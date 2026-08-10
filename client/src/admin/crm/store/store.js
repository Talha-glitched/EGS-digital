import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice.js';
import leadsReducer from './slices/leadsSlice.js';
import companiesReducer from './slices/companiesSlice.js';
import projectsReducer from './slices/projectsSlice.js';
import tasksReducer from './slices/tasksSlice.js';
import { crmApiSlice } from './crmApiSlice.js';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    leads: leadsReducer,
    companies: companiesReducer,
    projects: projectsReducer,
    tasks: tasksReducer,
    [crmApiSlice.reducerPath]: crmApiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(crmApiSlice.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

