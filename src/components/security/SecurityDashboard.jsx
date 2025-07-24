// src/components/security/SecurityDashboard.jsx - Dashboard sécurité utilisateur
import React, { useState, useEffect } from 'react';
import { Shield, MapPin, Monitor, Clock, AlertTriangle, CheckCircle, XCircle, LogOut, RefreshCw, Eye, Smartphone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { authApi } from '../../utils/api';

const SecurityDashboard = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [loginHistory, setLoginHistory] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [securityStats, setSecurityStats] = useState({
    totalLogins: 0,
    suspiciousAttempts: 0,
    newLocations: 0,
    newDevices: 0
  });
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState({});

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Charger l'historique des connexions
      const historyResponse = await fetch('/gestion-locative/api/auth/login-history?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setLoginHistory(historyData.data || []);
        
        // Calculer les statistiques
        const stats = historyData.data.reduce((acc, login) => {
          acc.totalLogins++;
          if (login.suspicious_score > 30) acc.suspiciousAttempts++;
          if (login.suspicious_score > 0) acc.newLocations++;
          return acc;
        }, { totalLogins: 0, suspiciousAttempts: 0, newLocations: 0, newDevices: 0 });
        
        setSecurityStats(stats);
      }
      
    } catch (error) {
      console.error('Erreur chargement données sécurité:', error);
      addNotification('Erreur lors du chargement des données de sécurité', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutOtherSessions = async () => {
    try {
      const response = await fetch('/gestion-locative/api/auth/logout-other-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        addNotification(`${result.closedSessions} session(s) fermée(s)`, 'success');
        loadSecurityData(); // Recharger les données
      } else {
        addNotification('Erreur lors de la fermeture des sessions', 'error');
      }
    } catch (error) {
      console.error('Erreur fermeture sessions:', error);
      addNotification('Erreur lors de la fermeture des sessions', 'error');
    }
  };

  const toggleDetails = (index) => {
    setShowDetails(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getLocationDisplay = (login) => {
    if (login.location && login.location !== 'Localisation inconnue') {
      return login.location;
    }
    return 'Localisation inconnue';
  };

  const getDeviceIcon = (deviceInfo) => {
    if (deviceInfo.toLowerCase().includes('mobile') || deviceInfo.toLowerCase().includes('android') || deviceInfo.toLowerCase().includes('ios')) {
      return <Smartphone size={16} />;
    }
    return <Monitor size={16} />;
  };

  const getTrustLevelColor = (level) => {
    switch (level) {
      case 'Confiance': return 'text-green-600 bg-green-50 border-green-200';
      case 'Moyen': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Suspect': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays} jour(s)`;
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3">
          <RefreshCw size={20} className="animate-spin text-blue-600" />
          <span className="text-gray-600">Chargement des données de sécurité...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Shield className="text-blue-600" />
            <span>Sécurité de votre compte</span>
          </h2>
          <p className="text-gray-600 mt-2">Surveillez l'activité de votre compte et gérez vos sessions</p>
        </div>
        <button
          onClick={loadSecurityData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <RefreshCw size={16} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Statistiques de sécurité */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Connexions (30j)</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{securityStats.totalLogins}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <Shield size={20} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Tentatives suspectes</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{securityStats.suspiciousAttempts}</p>
            </div>
            <div className="p-3 rounded-full bg-orange-100">
              <AlertTriangle size={20} className="text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Nouvelles localisations</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{securityStats.newLocations}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <MapPin size={20} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Protection 2FA</p>
              <p className="text-2xl font-bold text-green-600 mt-1">Activée</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircle size={20} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Sessions actives */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Sessions actives</h3>
          <button
            onClick={handleLogoutOtherSessions}
            className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center space-x-1"
          >
            <LogOut size={16} />
            <span>Fermer les autres sessions</span>
          </button>
        </div>

        <div className="space-y-3">
          {loginHistory.filter(login => login.isCurrentSession).length > 0 ? (
            loginHistory.filter(login => login.isCurrentSession).map((session, index) => (
              <div key={index} className="border border-green-200 bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      {getDeviceIcon(session.device_info)}
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Session actuelle</p>
                      <p className="text-sm text-green-700">{session.device_info} • {session.browser_info}</p>
                      <p className="text-xs text-green-600 flex items-center space-x-1 mt-1">
                        <MapPin size={12} />
                        <span>{getLocationDisplay(session)}</span>
                        <span>•</span>
                        <span>{formatDate(session.created_at)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 text-sm font-medium">Actuelle</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Shield size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucune session active détectée</p>
            </div>
          )}
        </div>
      </div>

      {/* Historique des connexions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Historique des connexions</h3>
        
        {loginHistory.length > 0 ? (
          <div className="space-y-3">
            {loginHistory.slice(0, 10).map((login, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      {login.success ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <XCircle size={16} className="text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">
                          {login.success ? 'Connexion réussie' : 'Tentative échouée'}
                        </p>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getTrustLevelColor(login.trustLevel)}`}>
                          {login.trustLevel}
                        </span>
                        {login.isCurrentSession && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            Session actuelle
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          {getDeviceIcon(login.device_info)}
                          <span>{login.device_info}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin size={12} />
                          <span>{getLocationDisplay(login)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={12} />
                          <span>{formatDate(login.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleDetails(index)}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    <Eye size={16} />
                  </button>
                </div>

                {/* Détails étendus */}
                {showDetails[index] && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Détails techniques</p>
                        <div className="mt-2 space-y-1 text-gray-600">
                          <p><strong>Navigateur :</strong> {login.browser_info}</p>
                          <p><strong>Système :</strong> {login.device_info}</p>
                          <p><strong>Adresse IP :</strong> {login.ip_address}</p>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Sécurité</p>
                        <div className="mt-2 space-y-1 text-gray-600">
                          <p><strong>Score de suspicion :</strong> {login.suspicious_score || 0}/100</p>
                          <p><strong>2FA utilisée :</strong> {login.two_fa_used ? 'Oui' : 'Non'}</p>
                          <p><strong>Niveau de confiance :</strong> {login.trustLevel}</p>
                        </div>
                      </div>
                    </div>
                    
                    {login.suspicious_score > 30 && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-yellow-800">Activité potentiellement suspecte</p>
                            <p className="text-yellow-700 mt-1">
                              Cette connexion a été marquée comme suspecte en raison de facteurs inhabituels 
                              (nouvelle localisation, nouvel appareil, horaire inhabituel).
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loginHistory.length > 10 && (
              <div className="text-center pt-4">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Voir plus d'historique ({loginHistory.length - 10} connexion(s) supplémentaire(s))
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucun historique de connexion disponible</p>
          </div>
        )}
      </div>

      {/* Conseils de sécurité */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-4 flex items-center space-x-2">
          <Shield size={20} />
          <span>Conseils de sécurité</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <CheckCircle size={16} className="text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Surveillez votre historique</p>
                <p>Vérifiez régulièrement vos connexions récentes</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle size={16} className="text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Utilisez des appareils de confiance</p>
                <p>Évitez les ordinateurs publics pour vous connecter</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <CheckCircle size={16} className="text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Changez votre mot de passe</p>
                <p>Mettez à jour votre mot de passe tous les 3 mois</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle size={16} className="text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Fermez les sessions inactives</p>
                <p>Déconnectez-vous de tous les appareils inutilisés</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;