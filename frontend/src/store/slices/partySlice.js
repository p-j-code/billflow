// partySlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { partyApi } from '@/api';
import toast from 'react-hot-toast';

export const fetchParties = createAsyncThunk('party/fetchAll', async (params, { rejectWithValue }) => {
  try { const { data } = await partyApi.list(params); return data.data; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const createParty = createAsyncThunk('party/create', async (formData, { rejectWithValue }) => {
  try { const { data } = await partyApi.create(formData); return data.data.party; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to create party'); }
});

export const updateParty = createAsyncThunk('party/update', async ({ id, data: formData }, { rejectWithValue }) => {
  try { const { data } = await partyApi.update(id, formData); return data.data.party; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to update'); }
});

export const deleteParty = createAsyncThunk('party/delete', async (id, { rejectWithValue }) => {
  try { await partyApi.delete(id); return id; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const partySlice = createSlice({
  name: 'party',
  initialState: { list: [], pagination: {}, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchParties.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchParties.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.list = payload.parties;
        state.pagination = payload.pagination;
      })
      .addCase(fetchParties.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(createParty.fulfilled,  (state, { payload }) => {
        state.list.unshift(payload);
        toast.success('Party added successfully!');
      })
      .addCase(createParty.rejected,   (_, { payload }) => { toast.error(payload); })
      .addCase(updateParty.fulfilled,  (state, { payload }) => {
        const idx = state.list.findIndex(p => p._id === payload._id);
        if (idx !== -1) state.list[idx] = payload;
        toast.success('Party updated!');
      })
      .addCase(deleteParty.fulfilled,  (state, { payload }) => {
        state.list = state.list.filter(p => p._id !== payload);
        toast.success('Party removed.');
      });
  },
});

export default partySlice.reducer;
export const selectParty = (s) => s.party;

// ─── uiSlice.js ──────────────────────────────────────────────────────
import { createSlice as createUISlice } from '@reduxjs/toolkit';

const uiSlice = createUISlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    modal: null, // { type, data }
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarCollapsed = !state.sidebarCollapsed; },
    openModal:  (state, { payload }) => { state.modal = payload; },
    closeModal: (state) => { state.modal = null; },
  },
});

export const uiReducer = uiSlice.reducer;
export const { toggleSidebar, openModal, closeModal } = uiSlice.actions;
export const selectUI = (s) => s.ui;
