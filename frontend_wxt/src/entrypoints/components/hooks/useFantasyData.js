import { useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS } from '@/entrypoints/config/endpoints.js';

function resolveSportsApi() {
  try {
    const base = API_ENDPOINTS?.sports?.base;
    if (base && base.includes('localhost')) return base;
  } catch {}
  if (typeof window !== 'undefined' && window.location?.hostname?.includes('localhost')) {
    return 'http://localhost:4000';
  }
  if (typeof import !== 'undefined' && import.meta?.env?.VITE_ENV === 'development') {
    return 'http://localhost:4000';
  }
  return (API_ENDPOINTS?.sports?.base) || 'http://localhost:4000';
}

export default function useFantasyData() {
  const SPORTS_API = resolveSportsApi();
  const [roster, setRoster] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle | loading | ok | error

  const accessToken = useMemo(() => {
    try { return localStorage.getItem('yahoo_access_token') || ''; } catch { return ''; }
  }, []);
  const selectedTeam = useMemo(() => {
    try { return localStorage.getItem('yahoo_selected_team') || ''; } catch { return ''; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken || !selectedTeam) return;
      setConnectionStatus('loading');
      try {
        const res = await fetch(`${SPORTS_API}/team/${encodeURIComponent(selectedTeam)}/roster`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setRoster(Array.isArray(data.roster) ? data.roster : []);
          setConnectionStatus('ok');
        }
      } catch (e) {
        if (!cancelled) setConnectionStatus('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [SPORTS_API, accessToken, selectedTeam]);

  return {
    roster,
    connectionStatus,
    hasFantasySelection: !!(accessToken && selectedTeam),
  };
}
