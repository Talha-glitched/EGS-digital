import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  filters: {},
  lastFetchedAt: null,
};

export const leadsSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    setLeadsData(state, action) {
      state.items = action.payload.items || [];
      state.total = action.payload.total ?? action.payload.items?.length ?? 0;
      state.loading = false;
      state.error = null;
      state.lastFetchedAt = Date.now();
    },
    appendLeads(state, action) {
      const existingIds = new Set(state.items.map((item) => item._id));
      const newItems = (action.payload.items || []).filter((item) => !existingIds.has(item._id));
      state.items = [...state.items, ...newItems];
      state.total = action.payload.total ?? state.items.length;
      state.loading = false;
      state.lastFetchedAt = Date.now();
    },
    updateLeadInState(state, action) {
      const updated = action.payload;
      const index = state.items.findIndex((item) => item._id === updated._id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...updated };
      }
    },
    removeLeadFromState(state, action) {
      const id = action.payload;
      state.items = state.items.filter((item) => item._id !== id);
      state.total = Math.max(0, state.total - 1);
    },
    removeLeadsFromState(state, action) {
      const ids = new Set(action.payload);
      state.items = state.items.filter((item) => !ids.has(item._id));
      state.total = Math.max(0, state.total - ids.size);
    },
    setLeadsLoading(state, action) {
      state.loading = action.payload;
    },
    setLeadsError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setLeadsData,
  appendLeads,
  updateLeadInState,
  removeLeadFromState,
  removeLeadsFromState,
  setLeadsLoading,
  setLeadsError,
} = leadsSlice.actions;

export default leadsSlice.reducer;
