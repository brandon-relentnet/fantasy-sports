import { createSlice } from '@reduxjs/toolkit';

const fantasySlice = createSlice({
  name: 'fantasy',
  initialState: {
    enabled: true,
  },
  reducers: {
    setFantasyEnabled: (state, action) => {
      state.enabled = !!action.payload;
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

