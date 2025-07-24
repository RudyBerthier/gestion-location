// src/components/admin/EmailTestComponent.jsx - Composant de test de configuration email
import React, { useState } from 'react';
import { Mail, Send, CheckCircle, XCircle, AlertTriangle, Settings, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../utils/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const EmailTestComponent = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [testEmail, setTestEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [emailConfig, setEmailConfig] = useState({
    host: '',
    port: '',
    user: '',
    pass: '',
    secure: false
  });

  // Configuration SMTP courantes
  const commonConfigs = [
    {
      name: 'Gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      description: 'Utilisez un mot de passe d\'application'
    },
    {
      name: 'Outlook',
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      description: 'Compte Microsoft/Outlook'
    },
    {
      name: 'Yahoo',
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
      description: 'Activez l\'authentification 2FA'
    },
    {
      name: 'OVH',
      host: 'ssl0.ovh.net',
      port: 587,
      secure: false,
      description: 'Hébergement OVH'
    }
  ];

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      addNotification('Veuillez saisir une adresse email valide', 'warning');
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      const response = await authApi.testEmail(testEmail);
      
      if (response.success) {
        setLastResult({
          success: true,
          message: 'Email de test envoyé avec succès',
          details: `Un email de test a été envoyé à ${testEmail}`
        });
        addNotification('Email de test envoyé avec succès', 'success');
      } else {
        setLastResult({
          success: false,
          message: 'Erreur lors de l\'envoi',
          details: response.error || 'Erreur inconnue'
        });
        addNotification('Erreur lors de l\'envoi de l\'email de test', 'error');
      }
    } catch (error) {
      console.error('Erreur test email:', error);
      setLastResult({
        success: false,
        message: 'Erreur de connexion',
        details: 'Impossible de contacter le serveur'
      });
      addNotification('Erreur de connexion au serveur', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const applyQuickConfig = (config) => {
    setEmailConfig({
      host: config.host,
      port: config.port.toString(),
      user: '',
      pass: '',
      secure: config.secure
    });
  };

  const getConfigInstructions = () => {
    return `
# Variables d'environnement pour le backend
SMTP_HOST=${emailConfig.host || 'smtp.gmail.com'}
SMTP_PORT=${emailConfig.port || '587'}
SMTP_USER=${emailConfig.user || 'votre.email@gmail.com'}
SMTP_PASS=${emailConfig.pass || 'votre_mot_de_passe_application'}

# Optionnel
FROM_NAME="Gestion Locative"
FROM_EMAIL=noreply@gestion-locative.fr
    `.trim();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Mail className="text-blue-600" />
            <span>Test Configuration Email</span>
          </h2>
          <p className="text-gray-600 mt-2">Testez votre configuration SMTP pour la 2FA</p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`px-4 py-2 rounded-lg border transition-colors flex items-center space-x-2 ${
            showConfig 
              ? 'bg-gray-100 border-gray-300 text-gray-700' 
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          <Settings size={16} />
          <span>{showConfig ? 'Masquer' : 'Voir'} la config</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test d'envoi */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Test d'envoi</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email de test
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="test@exemple.com"
              />
            </div>

            <button
              onClick={handleTestEmail}
              disabled={isLoading || !testEmail}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Envoyer un email de test</span>
                </>
              )}
            </button>

            {/* Résultat du test */}
            {lastResult && (
              <div className={`p-4 rounded-lg border ${
                lastResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start space-x-3">
                  {lastResult.success ? (
                    <CheckCircle size={20} className="text-green-600 mt-0.5" />
                  ) : (
                    <XCircle size={20} className="text-red-600 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      lastResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {lastResult.message}
                    </p>
                    <p className={`text-sm mt-1 ${
                      lastResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {lastResult.details}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Configurations rapides */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Configurations rapides</h3>
          
          <div className="space-y-3">
            {commonConfigs.map((config, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{config.name}</p>
                    <p className="text-sm text-gray-500">{config.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {config.host}:{config.port}
                    </p>
                  </div>
                  <button
                    onClick={() => applyQuickConfig(config)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Utiliser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Configuration détaillée */}
      {showConfig && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Configuration SMTP</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serveur SMTP
              </label>
              <input
                type="text"
                value={emailConfig.host}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, host: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="smtp.gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port
              </label>
              <input
                type="number"
                value={emailConfig.port}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, port: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="587"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom d'utilisateur
              </label>
              <input
                type="email"
                value={emailConfig.user}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, user: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="votre.email@gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={emailConfig.pass}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, pass: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 mb-6">
            <input
              type="checkbox"
              id="secure"
              checked={emailConfig.secure}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, secure: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="secure" className="text-sm text-gray-700">
              Connexion sécurisée (SSL/TLS)
            </label>
          </div>

          {/* Variables d'environnement */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Variables d'environnement (.env)</h4>
            <pre className="text-sm text-gray-700 bg-white p-3 rounded border overflow-x-auto">
              {getConfigInstructions()}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(getConfigInstructions());
                addNotification('Configuration copiée dans le presse-papiers', 'success');
              }}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              📋 Copier la configuration
            </button>
          </div>
        </div>
      )}

      {/* Instructions et conseils */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="font-semibold text-yellow-900 mb-4 flex items-center space-x-2">
            <AlertTriangle size={20} />
            <span>Instructions importantes</span>
          </h3>
          <div className="space-y-3 text-yellow-800 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
              <p><strong>Gmail :</strong> Activez la vérification en 2 étapes et générez un "mot de passe d'application"</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
              <p><strong>Production :</strong> Utilisez un service transactionnel (SendGrid, Mailgun) pour une meilleure délivrabilité</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
              <p><strong>Sécurité :</strong> Ne jamais committer les mots de passe dans le code source</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center space-x-2">
            <CheckCircle size={20} />
            <span>Bonnes pratiques</span>
          </h3>
          <div className="space-y-3 text-blue-800 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <p>Utilisez des variables d'environnement pour la configuration</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <p>Testez régulièrement la configuration en développement</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <p>Surveillez les logs d'erreurs SMTP en production</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <p>Configurez SPF/DKIM pour éviter le spam</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTestComponent;