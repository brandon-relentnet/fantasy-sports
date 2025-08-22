'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { decodeYahooStats, getKeyStats, YAHOO_BASEBALL_STATS } from '@/lib/yahoo-stat-ids';

export default function DebugPage() {
  const { data: session } = useSession();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const endpoints = [
    {
      name: 'Basic Roster',
      url: '/api/team/458.l.40137.t.6/roster',
      description: 'Standard roster endpoint'
    },
    {
      name: 'Roster with Stats Subresource',
      url: '/api/debug/test-endpoint?endpoint=/team/458.l.40137.t.6/roster/players/stats',
      description: 'Roster with players stats subresource'
    },
    {
      name: 'Team Stats',
      url: '/api/debug/test-endpoint?endpoint=/team/458.l.40137.t.6/stats',
      description: 'Team-level statistics'
    },
    {
      name: 'Current Matchup',
      url: '/api/team/458.l.40137.t.6/current-matchup',
      description: 'Current week matchup data'
    },
    {
      name: 'Individual Player Stats',
      url: '/api/debug/test-endpoint?endpoint=/player/458.p.11531/stats',
      description: 'Individual player stats (Cal Raleigh)'
    },
    {
      name: 'Player Stats Weekly',
      url: '/api/debug/test-endpoint?endpoint=/player/458.p.11531/stats;type=week;week=20',
      description: 'Weekly player stats'
    }
  ];

  const testEndpoint = async (endpoint: any) => {
    if (!session) {
      alert('Please login first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(endpoint.url);
      const data = await response.json();
      
      setResults(prev => [...prev, {
        name: endpoint.name,
        description: endpoint.description,
        url: endpoint.url,
        success: response.ok,
        data: data,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (error) {
      setResults(prev => [...prev, {
        name: endpoint.name,
        description: endpoint.description,
        url: endpoint.url,
        success: false,
        error: error.message,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  if (!session) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <h1>Yahoo API Debug Tool</h1>
        <p>Please login first to test the API endpoints.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>🔧 Yahoo Fantasy API Debug Tool</h1>
        <button onClick={clearResults} className="btn" style={{ background: '#f44336' }}>
          Clear Results
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {endpoints.map((endpoint, index) => (
          <div key={index} className="card">
            <div className="card-header">
              <h3>{endpoint.name}</h3>
              <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.5rem 0' }}>
                {endpoint.description}
              </p>
            </div>
            <div className="card-body">
              <button 
                onClick={() => testEndpoint(endpoint)}
                disabled={loading}
                className="btn"
                style={{ 
                  background: loading ? '#ccc' : '#2196f3',
                  width: '100%'
                }}
              >
                {loading ? 'Testing...' : 'Test Endpoint'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2>📊 Test Results</h2>
        {results.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No tests run yet. Click any button above to test an endpoint.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {results.map((result, index) => (
              <div key={index} className="card">
                <div className="card-header" style={{ 
                  background: result.success ? '#e8f5e8' : '#ffebee',
                  borderBottom: `2px solid ${result.success ? '#4caf50' : '#f44336'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>
                      {result.success ? '✅' : '❌'} {result.name}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>
                      {result.timestamp}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
                    {result.description}
                  </p>
                </div>
                <div className="card-body">
                  {result.error ? (
                    <div style={{ color: '#f44336', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>
                      <strong>Error:</strong> {result.error}
                    </div>
                  ) : (
                    <div>
                      <div style={{ marginBottom: '1rem' }}>
                        <strong>Response Preview:</strong>
                        <div style={{ 
                          background: '#f5f5f5', 
                          padding: '1rem', 
                          borderRadius: '4px', 
                          marginTop: '0.5rem',
                          maxHeight: '200px',
                          overflow: 'auto'
                        }}>
                          <pre style={{ margin: 0, fontSize: '0.8rem' }}>
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                      
                      {/* Special analysis for roster data */}
                      {result.data?.roster && (
                        <div style={{ 
                          background: '#e3f2fd', 
                          padding: '1rem', 
                          borderRadius: '4px',
                          marginTop: '1rem'
                        }}>
                          <strong>📋 Roster Analysis:</strong>
                          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                            <li>Players found: {result.data.roster?.length || 0}</li>
                            {result.data.roster?.[0] && (
                              <>
                                <li>Sample player: {result.data.roster[0].name}</li>
                                <li>Has stats: {result.data.roster[0].player_stats ? 'Yes' : 'No'}</li>
                                <li>Has points: {result.data.roster[0].player_points ? 'Yes' : 'No'}</li>
                                <li>Total points: {result.data.roster[0].total_points || 'N/A'}</li>
                              </>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Player stats decoder */}
                      {result.data?.rawData?.fantasy_content?.player?.[0]?.player_stats?.[0]?.stats?.[0]?.stat && (
                        <div style={{ 
                          background: '#fff3e0', 
                          padding: '1rem', 
                          borderRadius: '4px',
                          marginTop: '1rem'
                        }}>
                          <strong>⚾ Decoded Player Stats:</strong>
                          {(() => {
                            const stats = result.data.rawData.fantasy_content.player[0].player_stats[0].stats[0].stat;
                            const decoded = decodeYahooStats(stats);
                            const keyStats = getKeyStats(decoded);
                            
                            return (
                              <div style={{ marginTop: '0.5rem' }}>
                                <div style={{ marginBottom: '1rem' }}>
                                  <strong>Key Fantasy Stats:</strong>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {Object.entries(keyStats).filter(([_, value]) => value !== undefined).map(([key, value]) => (
                                      <div key={key} style={{ background: '#f5f5f5', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                        <strong>{key.replace(/_/g, ' ').toUpperCase()}:</strong> {value}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                <details style={{ marginTop: '1rem' }}>
                                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                                    All Decoded Stats ({Object.keys(decoded).length} total)
                                  </summary>
                                  <div style={{ 
                                    maxHeight: '200px', 
                                    overflow: 'auto', 
                                    marginTop: '0.5rem',
                                    background: '#f9f9f9',
                                    padding: '0.5rem',
                                    borderRadius: '4px'
                                  }}>
                                    {Object.entries(decoded).map(([key, stat]: [string, any]) => (
                                      <div key={key} style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                                        <strong>{stat.name}:</strong> {stat.value} 
                                        <span style={{ color: '#666', marginLeft: '0.5rem' }}>
                                          (ID: {stat.raw_stat_id}, {stat.category})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}