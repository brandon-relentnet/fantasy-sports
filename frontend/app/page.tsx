'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

type League = { league_key: string; name: string; season?: string };
type TeamSummary = { team_key: string; name: string };

export default function Home() {
  const { data: session, status } = useSession();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [hideBench, setHideBench] = useState(false);
  const [hideBatters, setHideBatters] = useState(false);
  const [hidePitchers, setHidePitchers] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [dateMode, setDateMode] = useState<'today' | 'date'>('today');
  const [date, setDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'signin' | 'league' | 'team'>('signin');

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

  const authHeader = async () => {
    const token = (session as any)?.accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (session?.accessToken) {
      setStep('league');
      fetchLeagues();
    } else {
      setStep('signin');
    }
  }, [session]);

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/leagues`, { headers: await authHeader() });
      const data = await res.json();
      const arr: League[] = Array.isArray(data.leagues)
        ? data.leagues
        : data.leagues?.league
          ? (Array.isArray(data.leagues.league) ? data.leagues.league : [data.leagues.league])
          : (Array.isArray(Object.values(data.leagues || {})) ? Object.values(data.leagues || {}) as any : []);
      setLeagues(arr);
    } catch (e) {
      setLeagues([]);
    } finally {
      setLoading(false);
    }
  };

  const onChooseLeague = async (leagueKey: string) => {
    setSelectedLeague(leagueKey);
    setSelectedTeam('');
    setRoster([]);
    setLoading(true);
    try {
      const leagueRes = await fetch(`${API_BASE}/league/${encodeURIComponent(leagueKey)}/standings`, { headers: await authHeader() });
      const leagueData = await leagueRes.json();
      const t = (leagueData.standings || []).map((x: any) => ({ team_key: x.team_key, name: x.name }));
      setTeams(t);
      setStep('team');
    } catch (e) {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const shiftDate = (deltaDays: number) => {
    const baseStr = date && !Number.isNaN(Date.parse(date)) ? date : fmt(new Date());
    const [y, m, d] = baseStr.split('-').map((x) => parseInt(x, 10));
    const base = new Date(Date.UTC(y, (m - 1), d));
    base.setUTCDate(base.getUTCDate() + deltaDays);
    const next = fmt(new Date(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
    setDate(next);
    if (selectedTeam) {
      setDateMode('date');
      setTimeout(() => { refreshRoster(); }, 0);
    }
  };

  const setToday = () => {
    const now = new Date();
    setDate(fmt(now));
    if (selectedTeam) {
      setDateMode('date');
      setTimeout(() => { refreshRoster(); }, 0);
    }
  };

  const onChooseTeam = async (teamKey: string) => {
    setSelectedTeam(teamKey);
    setLoading(true);
    try {
      const query = dateMode === 'date' && date ? `?date=${encodeURIComponent(date)}` : '';
      const rosterRes = await fetch(`${API_BASE}/team/${encodeURIComponent(teamKey)}/roster${query}`, { headers: await authHeader() });
      const rosterData = await rosterRes.json();
      setRoster(rosterData.roster || []);
    } finally {
      setLoading(false);
    }
  };

  const refreshRoster = async () => {
    if (!selectedTeam) return;
    setLoading(true);
    try {
      const query = dateMode === 'date' && date ? `?date=${encodeURIComponent(date)}` : '';
      const res = await fetch(`${API_BASE}/team/${encodeURIComponent(selectedTeam)}/roster${query}`, { headers: await authHeader() });
      const data = await res.json();
      setRoster(data.roster || []);
    } finally {
      setLoading(false);
    }
  };

  const PopupHeader = () => (
    <div className="border-b border-zinc-700 pb-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Yahoo Fantasy Baseball</h1>
        {session && (
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <span className="hidden md:inline">{session.user?.name}</span>
            <button onClick={() => signOut()} className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700">Sign out</button>
          </div>
        )}
      </div>

      {step !== 'signin' && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md bg-zinc-800 border border-zinc-700 p-1">
            <button
              className={`px-3 py-1.5 rounded-md text-sm ${dateMode==='today' ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:text-white'}`}
              onClick={() => setDateMode('today')}
              type="button"
            >
              Today
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm ${dateMode==='date' ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:text-white'}`}
              onClick={() => { setDateMode('date'); if (!date) setToday(); }}
              type="button"
            >
              Specific date
            </button>
          </div>

          {dateMode === 'date' && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <button type="button" aria-label="Next day" onClick={() => shiftDate(1)} className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700" title="Next day">↑</button>
                <button type="button" aria-label="Previous day" onClick={() => shiftDate(-1)} className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700" title="Previous day">↓</button>
              </div>
              <input type="date" className="px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100" value={date} onChange={(e) => { setDate(e.target.value); if (selectedTeam) setTimeout(() => { refreshRoster(); }, 0); }} />
              <button type="button" onClick={setToday} className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700">Today</button>
            </div>
          )}

          <button onClick={refreshRoster} className="ml-auto px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50" disabled={!selectedTeam || (dateMode==='date' && !date)}>Apply</button>
        </div>
      )}
    </div>
  );

  if (status === 'loading') {
    return <div className="w-full h-full flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="w-full h-full">
      <div className="h-full flex flex-col">
        <PopupHeader />
        <div className="flex-1 overflow-auto p-4">
          {step === 'signin' && (
            <div className="h-full grid place-items-center">
              <div className="text-center space-y-4">
                <p className="text-zinc-300">Sign in with Yahoo to view your leagues and teams.</p>
                <button onClick={() => signIn('yahoo')} className="px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-500 text-white">Sign in with Yahoo</button>
              </div>
            </div>
          )}

          {step === 'league' && (
            <div>
              <h2 className="text-base font-medium mb-3">Select a League</h2>
              {loading ? (
                <div className="text-sm text-zinc-300">Loading leagues…</div>
              ) : leagues.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {leagues.map((l) => (
                    <button key={l.league_key} onClick={() => onChooseLeague(l.league_key)} className="text-left p-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-zinc-400">{l.season ?? ''}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-zinc-300">No leagues found.</div>
              )}
            </div>
          )}

          {step === 'team' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <button className="underline" onClick={() => setStep('league')}>Change league</button>
                <span>•</span>
                <span className="text-zinc-400">{selectedLeague}</span>
              </div>
              <div className="grid gap-4">
                <div>
                  <h2 className="text-base font-medium mb-3">Select a Team</h2>
                  {loading ? (
                    <div className="text-sm text-zinc-300">Loading teams…</div>
                  ) : teams.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {teams.map((t) => (
                        <button key={t.team_key} onClick={() => onChooseTeam(t.team_key)} className="text-left p-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700">
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-zinc-400">{t.team_key}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-300">No teams found.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!!roster.length && (
        <div className="mt-6">
          <div className="max-w-5xl mx-auto bg-zinc-900/80 border border-zinc-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Roster</h3>
              <span className="text-xs text-zinc-400">{selectedTeam}</span>
            </div>
            {/* Filters */}
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <input id="hideBench" type="checkbox" className="accent-violet-600" checked={hideBench} onChange={(e) => setHideBench(e.target.checked)} />
                <label htmlFor="hideBench" className="text-zinc-300 select-none">Hide bench</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="hideBatters" type="checkbox" className="accent-violet-600" checked={hideBatters} onChange={(e) => setHideBatters(e.target.checked)} />
                <label htmlFor="hideBatters" className="text-zinc-300 select-none">Hide batters</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="hidePitchers" type="checkbox" className="accent-violet-600" checked={hidePitchers} onChange={(e) => setHidePitchers(e.target.checked)} />
                <label htmlFor="hidePitchers" className="text-zinc-300 select-none">Hide pitchers</label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-zinc-300">
                  <tr className="border-b border-zinc-700">
                    <th className="px-2 py-2 text-left">Pos</th>
                    <th className="px-2 py-2 text-left">Player</th>
                    <th className="px-2 py-2 text-center">R</th>
                    <th className="px-2 py-2 text-center">H</th>
                    <th className="px-2 py-2 text-center">RBI</th>
                    <th className="px-2 py-2 text-center">HR</th>
                    <th className="px-2 py-2 text-center">SB</th>
                    <th className="px-2 py-2 text-center">AVG</th>
                    <th className="px-2 py-2 text-center">OPS</th>
                    <th className="px-2 py-2 text-center">IP</th>
                    <th className="px-2 py-2 text-center">W</th>
                    <th className="px-2 py-2 text-center">L</th>
                    <th className="px-2 py-2 text-center">SV</th>
                    <th className="px-2 py-2 text-center">K</th>
                    <th className="px-2 py-2 text-center">ERA</th>
                    <th className="px-2 py-2 text-center">WHIP</th>
                  </tr>
                </thead>
                <tbody>
                  {(roster.filter((p: any) => {
                    const isBench = (p.selectedPosition || '').toUpperCase() === 'BN';
                    if (hideBench && isBench) return false;
                    const type = (p.positionType || '').toUpperCase();
                    if (hideBatters && type === 'B') return false;
                    if (hidePitchers && type === 'P') return false;
                    return true;
                  })).map((p: any) => (
                    <tr key={p.key} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                      <td className="px-2 py-2 text-zinc-300">{p.selectedPosition || p.position || '-'}</td>
                      <td className="px-2 py-2">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-zinc-400">{p.teamAbbr || p.teamFullName || ''}</div>
                      </td>
                      <td className="px-2 py-2 text-center">{p.runs ?? 0}</td>
                      <td className="px-2 py-2 text-center">{p.hits ?? 0}</td>
                      <td className="px-2 py-2 text-center">{p.rbis ?? 0}</td>
                      <td className="px-2 py-2 text-center">{p.homeRuns ?? 0}</td>
                      <td className="px-2 py-2 text-center">{p.sb ?? 0}</td>
                      <td className="px-2 py-2 text-center">{typeof p.avg === 'number' ? p.avg.toFixed(3) : '0.000'}</td>
                      <td className="px-2 py-2 text-center">{typeof p.ops === 'number' ? p.ops.toFixed(3) : '-'}</td>
                      <td className="px-2 py-2 text-center">{p.ip ?? 0}</td>
                      <td className="px-2 py-2 text-center">{p.wins ?? 0}</td>
                      <td className="px-2 py-2 text-center">{p.losses ?? 0}</td>
                      <td className="px-2 py-2 text-center">{p.saves ?? 0}</td>
                      <td className="px-2 py-2 text-center">{p.strikeouts ?? 0}</td>
                      <td className="px-2 py-2 text-center">{typeof p.era === 'number' ? p.era.toFixed(2) : '-'}</td>
                      <td className="px-2 py-2 text-center">{typeof p.whip === 'number' ? p.whip.toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
