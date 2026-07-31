import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  projects: [],
  ongoingJobs: [],
  completedJobs: [],
  currentProjectWorkspace: null,
  loading: false,
  error: null,
};

export const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setProjects(state, action) {
      state.projects = action.payload || [];
      state.loading = false;
    },
    setOngoingJobs(state, action) {
      state.ongoingJobs = action.payload || [];
    },
    updateOngoingJobInState(state, action) {
      const updated = action.payload;
      const index = state.ongoingJobs.findIndex((job) => job._id === updated._id);
      if (index !== -1) {
        state.ongoingJobs[index] = { ...state.ongoingJobs[index], ...updated };
      }
    },
    removeOngoingJobFromState(state, action) {
      const id = action.payload;
      state.ongoingJobs = state.ongoingJobs.filter((job) => job._id !== id);
    },
    setCompletedJobs(state, action) {
      state.completedJobs = action.payload || [];
    },
    setCurrentProjectWorkspace(state, action) {
      state.currentProjectWorkspace = action.payload;
    },
    setProjectsLoading(state, action) {
      state.loading = action.payload;
    },
  },
});

export const {
  setProjects,
  setOngoingJobs,
  updateOngoingJobInState,
  removeOngoingJobFromState,
  setCompletedJobs,
  setCurrentProjectWorkspace,
  setProjectsLoading,
} = projectsSlice.actions;

export default projectsSlice.reducer;
