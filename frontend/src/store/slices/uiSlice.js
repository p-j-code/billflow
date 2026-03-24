import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    modal: null,
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarCollapsed = !state.sidebarCollapsed; },
    openModal:  (state, { payload }) => { state.modal = payload; },
    closeModal: (state) => { state.modal = null; },
  },
});

export default uiSlice.reducer;
export const { toggleSidebar, openModal, closeModal } = uiSlice.actions;
export const selectUI = (s) => s.ui;
