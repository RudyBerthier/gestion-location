// src/contexts/AuthContext.jsx - VERSION CORRIGÉE POUR ÉVITER L'ERREUR #310
import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext(null);

// Actions pour le reducer
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_INITIALIZED: 'SET_INITIALIZED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_2FA_STEP: 'SET_2FA_STEP'
};

// État initial
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  initialized: false, // IMPORTANT: pour éviter les renders avant l'initialisation
  error: null,
  twoFAStep: null // 'requested' | 'verified' | null
};

// Reducer pour la gestion d'état
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case AUTH_ACTIONS.SET_INITIALIZED:
      return { ...state, initialized: true, loading: false };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        initialized: true,
        error: null,
        twoFAStep: null
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        initialized: true,
        error: null,
        twoFAStep: null
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    case AUTH_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    case AUTH_ACTIONS.SET_2FA_STEP:
      return { ...state, twoFAStep: action.payload };

    default:
      return state;
  }
};

// Provider du contexte
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Vérifier si l'utilisateur est connecté au démarrage
  useEffect(() => {
    let isMounted = true;

    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          if (isMounted) {
            dispatch({ type: AUTH_ACTIONS.SET_INITIALIZED });
          }
          return;
        }

        const response = await fetch('/gestion-locative/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: { user: data.user, token }
          });
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('rememberMe');
          dispatch({ type: AUTH_ACTIONS.SET_INITIALIZED });
        }
      } catch (error) {
        console.error('Erreur vérification auth:', error);
        if (isMounted) {
          localStorage.removeItem('token');
          localStorage.removeItem('rememberMe');
          dispatch({ type: AUTH_ACTIONS.SET_INITIALIZED });
        }
      }
    };

    checkAuthStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  // Écouter les événements de connexion réussie depuis le composant Login
  useEffect(() => {
    const handleAuthSuccess = (event) => {
      const { user, token } = event.detail;
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token }
      });
    };

    window.addEventListener('auth-success', handleAuthSuccess);

    return () => {
      window.removeEventListener('auth-success', handleAuthSuccess);
    };
  }, []);

  // Nouvelle méthode pour demander un code de vérification (étape 1 du 2FA)
  const requestVerificationCode = async (email, password, rememberMe = false) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
      
      const response = await fetch('/gestion-locative/api/auth/login-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        dispatch({ type: AUTH_ACTIONS.SET_2FA_STEP, payload: 'requested' });
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return { 
          success: true, 
          email: data.email, 
          expiresIn: data.expiresIn,
          maskedEmail: data.email 
        };
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: data.message });
        return { success: false, error: data.message };
      }
    } catch (error) {
      const errorMessage = 'Erreur de connexion';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Nouvelle méthode pour vérifier le code (étape 2 du 2FA)
  const verifyCode = async (email, code, rememberMe = false) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
      
      const response = await fetch('/gestion-locative/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, code, rememberMe })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user: data.user, token: data.token }
        });
        
        return { success: true };
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: data.message });
        return { success: false, error: data.message, tooManyAttempts: data.tooManyAttempts };
      }
    } catch (error) {
      const errorMessage = 'Erreur de vérification';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Méthode pour renvoyer un code
  const resendVerificationCode = async (email) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
      
      const response = await fetch('/gestion-locative/api/auth/resend-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });

      if (data.success) {
        return { success: true, expiresIn: data.expiresIn };
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: data.message });
        return { success: false, error: data.message, rateLimited: data.rateLimited };
      }
    } catch (error) {
      const errorMessage = 'Erreur lors du renvoi du code';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      return { success: false, error: errorMessage };
    }
  };

  // Méthode de connexion simplifiée (conservée pour compatibilité)
  const login = async (email, password, rememberMe = false) => {
    return await requestVerificationCode(email, password, rememberMe);
  };

  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const response = await fetch('/gestion-locative/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user: data.user, token: data.token }
        });
        
        return { success: true };
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: data.message });
        return { success: false, error: data.message };
      }
    } catch (error) {
      const errorMessage = 'Erreur lors de l\'inscription';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  const updateUser = async (userData) => {
    try {
      const response = await fetch('/gestion-locative/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (data.success) {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: data.user
        });
        return { success: true };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }
  };

  // Méthode pour réinitialiser l'état 2FA
  const reset2FAState = () => {
    dispatch({ type: AUTH_ACTIONS.SET_2FA_STEP, payload: null });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    // Méthodes existantes (conservées pour compatibilité)
    login,
    register,
    logout,
    updateUser,
    clearError,
    
    // Nouvelles méthodes pour 2FA
    requestVerificationCode,
    verifyCode,
    resendVerificationCode,
    reset2FAState
  };

  // IMPORTANT: Ne pas rendre les enfants tant que l'auth n'est pas initialisée
  if (!state.initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initialisation...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook pour utiliser le contexte - IMPORTANT: Bien exporté
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export par défaut
export default AuthContext;