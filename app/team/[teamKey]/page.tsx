'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TeamPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [team, setTeam] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [currentMatchup, setCurrentMatchup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'today' | 'date'>('today');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    if (session?.accessToken && params.teamKey) {
      fetchTeamData();
    }
  }, [session, params.teamKey]);

  const fetchTeamData = async () => {
    try {
      const rosterUrl = viewMode === 'date' && date
        ? `/api/team/${params.teamKey}/roster?date=${encodeURIComponent(date)}`
        : `/api/team/${params.teamKey}/roster`;
      const [teamRes, rosterRes, matchupsRes, currentMatchupRes] = await Promise.all([
        fetch(`/api/team/${params.teamKey}`),
        fetch(rosterUrl),
        fetch(`/api/team/${params.teamKey}/matchups`),
        fetch(`/api/team/${params.teamKey}/current-matchup`),
      ]);
      
      const teamData = await teamRes.json();
      const rosterData = await rosterRes.json();
      const matchupsData = await matchupsRes.json();
      const currentMatchupData = await currentMatchupRes.json();
      
      setTeam(teamData.team);
      setRoster(rosterData.roster || []);
      setMatchups(matchupsData.matchups || []);
      setCurrentMatchup(currentMatchupData.currentMatchup);
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
    setLoading(false);
  };

  const getResultClass = (result: string) => {
    if (result === 'W') return 'result-win';
    if (result === 'L') return 'result-loss';
    return 'result-tie';
  };


  if (loading) {
    return (
      <div className="loading">
        Loading team data...
      </div>
    );
  }

  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <button 
            onClick={() => router.back()}
            className="back-button"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Back
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label>Stats:</label>
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)}>
              <option value="today">Today</option>
              <option value="date">Date...</option>
            </select>
            {viewMode === 'date' && (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
            <button onClick={fetchTeamData}>Apply</button>
          </div>
        </div>
      </nav>

      <main className="container">
        <div className="page-header">
          <h1>{team?.name}</h1>
          <div className="page-header-info">
            <span>Manager: {team?.managers?.[0]?.nickname}</span>
            <span>Moves: {team?.number_of_moves}</span>
            <span>Trades: {team?.number_of_trades}</span>
          </div>
        </div>

        <div className="grid grid-cols-4" style={{ alignItems: 'start' }}>
          <div style={{ gridColumn: 'span 3' }}>
            <div className="card">
              <div className="card-header">
                <h2>
                  Roster{viewMode === 'date' && date ? ` — ${date}` : viewMode === 'today' ? " — Today" : ''}
                </h2>
              </div>
              <div className="card-body">
                <div className="roster-grid">
                  {roster.map((player: any) => (
                    <div key={player.key} className="player-card">
                      <div className="player-card-header">
                        <div className="position-badge">{player.selectedPosition}</div>
                        {player.is_undroppable && (
                          <span className="lock-badge">🔒</span>
                        )}
                      </div>
                      
                      <div className="player-card-content">
                        <div className="player-image-section">
                          {player.headshot ? (
                            <img 
                              src={player.headshot} 
                              alt={player.name}
                              className="player-image"
                            />
                          ) : (
                            <div className="player-image-placeholder">
                              {player.name?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        
                        <div className="player-info">
                          <div className="player-name">{player.name}</div>
                          <div className="player-team">
                            {player.teamAbbr} - {player.position}
                            {player.uniformNumber && ` #${player.uniformNumber}`}
                          </div>
                        </div>
                        
                        <div className="player-stats">
                          {player.positionType === 'B' ? (
                            <div className="stats-grid">
                              <div className="stat-item">
                                <span className="stat-label">H-AB</span>
                                <span className="stat-value">{player.hits || 0}-{player.allStats?.AB?.value || 0}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">R</span>
                                <span className="stat-value">{player.runs || 0}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">RBI</span>
                                <span className="stat-value">{player.rbis || 0}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">HR</span>
                                <span className="stat-value">{player.homeRuns || 0}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">SB</span>
                                <span className="stat-value">{player.sb || 0}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">OPS</span>
                                <span className="stat-value">
                                  {typeof player.ops === 'number' ? player.ops.toFixed(3) : (typeof player.avg === 'number' ? player.avg.toFixed(3) : '.000')}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="stats-grid">
                              <div className="stat-item">
                                <span className="stat-label">IP</span>
                                <span className="stat-value">
                                  {typeof player.ip === 'number' ? player.ip.toFixed(1) : '0.0'}
                                </span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">W-L</span>
                                <span className="stat-value">{player.wins || 0}-{player.losses || 0}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">ERA</span>
                                <span className="stat-value">
                                  {typeof player.era === 'number' ? player.era.toFixed(2) : '0.00'}
                                </span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">K</span>
                                <span className="stat-value">{player.strikeouts || 0}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">SV</span>
                                <span className="stat-value">{player.saves || 0}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">WHIP</span>
                                <span className="stat-value">
                                  {typeof player.whip === 'number' ? player.whip.toFixed(2) : '0.00'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {player.totalPoints !== undefined && player.totalPoints !== null && (
                          <div className="player-points">
                            <strong>{player.totalPoints.toFixed(1)}</strong> pts
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            {currentMatchup && (
              <div className="card">
                <div className="card-header">
                  <h2>🏆 Week {currentMatchup.week} Matchup</h2>
                </div>
                <div className="card-body">
                  <div className="current-matchup">
                    {currentMatchup.teams?.map((team: any, index: number) => {
                      const isCurrentTeam = team.team_key === params.teamKey;
                      const isWinning = parseInt(team.team_points || '0') > parseInt(currentMatchup.teams?.find((t: any) => t.team_key !== team.team_key)?.team_points || '0');
                      return (
                        <div key={team.team_key} className={`matchup-team ${isCurrentTeam ? 'current-team' : 'opponent-team'} ${isWinning ? 'winning' : ''}`}>
                          <div className="team-header">
                            <div>
                              <strong>{team.name}</strong>
                              {isCurrentTeam && <span className="you-badge">YOU</span>}
                            </div>
                            <div className="score-display">
                              <span className="team-score">{team.team_points || '0'}</span>
                              <small>pts</small>
                            </div>
                          </div>
                          <div className="projected-points">
                            <small>Projected: {team.team_projected_points || 'N/A'}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="matchup-status">
                    📅 {currentMatchup.week_start} to {currentMatchup.week_end} | 
                    Status: <strong>{currentMatchup.status}</strong>
                    {currentMatchup.winner_team_key && currentMatchup.winner_team_key === params.teamKey && (
                      <span className="winner-badge">🎉 WINNING!</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header">
                <h2>Recent Matchups</h2>
              </div>
              <div className="card-body">
                {matchups.slice(0, 5).map((matchup, index) => {
                  const currentTeam = matchup.teams?.find((t: any) => t.team_key === params.teamKey);
                  const opponent = matchup.teams?.find((t: any) => t.team_key !== params.teamKey);
                  const result = matchup.winner_team_key === params.teamKey ? 'W' : 
                               matchup.winner_team_key === opponent?.team_key ? 'L' : 
                               matchup.is_tied ? 'T' : 'In Progress';
                  
                  return (
                    <div key={index} className="matchup-item">
                      <div className="matchup-header">
                        <div>
                          <div className="matchup-week">Week {matchup.week}</div>
                          <div className="matchup-opponent">vs {opponent?.name}</div>
                        </div>
                        <div className="matchup-result">
                          <div className={getResultClass(result)}>
                            {result}
                          </div>
                          <div className="matchup-score">
                            {currentTeam?.team_points || '0'} - {opponent?.team_points || '0'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Team Stats</h2>
              </div>
              <div className="card-body">
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Waiver Priority:</span>
                    <span className="info-value">{team?.waiver_priority}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Playoffs:</span>
                    <span className="info-value">{team?.clinched_playoffs ? 'Clinched' : 'Not Clinched'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Moves:</span>
                    <span className="info-value">{team?.number_of_moves}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Trades:</span>
                    <span className="info-value">{team?.number_of_trades}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
