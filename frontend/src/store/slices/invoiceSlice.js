import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { invoiceApi } from '@/api';
import toast from 'react-hot-toast';

export const fetchInvoices = createAsyncThunk('invoice/fetchAll', async (params, { rejectWithValue }) => {
  try { const { data } = await invoiceApi.list(params); return data.data; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchInvoice = createAsyncThunk('invoice/fetchOne', async (id, { rejectWithValue }) => {
  try { const { data } = await invoiceApi.get(id); return data.data.invoice; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const createInvoice = createAsyncThunk('invoice/create', async (formData, { rejectWithValue }) => {
  try { const { data } = await invoiceApi.create(formData); return data.data.invoice; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to create invoice'); }
});

export const updateInvoiceStatus = createAsyncThunk('invoice/updateStatus', async ({ id, ...payload }, { rejectWithValue }) => {
  try { const { data } = await invoiceApi.updateStatus(id, payload); return data.data.invoice; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const deleteInvoice = createAsyncThunk('invoice/delete', async (id, { rejectWithValue }) => {
  try { await invoiceApi.delete(id); return id; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const invoiceSlice = createSlice({
  name: 'invoice',
  initialState: {
    list: [], pagination: {}, stats: {}, current: null,
    loading: false, saving: false, error: null,
  },
  reducers: {
    clearCurrent: (state) => { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchInvoices.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.list = payload.invoices;
        s.pagination = payload.pagination;
        s.stats = payload.stats;
      })
      .addCase(fetchInvoices.rejected,  (s, { payload }) => { s.loading = false; s.error = payload; })

      .addCase(fetchInvoice.fulfilled, (s, { payload }) => { s.current = payload; })

      .addCase(createInvoice.pending,   (s) => { s.saving = true; })
      .addCase(createInvoice.fulfilled, (s, { payload }) => {
        s.saving = false;
        s.list.unshift(payload);
        toast.success(`Invoice ${payload.invoiceNo} created!`);
      })
      .addCase(createInvoice.rejected,  (s, { payload }) => { s.saving = false; toast.error(payload); })

      .addCase(updateInvoiceStatus.fulfilled, (s, { payload }) => {
        const idx = s.list.findIndex(i => i._id === payload._id);
        if (idx !== -1) s.list[idx] = { ...s.list[idx], ...payload };
        toast.success(`Invoice marked as ${payload.status}`);
      })

      .addCase(deleteInvoice.fulfilled, (s, { payload }) => {
        s.list = s.list.filter(i => i._id !== payload);
        toast.success('Invoice voided.');
      });
  },
});

export const { clearCurrent } = invoiceSlice.actions;
export default invoiceSlice.reducer;
export const selectInvoice = (s) => s.invoice;
