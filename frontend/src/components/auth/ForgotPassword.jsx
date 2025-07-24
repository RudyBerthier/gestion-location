// src/components/auth/ForgotPassword.jsx - VERSION AVEC VRAIE API
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Home, CheckCircle, AlertTriangle } from 'lucide-react';
import { authApi } from '../../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      // Obtenir l'URL de base pour le client
      const clientUrl = window.location.origin;
      
      const result = await authApi.forgotPassword(email, clientUrl);
      
      if (result.success) {
        setIsSuccess(true);
        setMessage(result.message);
      } else {
        if (result.rateLimited) {
          setError('Trop de demandes de réinitialisation. Réessayez dans 1 heure.');
        } else {
          setError(result.message || 'Erreur lors de l\'envoi de l\'email');
        }
      }
    } catch (error) {
      console.error('Erreur forgot password:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Email envoyé !</h1>
            <p className="text-gray-600">Vérifiez votre boîte de réception</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions envoyées</h2>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">
                  {message}
                </p>
              </div>

              <div className="text-left space-y-3 mb-6">
                <div className="flex items-start space-x-3">
                  <span className="text-blue-600 font-semibold">1.</span>
                  <p className="text-gray-600 text-sm">Vérifiez votre boîte de réception (et le dossier spam)</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-600 font-semibold">2.</span>
                  <p className="text-gray-600 text-sm">Cliquez sur le lien de réinitialisation</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-600 font-semibold">3.</span>
                  <p className="text-gray-600 text-sm">Créez votre nouveau mot de passe</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-yellow-800 text-xs">
                  <strong>⏰ Important :</strong> Le lien expire dans 1 heure pour votre sécurité.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setEmail('');
                  setMessage('');
                  setError('');
                }}
                className="w-full text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Mail size={16} />
                <span>Renvoyer l'email</span>
              </button>

              <Link
                to="/login"
                className="w-full text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft size={16} />
                <span>Retour à la connexion</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mot de passe oublié</h1>
          <p className="text-gray-600">Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>

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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="votre.email@exemple.com"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Entrez l'adresse email associée à votre compte
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Mail size={18} />
                  <span>Envoyer le lien de réinitialisation</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeft size={18} />
              <span>Retour à la connexion</span>
            </Link>
          </div>

          {/* Informations sur la sécurité */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">🔒 Sécurité</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Le lien de réinitialisation expire dans 1 heure</li>
              <li>• Maximum 3 demandes par heure par email</li>
              <li>• Si l'email n'existe pas, aucun message ne sera envoyé</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;