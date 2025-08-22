'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LeaguePage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [league, setLeague] = useState<any>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.accessToken && params.leagueKey) {
      fetchLeagueData();
    }
  }, [session, params.leagueKey]);

  const fetchLeagueData = async () => {
    try {
      const [leagueRes, standingsRes] = await Promise.all([
        fetch(`/api/league/${params.leagueKey}`),
        fetch(`/api/league/${params.leagueKey}/standings`),
      ]);
      
      const leagueData = await leagueRes.json();
      const standingsData = await standingsRes.json();
      
      setLeague(leagueData.league);
      setStandings(standingsData.standings || []);
    } catch (error) {
      console.error('Error fetching league data:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="loading">
        Loading league data...
      </div>
    );
  }

  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <a href="/" className="back-button">
            ← Back to Leagues
          </a>
        </div>
      </nav>

      <main className="container">
        <div className="page-header">
          <h1>{league?.name}</h1>
          <div className="page-header-info">
            <span>{league?.season} Season</span>
            <span>{league?.num_teams} Teams</span>
          </div>
        </div>

        <div className="grid grid-cols-2" style={{ alignItems: 'start' }}>
          <div className="card">
            <div className="card-header">
              <h2>Standings</h2>
            </div>
            <div className="card-body">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>W-L-T</th>
                    <th>PCT</th>
                    <th>GB</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team, index) => (
                    <tr key={team.team_key}>
                      <td>{index + 1}</td>
                      <td>
                        <a href={`/team/${team.team_key}`}>
                          {team.name}
                        </a>
                      </td>
                      <td>{team.wins}-{team.losses}-{team.ties}</td>
                      <td>{team.percentage}</td>
                      <td>{team.games_back || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>League Info</h2>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-row">
                  <span className="info-label">Scoring Type:</span>
                  <span className="info-value">{league?.scoring_type}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Draft Status:</span>
                  <span className="info-value">{league?.draft_status}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Current Week:</span>
                  <span className="info-value">{league?.current_week}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Start Week:</span>
                  <span className="info-value">{league?.start_week}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">End Week:</span>
                  <span className="info-value">{league?.end_week}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}