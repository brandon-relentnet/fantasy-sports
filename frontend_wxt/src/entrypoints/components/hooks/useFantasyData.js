import { useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS } from '@/entrypoints/config/endpoints.js';

export default function useFantasyData() {
  const SPORTS_API = 'http://localhost:4000';
  const [roster, setRoster] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle | loading | ok | error
  const [filterType, setFilterType] = useState('all'); // all | batters | pitchers
  const [showExtras, setShowExtras] = useState(true); // bench + IL
  const [dateMode, setDateMode] = useState('today'); // today | date
  const [date, setDate] = useState(''); // YYYY-MM-DD

  const accessToken = useMemo(() => {
    try { return localStorage.getItem('yahoo_access_token') || ''; } catch { return ''; }
  }, []);
  const selectedTeam = useMemo(() => {
    try { return localStorage.getItem('yahoo_selected_team') || ''; } catch { return ''; }
  }, []);

  useEffect(() => {
    // load filters from popup
    try {
      const t = localStorage.getItem('yahoo_filter_type');
      const s = localStorage.getItem('yahoo_filter_showExtras');
      const dm = localStorage.getItem('yahoo_date_mode');
      const d = localStorage.getItem('yahoo_date');
      if (t === 'all' || t === 'batters' || t === 'pitchers') setFilterType(t);
      if (s === 'true' || s === 'false') setShowExtras(s === 'true');
      if (dm === 'today' || dm === 'date') setDateMode(dm);
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDate(d);
    } catch {}

    const onStorage = (e) => {
      if (e.key === 'yahoo_filter_type' && (e.newValue === 'all' || e.newValue === 'batters' || e.newValue === 'pitchers')) {
        setFilterType(e.newValue);
      }
      if (e.key === 'yahoo_filter_showExtras' && (e.newValue === 'true' || e.newValue === 'false')) {
        setShowExtras(e.newValue === 'true');
      }
      if (e.key === 'yahoo_date_mode' && (e.newValue === 'today' || e.newValue === 'date')) {
        setDateMode(e.newValue);
      }
      if (e.key === 'yahoo_date' && e.newValue && /^\d{4}-\d{2}-\d{2}$/.test(e.newValue)) {
        setDate(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken || !selectedTeam) return;
      setConnectionStatus('loading');
      try {
        const q = dateMode === 'date' && date ? `?date=${encodeURIComponent(date)}` : '';
        const res = await fetch(`${SPORTS_API}/team/${encodeURIComponent(selectedTeam)}/roster${q}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          const list = Array.isArray(data.roster) ? data.roster : [];
          setRoster(list);
          setConnectionStatus('ok');
        }
      } catch (e) {
        if (!cancelled) setConnectionStatus('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [SPORTS_API, accessToken, selectedTeam, dateMode, date]);

  const filteredRoster = useMemo(() => {
    const list = Array.isArray(roster) ? roster : [];
    return list.filter((p) => {
      const selPos = (p.selectedPosition || '').toUpperCase();
      const isBench = selPos === 'BN';
      const isIL = selPos === 'IL' || selPos === 'DL' || (Array.isArray(p.eligiblePositions) && p.eligiblePositions.includes('IL'));
      if (!showExtras && (isBench || isIL)) return false;
      const type = (p.positionType || '').toUpperCase();
      if (filterType === 'batters' && type === 'P') return false;
      if (filterType === 'pitchers' && type === 'B') return false;
      return true;
    });
  }, [roster, filterType, showExtras]);

  return {
    roster: filteredRoster,
    connectionStatus,
    hasFantasySelection: !!(accessToken && selectedTeam),
  };
}
