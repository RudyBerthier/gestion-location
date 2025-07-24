// src/components/auth/Login.jsx - VERSION CORRIGÉE POUR ÉVITER L'ERREUR #310
import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Home, Shield, ArrowLeft, RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  // TOUS LES HOOKS DOIVENT ÊTRE APPELÉS EN PREMIER - JAMAIS DE HOOKS CONDITIONNELS
  const authContext = useAuth();
  const [currentStep, setCurrentStep] = useState('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [verificationData, setVerificationData] = useState({
    email: '',
    code: '',
    expiresIn: 600,
    maskedEmail: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);

  // Déstructuration après les hooks pour éviter les erreurs
  const { isAuthenticated, loading, initialized } = authContext || {};

  // Timer pour le compte à rebours
  useEffect(() => {
    if (currentStep === 'verify' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentStep, timeLeft]);

  // Gestion de la redirection - APRÈS les hooks
  useEffect(() => {
    if (initialized && isAuthenticated) {
      // La redirection se fera via le composant Navigate ci-dessous
    }
  }, [initialized, isAuthenticated]);

  // Loading de l'initialisation
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Redirection si déjà authentifié
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Formater le temps restant
  const formatTimeLeft = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Étape 1: Connexion et demande de code
  const handleLoginRequest = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/gestion-locative/api/auth/login-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        setVerificationData({
          email: formData.email,
          code: '',
          expiresIn: data.expiresIn,
          maskedEmail: data.email
        });
        setTimeLeft(data.expiresIn);
        setCurrentStep('verify');
      } else {
        setError(data.message || 'Erreur lors de la connexion');
      }
    } catch (error) {
      console.error('Erreur login request:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Étape 2: Vérification du code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/gestion-locative/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: verificationData.email,
          code: verificationData.code,
          rememberMe: formData.rememberMe
        })
      });

      const data = await response.json();

      if (data.success) {
        // Sauvegarder le token et les données utilisateur
        localStorage.setItem('token', data.token);
        if (formData.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        
        // Déclencher un événement pour mettre à jour l'AuthContext
        window.dispatchEvent(new CustomEvent('auth-success', { 
          detail: { user: data.user, token: data.token } 
        }));
        
        // Redirection se fera automatiquement via l'AuthContext
      } else {
        if (data.tooManyAttempts) {
          setError(data.message + ' Vous allez être redirigé vers la page de connexion.');
          setTimeout(() => {
            setCurrentStep('login');
            setVerificationData({ email: '', code: '', expiresIn: 600, maskedEmail: '' });
            setFormData(prev => ({ ...prev, password: '' }));
          }, 3000);
        } else {
          setError(data.message || 'Code incorrect');
        }
      }
    } catch (error) {
      console.error('Erreur verify code:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Renvoyer un code
  const handleResendCode = async () => {
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/gestion-locative/api/auth/resend-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: verificationData.email
        })
      });

      const data = await response.json();

      if (data.success) {
        setTimeLeft(data.expiresIn);
        setVerificationData(prev => ({ ...prev, code: '' }));
        setError(''); // Pas d'erreur, code renvoyé avec succès
      } else {
        setError(data.message || 'Erreur lors du renvoi du code');
      }
    } catch (error) {
      console.error('Erreur resend code:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Retour à l'étape de connexion
  const handleBackToLogin = () => {
    setCurrentStep('login');
    setVerificationData({ email: '', code: '', expiresIn: 600, maskedEmail: '' });
    setTimeLeft(0);
    setError('');
  };

  const handleInputChange = (field, value) => {
    if (currentStep === 'login') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setVerificationData(prev => ({ ...prev, [field]: value }));
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion Locative</h1>
          <p className="text-gray-600">
            {currentStep === 'login' ? 'Connectez-vous à votre compte' : 'Vérification de sécurité'}
          </p>
        </div>

        {/* Étapes de progression */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'login' 
                ? 'bg-blue-600 text-white' 
                : 'bg-green-600 text-white'
            }`}>
              {currentStep === 'login' ? '1' : <CheckCircle size={16} />}
            </div>
            <div className="w-8 h-1 bg-gray-200 rounded">
              <div className={`h-full bg-blue-600 rounded transition-all duration-300 ${
                currentStep === 'verify' ? 'w-full' : 'w-0'
              }`}></div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'verify'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {currentStep === 'verify' ? '2' : <Shield size={16} />}
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={20} className="text-red-600" />
                <div className="text-red-600 text-sm">
                  <strong>Erreur:</strong> {error}
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 1: CONNEXION */}
          {currentStep === 'login' && (
            <form onSubmit={handleLoginRequest} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="votre.email@exemple.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                    Se souvenir de moi
                  </label>
                </div>

                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Envoi du code...</span>
                  </>
                ) : (
                  <>
                    <Shield size={18} />
                    <span>Envoyer le code de vérification</span>
                  </>
                )}
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield size={20} className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">🔒 Double vérification activée</p>
                    <p>Un code de vérification sera envoyé à votre adresse email pour sécuriser votre connexion.</p>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* ÉTAPE 2: VÉRIFICATION DU CODE */}
          {currentStep === 'verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={24} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Vérifiez votre email</h2>
                <p className="text-gray-600 text-sm">
                  Un code de vérification à 6 chiffres a été envoyé à<br />
                  <strong>{verificationData.maskedEmail}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                    Code de vérification
                  </label>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    value={verificationData.code}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Seulement les chiffres
                      handleInputChange('code', value);
                    }}
                    className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="000000"
                    autoComplete="one-time-code"
                  />
                </div>

                {/* Compte à rebours */}
                {timeLeft > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center justify-center space-x-2 text-yellow-800">
                      <Clock size={16} />
                      <span className="text-sm">
                        Code valide encore <strong>{formatTimeLeft(timeLeft)}</strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* Code expiré */}
                {timeLeft === 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-center text-red-800">
                      <AlertTriangle size={20} className="mx-auto mb-2" />
                      <p className="text-sm">Code expiré. Demandez un nouveau code.</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || verificationData.code.length !== 6}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Vérification...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      <span>Vérifier et se connecter</span>
                    </>
                  )}
                </button>
              </form>

              {/* Actions secondaires */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleResendCode}
                  disabled={isLoading || timeLeft > 540} // Peut renvoyer après 1 minute
                  className="w-full text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  <span>
                    {timeLeft > 540 
                      ? `Renvoyer dans ${formatTimeLeft(timeLeft - 540)}`  // ✅ CORRECTION ICI
                      : 'Renvoyer le code'
                    }
                  </span>
                </button>

                <button
                  onClick={handleBackToLogin}
                  disabled={isLoading}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <ArrowLeft size={16} />
                  <span>Retour à la connexion</span>
                </button>
              </div>
            </div>
          )}

          {/* Lien inscription */}
          {currentStep === 'login' && (
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Pas encore de compte ?{' '}
                <Link
                  to="/register"
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Créer un compte
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Fonctionnalités - affiché seulement à l'étape login */}
        {currentStep === 'login' && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                🏠
              </div>
              <h3 className="font-medium text-gray-900 text-sm">Gestion d'appartements</h3>
              <p className="text-xs text-gray-600 mt-1">Organisez votre portefeuille immobilier</p>
            </div>
            <div className="p-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                👥
              </div>
              <h3 className="font-medium text-gray-900 text-sm">Suivi des locataires</h3>
              <p className="text-xs text-gray-600 mt-1">Gérez vos relations locatives</p>
            </div>
            <div className="p-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                📊
              </div>
              <h3 className="font-medium text-gray-900 text-sm">Suivi financier</h3>
              <p className="text-xs text-gray-600 mt-1">Contrôlez vos revenus locatifs</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;