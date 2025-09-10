import { createSlice } from '@reduxjs/toolkit';

const fantasySlice = createSlice({
  name: 'fantasy',
  initialState: {
    enabled: true,
    sortKey: '',
    sortDir: 'desc',
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

export const { setFantasyEnabled, setState } = fantasySlice.actions;
export default fantasySlice.reducer;
