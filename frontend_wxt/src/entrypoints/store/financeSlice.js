import { createSlice } from "@reduxjs/toolkit";
import { STOCK_OPTIONS, CRYPTO_OPTIONS } from '@/entrypoints/popup/tabs/data';

const CRYPTO_SYMBOL_MIGRATIONS = {
    'COINBASE:BTC-USD': 'BINANCE:BTCUSDT',
    'COINBASE:ETH-USD': 'BINANCE:ETHUSDT',
    'COINBASE:XRP-USD': 'BINANCE:XRPUSDT',
    'COINBASE:LTC-USD': 'BINANCE:LTCUSDT',
    'COINBASE:BCH-USD': 'BINANCE:BCHUSDT',
};

const createDefaultSelections = (options) =>
    options.reduce((acc, opt) => ({ ...acc, [opt.key]: opt.enabled }), {});

const createAllTrueSelections = (options) =>
    options.reduce((acc, opt) => ({ ...acc, [opt.key]: true }), {});

const normalizeCryptoSelections = (selections = {}) => {
    const defaults = createDefaultSelections(CRYPTO_OPTIONS);
    const normalized = { ...defaults };

    for (const option of CRYPTO_OPTIONS) {
        if (selections.hasOwnProperty(option.key)) {
            normalized[option.key] = selections[option.key];
        }
    }
    for (const [oldKey, newKey] of Object.entries(CRYPTO_SYMBOL_MIGRATIONS)) {
        if (selections.hasOwnProperty(oldKey)) {
            normalized[newKey] = selections[oldKey];
        }
    }
    return normalized;
};

const normalizeFinanceState = (state) => {
    const next = { ...state };

    if (!next.stocks) next.stocks = {};
    const stockDefaults = createAllTrueSelections(STOCK_OPTIONS);
    next.stocks = {
        enabled: next.stocks.enabled ?? true,
        activePreset: next.stocks.activePreset ?? null,
        customSelections: {
            ...stockDefaults,
            ...(next.stocks.customSelections || {}),
        },
        searchTerm: next.stocks.searchTerm ?? '',
    };

    if (!next.crypto) next.crypto = {};
    next.crypto = {
        enabled: next.crypto.enabled ?? false,
        activePreset: next.crypto.activePreset && next.crypto.activePreset !== 'custom'
            ? next.crypto.activePreset
            : null,
        customSelections: normalizeCryptoSelections(next.crypto.customSelections),
        searchTerm: next.crypto.searchTerm ?? '',
    };

    return next;
};

const initialState = normalizeFinanceState({
    stocks: {
        enabled: true,
        activePreset: null,
        customSelections: createAllTrueSelections(STOCK_OPTIONS),
        searchTerm: ''
    },
    crypto: {
        enabled: false,
        activePreset: null,
        customSelections: {},
        searchTerm: ''
    }
});

const financeSlice = createSlice({
    name: "finance",
    initialState,
    reducers: {
        setFinance: (state, action) => {
            return normalizeFinanceState(action.payload || {});
        },
        toggleFinanceCategory: (state, action) => {
            const { category } = action.payload;
            state[category].enabled = !state[category].enabled;
            if (state[category].enabled) {
                state[category].activePreset = category === 'crypto' ? 'majors' : 'custom';
                if (category === 'crypto') {
                    state[category].customSelections = normalizeCryptoSelections();
                }
            }
        },
        setFinancePreset: (state, action) => {
            const { category, preset } = action.payload;
            state[category].activePreset = preset;
            if (category === 'crypto' && preset === 'majors') {
                state[category].customSelections = normalizeCryptoSelections();
            }
        },
        toggleFinanceSelection: (state, action) => {
            const { category } = action.payload;
            const key = action.payload.key ?? action.payload.symbol;
            if (!key) return;
            if (category === 'crypto') {
                state[category].customSelections = normalizeCryptoSelections({
                    ...state[category].customSelections,
                    [key]: !state[category].customSelections[key],
                });
                state[category].activePreset = 'custom';
            } else {
                state[category].customSelections[key] = !state[category].customSelections[key];
                state[category].activePreset = 'custom';
            }
        },
        setFinanceSearch: (state, action) => {
            const { category, searchTerm, term } = action.payload;
            state[category].searchTerm = searchTerm ?? term ?? '';
        },
        resetFinanceSelections: (state, action) => {
            const { category } = action.payload;
            if (category === 'crypto') {
                state.crypto.customSelections = normalizeCryptoSelections();
                state.crypto.activePreset = 'majors';
            } else {
                const options = category === 'stocks' ? STOCK_OPTIONS : CRYPTO_OPTIONS;
                state[category].customSelections = createDefaultSelections(options);
            }
        },
        toggleAllFinanceSelections: (state, action) => {
            const { category, selectAll } = action.payload;
            if (category === 'crypto') {
                const selections = {};
                for (const option of CRYPTO_OPTIONS) {
                    selections[option.key] = selectAll;
                }
                state.crypto.customSelections = selections;
                state.crypto.activePreset = selectAll ? 'custom' : 'majors';
            } else {
                const options = category === 'stocks' ? STOCK_OPTIONS : CRYPTO_OPTIONS;
                const newSelections = {};
                for (const opt of options) {
                    newSelections[opt.key] = selectAll;
                }
                state[category].customSelections = newSelections;
            }
        },
        setState: (state, action) => normalizeFinanceState(action.payload || {}),
    },
});

export const {
    setFinance,
    toggleFinanceCategory,
    setFinancePreset,
    toggleFinanceSelection,
    setFinanceSearch,
    resetFinanceSelections,
    toggleAllFinanceSelections,
    setState
} = financeSlice.actions;

export default financeSlice.reducer;
