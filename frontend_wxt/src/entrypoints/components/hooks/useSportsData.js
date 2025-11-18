import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { createWebSocketConnection } from "./connectionUtils";
import debugLogger, {
  DEBUG_CATEGORIES,
} from "@/entrypoints/utils/debugLogger.js";
import { getSupabaseClient } from "@/entrypoints/config/endpoints";

// Custom hook to handle sports data and WebSocket connection
export default function useSportsData() {
  const supabase = getSupabaseClient();
  
  const toggles = useSelector((state) => state.toggles);
  const [connectionStatus, setConnectionStatus] = useState("Initializing");
  const [isInitialized, setIsInitialized] = useState(false);

  const [sportsData, setSportsData] = useState({
      data: [],
      count: 0,
      type: "initial",
    });
  const sportsDataRef = useRef([]);

  const sportsToggles = useMemo(() => {
    if (!toggles) return {};
    const sportKeys = ["NFL", "NBA", "MLB", "NHL"];
    const filtered = {};
    sportKeys.forEach((key) => {
      if (toggles.hasOwnProperty(key) && toggles[key] === true) {
        filtered[key] = true;
      }
    });
    return filtered;
  }, [toggles]);

  const activeSports = useMemo(() => {
    return Object.keys(sportsToggles);
  }, [sportsToggles]);

  useEffect(() => {
    sportsDataRef.current = sportsData.data;
  }, [sportsData.data]);

  const hasActiveSportsToggles = useMemo(() => {
    return activeSports.length > 0;
  }, [activeSports]);

  const handleRealtimeUpdates = useCallback((newGame) => {
    const currentGames = sportsDataRef.current;

    let updatedGames;
    let found = false;
    const newID = newGame.id;

    updatedGames = currentGames.map(game => {
      if (game.id === newID) {
        found = true;
        return {
          ...game,
          ...newGame
        };
      }
      return game;
    });

    if (!found) {
      if (activeSports.includes(newGame.league)) {
        updatedGames = [newGame, ...currentGames];
      } else {
        updatedGames = currentGames;
      }
    }

    if (updatedGames !== currentGames) {
      setSportsData(prevData => ({
        ...prevData,
        data: updatedGames,
        count: updatedGames.length,
        type: 'realtime_update',
      }));
    }
  }, [activeSports]);

  useEffect(() => {
    let isMounted = true;
    const currentActiveSports = activeSports;

    if (currentActiveSports.length === 0) {
      setSportsData({
        data: [],
        type: "filtered_data",
        count: 0,
        isLoading: false,
      });
      setConnectionStatus("No Sports Selected");
      setIsInitialized(true);
      return;
    }

    async function fetchInitialGames() {
      setConnectionStatus(`Refetching ${currentActiveSports.length} leagues...`);
      try {
        const { data, error } = await supabase
          .from('games') 
          .select()
          .in("league", currentActiveSports);

        if (error) {
          debugLogger.error(DEBUG_CATEGORIES.finance, "Supabase fetch error", error);
          if (isMounted) setConnectionStatus("Data Fetch Error");
          return;
        }

        if (isMounted && data) {
          setSportsData({
            data: data,
            type: "filtered_data",
            count: data.length,
            isLoading: false,
          });
          setIsInitialized(true);
          setConnectionStatus("Initial Data Loaded");
        }
      } catch (e) {
        debugLogger.error(DEBUG_CATEGORIES.finance, "Initial data fetch failed", e);
        if (isMounted) setConnectionStatus("Data Fetch Error");
      }
    }

    fetchInitialGames();

    return () => {
      isMounted = false;
    };
  }, [activeSports]);

  useEffect(() => {
    if (!isInitialized || activeSports.length === 0) {
      return;
    }

    setConnectionStatus(`Subscribing to ${activeSports.length} sports channels...`);
    
    const channels = [];

    activeSports.forEach(sportKey => {
        const channelName = `sports:${sportKey.toLowerCase()}`;
        const channel = supabase.channel(channelName, {
            config: {
                broadcast: { self: true, ack: false },
                private: false
            },
        });

        channel
            .on('broadcast', { event: '*' }, (payload) => {
                const newGame = payload.payload;
                
                if (activeSports.includes(newGame.league)) {
                    handleRealtimeUpdates(newGame);
                }
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    if (sportKey === activeSports[activeSports.length - 1]) {
                        setConnectionStatus(`Realtime Connected (${activeSports.length})`);
                    }
                }
                if (status === 'CHANNEL_ERROR') {
                    debugLogger.error(DEBUG_CATEGORIES.WEBSOCKET, `Supabase Channel Error: ${sportKey}`, err);
                    setConnectionStatus('Realtime Error');
                }
            });
            
        channels.push(channel);
    });
    
    return () => {
      setConnectionStatus('Realtime Disconnected');
      channels.forEach(ch => supabase.removeChannel(ch));
    };
    
  }, [isInitialized, handleRealtimeUpdates, activeSports]);

  return {
    sportsData: sportsData.data,
    connectionStatus,
    hasActiveSportsToggles,
  };
}