import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMe, selectIsAuthed, selectAuth } from "@/store/slices/authSlice";
import { fetchBusinesses } from "@/store/slices/businessSlice";

import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import BusinessSetupPage from "@/pages/business/BusinessSetupPage";
import PartyListPage from "@/pages/parties/PartyListPage";
import PartyLedgerPage from "@/pages/parties/PartyLedgerPage";
import HsnSearchPage from "@/pages/hsn/HsnSearchPage";
import InvoiceListPage from "@/pages/invoices/InvoiceListPage";
import InvoiceCreatePage from "@/pages/invoices/InvoiceCreatePage";
import InvoiceViewPage from "@/pages/invoices/InvoiceViewPage";
import InvoiceEditPage from "@/pages/invoices/InvoiceEditPage";
import NotesListPage from "@/pages/invoices/NotesListPage";
import NoteCreatePage from "@/pages/invoices/NoteCreatePage";
import ReportsPage from "@/pages/reports/ReportsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import PublicInvoicePage from "@/pages/public/PublicInvoicePage";

function RequireAuth({ children }) {
  const isAuthed = useSelector(selectIsAuthed);
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}
function RequireGuest({ children }) {
  const isAuthed = useSelector(selectIsAuthed);
  if (isAuthed) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const dispatch = useDispatch();
  const { accessToken } = useSelector(selectAuth);

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchMe());
      dispatch(fetchBusinesses());
    }
  }, [accessToken, dispatch]);

  return (
    <Routes>
      {/* Public — no auth required */}
      <Route path="/invoice/view/:token" element={<PublicInvoicePage />} />

      {/* Guest only */}
      <Route
        path="/login"
        element={
          <RequireGuest>
            <LoginPage />
          </RequireGuest>
        }
      />
      <Route
        path="/register"
        element={
          <RequireGuest>
            <RegisterPage />
          </RequireGuest>
        }
      />

      {/* Protected app */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="business" element={<BusinessSetupPage />} />
        <Route path="parties" element={<PartyListPage />} />
        <Route path="parties/:id" element={<PartyLedgerPage />} />
        <Route path="hsn" element={<HsnSearchPage />} />
        <Route path="invoices" element={<InvoiceListPage />} />
        <Route path="invoices/new" element={<InvoiceCreatePage />} />
        <Route path="invoices/:id" element={<InvoiceViewPage />} />
        <Route path="invoices/:id/edit" element={<InvoiceEditPage />} />
        <Route path="notes" element={<NotesListPage />} />
        <Route path="notes/new" element={<NoteCreatePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
