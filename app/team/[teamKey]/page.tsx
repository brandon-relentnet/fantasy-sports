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

  useEffect(() => {
    if (session?.accessToken && params.teamKey) {
      fetchTeamData();
    }
  }, [session, params.teamKey]);

  const fetchTeamData = async () => {
    try {
      const [teamRes, rosterRes, matchupsRes, currentMatchupRes] = await Promise.all([
        fetch(`/api/team/${params.teamKey}`),
        fetch(`/api/team/${params.teamKey}/roster`),
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

  const testEndpoints = async () => {
    try {
      console.log('Testing Yahoo API endpoints...');
      const response = await fetch(`/api/team/${params.teamKey}/test-endpoints`);
      const data = await response.json();
      console.log('Test completed:', data);
      alert('Endpoint testing completed! Check browser console and debug.log file for results.');
    } catch (error) {
      console.error('Error testing endpoints:', error);
      alert('Error testing endpoints. Check console for details.');
    }
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
        </div>
      </nav>

      <main className="container">
        <div className="page-header">
          <h1>{team?.name}</h1>
          <div className="page-header-info">
            <span>Manager: {team?.managers?.[0]?.nickname}</span>
            <span>Moves: {team?.number_of_moves}</span>
            <span>Trades: {team?.number_of_trades}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => testEndpoints()}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  background: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Test API Endpoints
              </button>
              <button 
                onClick={() => router.push('/debug')}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  background: '#9c27b0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔧 Debug Tool
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3" style={{ alignItems: 'start' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <div className="card">
              <div className="card-header">
                <h2>Roster</h2>
              </div>
              <div className="card-body">
                {['C', '1B', '2B', '3B', 'SS', 'OF', 'Util', 'SP', 'RP', 'P', 'BN', 'IL'].map(position => {
                  const players = roster.filter(p => p.selected_position === position);
                  if (players.length === 0) return null;
                  
                  return (
                    <div key={position} className="roster-section">
                      <h3 className="roster-position">{position}</h3>
                      {players.map(player => (
                        <div key={player.player_key} className="player-card">
                          <div className="player-info">
                            <div className="player-name">{player.name}</div>
                            <div className="player-team">
                              {player.editorial_team_abbr} - {player.display_position}
                            </div>
                          </div>
                          <div className="player-stats">
                            {player.total_points !== undefined && player.total_points !== null ? (
                              <div className="fantasy-points">
                                <strong>{player.total_points.toFixed(1)} pts</strong>
                                {player.week_points !== undefined && (
                                  <div className="week-points">
                                    <small>Week {player.week}: {player.week_points.toFixed(1)}</small>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="player-status">
                                <span className="position-badge">{player.display_position}</span>
                                <span className="team-badge">{player.editorial_team_abbr}</span>
                              </div>
                            )}
                            
                            {/* Show actual stats if available */}
                            {(player.home_runs || player.wins || player.batting_average) && (
                              <div className="traditional-stats">
                                {player.position_type === 'B' ? (
                                  <small>
                                    AVG: {player.batting_average?.toFixed(3) || '.000'} | 
                                    HR: {player.home_runs || 0} | 
                                    RBI: {player.rbis || 0}
                                  </small>
                                ) : (
                                  <small>
                                    W: {player.wins || 0} | 
                                    ERA: {player.era?.toFixed(2) || '0.00'} | 
                                    K: {player.strikeouts || 0}
                                  </small>
                                )}
                              </div>
                            )}
                            
                            {player.is_undroppable && (
                              <div className="undroppable-badge">
                                <small>🔒 Can't Drop</small>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
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