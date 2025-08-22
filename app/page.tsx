'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.accessToken) {
      fetchLeagues();
    }
  }, [session]);

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leagues');
      const data = await response.json();
      console.log('Frontend - Received data:', data);
      
      // Handle different data formats Yahoo might return
      let leaguesArray = [];
      if (Array.isArray(data.leagues)) {
        leaguesArray = data.leagues;
      } else if (data.leagues && typeof data.leagues === 'object') {
        // If it's an object, try to extract leagues from common Yahoo API structures
        if (data.leagues.league) {
          leaguesArray = Array.isArray(data.leagues.league) ? data.leagues.league : [data.leagues.league];
        } else {
          leaguesArray = Object.values(data.leagues);
        }
      }
      
      console.log('Frontend - Processed leagues:', leaguesArray);
      setLeagues(leaguesArray);
    } catch (error) {
      console.error('Error fetching leagues:', error);
      setLeagues([]);
    }
    setLoading(false);
  };

  if (status === 'loading') {
    return (
      <div className="loading">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Yahoo Fantasy Baseball</h1>
          <p>Sign in with your Yahoo account to view your fantasy baseball leagues and teams.</p>
          <button 
            onClick={() => signIn('yahoo')}
            className="btn btn-primary btn-large"
            style={{ width: '100%' }}
          >
            Sign in with Yahoo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <div className="navbar-content">
            <h1>Yahoo Fantasy Baseball</h1>
            <div className="navbar-user">
              <span>Welcome, {session.user?.name}</span>
              <button 
                onClick={() => signOut()}
                className="btn btn-secondary"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container">
        <h2 style={{ marginBottom: '1.5rem' }}>Your Baseball Leagues</h2>
        
        {loading ? (
          <div className="loading">Loading leagues...</div>
        ) : leagues.length > 0 ? (
          <div className="grid grid-cols-3">
            {leagues.map((league) => (
              <div key={league.league_key} className="league-card">
                <h3>{league.name}</h3>
                <p>{league.season} Season</p>
                <a href={`/league/${league.league_key}`}>
                  View League →
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No baseball leagues found.</p>
            <p>Make sure you have active Yahoo Fantasy Baseball leagues.</p>
          </div>
        )}
      </main>
    </div>
  );
}