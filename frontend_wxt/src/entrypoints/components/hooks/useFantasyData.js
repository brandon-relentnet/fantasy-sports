import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { API_ENDPOINTS } from '@/entrypoints/config/endpoints.js';
import {
  DEFAULT_SPORT,
  FANTASY_SPORTS,
  FANTASY_STORAGE_KEYS,
  getSportParams,
  isBenchSlot,
  isInjuredSlot,
  readScopedPreference,
  resolveSportKey,
} from '@/entrypoints/utils/fantasySports.js';

const getStoredSport = () => {
  try {
    const saved = localStorage.getItem(FANTASY_STORAGE_KEYS.sport);
    return saved ? resolveSportKey(saved) : DEFAULT_SPORT;
  } catch {
    return DEFAULT_SPORT;
  }
};

const getStoredFilter = (sportKey) => {
  const key = resolveSportKey(sportKey);
  const cfg = FANTASY_SPORTS[key] || FANTASY_SPORTS[DEFAULT_SPORT];
  const allowed = (cfg.typeFilters || []).map((opt) => opt.value);
  const stored = readScopedPreference(FANTASY_STORAGE_KEYS.typeFilter, key, allowed[0] || 'all') || '';
  if (allowed.length && !allowed.includes(stored)) return allowed[0];
  return stored || allowed[0] || 'all';
};

const getStoredSortKey = (sportKey) => {
  const key = resolveSportKey(sportKey);
  const cfg = FANTASY_SPORTS[key] || FANTASY_SPORTS[DEFAULT_SPORT];
  const allowed = new Set((cfg.sortOptions || []).map((opt) => opt.value));
  const fallback = cfg.defaultSort || cfg.sortOptions?.[0]?.value || '';
  const stored = readScopedPreference(FANTASY_STORAGE_KEYS.sortKey, key, fallback) || '';
  if (allowed.size && !allowed.has(stored)) return fallback;
  return stored;
};

