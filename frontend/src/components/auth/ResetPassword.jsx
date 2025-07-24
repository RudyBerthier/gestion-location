// src/components/auth/ResetPassword.jsx - VERSION AVEC VRAIE API
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Home, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { authApi } from '../../utils/api';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extraire token et email de l'URL
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // États pour la validation du token
  const [tokenValidation, setTokenValidation] = useState({
    isValidating: true,
    isValid: false,
    userData: null,
    expiresInMinutes: 0
  });

  // Valider le token au chargement du composant
  useEffect(() => {
    const validateToken = async () => {
      if (!token || !email) {
        setTokenValidation({
          isValidating: false,
          isValid: false,
          userData: null,
          expiresInMinutes: 0
        });
        setError('Lien invalide. Veuillez demander un nouveau lien de réinitialisation.');
        return;
      }

      try {
        const result = await authApi.validateResetToken(token, email);
        
        if (result.success) {
          setTokenValidation({
            isValidating: false,
            isValid: true,
            userData: result.data,
            expiresInMinutes: result.data.expires_in_minutes
          });
        } else {
          setTokenValidation({
            isValidating: false,
            isValid: false,
            userData: null,
            expiresInMinutes: 0
          });
          
          if (result.invalid) {
            setError('Ce lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.');
          } else {
            setError(result.message || 'Erreur lors de la validation du lien');
          }
        }
      } catch (error) {
        console.error('Erreur validation token:', error);
        setTokenValidation({
          isValidating: false,
          isValid: false,
          userData: null,
          expiresInMinutes: 0
        });
        setError('Erreur de connexion au serveur');
      }
    };

    validateToken();
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations côté client
    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Tous les champs sont requis');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authApi.resetPassword(
        token, 
        email, 
        formData.newPassword, 
        formData.confirmPassword
      );
      
      if (result.success) {
        setSuccess(true);
      } else {
        if (result.invalid) {
          setError('Ce lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.');
        } else {
          setError(result.message || 'Erreur lors de la réinitialisation');
        }
      }
    } catch (error) {
      console.error('Erreur reset password:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Effacer l'erreur quand l'utilisateur tape
  };

  // Affichage pendant la validation du token
  if (tokenValidation.isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Validation en cours</h2>
            <p className="text-gray-600 text-sm">Vérification de votre lien de réinitialisation...</p>
          </div>
        </div>
      </div>
    );
  }

  // Affichage si le token est invalide
  if (!tokenValidation.isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Lien invalide</h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <Link
                to="/forgot-password"
                className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Demander un nouveau lien
              </Link>
              
              <Link
                to="/login"
                className="block w-full text-gray-600 hover:text-gray-800 transition-colors"
              >
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Affichage du succès
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mot de passe réinitialisé !</h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-sm">
                Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
              </p>
            </div>
            
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-200"
            >
              Se connecter maintenant
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formulaire principal de réinitialisation
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h1>
          <p className="text-gray-600">Choisissez un nouveau mot de passe sécurisé</p>
          
          {tokenValidation.userData && (
            <div className="mt-4 text-sm text-gray-600">
              Réinitialisation pour <strong>{tokenValidation.userData.user_name}</strong>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {/* Indicateur de temps restant */}
          {tokenValidation.expiresInMinutes > 0 && tokenValidation.expiresInMinutes <= 60 && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-yellow-800">
                <Clock size={16} />
                <span className="text-sm">
                  Ce lien expire dans <strong>{tokenValidation.expiresInMinutes} minute{tokenValidation.expiresInMinutes > 1 ? 's' : ''}</strong>
                </span>
              </div>
            </div>
          )}

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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.newPassword}
                  onChange={(e) => handleChange('newPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Au moins 8 caractères
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Critères de sécurité */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Critères du mot de passe :</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className={formData.newPassword.length >= 8 ? 'text-green-600' : ''}>
                  • Au moins 8 caractères
                </li>
                <li className={formData.newPassword === formData.confirmPassword && formData.confirmPassword ? 'text-green-600' : ''}>
                  • Les mots de passe correspondent
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isLoading || !formData.newPassword || !formData.confirmPassword}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Mise à jour...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>Réinitialiser le mot de passe</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-gray-600 hover:text-gray-800 font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeft size={18} />
              <span>Retour à la connexion</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;