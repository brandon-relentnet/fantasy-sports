import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { STOCK_PRESETS, CRYPTO_PRESETS } from "@/entrypoints/popup/tabs/data";
import { SERVICE_CONFIG, getSupabaseClient } from "@/entrypoints/config/endpoints.js";
import debugLogger, {
  DEBUG_CATEGORIES,
} from "@/entrypoints/utils/debugLogger.js";

// OPTIMIZATION: Debounce utility
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// OPTIMIZATION: Throttle utility for WebSocket messages
function useThrottle(callback, delay) {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    },
    [callback, delay]
  );
}

// OPTIMIZATION: Static helper functions outside component
function getSymbolsForPreset(type, activePreset, customSelections) {
  if (activePreset === "custom") {
    return Object.entries(customSelections || {})
      .filter(([symbol, enabled]) => enabled)
      .map(([symbol]) => symbol);
  } else {
    const presets = type === "stocks" ? STOCK_PRESETS : CRYPTO_PRESETS;
    const preset = presets.find((p) => p.key === activePreset);
    return preset ? preset.symbols || [] : [];
  }
}

function symbolToFilter(symbol) {
  return `symbol_${symbol}`;
}

// FIX: Immediate filter calculation without debouncing for initial load
function calculateFinanceFilters(financeState) {
  const filters = [];

  if (financeState) {
    // Handle stocks
    if (financeState.stocks?.enabled && financeState.stocks?.activePreset) {
      const stockSymbols = getSymbolsForPreset(
        "stocks",
        financeState.stocks.activePreset,
        financeState.stocks.customSelections
      );
      stockSymbols.forEach((symbol) => {
        filters.push(symbolToFilter(symbol));
      });
    }

    // Handle crypto
    if (financeState.crypto?.enabled && financeState.crypto?.activePreset) {
      const cryptoSymbols = getSymbolsForPreset(
        "crypto",
        financeState.crypto.activePreset,
        financeState.crypto.customSelections
      );
      cryptoSymbols.forEach((symbol) => {
        filters.push(symbolToFilter(symbol));
      });
    }
  }

  return filters.sort(); // Sort for consistent comparison
}

// FIX: Stable filter hook with immediate calculation
function useStableFinanceFilters(financeState) {
  const [stableFilters, setStableFilters] = useState([]);

  // Calculate filters immediately when state changes
  const currentFilters = useMemo(
    () => calculateFinanceFilters(financeState),
    [
      financeState?.stocks?.enabled,
      financeState?.stocks?.activePreset,
      financeState?.crypto?.enabled,
      financeState?.crypto?.activePreset,
      JSON.stringify(financeState?.stocks?.customSelections),
      JSON.stringify(financeState?.crypto?.customSelections),
    ]
  );

  // Update stable filters immediately when current filters change
  useEffect(() => {
    // Fast array comparison - much faster than JSON.stringify
    const filtersChanged =
      currentFilters.length !== stableFilters.length ||
      currentFilters.some((filter, index) => filter !== stableFilters[index]);

    if (filtersChanged) {
      debugLogger.stateChange("Finance filters changed", {
        from: stableFilters.length,
        to: currentFilters.length,
        new: currentFilters.slice(0, 3), // First 3 for debugging
      });
      setStableFilters(currentFilters);
    }
  }, [currentFilters, stableFilters]);

  return stableFilters;
}

