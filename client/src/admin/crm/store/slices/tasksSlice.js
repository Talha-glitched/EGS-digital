import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasksData(state, action) {
      state.items = action.payload.items || [];
      state.total = action.payload.total ?? state.items.length;
      state.loading = false;
    },
    updateTaskInState(state, action) {
      const updated = action.payload;
      const index = state.items.findIndex((item) => item._id === updated._id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...updated };
      }
    },
    addTaskToState(state, action) {
      state.items.unshift(action.payload);
      state.total += 1;
    },
    removeTaskFromState(state, action) {
      const id = action.payload;
      state.items = state.items.filter((item) => item._id !== id);
      state.total = Math.max(0, state.total - 1);
    },
    removeTasksFromState(state, action) {
      const ids = new Set(action.payload);
      state.items = state.items.filter((item) => !ids.has(item._id));
      state.total = Math.max(0, state.total - ids.size);
    },
    setTasksLoading(state, action) {
      state.loading = action.payload;
    },
  },
});

export const {
  setTasksData,
  updateTaskInState,
  addTaskToState,
  removeTaskFromState,
  removeTasksFromState,
  setTasksLoading,
} = tasksSlice.actions;

export default tasksSlice.reducer;
