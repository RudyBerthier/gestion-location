// src/App.jsx - Version mise à jour avec toutes les nouvelles fonctionnalités
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider, NotificationContainer } from './contexts/NotificationContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import Layout from './components/Layout';
import Dashboard from './components/dashboard/Dashboard';
import ApartmentList from './components/apartments/ApartmentList';
import ApartmentDetail from './components/apartments/ApartmentDetail';
import ApartmentForm from './components/apartments/ApartmentForm';
import TenantList from './components/tenants/TenantList';
import TenantDetail from './components/tenants/TenantDetail';
import TenantForm from './components/tenants/TenantForm';
import DocumentManager from './components/documents/DocumentManager';
import Settings from './components/settings/Settings';
import Callback from './components/bank/Callback';
import ErrorBoundary from './components/common/ErrorBoundary';

const SimpleErrorBoundary = ({ children }) => {
  return children;
};

function App() {
  return (
    <ErrorBoundary fallback={<SimpleErrorBoundary />}>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <AppProvider>
              <Router>
                <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                  <Routes>
                    {/* Routes publiques */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* Route callback OAuth (publique, non protégée) */}
                    <Route path="/callback" element={<Callback />} />
                    
                    {/* Routes protégées */}
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Navigate to="/dashboard" replace />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/apartments" element={
                      <ProtectedRoute>
                        <Layout>
                          <ApartmentList />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/apartments/new" element={
                      <ProtectedRoute>
                        <Layout>
                          <ApartmentForm />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/apartments/:id" element={
                      <ProtectedRoute>
                        <Layout>
                          <ApartmentDetail />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/apartments/:id/edit" element={
                      <ProtectedRoute>
                        <Layout>
                          <ApartmentForm />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/tenants" element={
                      <ProtectedRoute>
                        <Layout>
                          <TenantList />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/tenants/new" element={
                      <ProtectedRoute>
                        <Layout>
                          <TenantForm />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/tenants/:id" element={
                      <ProtectedRoute>
                        <Layout>
                          <TenantDetail />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/tenants/:id/edit" element={
                      <ProtectedRoute>
                        <Layout>
                          <TenantForm />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/documents" element={
                      <ProtectedRoute>
                        <Layout>
                          <DocumentManager />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <Layout>
                          <Settings />
                        </Layout>
                      </ProtectedRoute>
                    } />
                  </Routes>
                  <NotificationContainer />
                </div>
              </Router>
            </AppProvider>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;