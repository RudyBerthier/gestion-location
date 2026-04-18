import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'

// Pages Auth
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Callback from './pages/auth/Callback'
import WaitingPage from './pages/auth/WaitingPage'

// Layout
import AppLayout from './components/layout/AppLayout'

// Pages Dashboard
import Dashboard from './pages/dashboard/Dashboard'
import Settings from './pages/dashboard/Settings'

// Pages Appartements
import ApartmentList from './pages/apartments/ApartmentList'
import ApartmentForm from './pages/apartments/ApartmentForm'
import ApartmentDetail from './pages/apartments/ApartmentDetail'

// Pages Locataires
import TenantList from './pages/tenants/TenantList'
import TenantForm from './pages/tenants/TenantForm'
import TenantDetail from './pages/tenants/TenantDetail'

// Pages Modules
import FinancePage from './pages/finance/FinancePage'
import DocumentsPage from './pages/documents/DocumentsPage'
import Mailbox from './pages/messages/Mailbox'
import LeaseManager from './pages/leases/LeaseManager'
import EtatDesLieuxBuilder from './pages/etat-des-lieux/EtatDesLieuxBuilder'
import ContactList from './pages/contacts/ContactList'
import CalendarPage from './pages/calendar/CalendarPage'

// ── Route protégée ───────────────────────────────────────────
function PrivateRoute({ children }) {
  const { isAuthenticated, loading, profile } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  
  if (isAuthenticated && profile && profile.status === 'pending') {
    return <Navigate to="/en-attente" replace />
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// Raccourci pour les pages protégées avec layout
function P({ children }) {
  return <PrivateRoute><AppLayout>{children}</AppLayout></PrivateRoute>
}

// ── App ──────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
        <Router>
          <Routes>
            {/* ── Publiques ── */}
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
            <Route path="/auth/callback"   element={<Callback />} />
            <Route path="/en-attente"      element={<WaitingPage />} />

            {/* ── Protégées ── */}
            <Route path="/"                element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"       element={<P><Dashboard /></P>} />
            <Route path="/settings"        element={<P><Settings /></P>} />

            {/* Appartements */}
            <Route path="/apartments"          element={<P><ApartmentList /></P>} />
            <Route path="/apartments/new"      element={<P><ApartmentForm /></P>} />
            <Route path="/apartments/:id"      element={<P><ApartmentDetail /></P>} />
            <Route path="/apartments/:id/edit" element={<P><ApartmentForm /></P>} />

            {/* Locataires */}
            <Route path="/tenants"          element={<P><TenantList /></P>} />
            <Route path="/tenants/new"      element={<P><TenantForm /></P>} />
            <Route path="/tenants/:id"      element={<P><TenantDetail /></P>} />
            <Route path="/tenants/:id/edit" element={<P><TenantForm /></P>} />

            {/* Modules */}
            <Route path="/finance"   element={<P><FinancePage /></P>} />
            <Route path="/documents" element={<P><DocumentsPage /></P>} />
            <Route path="/messages"  element={<P><Mailbox /></P>} />
            <Route path="/contacts"  element={<P><ContactList /></P>} />
            <Route path="/calendar"  element={<P><CalendarPage /></P>} />

            {/* Baux */}
            <Route path="/leases/:id" element={<P><LeaseManager /></P>} />
            <Route path="/leases/:id/etat-des-lieux" element={<PrivateRoute><EtatDesLieuxBuilder /></PrivateRoute>} />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
