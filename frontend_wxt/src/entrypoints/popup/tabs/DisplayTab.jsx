import { ComputerDesktopIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { FinanceSection } from "../../components/FinanceSection.jsx";
import { SportsSection } from "../../components/SportsSection.jsx";
import { RssSection } from "../../components/RssSection.jsx";
import { useAuth } from "../../components/hooks/useAuth.tsx";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setToggles } from "@/entrypoints/store/togglesSlice.js";
// We will use local state + localStorage for fantasy filters; keep Redux only for enabled toggle
import { API_ENDPOINTS } from "@/entrypoints/config/endpoints.js";
 

function FantasyBaseballPanel() {
  const dispatch = useDispatch();
  const toggles = useSelector((s) => s.toggles || {});
  const fantasyEnabled = !!(toggles.YAHOO_FANTASY ?? true);
  // Use Redux as source of truth for enabled
  const fantasyApi = API_ENDPOINTS.fantasy;
  const [accessToken, setAccessToken] = useState("");
  const [step, setStep] = useState("signin");
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [roster, setRoster] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [loading, setLoading] = useState(false);
  // Local filter states (persist to localStorage)
  const [dateMode, setDateMode] = useState('today');
  const [date, setDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showExtras, setShowExtras] = useState(true);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('desc');

  // Default sort per type: batters -> HR, pitchers -> K
  useEffect(() => {
    const batterKeys = ['HR','RBI','R','H','SB','AVG','OPS'];
    const pitcherKeys = ['K','W','SV','IP','ERA','WHIP'];
    if (typeFilter === 'batters') {
      if (!sortKey || pitcherKeys.includes(sortKey)) setSortKey('HR');
    } else if (typeFilter === 'pitchers') {
      if (!sortKey || batterKeys.includes(sortKey)) setSortKey('K');
    }
  }, [typeFilter, sortKey]);

  // Load saved token + selections + date on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('yahoo_access_token');
      const savedLeague = localStorage.getItem('yahoo_selected_league');
      const savedTeam = localStorage.getItem('yahoo_selected_team');
      const savedMode = localStorage.getItem('yahoo_date_mode');
      const savedDate = localStorage.getItem('yahoo_date');
      const savedType = localStorage.getItem('yahoo_type_filter');
      const savedExtras = localStorage.getItem('yahoo_show_extras');
      const savedSortKey = localStorage.getItem('yahoo_sort_key');
      const savedSortDir = localStorage.getItem('yahoo_sort_dir');
      if (saved) {
        setAccessToken(saved);
        setStep('league');
      }
      if (savedLeague) setSelectedLeague(savedLeague);
      if (savedTeam) setSelectedTeam(savedTeam);
      if (savedMode === 'today' || savedMode === 'date') setDateMode(savedMode);
      if (savedDate && /^\d{4}-\d{2}-\d{2}$/.test(savedDate)) setDate(savedDate);
      if (savedType === 'batters' || savedType === 'pitchers' || savedType === 'all') setTypeFilter(savedType);
      if (savedExtras != null) setShowExtras(savedExtras === 'true');
      if (savedSortKey) setSortKey(savedSortKey);
      if (savedSortDir === 'asc' || savedSortDir === 'desc') setSortDir(savedSortDir);
    } catch {}
  }, []);

  // When token changes, persist it and load leagues
  useEffect(() => {
    if (accessToken) {
      try { localStorage.setItem('yahoo_access_token', accessToken); } catch {}
      setStep('league');
      // Ensure leagues load after token is set
      fetchLeagues();
    }
  }, [accessToken]);

  // Yahoo OAuth popup flow
  function signInWithYahoo() {
    if (!fantasyApi) return;
    const authUrl = fantasyApi.auth.start;
    const w = 500, h = 700;
    const y = window.top.outerHeight / 2 + window.top.screenY - ( h / 2);
    const x = window.top.outerWidth / 2 + window.top.screenX - ( w / 2);
    const win = window.open(authUrl, 'yahoo-oauth', `toolbar=no, location=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=${w}, height=${h}, top=${y}, left=${x}`);
    const listener = (event) => {
      if (!event || !event.data) return;
      if (event.data.type === 'yahoo-auth' && event.data.accessToken) {
        setAccessToken(event.data.accessToken);
        window.removeEventListener('message', listener);
        if (win) try { win.close(); } catch {}
      }
    };
    window.addEventListener('message', listener);
  }

  const authHeader = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), [accessToken]);

  async function fetchLeagues() {
    if (!accessToken) return;
    setLoading(true);
    try {
      if (!fantasyApi) return;
      const res = await fetch(fantasyApi.leagues(), { headers: authHeader });
      const data = await res.json();
      const arr = Array.isArray(data.leagues) ? data.leagues : [];
      setLeagues(arr);
      // Auto choose saved league if present
      try {
        const savedLeague = localStorage.getItem('yahoo_selected_league');
        if (savedLeague && arr.find((l) => l.league_key === savedLeague)) {
          setTimeout(() => chooseLeague(savedLeague), 0);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  async function chooseLeague(leagueKey) {
    setSelectedLeague(leagueKey);
    try { localStorage.setItem('yahoo_selected_league', leagueKey); } catch {}
    setSelectedTeam("");
    setRoster([]);
    setLoading(true);
    try {
      if (!fantasyApi) return;
      const res = await fetch(fantasyApi.leagueStandings(leagueKey), { headers: authHeader });
      const data = await res.json();
      const t = (data.standings || []).map((x) => ({ team_key: x.team_key, name: x.name }));
      setTeams(t);
      setStep("team");
      // Auto choose saved team if present
      try {
        const savedTeam = localStorage.getItem('yahoo_selected_team');
        if (savedTeam && t.find((tm) => tm.team_key === savedTeam)) {
          setTimeout(() => chooseTeam(savedTeam), 0);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  function fmt(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  function shiftDate(delta) {
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
  }
  function setToday() {
    const now = new Date();
    const today = fmt(now);
    setDate(today);
    try { localStorage.setItem('yahoo_date', today); } catch {}
    if (selectedTeam) {
      setDateMode('date');
      try { localStorage.setItem('yahoo_date_mode', 'date'); } catch {}
      setTimeout(() => refreshRoster(), 0);
    }
  }

  // Filters persisted via Redux proxy store (no localStorage needed)
  // sorting now persisted in Redux via proxy store (no localStorage needed)

  async function chooseTeam(teamKey) {
    setSelectedTeam(teamKey);
    try { localStorage.setItem('yahoo_selected_team', teamKey); } catch {}
    setLoading(true);
    try {
      if (!fantasyApi) return;
      const rosterUrl = fantasyApi.teamRoster(
        teamKey,
        dateMode === "date" && date ? { date } : undefined
      );
      const res = await fetch(rosterUrl, { headers: authHeader });
      const data = await res.json();
      setRoster(data.roster || []);
    } finally {
      setLoading(false);
    }
  }
  async function refreshRoster() {
    if (!selectedTeam) return;
    setLoading(true);
    try {
      if (!fantasyApi) return;
      const rosterUrl = fantasyApi.teamRoster(
        selectedTeam,
        dateMode === "date" && date ? { date } : undefined
      );
      const res = await fetch(rosterUrl, { headers: authHeader });
      const data = await res.json();
      setRoster(data.roster || []);
    } finally {
      setLoading(false);
    }
  }

  // No local filtering; Redux drives the iframe’s filtering/sorting

  return (
    <div className="space-y-3">
      {/* Header controls */}
      <div className="z-50 relative flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Yahoo + ESPN toggles (compact row, like Sports/Finance) */}
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

        {/* Rest of controls are only visible when enabled */}
        {fantasyEnabled && (
          <>
            {/* Sign in/out + Date controls in one row */}
            <div className="flex items-center gap-2 w-full">
              {!accessToken ? (
                <button className="btn btn-primary btn-xs" onClick={signInWithYahoo}>Sign in with Yahoo</button>
              ) : (
                <button
                  className="group"
                  onClick={() => { try { localStorage.removeItem('yahoo_access_token'); localStorage.removeItem('yahoo_selected_league'); localStorage.removeItem('yahoo_selected_team'); } catch {}; setAccessToken(''); setSelectedLeague(''); setSelectedTeam(''); setLeagues([]); setTeams([]); setRoster([]); setStep('signin'); }}
                  title="Sign out"
                >
                  <span className="badge badge-success badge-sm group-hover:hidden">Signed in</span>
                  <span className="badge badge-error badge-sm hidden group-hover:inline-block">Sign out</span>
                </button>
              )}

              <div className="pointer-events-auto join">
                <button className="join-item btn btn-xs" aria-label="Next day" onClick={() => shiftDate(1)}>↑</button>
                <input type="date" className="input-bordered join-item input input-xs" value={date} onChange={(e) => { setDate(e.target.value); try { localStorage.setItem('yahoo_date', e.target.value); } catch {}; }} />
                <button className="join-item btn btn-xs" aria-label="Previous day" onClick={() => shiftDate(-1)}>↓</button>
                <button className="join-item btn btn-xs" onClick={setToday}>Today</button>
              </div>
            </div>

            <div className="border border-base-300 rounded-md pointer-events-auto join">
              <button className={`join-item btn btn-xs ${typeFilter==='all' ? 'btn-active' : ''}`} onClick={() => { setTypeFilter('all'); try{ localStorage.setItem('yahoo_type_filter','all'); }catch{} }}>All</button>
              <button className={`join-item btn btn-xs ${typeFilter==='batters' ? 'btn-active' : ''}`} onClick={() => { setTypeFilter('batters'); try{ localStorage.setItem('yahoo_type_filter','batters'); }catch{} }}>Batters</button>
              <button className={`join-item btn btn-xs ${typeFilter==='pitchers' ? 'btn-active' : ''}`} onClick={() => { setTypeFilter('pitchers'); try{ localStorage.setItem('yahoo_type_filter','pitchers'); }catch{} }}>Pitchers</button>
            </div>
            <label className="gap-2 cursor-pointer pointer-events-auto label">
              <input type="checkbox" className="checkbox checkbox-xs" checked={showExtras} onChange={(e) => { setShowExtras(e.target.checked); try{ localStorage.setItem('yahoo_show_extras', String(e.target.checked)); }catch{} }} />
              <span className="label-text">Show Bench & IL</span>
            </label>

            {/* Sorting Controls */}
            <div className="border border-base-300 rounded-md pointer-events-auto join">
              <select className="select-xs join-item select" value={sortKey} onChange={(e) => { setSortKey(e.target.value); try{ localStorage.setItem('yahoo_sort_key', e.target.value); }catch{} }}>
                <option value="">Sort: None</option>
                <optgroup label="Batters">
                  <option value="HR">HR</option>
                  <option value="RBI">RBI</option>
                  <option value="R">R</option>
                  <option value="H">H</option>
                  <option value="SB">SB</option>
                  <option value="AVG">AVG</option>
                  <option value="OPS">OPS</option>
                </optgroup>
                <optgroup label="Pitchers">
                  <option value="K">K</option>
                  <option value="W">W</option>
                  <option value="SV">SV</option>
                  <option value="IP">IP</option>
                  <option value="ERA">ERA</option>
                  <option value="WHIP">WHIP</option>
                </optgroup>
              </select>
              <select className="select-xs join-item select" value={sortDir} onChange={(e) => { const v = e.target.value === 'asc' ? 'asc' : 'desc'; setSortDir(v); try{ localStorage.setItem('yahoo_sort_dir', v); }catch{} }}>
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* When disabled, hide Fantasy controls entirely */}

      {/* Flow content */}
      {fantasyEnabled && step === 'league' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="opacity-70 text-sm">Select a League</div>
            <button className="btn btn-ghost btn-xs" onClick={fetchLeagues} disabled={loading}>Refresh</button>
          </div>
          {loading ? (
            <div className="opacity-70 text-sm">Loading leagues…</div>
          ) : leagues.length ? (
            <div className="w-full form-control">
              <select
                className="w-full select-bordered select-sm select"
                value={selectedLeague}
                onChange={(e) => chooseLeague(e.target.value)}
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
            <div className="opacity-70 text-sm">No leagues found.</div>
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
              onChange={(e) => chooseTeam(e.target.value)}
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

      {/* Roster cards are displayed in the carousel */}
    </div>
  );
}

export default function DisplayTab() {
  const { isAuthenticated } = useAuth();
  const sectionStorageKey = "scrollr_display_sections";
  const defaultSections = {
    sports: true,
    finance: true,
    rss: true,
    fantasy: true,
  };

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

  const toggleSection = (key) => {
    setOpenSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { window.localStorage.setItem(sectionStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const sections = [
    {
      key: "sports",
      title: "Sports",
      description: "Manage live game tracking, alerts, and score ribbon settings.",
      content: <SportsSection />,
    },
    {
      key: "finance",
      title: "Finance",
      description: "Control trade stream behaviour and financial ticker options.",
      content: isAuthenticated ? (
        <FinanceSection />
      ) : (
        <div className="text-sm opacity-70">
          Sign in to manage finance alerts and ticker preferences.
        </div>
      ),
    },
    {
      key: "rss",
      title: "News (RSS)",
      description: "Add, remove, and prioritise the feeds that drive breaking news.",
      content: <RssSection />,
    },
    {
      key: "fantasy",
      title: "Fantasy Baseball",
      description: "Connect Yahoo leagues and fine-tune roster presentation.",
      content: <FantasyBaseballPanel />,
    },
  ];

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
      <div className="space-y-4 bg-base-100 p-2 border-base-300 max-h-120 overflow-hidden tab-content">
        <div className="flex flex-col gap-3 p-2 h-110 overflow-y-auto">
          {sections.map(({ key, title, description, content }) => {
            const isOpen = openSections[key] ?? true;
            return (
              <section
                key={key}
                className="bg-base-100 border border-base-300 rounded-box shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-base-200 transition-colors"
                  aria-expanded={isOpen}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{title}</span>
                    <span className="opacity-60 text-xs leading-relaxed">
                      {description}
                    </span>
                  </div>
                  <ChevronDownIcon
                    className={`size-5 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-2">
                    {content}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
