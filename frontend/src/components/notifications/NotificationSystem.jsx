// src/components/notifications/NotificationSystem.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Check, AlertTriangle, Info, Calendar, Euro, Home, Users, Settings, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';

const NotificationSystem = () => {
  const { user } = useAuth();
  const { apartments, tenants } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, important
  const buttonRef = useRef(null);
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    browser: true,
    rentReminders: true,
    documentExpiry: true,
    maintenanceAlerts: true,
    financialAlerts: true
  });

  // Génération des notifications basées sur les données
  useEffect(() => {
    const generateNotifications = () => {
      const newNotifications = [];
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Notifications pour appartements vacants
      apartments.filter(apt => apt.statut === 'libre').forEach(apt => {
        newNotifications.push({
          id: `vacant-${apt.id}`,
          type: 'warning',
          category: 'property',
          title: 'Appartement vacant',
          message: `${apt.titre} est libre depuis plusieurs jours`,
          timestamp: new Date(today.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000),
          isRead: false,
          isImportant: true,
          actionable: true,
          actions: [
            { label: 'Voir l\'appartement', action: () => window.location.href = `/apartments/${apt.id}` },
            { label: 'Publier annonce', action: () => console.log('Publier annonce') }
          ]
        });
      });

      // Notifications pour loyers à venir
      tenants.filter(tenant => tenant.location_statut === 'active').forEach(tenant => {
        newNotifications.push({
          id: `rent-${tenant.id}`,
          type: 'info',
          category: 'financial',
          title: 'Loyer à encaisser',
          message: `Loyer de ${tenant.prenom} ${tenant.nom} - ${tenant.loyer_mensuel}€`,
          timestamp: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
          isRead: Math.random() > 0.5,
          isImportant: false,
          actionable: true,
          actions: [
            { label: 'Marquer comme reçu', action: () => console.log('Marquer reçu') },
            { label: 'Générer quittance', action: () => console.log('Générer quittance') }
          ]
        });
      });

      // Notifications système
      if (user?.derniere_connexion) {
        const lastLogin = new Date(user.derniere_connexion);
        const daysSince = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));
        
        if (daysSince > 7) {
          newNotifications.push({
            id: 'welcome-back',
            type: 'info',
            category: 'system',
            title: 'Bon retour !',
            message: `Vous ne vous étiez pas connecté depuis ${daysSince} jours`,
            timestamp: new Date(),
            isRead: false,
            isImportant: false,
            actionable: false
          });
        }
      }

      // Notifications d'optimisation
      const occupancyRate = apartments.length > 0 ? 
        (apartments.filter(apt => apt.statut === 'occupé').length / apartments.length) * 100 : 0;

      if (occupancyRate < 80) {
        newNotifications.push({
          id: 'low-occupancy',
          type: 'warning',
          category: 'business',
          title: 'Taux d\'occupation faible',
          message: `Votre taux d'occupation est de ${occupancyRate.toFixed(1)}%`,
          timestamp: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
          isRead: false,
          isImportant: true,
          actionable: true,
          actions: [
            { label: 'Voir conseils', action: () => console.log('Voir conseils') },
            { label: 'Analyser le marché', action: () => console.log('Analyser marché') }
          ]
        });
      }

      // Trier par importance puis par date
      newNotifications.sort((a, b) => {
        if (a.isImportant && !b.isImportant) return -1;
        if (!a.isImportant && b.isImportant) return 1;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      setNotifications(newNotifications);
    };

    generateNotifications();
  }, [apartments, tenants, user]);

  // Filtrage des notifications
  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.isRead;
    if (filter === 'important') return notif.isImportant;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const [menuPosition, setMenuPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

  // Calculer la position du menu quand il s'ouvre
  useEffect(() => {
    if (showNotifications && buttonRef.current) {
      const updatePosition = () => {
        const rect = buttonRef.current.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const menuWidth = 384; // w-96 = 384px
        const menuHeight = 512; // max-h-[32rem] = 512px
        
        let top = rect.bottom + 8;
        let left = rect.right - menuWidth;
        
        // Ajuster si le menu dépasse à droite
        if (left < 20) {
          left = 20;
        }
        
        // Ajuster si le menu dépasse en bas
        if (top + menuHeight > windowHeight - 20) {
          top = rect.top - menuHeight - 8;
        }
        
        // Si ça dépasse encore en haut, le coller en haut
        if (top < 20) {
          top = 20;
        }
        
        setMenuPosition({
          top: `${top}px`,
          left: `${left}px`,
          transform: 'none'
        });
      };
      
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [showNotifications]);

  // Calculer la position du menu
  const getMenuPosition = () => {
    if (!buttonRef.current) return { top: '4rem', right: '1rem' };
    
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: `${rect.bottom + 8}px`,
      right: `${window.innerWidth - rect.right}px`
    };
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'error': return <X className="h-5 w-5 text-red-500" />;
      case 'success': return <Check className="h-5 w-5 text-green-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'property': return <Home className="h-4 w-4" />;
      case 'financial': return <Euro className="h-4 w-4" />;
      case 'tenant': return <Users className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return new Date(timestamp).toLocaleDateString('fr-FR');
  };

  return (
    <>
      {/* Bouton de notification dans la barre de navigation */}
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Panel des notifications - AVEC PORTAIL */}
        {showNotifications && createPortal(
          <>
            {/* Overlay pour fermer en cliquant en dehors - Plus discret */}
            <div 
              className="fixed inset-0 z-[9998] bg-transparent"
              onClick={() => setShowNotifications(false)}
            />
            
            {/* Menu des notifications - Position calculée intelligemment */}
            <div 
              className="fixed w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] max-h-[32rem] overflow-hidden"
              style={{
                ...menuPosition,
                maxWidth: 'calc(100vw - 40px)'
              }}
            >
              {/* En-tête */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                {/* Filtres */}
                <div className="flex space-x-2">
                  {[
                    { key: 'all', label: 'Toutes', count: notifications.length },
                    { key: 'unread', label: 'Non lues', count: unreadCount },
                    { key: 'important', label: 'Importantes', count: notifications.filter(n => n.isImportant).length }
                  ].map(filterOption => (
                    <button
                      key={filterOption.key}
                      onClick={() => setFilter(filterOption.key)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filter === filterOption.key
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filterOption.label} ({filterOption.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Liste des notifications */}
              <div className="max-h-80 overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Aucune notification</p>
                    <p className="text-sm">Vous êtes à jour ! 🎉</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredNotifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          !notification.isRead ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getTypeIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              {getCategoryIcon(notification.category)}
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {notification.title}
                              </p>
                              {notification.isImportant && (
                                <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">
                                  Important
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                              
                              <div className="flex items-center space-x-2">
                                {!notification.isRead && (
                                  <button
                                    onClick={() => markAsRead(notification.id)}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    Marquer lu
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteNotification(notification.id)}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            {notification.actionable && notification.actions && (
                              <div className="flex space-x-2 mt-3">
                                {notification.actions.map((action, index) => (
                                  <button
                                    key={index}
                                    onClick={action.action}
                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Tout marquer comme lu
                    </button>
                    <button className="text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-1">
                      <Settings size={14} />
                      <span>Paramètres</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>,
          document.body
        )}
      </div>

      {/* Modal de paramètres de notifications */}
      <NotificationSettings 
        settings={notificationSettings}
        onSettingsChange={setNotificationSettings}
      />
    </>
  );
};

// Composant des paramètres de notifications
const NotificationSettings = ({ settings, onSettingsChange }) => {
  const [showSettings, setShowSettings] = useState(false);

  const updateSetting = (key, value) => {
    onSettingsChange(prev => ({ ...prev, [key]: value }));
  };

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Paramètres des notifications</h2>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-4">Canaux de notification</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notifications email</p>
                  <p className="text-sm text-gray-500">Recevoir par email</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.email}
                  onChange={(e) => updateSetting('email', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notifications navigateur</p>
                  <p className="text-sm text-gray-500">Alertes dans le navigateur</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.browser}
                  onChange={(e) => updateSetting('browser', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-4">Types de notifications</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Rappels de loyer</p>
                  <p className="text-sm text-gray-500">Échéances et retards</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.rentReminders}
                  onChange={(e) => updateSetting('rentReminders', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Documents expirés</p>
                  <p className="text-sm text-gray-500">Assurances, baux, etc.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.documentExpiry}
                  onChange={(e) => updateSetting('documentExpiry', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertes maintenance</p>
                  <p className="text-sm text-gray-500">Travaux et réparations</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.maintenanceAlerts}
                  onChange={(e) => updateSetting('maintenanceAlerts', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertes financières</p>
                  <p className="text-sm text-gray-500">Revenus et dépenses</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.financialAlerts}
                  onChange={(e) => updateSetting('financialAlerts', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={() => setShowSettings(false)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enregistrer les paramètres
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSystem;