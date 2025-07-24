// src/components/auth/ProtectedRoute.jsx - VERSION CORRIGÉE
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  // TOUS LES HOOKS EN PREMIER - JAMAIS DE HOOKS CONDITIONNELS
  const authContext = useAuth();
  const location = useLocation();

  // Déstructuration après les hooks
  const { isAuthenticated, loading, initialized } = authContext || {};

  // Affichage du loading pendant l'initialisation
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des droits d'accès...</p>
        </div>
      </div>
    );
  }

  // Redirection vers login si non authentifié
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Rendu des enfants si authentifié
  return children;
};

export default ProtectedRoute;