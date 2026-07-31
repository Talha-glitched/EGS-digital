import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  activeCompanyDetail: null,
  lastFetchedAt: null,
};

export const companiesSlice = createSlice({
  name: 'companies',
  initialState,
  reducers: {
    setCompaniesData(state, action) {
      state.items = action.payload.items || [];
      state.total = action.payload.total ?? action.payload.items?.length ?? 0;
      state.loading = false;
      state.error = null;
      state.lastFetchedAt = Date.now();
    },
    updateCompanyInState(state, action) {
      const updated = action.payload;
      const index = state.items.findIndex((item) => item._id === updated._id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...updated };
      }
      if (state.activeCompanyDetail && state.activeCompanyDetail._id === updated._id) {
        state.activeCompanyDetail = { ...state.activeCompanyDetail, ...updated };
      }
    },
    removeCompanyFromState(state, action) {
      const id = action.payload;
      state.items = state.items.filter((item) => item._id !== id);
      state.total = Math.max(0, state.total - 1);
      if (state.activeCompanyDetail?._id === id) {
        state.activeCompanyDetail = null;
      }
    },
    setActiveCompanyDetail(state, action) {
      state.activeCompanyDetail = action.payload;
    },
    setCompaniesLoading(state, action) {
      state.loading = action.payload;
    },
    setCompaniesError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setCompaniesData,
  updateCompanyInState,
  removeCompanyFromState,
  setActiveCompanyDetail,
  setCompaniesLoading,
  setCompaniesError,
} = companiesSlice.actions;

export default companiesSlice.reducer;