export default function useFantasyData() {
  const fantasyApi = API_ENDPOINTS.fantasy;
  const [roster, setRoster] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('idle');

  const storedSport = getStoredSport();
  const [selectedSport, setSelectedSport] = useState(storedSport);
  const [filterType, setFilterType] = useState(() => getStoredFilter(storedSport));
  const [showExtras, setShowExtras] = useState(() => {
    try { return (localStorage.getItem('yahoo_show_extras') ?? 'true') === 'true'; } catch { return true; }
  });
  const [dateMode, setDateMode] = useState(() => {
    try { return localStorage.getItem('yahoo_date_mode') || 'today'; } catch { return 'today'; }
  });
  const [date, setDate] = useState(() => {
    try { return localStorage.getItem('yahoo_date') || ''; } catch { return ''; }
  });
  const [sortKey, setSortKey] = useState(() => getStoredSortKey(storedSport));
  const [sortDir, setSortDir] = useState(() => {
    try { return localStorage.getItem('yahoo_sort_dir') || 'desc'; } catch { return 'desc'; }
  });
  const [accessToken, setAccessToken] = useState(() => {
    try {
      return (
        localStorage.getItem(FANTASY_STORAGE_KEYS.accessToken) ||
        localStorage.getItem('yahoo_access_token') ||
        ''
      );
    } catch {
      return '';
    }
  });
  const [refreshToken, setRefreshToken] = useState(() => {
    try {
      return (
        localStorage.getItem(FANTASY_STORAGE_KEYS.refreshToken) ||
        localStorage.getItem('yahoo_refresh_token') ||
        ''
      );
    } catch {
      return '';
    }
  });
  const [selectedTeam, setSelectedTeam] = useState(() => {
    try { return readScopedPreference(FANTASY_STORAGE_KEYS.team, storedSport, '') || ''; } catch { return ''; }
  });

  const enabled = useSelector((state) => (state.toggles?.YAHOO_FANTASY ?? true));

  useEffect(() => {
    const onStorage = (e) => {
      if (!e || typeof e.key !== 'string') return;
      if (e.key === 'yahoo_access_token' || e.key === FANTASY_STORAGE_KEYS.accessToken) {
        setAccessToken(e.newValue || '');
      }
      if (e.key === 'yahoo_refresh_token' || e.key === FANTASY_STORAGE_KEYS.refreshToken) {
        setRefreshToken(e.newValue || '');
      }
      if (e.key === 'yahoo_show_extras') setShowExtras((e.newValue ?? 'true') === 'true');
      if (e.key === 'yahoo_date_mode') setDateMode(e.newValue || 'today');
      if (e.key === 'yahoo_date') setDate(e.newValue || '');
      if (e.key === 'yahoo_sort_dir') setSortDir(e.newValue === 'asc' ? 'asc' : 'desc');
      if (e.key === FANTASY_STORAGE_KEYS.sport) {
        setSelectedSport(resolveSportKey(e.newValue || DEFAULT_SPORT));
        return;
      }
      if (e.key.startsWith(FANTASY_STORAGE_KEYS.team)) {
        setSelectedTeam(readScopedPreference(FANTASY_STORAGE_KEYS.team, selectedSport, '') || '');
      }
      if (e.key.startsWith(FANTASY_STORAGE_KEYS.typeFilter)) {
        setFilterType(getStoredFilter(selectedSport));
      }
      if (e.key.startsWith(FANTASY_STORAGE_KEYS.sortKey)) {
        setSortKey(getStoredSortKey(selectedSport));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [selectedSport]);

  useEffect(() => {
    setFilterType(getStoredFilter(selectedSport));
    setSortKey(getStoredSortKey(selectedSport));
    setSelectedTeam(readScopedPreference(FANTASY_STORAGE_KEYS.team, selectedSport, '') || '');
  }, [selectedSport]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!enabled || !accessToken || !refreshToken || !selectedTeam || !fantasyApi) return;
      setConnectionStatus('loading');
      try {
        const effectiveDate =
          dateMode === 'date' && date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
        const sportParams = getSportParams(selectedSport);
        const buildUrl = (p) =>
          fantasyApi.teamRoster(selectedTeam, p && Object.keys(p).length ? p : undefined);
        const authHeaders = { Authorization: `Bearer ${accessToken}` };
        const postOptions = {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        };
        const candidates = [];
        const seen = new Set();
        const addCandidate = (p) => {
          const key = JSON.stringify(p || {});
          if (seen.has(key)) return;
          seen.add(key);
          candidates.push(p);
        };
        sportParams.forEach((sp) => {
          if (effectiveDate) addCandidate({ sport: sp, date: effectiveDate });
          addCandidate({ sport: sp });
        });
        if (effectiveDate) addCandidate({ date: effectiveDate });
        addCandidate({});

        let successData = null;
        for (const candidate of candidates) {
          let res = await fetch(buildUrl(candidate), { headers: authHeaders });
          if (!res.ok && res.status === 401) {
            res = await fetch(buildUrl(candidate), postOptions);
          }
          if (!res.ok && candidate?.date) {
            const withoutDate = { ...candidate };
            delete withoutDate.date;
            let retry = await fetch(buildUrl(withoutDate), { headers: authHeaders });
            if (!retry.ok && retry.status === 401) {
              retry = await fetch(buildUrl(withoutDate), postOptions);
            }
            res = retry;
          }
          if (res.ok) {
            successData = await res.json();
            break;
          }
        }

        if (!successData) throw new Error('Roster load failed');
        if (!cancelled) {
          const list = Array.isArray(successData.roster) ? successData.roster : [];
          setRoster(list.map((player) => ({ ...player, sport: selectedSport })));
          setConnectionStatus('ok');
        }
      } catch (e) {
        if (!cancelled) setConnectionStatus('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [fantasyApi, accessToken, refreshToken, selectedTeam, dateMode, date, enabled, selectedSport]);

  const filteredRoster = useMemo(() => {
    if (!enabled) return [];
    const cfg = FANTASY_SPORTS[selectedSport] || FANTASY_SPORTS[DEFAULT_SPORT];
    const list = Array.isArray(roster) ? roster : [];
    const filtered = list.filter((player) => {
      const slot = (player.selectedPosition || '').toUpperCase();
      if (!showExtras && (isBenchSlot(slot) || isInjuredSlot(slot))) return false;
      if (cfg.filterPredicate && !cfg.filterPredicate(player, filterType)) return false;
      return true;
    });
    if (!sortKey) return filtered;
    const getter = cfg.getSortValue || (() => 0);
    const sorted = [...filtered].sort((a, b) => {
      const va = getter(a, sortKey);
      const vb = getter(b, sortKey);
      if (va === vb) return 0;
      if (sortDir === 'asc') return va < vb ? -1 : 1;
      return va > vb ? -1 : 1;
    });
    return sorted;
  }, [roster, filterType, showExtras, sortKey, sortDir, enabled, selectedSport]);

  return {
    roster: filteredRoster,
    connectionStatus,
    hasFantasySelection: !!(enabled && accessToken && refreshToken && selectedTeam),
    dateMode,
    date,
    sortKey,
    sortDir,
    sport: selectedSport,
  };
}
