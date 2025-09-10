import { ComputerDesktopIcon, InformationCircleIcon } from "@heroicons/react/24/solid";
import { FinanceSection } from "../../components/FinanceSection.jsx";
import { SportsSection } from "../../components/SportsSection.jsx";
import { RssSection } from "../../components/RssSection.jsx";
import { useAuth } from "../../components/hooks/useAuth.tsx";
import React, { useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "@/entrypoints/config/endpoints.js";

function FantasyBaseballPanel() {
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

  // Load saved token on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('yahoo_access_token');
      if (saved) {
        setAccessToken(saved);
        setStep('league');
        // Preload leagues quietly
        setTimeout(() => fetchLeagues(), 0);
      }
    } catch {}
  }, []);

  // When token changes, persist it
  useEffect(() => {
    if (accessToken) {
      try { localStorage.setItem('yahoo_access_token', accessToken); } catch {}
      setStep('league');
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
            <button className="ml-auto btn btn-primary btn-xs" onClick={refreshRoster} disabled={!selectedTeam || (dateMode==='date' && !date)}>Apply</button>
          </>
        )}
      </div>

      {/* Flow content */}
      {step === 'league' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="opacity-70 text-sm">Select a League</div>
            <button className="btn btn-ghost btn-xs" onClick={fetchLeagues} disabled={loading}>Refresh</button>
          </div>
          {loading ? (
            <div className="opacity-70 text-sm">Loading leagues…</div>
          ) : leagues.length ? (
            <div className="gap-2 grid grid-cols-2">
              {leagues.map((l) => (
                <button key={l.league_key} className="btn btn-sm" onClick={() => chooseLeague(l.league_key)}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm">{l.name}</span>
                    <span className="opacity-60 text-xs">{l.season ?? ''}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="opacity-70 text-sm">No leagues found.</div>
          )}
        </div>
      )}

      {step === 'team' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <button className="link" onClick={() => setStep('league')}>Change league</button>
            <span className="opacity-60">{selectedLeague}</span>
          </div>
          <div className="gap-2 grid grid-cols-2">
            {teams.map((t) => (
              <button key={t.team_key} className="btn btn-sm" onClick={() => chooseTeam(t.team_key)}>
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">{t.name}</span>
                  <span className="opacity-60 text-xs">{t.team_key}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!!roster.length && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="font-semibold">Roster</div>
            <div className="opacity-60 text-xs">{selectedTeam}</div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {filteredRoster.map((p) => {
              const isPitcher = (p.positionType || '').toUpperCase() === 'P';
              return (
                <div key={p.key} className="card card-compact border border-base-300">
                  <div className="card-body py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-outline">{p.selectedPosition || p.position || '-'}</span>
                        <div>
                          <div className="font-medium leading-tight">{p.name}</div>
                          <div className="opacity-60 text-[10px]">{p.teamAbbr || p.teamFullName || ''}</div>
                        </div>
                      </div>
                      {typeof p.totalPoints === 'number' && (
                        <div className="text-right">
                          <div className="opacity-60 text-xs">Pts</div>
                          <div className="font-semibold">{p.totalPoints.toFixed(1)}</div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                      {!isPitcher ? (
                        <>
                          <Stat label="R" val={p.runs ?? 0} />
                          <Stat label="H" val={p.hits ?? 0} />
                          <Stat label="RBI" val={p.rbis ?? 0} />
                          <Stat label="HR" val={p.homeRuns ?? 0} />
                          <Stat label="SB" val={p.sb ?? 0} />
                          <Stat label="AVG" val={typeof p.avg === 'number' ? p.avg.toFixed(3) : '0.000'} />
                          <Stat label="OPS" val={typeof p.ops === 'number' ? p.ops.toFixed(3) : '-'} />
                        </>
                      ) : (
                        <>
                          <Stat label="IP" val={p.ip ?? 0} />
                          <Stat label="W" val={p.wins ?? 0} />
                          <Stat label="L" val={p.losses ?? 0} />
                          <Stat label="SV" val={p.saves ?? 0} />
                          <Stat label="K" val={p.strikeouts ?? 0} />
                          <Stat label="ERA" val={typeof p.era === 'number' ? p.era.toFixed(2) : '-'} />
                          <Stat label="WHIP" val={typeof p.whip === 'number' ? p.whip.toFixed(2) : '-'} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
