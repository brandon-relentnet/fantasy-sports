import {
  ComputerDesktopIcon,
  ChevronDownIcon,
  Bars3Icon,
  TrophyIcon,
  BanknotesIcon,
  NewspaperIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import { FinanceSection } from "../../components/FinanceSection.jsx";
import { SportsSection } from "../../components/SportsSection.jsx";
import { RssSection } from "../../components/RssSection.jsx";
import { useAuth } from "../../components/hooks/useAuth.tsx";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setToggles } from "@/entrypoints/store/togglesSlice.js";
// We will use local state + localStorage for fantasy filters; keep Redux only for enabled toggle
import { API_ENDPOINTS } from "@/entrypoints/config/endpoints.js";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import {
  DEFAULT_SPORT,
  FANTASY_SPORTS,
  FANTASY_STORAGE_KEYS,
  SUPPORTED_SPORTS_ORDER,
  readScopedPreference,
  removeScopedPreference,
  resolveSportKey,
  writeScopedPreference,
} from "@/entrypoints/utils/fantasySports.js";
 

const BATTER_SORT_KEYS = new Set(["HR", "RBI", "R", "H", "SB", "AVG", "OPS"]);
const PITCHER_SORT_KEYS = new Set(["K", "W", "L", "SV", "IP", "ERA", "WHIP"]);

const getInitialSportKey = () => {
  if (typeof window === "undefined") return DEFAULT_SPORT;
  try {
    const saved = window.localStorage.getItem(FANTASY_STORAGE_KEYS.sport);
    return saved ? resolveSportKey(saved) : DEFAULT_SPORT;
  } catch {
    return DEFAULT_SPORT;
  }
};

const ensureValidTypeFilter = (value, sportKey) => {
  const cfg = FANTASY_SPORTS[resolveSportKey(sportKey)] || FANTASY_SPORTS[DEFAULT_SPORT];
  const allowed = (cfg.typeFilters || []).map((opt) => opt.value);
  if (!allowed.length) return "all";
  return allowed.includes(value) ? value : allowed[0];
};

const ensureValidSortKey = (value, sportKey) => {
  const cfg = FANTASY_SPORTS[resolveSportKey(sportKey)] || FANTASY_SPORTS[DEFAULT_SPORT];
  const allowed = new Set((cfg.sortOptions || []).map((opt) => opt.value));
  if (allowed.has(value)) return value;
  return cfg.defaultSort || cfg.sortOptions?.[0]?.value || "";
};

const normalizeLeaguesResponse = (payload) => {
  const result = {};
  const source = payload?.leagues ?? payload;
  const addLeague = (league, fallbackSport) => {
    if (!league) return;
    const code = league.game_code || league.gameCode || fallbackSport || DEFAULT_SPORT;
    const sportKey = resolveSportKey(code);
    if (!result[sportKey]) result[sportKey] = [];
    result[sportKey].push(league);
  };
  if (Array.isArray(source)) {
    source.forEach((league) => addLeague(league, "mlb"));
  } else if (source && typeof source === "object") {
    Object.entries(source).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((league) => addLeague(league, key));
      }
    });
  }
  return result;
};