export default function useFinanceData() {
  const supabase = getSupabaseClient();
  const [tradesData, setTradesData] = useState({
    data: [],
    type: "initial_data",
    count: 0,
    isLoading: true,
  });
  const [connectionStatus, setConnectionStatus] = useState("Initializing");
  const [isInitialized, setIsInitialized] = useState(false); 

  const tradesDataRef = useRef([]);

  const financeState = useSelector((state) => state.finance);
  const financeFilters = useStableFinanceFilters(financeState);
  const hasFinanceFilters = useMemo(() => financeFilters.length > 0, [financeFilters.length]);

  const activeSymbols = useMemo(() => {
    return financeFilters
      .filter((f) => f.startsWith("symbol_"))
      .map((f) => f.replace("symbol_", ""));
  }, [financeFilters]);

  useEffect(() => {
    tradesDataRef.current = tradesData.data;
  }, [tradesData.data]);

  const handleRealtimeUpdates = useCallback((newTrade) => {
    const currentTrades = tradesDataRef.current;

    let updatedTrades;
    let found = false;

    const newSymbol = newTrade.symbol;

    updatedTrades = currentTrades.map(trade => {
      if (trade.symbol === newSymbol) {
        found = true;
        return {
          ...trade,
          ...newTrade
        };
      }
      return trade;
    });

    if (!found) {
      updatedTrades = [newTrade, ...currentTrades];
    }

    setTradesData(prevData => ({
      ...prevData,
      data: updatedTrades,
      count: updatedTrades.length,
      type: 'realtime_update',
    }));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const currentActiveSymbols = activeSymbols;

    if (activeSymbols.length === 0) {
      setTradesData({
        data: [],
        type: "filtered_data",
        count: 0,
        isLoading: false,
      });
      setConnectionStatus("No Symbols Selected");
      setIsInitialized(true);
      return;
    }

    async function fetchInitialTrades() {
      setTradesData((prev) => ({ ...prev, isLoading: true }));
      setConnectionStatus(`Refetching ${activeSymbols.length} trades...`);

      try {
        const { data, error } = await supabase
          .from('trades')
          .select()
          .in("symbol", currentActiveSymbols);

        if (error) {
          debugLogger.error(
            DEBUG_CATEGORIES.finance,
            "Supabase fetch error",
            error
          );
          if (isMounted) {
            setConnectionStatus("Data Fetch Error");
          }
          return;
        }

        if (isMounted && data) {
          const tdata = data.map((trade) => ({
            symbol: trade.symbol,
            price: trade.price,
          }));

          setTradesData({
            data: tdata,
            type: "filtered_data",
            count: tdata.length,
            isLoading: false,
          });
          setIsInitialized(true);
          setConnectionStatus("Initial Data Loaded");
        }
      } catch (e) {
        debugLogger.error(
          DEBUG_CATEGORIES.finance,
          "Initial data fetch failed",
          e
        );
        if (isMounted) {
          setConnectionStatus("Data Fetch Error");
          setTradesData((prev) => ({ ...prev, isLoading: false }));
        }
      }
    }

    fetchInitialTrades();

    return () => {
      isMounted = false;
    };
  }, [activeSymbols]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (activeSymbols.length === 0) {
      setConnectionStatus("No Symbols Subscribed");
      return;
    }

    setConnectionStatus(`Subscribing to broad channel for ${activeSymbols.length} symbols`);

    const stocksChannel = supabase.channel('trades:stocks', {
      config: {
        broadcast: { self: true, ack: false },
        private: false
      },
    });

    const cryptoChannel = supabase.channel('trades:crypto', {
      config: {
        broadcast: { self: true, ack: false },
        private: false
      },
    });

    stocksChannel
      .on('broadcast', { event: '*' }, (payload) => {
        const newTrade = payload.payload;

        if (activeSymbols.includes(newTrade.symbol)) {
          handleRealtimeUpdates(newTrade);
        }
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('Realtime Connected & Client-Filtered');
        }
        if (status === 'CHANNEL_ERROR') {
          debugLogger.error(DEBUG_CATEGORIES.WEBSOCKET, "Supabase Channel Error", err);
          setConnectionStatus('Realtime Error');
        }
      });

    cryptoChannel
      .on('broadcast', { event: '*' }, (payload) => {
        const newTrade = payload.payload;

        if (activeSymbols.includes(newTrade.symbol)) {
          handleRealtimeUpdates(newTrade);
        }
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('Realtime Connected & Client-Filtered');
        }
        if (status === 'CHANNEL_ERROR') {
          debugLogger.error(DEBUG_CATEGORIES.WEBSOCKET, "Supabase Channel Error", err);
          setConnectionStatus('Realtime Error');
        }
      });
    
    return () => {
      setConnectionStatus('Realtime Disconnected');
      supabase.removeChannel(stocksChannel);
      supabase.removeChannel(cryptoChannel);
    };
  }, [isInitialized, handleRealtimeUpdates, activeSymbols]);

  return {
    tradesData,
    connectionStatus,
    hasFinanceFilters,
    isInitialized,
  };
}