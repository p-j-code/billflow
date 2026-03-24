import { configureStore } from '@reduxjs/toolkit';
import authReducer     from './slices/authSlice';
import businessReducer from './slices/businessSlice';
import partyReducer    from './slices/partySlice';
import uiReducer       from './slices/uiSlice';
import invoiceReducer  from './slices/invoiceSlice';

export const store = configureStore({
  reducer: {
    auth:     authReducer,
    business: businessReducer,
    party:    partyReducer,
    ui:       uiReducer,
    invoice:  invoiceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});