function FantasyYahooPanel() {
  const dispatch = useDispatch();
  const toggles = useSelector((s) => s.toggles || {});
  const fantasyEnabled = !!(toggles.YAHOO_FANTASY ?? true);
  const fantasyApi = API_ENDPOINTS.fantasy;
  const [accessToken, setAccessToken] = useState("");
  const [step, setStep] = useState("signin");
  const [leaguesBySport, setLeaguesBySport] = useState({});
  const [teams, setTeams] = useState([]);
  const [roster, setRoster] = useState([]);
  const [selectedSport, setSelectedSport] = useState(() => getInitialSportKey());
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateMode, setDateMode] = useState('today');
  const [date, setDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showExtras, setShowExtras] = useState(true);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const sportConfig = FANTASY_SPORTS[selectedSport] || FANTASY_SPORTS[DEFAULT_SPORT];
  const leagues = leaguesBySport[selectedSport] || [];
  const sportButtons = SUPPORTED_SPORTS_ORDER.map((key) => ({
    key,
    ...FANTASY_SPORTS[key],
  }));

  const syncSelectionsForSport = (sportKey) => {
    const safeSport = resolveSportKey(sportKey);
    const storedType = readScopedPreference(FANTASY_STORAGE_KEYS.typeFilter, safeSport, 'all');
    setTypeFilter(ensureValidTypeFilter(storedType || 'all', safeSport));
    const storedSort = readScopedPreference(
      FANTASY_STORAGE_KEYS.sortKey,
      safeSport,
      FANTASY_SPORTS[safeSport]?.defaultSort || ''
    );
    setSortKey(ensureValidSortKey(storedSort || '', safeSport));
    setSelectedLeague(readScopedPreference(FANTASY_STORAGE_KEYS.league, safeSport, '') || '');
    setSelectedTeam(readScopedPreference(FANTASY_STORAGE_KEYS.team, safeSport, '') || '');
  };

  useEffect(() => {
    syncSelectionsForSport(selectedSport);
  }, [selectedSport]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('yahoo_access_token');
      const savedMode = localStorage.getItem('yahoo_date_mode');
      const savedDate = localStorage.getItem('yahoo_date');
      const savedExtras = localStorage.getItem('yahoo_show_extras');
      const savedSortDir = localStorage.getItem('yahoo_sort_dir');
      if (saved) {
        setAccessToken(saved);
        setStep('league');
      }
      if (savedMode === 'today' || savedMode === 'date') setDateMode(savedMode);
      if (savedDate && /^\d{4}-\d{2}-\d{2}$/.test(savedDate)) setDate(savedDate);
      if (savedExtras != null) setShowExtras(savedExtras === 'true');
      if (savedSortDir === 'asc' || savedSortDir === 'desc') setSortDir(savedSortDir);
    } catch {}
  }, []);

  useEffect(() => {
    if (accessToken) {
      try { localStorage.setItem('yahoo_access_token', accessToken); } catch {}
      setStep('league');
      fetchLeagues();
    }
  }, [accessToken]);

  const signInWithYahoo = () => {
    if (!fantasyApi) return;
    const authUrl = fantasyApi.auth.start;
    const w = 500;
    const h = 700;
    const top =
      (window.top?.outerHeight ?? window.outerHeight ?? h) / 2 +
      (window.top?.screenY ?? window.screenY ?? 0) -
      h / 2;
    const left =
      (window.top?.outerWidth ?? window.outerWidth ?? w) / 2 +
      (window.top?.screenX ?? window.screenX ?? 0) -
      w / 2;
    const win = window.open(
      authUrl,
      "yahoo-oauth",
      `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${w},height=${h},top=${top},left=${left}`
    );
    const listener = (event) => {
      if (!event || !event.data) return;
      if (event.data.type === "yahoo-auth" && event.data.accessToken) {
        setAccessToken(event.data.accessToken);
        window.removeEventListener("message", listener);
        if (win) {
          try {
            win.close();
          } catch {}
        }
      }
    };
    window.addEventListener("message", listener);
  };

  const fmt = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const shiftDate = (delta) => {
    const baseStr = date && !Number.isNaN(Date.parse(date)) ? date : fmt(new Date());
    const [y, m, d] = baseStr.split("-").map((x) => parseInt(x, 10));
    const base = new Date(Date.UTC(y, m - 1, d));
    base.setUTCDate(base.getUTCDate() + delta);
    const next = fmt(new Date(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
    setDate(next);
    try { localStorage.setItem('yahoo_date', next); } catch {}
    if (selectedTeam) {
      setDateMode('date');
      try { localStorage.setItem('yahoo_date_mode', 'date'); } catch {}
      setTimeout(() => refreshRoster(), 0);
    }
  };
  const setToday = () => {
    const today = fmt(new Date());
    setDate(today);
    try { localStorage.setItem('yahoo_date', today); } catch {}
    if (selectedTeam) {
      setDateMode('date');
      try { localStorage.setItem('yahoo_date_mode', 'date'); } catch {}
      setTimeout(() => refreshRoster(), 0);
    }
  };

  const authHeader = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), [accessToken]);

  async function fetchLeagues() {
    if (!accessToken) return;
    setLoading(true);
    try {
      if (!fantasyApi) return;
      const res = await fetch(fantasyApi.leagues(), { headers: authHeader });
      const data = await res.json();
      const normalized = normalizeLeaguesResponse(data);
      setLeaguesBySport(normalized);
      const availableSports = Object.keys(normalized);
      let targetSport = selectedSport;
      if (!normalized[targetSport] || !normalized[targetSport].length) {
        const fallback = availableSports[0];
        if (fallback) {
          targetSport = resolveSportKey(fallback);
          setSelectedSport(targetSport);
          try { localStorage.setItem(FANTASY_STORAGE_KEYS.sport, targetSport); } catch {}
        }
      }
      const savedLeague = readScopedPreference(FANTASY_STORAGE_KEYS.league, targetSport, '');
      const savedTeam = readScopedPreference(FANTASY_STORAGE_KEYS.team, targetSport, '');
      if (savedLeague && normalized[targetSport]?.some((l) => l.league_key === savedLeague)) {
        setTimeout(() => chooseLeague(savedLeague, { sportOverride: targetSport, skipStorage: true, restoreTeam: savedTeam }), 0);
      } else {
        setSelectedLeague('');
        setSelectedTeam('');
        setRoster([]);
        setStep('league');
      }
    } finally {
      setLoading(false);
    }
  }

  async function chooseLeague(leagueKey, options = {}) {
    if (!leagueKey) return;
    const sportKey = resolveSportKey(options.sportOverride || selectedSport);
    if (sportKey !== selectedSport) {
      setSelectedSport(sportKey);
      try { localStorage.setItem(FANTASY_STORAGE_KEYS.sport, sportKey); } catch {}
    }
    setSelectedLeague(leagueKey);
    if (!options.skipStorage) writeScopedPreference(FANTASY_STORAGE_KEYS.league, sportKey, leagueKey);
    setSelectedTeam('');
    removeScopedPreference(FANTASY_STORAGE_KEYS.team, sportKey);
    setRoster([]);
    setLoading(true);
    try {
      if (!fantasyApi) return;
      const res = await fetch(fantasyApi.leagueStandings(leagueKey), { headers: authHeader });
      const data = await res.json();
      const t = (data.standings || []).map((x) => ({ team_key: x.team_key, name: x.name }));
      setTeams(t);
      setStep('team');
      try {
        const savedTeam = options.restoreTeam || readScopedPreference(FANTASY_STORAGE_KEYS.team, sportKey, '');
        if (savedTeam && t.find((tm) => tm.team_key === savedTeam)) {
          setTimeout(() => chooseTeam(savedTeam, sportKey, { skipStorage: true }), 0);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  const buildRosterParams = (sportKey) => {
    const params = {};
    if (dateMode === 'date' && date) params.date = date;
    const sportParam = FANTASY_SPORTS[sportKey]?.sportParam;
    if (sportParam) params.sport = sportParam;
    return params;
  };

  async function chooseTeam(teamKey, sportOverride, options = {}) {
    if (!teamKey) return;
    const sportKey = resolveSportKey(sportOverride || selectedSport);
    if (sportKey !== selectedSport) {
      setSelectedSport(sportKey);
      try { localStorage.setItem(FANTASY_STORAGE_KEYS.sport, sportKey); } catch {}
    }
    setSelectedTeam(teamKey);
    if (!options.skipStorage) writeScopedPreference(FANTASY_STORAGE_KEYS.team, sportKey, teamKey);
    setLoading(true);
    try {
      if (!fantasyApi) return;
      const rosterUrl = fantasyApi.teamRoster(teamKey, buildRosterParams(sportKey));
      const res = await fetch(rosterUrl, { headers: authHeader });
      const data = await res.json();
      const list = Array.isArray(data.roster) ? data.roster : [];
      setRoster(list.map((player) => ({ ...player, sport: sportKey })));
    } finally {
      setLoading(false);
    }
  }

  async function refreshRoster(sportOverride) {
    if (!selectedTeam) return;
    const sportKey = resolveSportKey(sportOverride || selectedSport);
    setLoading(true);
    try {
      if (!fantasyApi) return;
      const rosterUrl = fantasyApi.teamRoster(selectedTeam, buildRosterParams(sportKey));
      const res = await fetch(rosterUrl, { headers: authHeader });
      const data = await res.json();
      const list = Array.isArray(data.roster) ? data.roster : [];
      setRoster(list.map((player) => ({ ...player, sport: sportKey })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedSport !== 'mlb') return;
    if (typeFilter === 'batters' && (PITCHER_SORT_KEYS.has(sortKey) || !sortKey)) {
      setSortKey('HR');
      writeScopedPreference(FANTASY_STORAGE_KEYS.sortKey, 'mlb', 'HR');
    } else if (typeFilter === 'pitchers' && (BATTER_SORT_KEYS.has(sortKey) || !sortKey)) {
      setSortKey('K');
      writeScopedPreference(FANTASY_STORAGE_KEYS.sortKey, 'mlb', 'K');
    }
  }, [typeFilter, sortKey, selectedSport]);

  const handleSportSwitch = (sportKey) => {
    const key = resolveSportKey(sportKey);
    if (key === selectedSport) return;
    setSelectedSport(key);
    try { localStorage.setItem(FANTASY_STORAGE_KEYS.sport, key); } catch {}
    setRoster([]);
    setTeams([]);
    setStep('league');
    const savedLeague = readScopedPreference(FANTASY_STORAGE_KEYS.league, key, '');
    const savedTeam = readScopedPreference(FANTASY_STORAGE_KEYS.team, key, '');
    if (savedLeague && (leaguesBySport[key] || []).some((l) => l.league_key === savedLeague)) {
      setTimeout(() => chooseLeague(savedLeague, { sportOverride: key, skipStorage: true, restoreTeam: savedTeam }), 0);
    }
  };

  return (
    <div className="space-y-3">
      <div className="z-50 relative flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="gap-4 grid grid-cols-2">
          <label
            className={`${fantasyEnabled ? 'text-base-content' : 'text-base-content/50'} .label btn btn-ghost justify-between flex items-center`}
          >
            <span className="flex items-center gap-2">
              <span className="inline-flex justify-center items-center bg-[#6001D2] rounded-full w-5 h-5 font-bold text-[10px] text-white">Y!</span>
              <span>Yahoo</span>
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={fantasyEnabled}
              onChange={(e) => {
                const val = e.target.checked;
                dispatch(setToggles({ ...toggles, YAHOO_FANTASY: val }));
              }}
            />
          </label>
          <div className="tooltip-bottom tooltip" data-tip="Coming soon!">
            <label className={`text-base-content/50 .label btn btn-ghost justify-between flex items-center cursor-not-allowed`}>
              <span className="flex items-center gap-2">
                <span className="inline-flex justify-center items-center bg-[#C8102E] rounded-full w-5 h-5 font-bold text-[10px] text-white">ES</span>
                <span>ESPN</span>
              </span>
              <input type="checkbox" className="toggle toggle-primary" disabled />
            </label>
          </div>
        </div>

        {fantasyEnabled && (
          <>
            <div className="flex flex-wrap items-center gap-2 w-full">
              {!accessToken ? (
                <button className="btn btn-primary btn-xs" onClick={signInWithYahoo}>Sign in with Yahoo</button>
              ) : (
                <button
                  className="group"
                  onClick={() => {
                    try {
                      localStorage.removeItem('yahoo_access_token');
                      localStorage.removeItem(FANTASY_STORAGE_KEYS.sport);
                      localStorage.removeItem('yahoo_date_mode');
                      localStorage.removeItem('yahoo_date');
                      localStorage.removeItem('yahoo_show_extras');
                      localStorage.removeItem('yahoo_sort_dir');
                      SUPPORTED_SPORTS_ORDER.forEach((sportKey) => {
                        removeScopedPreference(FANTASY_STORAGE_KEYS.league, sportKey);
                        removeScopedPreference(FANTASY_STORAGE_KEYS.team, sportKey);
                        removeScopedPreference(FANTASY_STORAGE_KEYS.typeFilter, sportKey);
                        removeScopedPreference(FANTASY_STORAGE_KEYS.sortKey, sportKey);
                      });
                    } catch {}
                    setAccessToken('');
                    setSelectedLeague('');
                    setSelectedTeam('');
                    setLeaguesBySport({});
                    setTeams([]);
                    setRoster([]);
                    setStep('signin');
                  }}
                  title="Sign out"
                >
                  <span className="badge badge-success badge-sm group-hover:hidden">Signed in</span>
                  <span className="badge badge-error badge-sm hidden group-hover:inline-block">Sign out</span>
                </button>
              )}

              <div className="flex flex-wrap items-center gap-1">
                {sportButtons.map((sport) => (
                  <button
                    key={sport.key}
                    className={`btn btn-xs ${sport.key === selectedSport ? 'btn-active' : 'btn-ghost'}`}
                    onClick={() => handleSportSwitch(sport.key)}
                  >
                    <span className="mr-1">{sport.emoji}</span>
                    {sport.shortLabel}
                  </button>
                ))}
              </div>

              <div className="pointer-events-auto join">
                <button className="join-item btn btn-xs" aria-label="Next day" onClick={() => shiftDate(1)}>↑</button>
                <input type="date" className="input-bordered join-item input input-xs" value={date} onChange={(e) => { setDate(e.target.value); try { localStorage.setItem('yahoo_date', e.target.value); } catch {}; }} />
                <button className="join-item btn btn-xs" aria-label="Previous day" onClick={() => shiftDate(-1)}>↓</button>
                <button className="join-item btn btn-xs" onClick={setToday}>Today</button>
              </div>
            </div>

            {sportConfig.typeFilters?.length > 1 && (
              <div className="border border-base-300 rounded-md pointer-events-auto join">
                {sportConfig.typeFilters.map((filter) => (
                  <button
                    key={filter.value}
                    className={`join-item btn btn-xs ${typeFilter === filter.value ? 'btn-active' : ''}`}
                    onClick={() => {
                      setTypeFilter(filter.value);
                      writeScopedPreference(FANTASY_STORAGE_KEYS.typeFilter, selectedSport, filter.value);
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}

            <label className="gap-2 cursor-pointer pointer-events-auto label">
              <input type="checkbox" className="checkbox checkbox-xs" checked={showExtras} onChange={(e) => { setShowExtras(e.target.checked); try{ localStorage.setItem('yahoo_show_extras', String(e.target.checked)); }catch{} }} />
              <span className="label-text">Show Bench &amp; IR</span>
            </label>

            <div className="pointer-events-auto join">
              <select
                className="select-xs join-item select"
                value={sortKey}
                onChange={(e) => {
                  const val = ensureValidSortKey(e.target.value, selectedSport);
                  setSortKey(val);
                  writeScopedPreference(FANTASY_STORAGE_KEYS.sortKey, selectedSport, val);
                }}
              >
                {sportConfig.sortOptions?.map((option) => (
                  <option key={option.value || 'default'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select className="select-xs join-item select" value={sortDir} onChange={(e) => { const v = e.target.value === 'asc' ? 'asc' : 'desc'; setSortDir(v); try{ localStorage.setItem('yahoo_sort_dir', v); }catch{} }}>
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </>
        )}
      </div>

      {fantasyEnabled && step === 'league' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="opacity-70 text-sm">Select a {sportConfig.label} league</div>
            <button className="btn btn-ghost btn-xs" onClick={fetchLeagues} disabled={loading}>Refresh</button>
          </div>
          {loading ? (
            <div className="opacity-70 text-sm">Loading leagues…</div>
          ) : leagues.length ? (
            <div className="w-full form-control">
              <select
                className="w-full select-bordered select-sm select"
                value={selectedLeague}
                onChange={(e) => chooseLeague(e.target.value, { sportOverride: selectedSport })}
              >
                <option value="" disabled>
                  Choose a league…
                </option>
                {leagues.map((l) => (
                  <option key={l.league_key} value={l.league_key}>
                    {l.name} ({l.season ?? ''})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="opacity-70 text-sm">No {sportConfig.label.toLowerCase()} leagues found.</div>
          )}
        </div>
      )}

      {fantasyEnabled && step === 'team' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <button className="link" onClick={() => setStep('league')}>Change league</button>
            <span className="opacity-60">{selectedLeague}</span>
          </div>
          <div className="w-full form-control">
            <select
              className="w-full select-bordered select-sm select"
              value={selectedTeam}
              onChange={(e) => chooseTeam(e.target.value, selectedSport)}
            >
              <option value="" disabled>
                Choose a team…
              </option>
              {teams.map((t) => (
                <option key={t.team_key} value={t.team_key}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DisplayTab() {
  useAuth();
  const toggles = useSelector((s) => s.toggles || {});
  const sectionStorageKey = "scrollr_display_sections";
  const orderStorageKey = "scrollr_display_order";
  const defaultSections = {
    sports: true,
    finance: true,
    rss: true,
    fantasy: true,
  };

  const fantasyEnabled = !!(toggles.YAHOO_FANTASY ?? true);

  const [openSections, setOpenSections] = useState(() => {
    if (typeof window === "undefined") return defaultSections;
    try {
      const stored = window.localStorage.getItem(sectionStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultSections, ...parsed };
      }
    } catch {}
    return defaultSections;
  });

  const baseOrder = Object.keys(defaultSections);
  const [sectionOrder, setSectionOrder] = useState(() => {
    if (typeof window === "undefined") return baseOrder;
    try {
      const stored = window.localStorage.getItem(orderStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          const filtered = parsed.filter((key) => baseOrder.includes(key));
          const extras = baseOrder.filter((key) => !filtered.includes(key));
          return [...filtered, ...extras];
        }
      }
    } catch {}
    return baseOrder;
  });

  const orderedSections = useMemo(() => {
    const known = sectionOrder.filter((key) => baseOrder.includes(key));
    const extras = baseOrder.filter((key) => !known.includes(key));
    return [...known, ...extras];
  }, [sectionOrder]);

  const toggleSection = (key) => {
    setOpenSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { window.localStorage.setItem(sectionStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const sectionMap = useMemo(
    () => ({
      sports: {
        title: "Sports",
        description: "Manage live game tracking, alerts, and score ribbon settings.",
        icon: TrophyIcon,
        accentBg: "bg-success/90",
        accentText: "text-success-content",
        content: <SportsSection />,
      },
      finance: {
        title: "Finance",
        description: "Control trade stream behaviour and financial ticker options.",
        icon: BanknotesIcon,
        accentBg: "bg-warning/90",
        accentText: "text-warning-content",
        content: <FinanceSection />,
      },
      rss: {
        title: "News (RSS)",
        description: "Add, remove, and prioritise the feeds that drive breaking news.",
        icon: NewspaperIcon,
        accentBg: "bg-info/90",
        accentText: "text-info-content",
        content: <RssSection />,
      },
      fantasy: {
        title: "Fantasy (Yahoo)",
        description: "Connect Yahoo leagues for baseball, football, and basketball.",
        icon: SparklesIcon,
        accentBg: "bg-secondary/90",
        accentText: "text-secondary-content",
        content: <FantasyYahooPanel />,
      },
    }),
    []
  );

  return (
    <>
      <label className="tab">
        <input
          type="radio"
          name="my_tabs_3"
          className="tab"
          aria-label="Tab 2"
        />
        <ComputerDesktopIcon className="size-8" />
      </label>
      <div className="space-y-4 bg-base-100 p-2 border border-base-300 rounded-xl max-h-120 overflow-hidden tab-content">
        <Reorder.Group
          axis="y"
          values={orderedSections}
          onReorder={(order) => {
            setSectionOrder(order);
            if (typeof window !== "undefined") {
              try {
                window.localStorage.setItem(orderStorageKey, JSON.stringify(order));
              } catch {}
            }
          }}
          className="flex flex-col gap-3 p-2 h-110 overflow-y-auto"
        >
          {orderedSections.map((key) => {
            const section = sectionMap[key];
            if (!section) return null;
            const isOpen = openSections[key] ?? true;
            const AccentIcon = section.icon ?? SparklesIcon;

            return (
              <Reorder.Item
                value={key}
                key={key}
                className="card card-compact bg-base-200/40 border border-base-200/60 backdrop-blur"
                whileDrag={{ scale: 1.02, boxShadow: "0 16px 32px rgba(15,23,42,0.18)" }}
                dragListener
              >
                <motion.button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="card-body flex w-full flex-row items-start justify-between gap-3 px-4 py-3 text-left"
                  aria-expanded={isOpen}
                  whileTap={{ scale: 0.985 }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${section.accentBg} ${section.accentText}`}
                    >
                      <AccentIcon className="size-5" />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm tracking-tight leading-tight">
                        {section.title}
                      </span>
                      <span className="opacity-70 text-xs leading-relaxed">
                        {section.description}
                      </span>
                    </div>
                  </div>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
                    <ChevronDownIcon className="size-5" />
                  </motion.span>
                </motion.button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial="collapsed"
                      animate="open"
                      exit="collapsed"
                      variants={{
                        open: { height: "auto", opacity: 1 },
                        collapsed: { height: 0, opacity: 0 },
                      }}
                      transition={{ duration: 0.28, ease: [0.24, 1, 0.32, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="card-body pt-0 text-sm leading-relaxed text-base-content/90">
                        {section.content}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </div>
    </>
  );
}
