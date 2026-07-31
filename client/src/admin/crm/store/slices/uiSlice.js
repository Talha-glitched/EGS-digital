import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarCollapsed: false,
  spotlightOpen: false,
  toast: null,
  activeLeadId: null,
  activeCompanyId: null,
  activeJobId: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarCollapsed(state, action) {
      state.sidebarCollapsed = action.payload;
    },
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSpotlightOpen(state, action) {
      state.spotlightOpen = action.payload;
    },
    showToast(state, action) {
      state.toast = typeof action.payload === 'string' 
        ? { message: action.payload, type: 'info', id: Date.now() }
        : { ...action.payload, id: Date.now() };
    },
    clearToast(state) {
      state.toast = null;
    },
    setActiveLeadId(state, action) {
      state.activeLeadId = action.payload;
    },
    setActiveCompanyId(state, action) {
      state.activeCompanyId = action.payload;
    },
    setActiveJobId(state, action) {
      state.activeJobId = action.payload;
    },
  },
});

export const {
  setSidebarCollapsed,
  toggleSidebarCollapsed,
  setSpotlightOpen,
  showToast,
  clearToast,
  setActiveLeadId,
  setActiveCompanyId,
  setActiveJobId,
} = uiSlice.actions;

export default uiSlice.reducer;
