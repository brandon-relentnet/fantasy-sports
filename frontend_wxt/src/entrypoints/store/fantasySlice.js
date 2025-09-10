import { createSlice } from '@reduxjs/toolkit';

const fantasySlice = createSlice({
  name: 'fantasy',
  initialState: {
    enabled: true,
    sortKey: '',
    sortDir: 'desc',
    dateMode: 'today',
    date: '',
    typeFilter: 'all',
    showExtras: true,
  },
  reducers: {
    setFantasyEnabled: (state, action) => {
      state.enabled = !!action.payload;
    },
    setSortKey: (state, action) => {
      state.sortKey = action.payload || '';
    },
    setSortDir: (state, action) => {
      const v = action.payload;
      state.sortDir = v === 'asc' || v === 'desc' ? v : 'desc';
    },
    setDateMode: (state, action) => {
      const v = action.payload;
      state.dateMode = v === 'date' ? 'date' : 'today';
    },
    setDate: (state, action) => {
      state.date = action.payload || '';
    },
    setTypeFilter: (state, action) => {
      const v = action.payload;
      state.typeFilter = v === 'batters' || v === 'pitchers' ? v : 'all';
    },
    setShowExtras: (state, action) => {
      state.showExtras = !!action.payload;
    },
    setState: (state, action) => action.payload,
  },
  extraReducers: (builder) => {
    builder.addDefaultCase((state, action) => {
      if (action.type === 'LOAD_PERSISTED_STATE' && action.payload?.fantasy) {
        return action.payload.fantasy;
      }
      return state;
    });
  },
});

export const { setFantasyEnabled, setSortKey, setSortDir, setDateMode, setDate, setTypeFilter, setShowExtras, setState } = fantasySlice.actions;
export default fantasySlice.reducer;
