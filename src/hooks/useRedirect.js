// src/hooks/useRedirect.js
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

export const useRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Obtenir l'URL de redirection depuis l'état ou défaut
  const getRedirectPath = (defaultPath = '/dashboard') => {
    return location.state?.from?.pathname || defaultPath;
  };

  // Rediriger après connexion/inscription réussie
  const redirectAfterAuth = (customPath = null) => {
    const redirectPath = customPath || getRedirectPath();
    navigate(redirectPath, { replace: true });
  };

  // Rediriger automatiquement si déjà connecté
  const redirectIfAuthenticated = (defaultPath = '/dashboard') => {
    if (isAuthenticated) {
      const redirectPath = getRedirectPath(defaultPath);
      navigate(redirectPath, { replace: true });
    }
  };

  // Créer une URL de login avec redirection
  const createLoginUrl = (returnPath = null) => {
    const path = returnPath || location.pathname + location.search;
    return {
      pathname: '/login',
      state: { from: { pathname: path } }
    };
  };

  return {
    getRedirectPath,
    redirectAfterAuth,
    redirectIfAuthenticated,
    createLoginUrl,
    isRedirectPending: !!location.state?.from
  };
};