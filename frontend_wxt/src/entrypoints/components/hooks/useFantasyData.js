import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { API_ENDPOINTS } from '@/entrypoints/config/endpoints.js';

export default function useFantasyData() {
  const SPORTS_API = 'http://localhost:4000';
  const [roster, setRoster] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle | loading | ok | error
  // Filters from localStorage
  const [filterType, setFilterType] = useState(() => {
    try { return localStorage.getItem('yahoo_type_filter') || 'all'; } catch { return 'all'; }
  });
  const [showExtras, setShowExtras] = useState(() => {
    try { return (localStorage.getItem('yahoo_show_extras') ?? 'true') === 'true'; } catch { return true; }
  });
  const [dateMode, setDateMode] = useState(() => {
    try { return localStorage.getItem('yahoo_date_mode') || 'today'; } catch { return 'today'; }
  });
  const [date, setDate] = useState(() => {
    try { return localStorage.getItem('yahoo_date') || ''; } catch { return ''; }
  });
  const [sortKey, setSortKey] = useState(() => {
    try { return localStorage.getItem('yahoo_sort_key') || ''; } catch { return ''; }
  });
  const [sortDir, setSortDir] = useState(() => {
    try { return localStorage.getItem('yahoo_sort_dir') || 'desc'; } catch { return 'desc'; }
  });
  // Token/team from localStorage
  const [accessToken, setAccessToken] = useState(() => {
    try { return localStorage.getItem('yahoo_access_token') || ''; } catch { return ''; }
  });
  const [selectedTeam, setSelectedTeam] = useState(() => {
    try { return localStorage.getItem('yahoo_selected_team') || ''; } catch { return ''; }
  });
  // Keep enable toggle in Redux (works fine)
  const enabled = useSelector((state) => (state.toggles?.YAHOO_FANTASY ?? true));

  // Listen for storage changes from popup (token/team + filters)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'yahoo_access_token') setAccessToken(e.newValue || '');
      if (e.key === 'yahoo_selected_team') setSelectedTeam(e.newValue || '');
      if (e.key === 'yahoo_type_filter') setFilterType(e.newValue || 'all');
      if (e.key === 'yahoo_show_extras') setShowExtras((e.newValue ?? 'true') === 'true');
      if (e.key === 'yahoo_date_mode') setDateMode(e.newValue || 'today');
      if (e.key === 'yahoo_date') setDate(e.newValue || '');
      if (e.key === 'yahoo_sort_key') setSortKey(e.newValue || '');
      if (e.key === 'yahoo_sort_dir') setSortDir(e.newValue || 'desc');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // No separate local enabled state — use Redux directly

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!enabled || !accessToken || !selectedTeam) return;
      setConnectionStatus('loading');
      try {
        const q = dateMode === 'date' && date ? `?date=${encodeURIComponent(date)}` : '';
        const res = await fetch(`${SPORTS_API}/team/${encodeURIComponent(selectedTeam)}/roster${q}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          const list = Array.isArray(data.roster) ? data.roster : [];
          setRoster(list);
          setConnectionStatus('ok');
        }
      } catch (e) {
        if (!cancelled) setConnectionStatus('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [SPORTS_API, accessToken, selectedTeam, dateMode, date, enabled]);

  const filteredRoster = useMemo(() => {
    if (!enabled) return [];
    const list = Array.isArray(roster) ? roster : [];
    const filtered = list.filter((p) => {
      const selPos = (p.selectedPosition || '').toUpperCase();
      const isBench = selPos === 'BN';
      const isIL = selPos === 'IL' || selPos === 'DL' || (Array.isArray(p.eligiblePositions) && p.eligiblePositions.includes('IL'));
      if (!showExtras && (isBench || isIL)) return false;
      const type = (p.positionType || '').toUpperCase();
      if (filterType === 'batters' && type === 'P') return false;
      if (filterType === 'pitchers' && type === 'B') return false;
      return true;
    });
    if (!sortKey) return filtered;
    const getVal = (pl) => {
      switch (sortKey) {
        case 'HR': return pl.homeRuns ?? 0;
        case 'RBI': return pl.rbis ?? 0;
        case 'R': return pl.runs ?? 0;
        case 'H': return pl.hits ?? 0;
        case 'SB': return pl.sb ?? 0;
        case 'AVG': return typeof pl.avg === 'number' ? pl.avg : 0;
        case 'OPS': return typeof pl.ops === 'number' ? pl.ops : 0;
        case 'K': return pl.strikeouts ?? 0;
        case 'W': return pl.wins ?? 0;
        case 'L': return pl.losses ?? 0;
        case 'SV': return pl.saves ?? 0;
        case 'IP': return pl.ip ?? 0;
        case 'ERA': return typeof pl.era === 'number' ? pl.era : Number.POSITIVE_INFINITY;
        case 'WHIP': return typeof pl.whip === 'number' ? pl.whip : Number.POSITIVE_INFINITY;
        default: return 0;
      }
    };
    const sorted = [...filtered].sort((a, b) => {
      const va = getVal(a); const vb = getVal(b);
      if (va === vb) return 0;
      if (sortDir === 'asc') return va < vb ? -1 : 1;
      return va > vb ? -1 : 1;
    });
    return sorted;
  }, [roster, filterType, showExtras, sortKey, sortDir, enabled]);

  return {
    roster: filteredRoster,
    connectionStatus,
    hasFantasySelection: !!(enabled && accessToken && selectedTeam),
    dateMode,
    date,
    sortKey,
    sortDir,
  };
}
