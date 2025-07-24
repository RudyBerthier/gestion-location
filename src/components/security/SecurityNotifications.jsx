// src/components/security/SecurityNotifications.jsx - Système de notifications sécurité
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, X, MapPin, Monitor, Clock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const SecurityNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    checkSecurityAlerts();
    
    // Vérifier les alertes toutes les 5 minutes
    const interval = setInterval(checkSecurityAlerts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  const checkSecurityAlerts = async () => {
    if (!user) return;

    try {
      const response = await fetch('/gestion-locative/api/auth/security-alerts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.alerts) {
          setNotifications(data.alerts.filter(alert => !dismissed.has(alert.id)));
        }
      }
    } catch (error) {
      console.error('Erreur vérification alertes sécurité:', error);
    }
  };

  const dismissNotification = (notificationId) => {
    setDismissed(prev => new Set([...prev, notificationId]));
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const SecurityAlert = ({ alert, onDismiss }) => {
    const [showDetails, setShowDetails] = useState(false);

    const getAlertIcon = () => {
      switch (alert.type) {
        case 'suspicious_login':
          return <AlertTriangle size={20} className="text-yellow-600" />;
        case 'new_location':
          return <MapPin size={20} className="text-blue-600" />;
        case 'new_device':
          return <Monitor size={20} className="text-purple-600" />;
        case 'multiple_attempts':
          return <Shield size={20} className="text-red-600" />;
        default:
          return <AlertTriangle size={20} className="text-gray-600" />;
      }
    };

    const getAlertColor = () => {
      switch (alert.severity) {
        case 'high':
          return 'border-red-200 bg-red-50';
        case 'medium':
          return 'border-yellow-200 bg-yellow-50';
        case 'low':
          return 'border-blue-200 bg-blue-50';
        default:
          return 'border-gray-200 bg-gray-50';
      }
    };

    const getAlertTitle = () => {
      switch (alert.type) {
        case 'suspicious_login':
          return 'Connexion suspecte détectée';
        case 'new_location':
          return 'Connexion depuis une nouvelle localisation';
        case 'new_device':
          return 'Connexion depuis un nouvel appareil';
        case 'multiple_attempts':
          return 'Tentatives de connexion multiples';
        default:
          return 'Alerte de sécurité';
      }
    };

    return (
      <div className={`border rounded-lg p-4 mb-3 ${getAlertColor()}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="mt-0.5">
              {getAlertIcon()}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{getAlertTitle()}</h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title={showDetails ? "Masquer les détails" : "Voir les détails"}
                  >
                    {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Ignorer cette alerte"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
              
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock size={12} />
                  <span>{new Date(alert.timestamp).toLocaleString('fr-FR')}</span>
                </div>
                {alert.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin size={12} />
                    <span>{alert.location}</span>
                  </div>
                )}
              </div>

              {showDetails && (
                <div className="mt-3 p-3 bg-white rounded-lg border">
                  <h5 className="font-medium text-gray-900 mb-2">Détails de l'alerte</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    <div>
                      <p><strong>Type :</strong> {alert.type}</p>
                      <p><strong>Sévérité :</strong> {alert.severity}</p>
                      <p><strong>Score de risque :</strong> {alert.riskScore || 'N/A'}/100</p>
                    </div>
                    <div>
                      <p><strong>Adresse IP :</strong> {alert.ipAddress || 'Inconnue'}</p>
                      <p><strong>Appareil :</strong> {alert.device || 'Inconnu'}</p>
                      <p><strong>Navigateur :</strong> {alert.browser || 'Inconnu'}</p>
                    </div>
                  </div>
                  
                  {alert.recommendations && (
                    <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                      <p className="font-medium text-blue-900 text-sm mb-1">Recommandations :</p>
                      <ul className="text-xs text-blue-800 space-y-1">
                        {alert.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start space-x-1">
                            <span className="text-blue-600">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Notification toast pour les alertes en temps réel
  const SecurityToast = ({ alert, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(alert.id), 300);
      }, 8000); // Disparaît après 8 secondes

      return () => clearTimeout(timer);
    }, [alert.id, onDismiss]);

    if (!isVisible) return null;

    return (
      <div className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}>
        <div className="bg-white border-l-4 border-yellow-500 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start space-x-3">
            <AlertTriangle size={20} className="text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Alerte de sécurité</h4>
              <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
              <button
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(() => onDismiss(alert.id), 300);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
              >
                Voir les détails →
              </button>
            </div>
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onDismiss(alert.id), 300);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Ne rien afficher si pas d'utilisateur ou pas de notifications
  if (!user || notifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Notifications dans le dashboard */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Shield size={20} className="text-red-600" />
            <span>Alertes de sécurité récentes</span>
          </h3>
          {notifications.length > 0 && (
            <button
              onClick={() => {
                setDismissed(new Set(notifications.map(n => n.id)));
                setNotifications([]);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Ignorer toutes ({notifications.length})
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {notifications.map((notification) => (
            <SecurityAlert
              key={notification.id}
              alert={notification}
              onDismiss={dismissNotification}
            />
          ))}
        </div>
      </div>

      {/* Toasts pour les alertes en temps réel */}
      {notifications
        .filter(n => n.isRealtime)
        .map((notification) => (
          <SecurityToast
            key={`toast-${notification.id}`}
            alert={notification}
            onDismiss={dismissNotification}
          />
        ))}
    </>
  );
};

// Hook pour utiliser les notifications de sécurité dans d'autres composants
export const useSecurityNotifications = () => {
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const response = await fetch('/gestion-locative/api/auth/security-alerts-count', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setHasUnreadAlerts(data.hasUnread || false);
          setAlertCount(data.count || 0);
        }
      } catch (error) {
        console.error('Erreur vérification nombre alertes:', error);
      }
    };

    checkAlerts();
    
    // Vérifier toutes les 2 minutes
    const interval = setInterval(checkAlerts, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { hasUnreadAlerts, alertCount };
};

// Composant indicateur d'alertes pour la navigation
export const SecurityAlertIndicator = () => {
  const { hasUnreadAlerts, alertCount } = useSecurityNotifications();

  if (!hasUnreadAlerts) return null;

  return (
    <div className="relative">
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
      {alertCount > 0 && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        </div>
      )}
    </div>
  );
};

export default SecurityNotifications;