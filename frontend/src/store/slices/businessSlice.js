// ─── businessSlice.js ────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { businessApi } from '@/api';
import toast from 'react-hot-toast';

export const fetchBusinesses = createAsyncThunk('business/fetchAll', async (_, { rejectWithValue }) => {
  try { const { data } = await businessApi.list(); return data.data.businesses; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const createBusiness = createAsyncThunk('business/create', async (formData, { rejectWithValue }) => {
  try { const { data } = await businessApi.create(formData); return data.data.business; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to create business'); }
});

export const updateBusiness = createAsyncThunk('business/update', async ({ id, data: formData }, { rejectWithValue }) => {
  try { const { data } = await businessApi.update(id, formData); return data.data.business; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to update'); }
});

const businessSlice = createSlice({
  name: 'business',
  initialState: {
    list: [],
    activeBusiness: JSON.parse(localStorage.getItem('bf_activeBusiness') || 'null'),
    loading: false,
    error: null,
  },
  reducers: {
    setActiveBusiness(state, { payload }) {
      state.activeBusiness = payload;
      localStorage.setItem('bf_activeBusiness', JSON.stringify(payload));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinesses.pending,   (state) => { state.loading = true; })
      .addCase(fetchBusinesses.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.list = payload;
        if (!state.activeBusiness && payload.length > 0) {
          state.activeBusiness = payload[0];
          localStorage.setItem('bf_activeBusiness', JSON.stringify(payload[0]));
        }
      })
      .addCase(fetchBusinesses.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(createBusiness.fulfilled,  (state, { payload }) => {
        state.list.push(payload);
        state.activeBusiness = payload;
        localStorage.setItem('bf_activeBusiness', JSON.stringify(payload));
        toast.success('Business created!');
      })
      .addCase(updateBusiness.fulfilled,  (state, { payload }) => {
        const idx = state.list.findIndex(b => b._id === payload._id);
        if (idx !== -1) state.list[idx] = payload;
        if (state.activeBusiness?._id === payload._id) {
          state.activeBusiness = payload;
          localStorage.setItem('bf_activeBusiness', JSON.stringify(payload));
        }
        toast.success('Business updated!');
      });
  },
});

export const { setActiveBusiness } = businessSlice.actions;
export default businessSlice.reducer;
export const selectBusiness       = (s) => s.business;
export const selectActiveBusiness = (s) => s.business.activeBusiness;
