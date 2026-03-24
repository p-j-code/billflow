import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '@/api';
import toast from 'react-hot-toast';

const loadFromStorage = () => {
  try {
    return {
      accessToken:  localStorage.getItem('bf_access')  || null,
      refreshToken: localStorage.getItem('bf_refresh') || null,
      user:         JSON.parse(localStorage.getItem('bf_user') || 'null'),
    };
  } catch { return { accessToken: null, refreshToken: null, user: null }; }
};

// ── Thunks ──────────────────────────────────────────────────────────
export const loginThunk = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await authApi.login(credentials);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const registerThunk = createAsyncThunk('auth/register', async (formData, { rejectWithValue }) => {
  try {
    const { data } = await authApi.register(formData);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

export const logoutThunk = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  try { await authApi.logout(); } catch {}
  dispatch(logout());
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authApi.me();
    return data.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

// ── Slice ────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: { ...loadFromStorage(), loading: false, error: null },
  reducers: {
    setTokens(state, { payload }) {
      state.accessToken  = payload.accessToken;
      state.refreshToken = payload.refreshToken;
      localStorage.setItem('bf_access',  payload.accessToken);
      localStorage.setItem('bf_refresh', payload.refreshToken);
    },
    logout(state) {
      state.user = null;
      state.accessToken  = null;
      state.refreshToken = null;
      localStorage.removeItem('bf_access');
      localStorage.removeItem('bf_refresh');
      localStorage.removeItem('bf_user');
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    const handlePending  = (state) => { state.loading = true; state.error = null; };
    const handleRejected = (state, { payload }) => { state.loading = false; state.error = payload; };

    // Login
    builder
      .addCase(loginThunk.pending, handlePending)
      .addCase(loginThunk.fulfilled, (state, { payload }) => {
        state.loading      = false;
        state.user         = payload.user;
        state.accessToken  = payload.accessToken;
        state.refreshToken = payload.refreshToken;
        localStorage.setItem('bf_access',  payload.accessToken);
        localStorage.setItem('bf_refresh', payload.refreshToken);
        localStorage.setItem('bf_user',    JSON.stringify(payload.user));
        toast.success(`Welcome back, ${payload.user.name.split(' ')[0]}!`);
      })
      .addCase(loginThunk.rejected, (state, { payload }) => {
        state.loading = false; state.error = payload;
        toast.error(payload || 'Login failed');
      });

    // Register
    builder
      .addCase(registerThunk.pending, handlePending)
      .addCase(registerThunk.fulfilled, (state, { payload }) => {
        state.loading      = false;
        state.user         = payload.user;
        state.accessToken  = payload.accessToken;
        state.refreshToken = payload.refreshToken;
        localStorage.setItem('bf_access',  payload.accessToken);
        localStorage.setItem('bf_refresh', payload.refreshToken);
        localStorage.setItem('bf_user',    JSON.stringify(payload.user));
        toast.success('Account created! Welcome to BillFlow.');
      })
      .addCase(registerThunk.rejected, handleRejected);

    // Me
    builder
      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.user = payload;
        localStorage.setItem('bf_user', JSON.stringify(payload));
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
      });
  },
});

export const { setTokens, logout, clearError } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectAuth     = (s) => s.auth;
export const selectUser     = (s) => s.auth.user;
export const selectIsAuthed = (s) => !!s.auth.accessToken && !!s.auth.user;
