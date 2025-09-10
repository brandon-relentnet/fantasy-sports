import { ComputerDesktopIcon, InformationCircleIcon } from "@heroicons/react/24/solid";
import { FinanceSection } from "../../components/FinanceSection.jsx";
import { SportsSection } from "../../components/SportsSection.jsx";
import { RssSection } from "../../components/RssSection.jsx";
import { useAuth } from "../../components/hooks/useAuth.tsx";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setFantasyEnabled } from "@/entrypoints/store/fantasySlice.js";
import { API_ENDPOINTS } from "@/entrypoints/config/endpoints.js";

function FantasyBaseballPanel() {
  const dispatch = useDispatch();
  const fantasyEnabled = useSelector((s) => s.fantasy?.enabled ?? true);
  const [enabledLocal, setEnabledLocal] = useState(() => {
    try { return (localStorage.getItem('yahoo_enabled') ?? 'true') === 'true'; } catch { return true; }
  });
  useEffect(() => {
    // keep local toggle in sync with redux (e.g., on initial load)
    setEnabledLocal(!!fantasyEnabled);
  }, [fantasyEnabled]);
  const SPORTS_API = "http://localhost:4000";
  const [accessToken, setAccessToken] = useState("");
  const [step, setStep] = useState("signin");
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [roster, setRoster] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateMode, setDateMode] = useState("today");
  const [date, setDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showExtras, setShowExtras] = useState(true);
  const [sortKey, setSortKey] = useState(() => { try { return localStorage.getItem('yahoo_sort') || ''; } catch { return ''; } });
  const [sortDir, setSortDir] = useState(() => { try { return localStorage.getItem('yahoo_sort_dir') || 'desc'; } catch { return 'desc'; } });

  // Load saved token + selections + date on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('yahoo_access_token');
      const savedLeague = localStorage.getItem('yahoo_selected_league');
      const savedTeam = localStorage.getItem('yahoo_selected_team');
      const savedMode = localStorage.getItem('yahoo_date_mode');
      const savedDate = localStorage.getItem('yahoo_date');
      if (saved) {
        setAccessToken(saved);
        setStep('league');
        // Preload leagues quietly
        setTimeout(() => fetchLeagues(), 0);
      }
      if (savedLeague) setSelectedLeague(savedLeague);
      if (savedTeam) setSelectedTeam(savedTeam);
      if (savedMode === 'today' || savedMode === 'date') setDateMode(savedMode);
      if (savedDate && /^\d{4}-\d{2}-\d{2}$/.test(savedDate)) setDate(savedDate);
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
    const authUrl = `${SPORTS_API}/auth/yahoo/start`;
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
        setTimeout(() => fetchLeagues(), 0);
      }
    };
    window.addEventListener('message', listener);
  }

  const authHeader = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), [accessToken]);

  async function fetchLeagues() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${SPORTS_API}/leagues`, { headers: authHeader });
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
      const res = await fetch(`${SPORTS_API}/league/${encodeURIComponent(leagueKey)}/standings`, { headers: authHeader });
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
    if (selectedTeam) {
      setDateMode("date");
      setTimeout(() => refreshRoster(), 0);
    }
  }
  function setToday() {
    const now = new Date();
    setDate(fmt(now));
    if (selectedTeam) {
      setDateMode("date");
      setTimeout(() => refreshRoster(), 0);
    }
  }

  // Persist filters for iframe carousel to use
  useEffect(() => {
    try { localStorage.setItem('yahoo_filter_type', typeFilter); } catch {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: 'yahoo_filter_type', newValue: typeFilter })); } catch {}
  }, [typeFilter]);
  useEffect(() => {
    try { localStorage.setItem('yahoo_filter_showExtras', String(showExtras)); } catch {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: 'yahoo_filter_showExtras', newValue: String(showExtras) })); } catch {}
  }, [showExtras]);
  useEffect(() => {
    try { localStorage.setItem('yahoo_date_mode', dateMode); } catch {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: 'yahoo_date_mode', newValue: dateMode })); } catch {}
  }, [dateMode]);
  useEffect(() => {
    try { localStorage.setItem('yahoo_date', date); } catch {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: 'yahoo_date', newValue: date })); } catch {}
  }, [date]);
  useEffect(() => {
    try { localStorage.setItem('yahoo_sort', sortKey); } catch {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: 'yahoo_sort', newValue: sortKey })); } catch {}
  }, [sortKey]);
  useEffect(() => {
    try { localStorage.setItem('yahoo_sort_dir', sortDir); } catch {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: 'yahoo_sort_dir', newValue: sortDir })); } catch {}
  }, [sortDir]);

  async function chooseTeam(teamKey) {
    setSelectedTeam(teamKey);
    try { localStorage.setItem('yahoo_selected_team', teamKey); } catch {}
    setLoading(true);
    try {
      const query = dateMode === "date" && date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await fetch(`${SPORTS_API}/team/${encodeURIComponent(teamKey)}/roster${query}`, { headers: authHeader });
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
      const query = dateMode === "date" && date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await fetch(`${SPORTS_API}/team/${encodeURIComponent(selectedTeam)}/roster${query}`, { headers: authHeader });
      const data = await res.json();
      setRoster(data.roster || []);
    } finally {
      setLoading(false);
    }
  }

  const filteredRoster = useMemo(() => {
    return (roster || []).filter((p) => {
      const selPos = (p.selectedPosition || '').toUpperCase();
      const isBench = selPos === 'BN';
      const isIL = selPos === 'IL' || selPos === 'DL' || (Array.isArray(p.eligiblePositions) && p.eligiblePositions.includes('IL'));
      if (!showExtras && (isBench || isIL)) return false;
      const type = (p.positionType || '').toUpperCase();
      if (typeFilter === 'batters' && type === 'P') return false;
      if (typeFilter === 'pitchers' && type === 'B') return false;
      return true;
    });
  }, [roster, showExtras, typeFilter]);

  function Stat({ label, val }) {
    return (
      <div className="flex flex-col items-center">
        <div className="opacity-60 text-[10px]">{label}</div>
        <div className="font-semibold">{val}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Access token */}
        {step === 'signin' && (
          <div className="flex items-center gap-2 w-full">
            <button className="btn btn-primary btn-sm" onClick={signInWithYahoo}>Sign in with Yahoo</button>
          </div>
        )}
        {accessToken && (
          <div className="flex items-center gap-2">
            <span className="badge badge-success badge-sm">Signed in</span>
            <button className="btn btn-ghost btn-xs" onClick={() => { try { localStorage.removeItem('yahoo_access_token'); } catch {}; setAccessToken(''); setLeagues([]); setTeams([]); setRoster([]); setStep('signin'); }}>Sign out</button>
          </div>
        )}

        {step !== 'signin' && (
          <>
            {/* Enable Toggle */}
            <label className="label cursor-pointer gap-2 mr-2">
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={enabledLocal}
                onChange={(e) => {
                  const val = e.target.checked;
                  setEnabledLocal(val);
                  try {
                    localStorage.setItem('yahoo_enabled', String(val));
                    window.dispatchEvent(new StorageEvent('storage', { key: 'yahoo_enabled', newValue: String(val) }));
                  } catch {}
                  dispatch(setFantasyEnabled(val));
                }}
              />
              <span className="label-text">Enable Yahoo Fantasy</span>
            </label>
            <div className="border border-base-300 rounded-md join">
              <button className={`join-item btn btn-xs ${dateMode==='today' ? 'btn-active' : ''}`} onClick={() => setDateMode('today')}>Today</button>
              <button className={`join-item btn btn-xs ${dateMode==='date' ? 'btn-active' : ''}`} onClick={() => { setDateMode('date'); if (!date) setToday(); }}>Date</button>
            </div>
            {dateMode === 'date' && (
              <div className="join">
                <button className="join-item btn btn-xs" aria-label="Next day" onClick={() => shiftDate(1)}>↑</button>
                <input type="date" className="input-bordered join-item input input-xs" value={date} onChange={(e) => { setDate(e.target.value); if (selectedTeam) setTimeout(() => refreshRoster(), 0); }} />
                <button className="join-item btn btn-xs" aria-label="Previous day" onClick={() => shiftDate(-1)}>↓</button>
                <button className="join-item btn btn-xs" onClick={setToday}>Today</button>
              </div>
            )}

            <div className="border border-base-300 rounded-md join">
              <button className={`join-item btn btn-xs ${typeFilter==='all' ? 'btn-active' : ''}`} onClick={() => setTypeFilter('all')}>All</button>
              <button className={`join-item btn btn-xs ${typeFilter==='batters' ? 'btn-active' : ''}`} onClick={() => setTypeFilter('batters')}>Batters</button>
              <button className={`join-item btn btn-xs ${typeFilter==='pitchers' ? 'btn-active' : ''}`} onClick={() => setTypeFilter('pitchers')}>Pitchers</button>
            </div>
            <label className="gap-2 cursor-pointer label">
              <input type="checkbox" className="checkbox checkbox-xs" checked={showExtras} onChange={(e) => setShowExtras(e.target.checked)} />
              <span className="label-text">Show Bench & IL</span>
            </label>

            {/* Sorting Controls */}
            <div className="border border-base-300 rounded-md join">
              <select className="join-item select select-xs" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
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
              <select className="join-item select select-xs" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
            {/* Auto updates; no Apply button needed */}
          </>
        )}
      </div>

      {/* Flow content */}
      {step === 'league' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-70">Select a League</div>
            <button className="btn btn-ghost btn-xs" onClick={fetchLeagues} disabled={loading}>Refresh</button>
          </div>
          {loading ? (
            <div className="text-sm opacity-70">Loading leagues…</div>
          ) : leagues.length ? (
            <div className="form-control w-full">
              <select
                className="select select-sm select-bordered w-full"
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
            <div className="text-sm opacity-70">No leagues found.</div>
          )}
        </div>
      )}

      {step === 'team' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <button className="link" onClick={() => setStep('league')}>Change league</button>
            <span className="opacity-60">{selectedLeague}</span>
          </div>
          <div className="form-control w-full">
            <select
              className="select select-sm select-bordered w-full"
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
      <div className="space-y-6 bg-base-100 p-2 border-base-300 max-h-120 overflow-hidden tab-content">
        <div className="flex flex-col gap-4 p-2 h-110 overflow-y-auto">
          {/* Sports Section */}
          <SportsSection />

          {/* Finance Section */}
          <FinanceSection />

          {/* RSS Section */}
          <RssSection />

          <fieldset className="group space-y-2 bg-base-100 p-4 border border-base-300 rounded-box w-full fieldset">
            <legend className="py-0 text-lg text-center fieldset-legend">
              <div className="flex-row justify-center items-center gap-1 group-hover:bg-base-200 px-4 py-1 card-border border-base-300 transition-all duration-150 card">
                <InformationCircleIcon className="size-5 text-base-content/50" />
                Fantasy Baseball
              </div>
            </legend>
            <FantasyBaseballPanel />
          </fieldset>
        </div>
      </div>
    </>
  );
}
