import React, { useState, useEffect } from 'react';
import { Save, User, Building, Euro, Database, Bell, Shield, Eye, EyeOff, CreditCard, RefreshCw, Clock, Wifi, WifiOff, AlertTriangle, CheckCircle, Mail, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { goCardlessApi, authApi } from '../../utils/api';
import { useSearchParams } from 'react-router-dom';
import EmailTestComponent from '../admin/EmailTestComponent';
import TwoFADashboard from '../admin/TwoFADashboard';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { addNotification } = useNotifications();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // États pour GoCardless (améliorés)
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [loadingBanking, setLoadingBanking] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountDetails, setAccountDetails] = useState(null);
  const [bankMetadata, setBankMetadata] = useState(null);

  // NOUVEAUX ÉTATS POUR 2FA
  const [twoFASettings, setTwoFASettings] = useState({
    enabled: true, // 2FA toujours activée dans ce système
    emailNotifications: true,
    securityAlerts: true,
    loginHistory: true
  });
  const [twoFAStats, setTwoFAStats] = useState(null);
  const [loadingTwoFA, setLoadingTwoFA] = useState(false);
  
  const [settings, setSettings] = useState({
    profile: {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      entreprise: ''
    },
    preferences: {
      devise: 'EUR',
      langue: 'fr',
      notifications_email: true,
      notifications_retards: true,
      sauvegarde_auto: true
    },
    finance: {
      taux_tva: 20,
      frais_gestion: 8,
      commission_agence: 0
    },
    password: {
      current_password: '',
      new_password: '',
      confirm_password: ''
    }
  });

  // Charger l'onglet depuis l'URL au montage
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['profile', 'preferences', 'finance', 'banking', 'security', 'data', 'admin-email', 'admin-2fa'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Charger les statistiques 2FA si admin
  useEffect(() => {
    if (activeTab === 'admin-2fa' && user?.email === 'admin@gestion-locative.fr') {
      loadTwoFAStats();
    }
  }, [activeTab, user]);

  const loadTwoFAStats = async () => {
    try {
      setLoadingTwoFA(true);
      const response = await authApi.get2FAStats();
      if (response.success) {
        setTwoFAStats(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement stats 2FA:', error);
    } finally {
      setLoadingTwoFA(false);
    }
  };

  // Composant d'état bancaire intégré
  const BankDataStatus = ({ metadata, onRefresh, isLoading }) => {
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
      const updateTimeAgo = () => {
        if (!metadata?.age) return;
        
        const minutes = metadata.age;
        if (minutes < 60) {
          setTimeAgo(`${minutes} min`);
        } else if (minutes < 1440) {
          setTimeAgo(`${Math.round(minutes / 60)}h`);
        } else {
          setTimeAgo(`${Math.round(minutes / 1440)} jour(s)`);
        }
      };

      updateTimeAgo();
      const interval = setInterval(updateTimeAgo, 60000);

      return () => clearInterval(interval);
    }, [metadata?.age]);

    if (!metadata) return null;

    const getStatusConfig = () => {
      if (metadata.error && metadata.error.includes('Limite API')) {
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          title: 'Limite API atteinte',
          description: metadata.stale ? 'Données anciennes affichées' : 'Données en cache utilisées'
        };
      }

      if (metadata.fromCache && metadata.stale) {
        return {
          icon: WifiOff,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Données obsolètes',
          description: 'Synchronisation impossible, données anciennes'
        };
      }

      if (metadata.fromCache) {
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Données en cache',
          description: 'Synchronisation non nécessaire'
        };
      }

      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        title: 'Données actualisées',
        description: 'Synchronisation récente avec votre banque'
      };
    };

    const config = getStatusConfig();
    const StatusIcon = config.icon;

    return (
      <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3 mb-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusIcon size={20} className={config.color} />
            <div>
              <div className="flex items-center space-x-2">
                <p className={`font-medium ${config.color}`}>{config.title}</p>
                {timeAgo && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {timeAgo}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{config.description}</p>
              {metadata.lastRefresh && (
                <p className="text-xs text-gray-500 mt-1">
                  Dernière sync: {metadata.lastRefresh}
                </p>
              )}
            </div>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`p-2 rounded-lg transition-colors ${
                isLoading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800'
              }`}
              title="Actualiser les données"
            >
              <RefreshCw 
                size={16} 
                className={isLoading ? 'animate-spin' : ''} 
              />
            </button>
          )}
        </div>

        {/* Indicateur de limite API */}
        {metadata.error && metadata.error.includes('Limite API') && (
          <div className="mt-3 pt-3 border-t border-orange-200">
            <div className="flex items-center space-x-2 text-sm text-orange-700">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="w-2 h-2 bg-orange-300 rounded-full"></div>
                <div className="w-2 h-2 bg-orange-300 rounded-full"></div>
                <div className="w-2 h-2 bg-orange-300 rounded-full"></div>
              </div>
              <span>Limite quotidienne: 4/4 utilisées</span>
            </div>
            <p className="text-xs text-orange-600 mt-1">
              Les données seront actualisées automatiquement demain.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Charger les données utilisateur au montage
  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        profile: {
          nom: user.nom || '',
          prenom: user.prenom || '',
          email: user.email || '',
          telephone: user.telephone || '',
          entreprise: user.entreprise || ''
        },
        preferences: {
          devise: user.devise || 'EUR',
          langue: user.langue || 'fr',
          notifications_email: user.notifications_email !== undefined ? user.notifications_email : true,
          notifications_retards: user.notifications_retards !== undefined ? user.notifications_retards : true,
          sauvegarde_auto: user.sauvegarde_auto !== undefined ? user.sauvegarde_auto : true
        },
        finance: {
          taux_tva: user.taux_tva || 20,
          frais_gestion: user.frais_gestion || 8,
          commission_agence: user.commission_agence || 0
        }
      }));

      // Si l'utilisateur a une connexion GoCardless, charger ses comptes
      if (user.gocardless_requisition_id) {
        loadBankAccounts();
      }
    }
  }, [user]);

  // Charger les institutions bancaires françaises
  useEffect(() => {
    if (activeTab === 'banking') {
      loadInstitutions();
    }
  }, [activeTab]);

  const loadInstitutions = async () => {
    try {
      const data = await goCardlessApi.getInstitutions('FR');
      setInstitutions(data);
    } catch (error) {
      console.error('Erreur chargement institutions:', error);
      addNotification('Erreur lors du chargement des banques', 'error');
    }
  };

  const loadBankAccounts = async (forceRefresh = false) => {
    try {
      setLoadingBanking(true);
      const url = forceRefresh ? '/gocardless/accounts?refresh=true' : '/gocardless/accounts';
      
      const response = await fetch(`/gestion-locative/api${url}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBankAccounts(result.data.accounts || []);
        setBankMetadata(result.data.metadata);
        
        // Messages informatifs
        if (result.data.metadata?.fromCache && result.data.metadata?.error) {
          addNotification(result.data.metadata.error, 'warning');
        } else if (result.data.metadata?.fromCache) {
          addNotification(`Données en cache (${result.data.metadata.age} min)`, 'info');
        } else {
          addNotification('Données actualisées depuis votre banque', 'success');
        }
        
        if (result.data.accounts?.length > 0) {
          setSelectedAccount(result.data.accounts[0]);
          loadAccountDetails(result.data.accounts[0], forceRefresh);
        }
      } else {
        throw new Error(result.message || 'Erreur lors du chargement');
      }
      
    } catch (error) {
      console.error('Erreur chargement comptes:', error);
      
      if (error.message.includes('Rate limit') || error.message.includes('limit')) {
        addNotification('Limite API atteinte - Données en cache utilisées', 'warning');
      } else {
        addNotification('Erreur lors du chargement des comptes', 'error');
      }
    } finally {
      setLoadingBanking(false);
    }
  };

  const loadAccountDetails = async (accountId, forceRefresh = false) => {
    try {
      const refreshParam = forceRefresh ? '?refresh=true' : '';
      
      const [detailsResponse, balancesResponse] = await Promise.all([
        fetch(`/gestion-locative/api/gocardless/accounts/${accountId}/details${refreshParam}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/gestion-locative/api/gocardless/accounts/${accountId}/balances${refreshParam}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      
      const details = await detailsResponse.json();
      const balances = await balancesResponse.json();
      
      if (details.success && balances.success) {
        setAccountDetails({
          ...details.data,
          balances: balances.data.balances || [],
          metadata: details.data.metadata || balances.data.metadata
        });
      }
      
    } catch (error) {
      console.error('Erreur chargement détails compte:', error);
      addNotification('Erreur lors du chargement des détails', 'error');
    }
  };

  const handleBankConnection = async () => {
    if (!selectedInstitution) {
      addNotification('Veuillez sélectionner une banque', 'warning');
      return;
    }

    try {
      setLoadingBanking(true);
      
      const requisition = await goCardlessApi.createRequisition({
        institution_id: selectedInstitution,
        reference: `user_${user.id}_${Date.now()}`,
        user_language: 'fr'
      });

      if (requisition.success && requisition.data.link) {
        // Solution propre avec _blank
        const popup = window.open(requisition.data.link, '_blank');
        
        // Vérifier si la pop-up a été bloquée
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          // Fallback si bloquée : redirection directe
          addNotification('Pop-up bloquée, redirection en cours...', 'info');
          window.location.href = requisition.data.link;
        } else {
          addNotification('Redirection vers votre banque...', 'info');
        }
      } else {
        addNotification('Erreur lors de la création du lien bancaire', 'error');
      }
      
    } catch (error) {
      console.error('Erreur connexion bancaire:', error);
      addNotification('Erreur lors de la connexion bancaire', 'error');
    } finally {
      setLoadingBanking(false);
    }
  };

  const handleBankDisconnect = async () => {
    if (!user.gocardless_requisition_id) return;

    try {
      setLoadingBanking(true);
      
      const result = await goCardlessApi.deleteRequisition(user.gocardless_requisition_id);
      
      if (result.success) {
        setBankAccounts([]);
        setSelectedAccount(null);
        setAccountDetails(null);
        setBankMetadata(null);
        addNotification('Connexion bancaire supprimée', 'success');
        
        // Recharger les données utilisateur
        window.location.reload();
      } else {
        addNotification('Erreur lors de la déconnexion bancaire', 'error');
      }
      
    } catch (error) {
      console.error('Erreur déconnexion bancaire:', error);
      addNotification('Erreur lors de la déconnexion bancaire', 'error');
    } finally {
      setLoadingBanking(false);
    }
  };

  const handleForceSync = async () => {
    try {
      setLoadingBanking(true);
      
      const response = await fetch('/gestion-locative/api/gocardless/force-sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        addNotification('Synchronisation forcée réussie', 'success');
        await loadBankAccounts(true); // Forcer le refresh
      } else {
        if (result.rateLimitExceeded || result.rateLimitPreventive) {
          addNotification(result.message, 'warning');
        } else {
          addNotification(result.message || 'Erreur lors de la synchronisation', 'error');
        }
      }
      
    } catch (error) {
      console.error('Erreur force sync:', error);
      addNotification('Erreur lors de la synchronisation forcée', 'error');
    } finally {
      setLoadingBanking(false);
    }
  };

  // NOUVELLE FONCTION POUR SAUVEGARDER LES PARAMÈTRES 2FA
  const handleSave2FA = async () => {
    try {
      const result = await updateUser({
        notifications_email: twoFASettings.emailNotifications,
        security_alerts: twoFASettings.securityAlerts,
        login_history: twoFASettings.loginHistory
      });
      
      if (result.success) {
        addNotification('Paramètres de sécurité sauvegardés', 'success');
      } else {
        addNotification(`Erreur: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Erreur sauvegarde 2FA:', error);
      addNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleSave = async (section) => {
    try {
      let dataToUpdate = {};

      switch (section) {
        case 'profil':
          dataToUpdate = settings.profile;
          break;
        case 'préférences':
          dataToUpdate = settings.preferences;
          break;
        case 'finance':
          dataToUpdate = settings.finance;
          break;
        case 'password':
          if (settings.password.new_password !== settings.password.confirm_password) {
            addNotification('Les mots de passe ne correspondent pas', 'error');
            return;
          }
          dataToUpdate = {
            current_password: settings.password.current_password,
            new_password: settings.password.new_password
          };
          break;
        default:
          return;
      }

      const result = await updateUser(dataToUpdate);
      
      if (result.success) {
        addNotification(`Paramètres ${section} sauvegardés`, 'success');
        
        if (section === 'password') {
          setSettings(prev => ({
            ...prev,
            password: {
              current_password: '',
              new_password: '',
              confirm_password: ''
            }
          }));
        }
      } else {
        addNotification(`Erreur: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
      addNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch('/gestion-locative/api/export/data', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gestion-locative-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        addNotification('Données exportées avec succès', 'success');
      } else {
        addNotification('Erreur lors de l\'export', 'error');
      }
    } catch (error) {
      console.error('Erreur export:', error);
      addNotification('Erreur lors de l\'export', 'error');
    }
  };

  // MISE À JOUR DES ONGLETS AVEC 2FA
  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'preferences', label: 'Préférences', icon: Bell },
    { id: 'finance', label: 'Finance', icon: Euro },
    { id: 'banking', label: 'Banque', icon: CreditCard },
    { id: 'security', label: 'Sécurité 2FA', icon: Shield },
    { id: 'data', label: 'Données', icon: Database },
    ...(user?.email === 'admin@gestion-locative.fr' ? [
      { id: 'admin-email', label: 'Test Email', icon: Mail },
      { id: 'admin-2fa', label: 'Dashboard 2FA', icon: SettingsIcon }
    ] : [])
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600 mt-2">Gérez vos préférences et paramètres de l'application</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon size={20} />
                  <span>{tab.label}</span>
                  {tab.id === 'security' && (
                    <span className="ml-auto bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      2FA
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Informations de profil</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                      <input
                        type="text"
                        value={settings.profile.prenom}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          profile: { ...prev.profile, prenom: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Votre prénom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                      <input
                        type="text"
                        value={settings.profile.nom}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          profile: { ...prev.profile, nom: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={settings.profile.email}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, email: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="votre.email@exemple.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={settings.profile.telephone}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, telephone: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Entreprise</label>
                    <input
                      type="text"
                      value={settings.profile.entreprise}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, entreprise: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nom de votre entreprise"
                    />
                  </div>
                  
                  <button
                    onClick={() => handleSave('profil')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Save size={18} />
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Préférences</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                    <select
                      value={settings.preferences.devise}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, devise: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="EUR">Euro (€)</option>
                      <option value="USD">Dollar ($)</option>
                      <option value="GBP">Livre (£)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Langue</label>
                    <select
                      value={settings.preferences.langue}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, langue: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Notifications</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notifications par email</p>
                        <p className="text-sm text-gray-500">Recevoir les notifications importantes par email</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.preferences.notifications_email}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, notifications_email: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Alertes de retard</p>
                        <p className="text-sm text-gray-500">Être notifié des retards de paiement</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.preferences.notifications_retards}
                        onChange={(e) => setSettings(prev => ({
                        ...prev,
                          preferences: { ...prev.preferences, notifications_retards: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Sauvegarde automatique</p>
                        <p className="text-sm text-gray-500">Sauvegarder automatiquement les modifications</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.preferences.sauvegarde_auto}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, sauvegarde_auto: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleSave('préférences')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Save size={18} />
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Paramètres financiers</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Taux de TVA (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.finance.taux_tva}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        finance: { ...prev.finance, taux_tva: parseFloat(e.target.value) }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frais de gestion (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.finance.frais_gestion}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        finance: { ...prev.finance, frais_gestion: parseFloat(e.target.value) }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Commission d'agence (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.finance.commission_agence}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        finance: { ...prev.finance, commission_agence: parseFloat(e.target.value) }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">💡 Information</h4>
                    <p className="text-sm text-blue-800">
                      Ces paramètres seront appliqués automatiquement lors de la génération des factures et des calculs de revenus.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleSave('finance')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Save size={18} />
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'banking' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Connexion bancaire GoCardless</h2>
                <div className="space-y-6">
                  
                  {/* Section connexion */}
                  {!user?.gocardless_requisition_id ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="font-medium text-gray-900 mb-4">Connecter votre banque</h3>
                      <p className="text-gray-600 mb-6">
                        Connectez votre compte bancaire pour synchroniser automatiquement vos transactions 
                        et simplifier la gestion de vos revenus locatifs.
                      </p>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h4 className="font-medium text-blue-900 mb-2">🔒 Sécurité garantie par GoCardless</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Connexion sécurisée via GoCardless (Agrégateur bancaire certifié PSD2)</li>
                          <li>• Vos identifiants bancaires ne transitent jamais par nos serveurs</li>
                          <li>• Accès en lecture seule à vos comptes</li>
                          <li>• Possibilité de déconnecter à tout moment</li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sélectionnez votre banque
                          </label>
                          <select
                            value={selectedInstitution}
                            onChange={(e) => setSelectedInstitution(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            disabled={loadingBanking}
                          >
                            <option value="">Choisissez votre banque...</option>
                            {institutions.map((institution) => (
                              <option key={institution.id} value={institution.id}>
                                {institution.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <button
                          onClick={handleBankConnection}
                          disabled={!selectedInstitution || loadingBanking}
                          className="inline-flex items-center space-x-3 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                        >
                          {loadingBanking ? (
                            <RefreshCw size={20} className="animate-spin" />
                          ) : (
                            <CreditCard size={20} />
                          )}
                          <span>
                            {loadingBanking ? 'Connexion...' : 'Connecter ma banque'}
                          </span>
                        </button>
                        
                        <div className="text-sm text-gray-500">
                          <p>Banques supportées : BNP Paribas, Crédit Agricole, LCL, Société Générale, 
                          Crédit Mutuel, Banque Populaire, Caisse d'Épargne, et plus de 400 autres banques européennes.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Section banque connectée avec composant d'état */
                    <div className="space-y-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <div>
                              <p className="font-medium text-green-900">Banque connectée via GoCardless</p>
                              <p className="text-sm text-green-700">
                                Connexion active - {bankAccounts.length} compte(s) détecté(s)
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleBankDisconnect}
                            disabled={loadingBanking}
                            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm disabled:bg-gray-200"
                          >
                            {loadingBanking ? 'Déconnexion...' : 'Déconnecter'}
                          </button>
                        </div>

                        {/* Composant d'état bancaire */}
                        <BankDataStatus 
                          metadata={bankMetadata} 
                          onRefresh={() => loadBankAccounts(false)}
                          isLoading={loadingBanking}
                        />
                        
                        <div className="flex space-x-4">
                          <button
                            onClick={() => loadBankAccounts(false)}
                            disabled={loadingBanking}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center space-x-2"
                          >
                            {loadingBanking ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <RefreshCw size={16} />
                            )}
                            <span>Rafraîchir (cache)</span>
                          </button>
                          
                          <button
                            onClick={handleForceSync}
                            disabled={loadingBanking}
                            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 flex items-center space-x-2"
                          >
                            {loadingBanking ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <RefreshCw size={16} />
                            )}
                            <span>Forcer sync API</span>
                          </button>
                        </div>
                      </div>

                      {/* Affichage des comptes avec état amélioré */}
                      {bankAccounts.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h3 className="font-medium text-gray-900 mb-4">Vos comptes bancaires</h3>
                          <div className="space-y-3">
                            {bankAccounts.map((accountId, index) => (
                              <div 
                                key={accountId} 
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                  selectedAccount === accountId 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}
                                onClick={() => {
                                  setSelectedAccount(accountId);
                                  loadAccountDetails(accountId);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">Compte {index + 1}</p>
                                    <p className="text-sm text-gray-500">ID: {accountId.substring(0, 8)}...</p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {bankMetadata?.fromCache && (
                                      <div className="flex items-center space-x-1">
                                        <Clock size={12} className="text-blue-500" />
                                        <span className="text-xs text-blue-600">Cache</span>
                                      </div>
                                    )}
                                    {selectedAccount === accountId && (
                                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Détails du compte sélectionné */}
                          {accountDetails && selectedAccount && (
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-900">Détails du compte</h4>
                                {accountDetails.metadata && (
                                  <BankDataStatus 
                                    metadata={accountDetails.metadata} 
                                    onRefresh={() => loadAccountDetails(selectedAccount, true)}
                                    isLoading={loadingBanking}
                                  />
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">Nom du compte</p>
                                  <p className="font-medium">{accountDetails.account?.name || accountDetails.name || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">IBAN</p>
                                  <p className="font-medium">{accountDetails.account?.iban || accountDetails.iban || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Devise</p>
                                  <p className="font-medium">{accountDetails.account?.currency || accountDetails.currency || 'EUR'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Solde actuel</p>
                                  <p className="font-medium text-green-600">
                                    {accountDetails.balances?.[0]?.balanceAmount?.amount || '0'} €
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Paramètres de synchronisation */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Paramètres de synchronisation</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Synchronisation automatique</p>
                          <p className="text-sm text-gray-500">Synchroniser les transactions chaque nuit</p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked={true}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Catégorisation automatique</p>
                          <p className="text-sm text-gray-500">Identifier automatiquement les loyers reçus</p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked={true}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOUVEL ONGLET SÉCURITÉ 2FA */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-xl font-semibold mb-6 flex items-center space-x-3">
                  <Shield className="text-blue-600" />
                  <span>Sécurité et Double Authentification</span>
                </h2>
                
                <div className="space-y-6">
                  {/* Status 2FA */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <CheckCircle size={24} className="text-green-600" />
                      <div>
                        <h3 className="font-semibold text-green-900">Double authentification activée</h3>
                        <p className="text-green-700 text-sm">Votre compte est protégé par une vérification par email</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="flex items-center space-x-2">
                          <Mail size={16} className="text-green-600" />
                          <span className="text-sm font-medium text-green-900">Email vérifié</span>
                        </div>
                        <p className="text-xs text-green-700 mt-1">{user?.email}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="flex items-center space-x-2">
                          <Shield size={16} className="text-green-600" />
                          <span className="text-sm font-medium text-green-900">Codes sécurisés</span>
                        </div>
                        <p className="text-xs text-green-700 mt-1">Expiration 10 min</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="flex items-center space-x-2">
                          <Clock size={16} className="text-green-600" />
                          <span className="text-sm font-medium text-green-900">Limite active</span>
                        </div>
                        <p className="text-xs text-green-700 mt-1">3 codes/heure max</p>
                      </div>
                    </div>
                  </div>

                  {/* Paramètres de notifications 2FA */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Notifications de sécurité</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Notifications de connexion</p>
                          <p className="text-sm text-gray-500">Recevoir un email à chaque connexion</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={twoFASettings.emailNotifications}
                          onChange={(e) => setTwoFASettings(prev => ({
                            ...prev,
                            emailNotifications: e.target.checked
                          }))}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Alertes de sécurité</p>
                          <p className="text-sm text-gray-500">Notifications en cas d'activité suspecte</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={twoFASettings.securityAlerts}
                          onChange={(e) => setTwoFASettings(prev => ({
                            ...prev,
                            securityAlerts: e.target.checked
                          }))}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Historique des connexions</p>
                          <p className="text-sm text-gray-500">Conserver un log des connexions</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={twoFASettings.loginHistory}
                          onChange={(e) => setTwoFASettings(prev => ({
                            ...prev,
                            loginHistory: e.target.checked
                          }))}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={handleSave2FA}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Sauvegarder les préférences
                    </button>
                  </div>

                  {/* Changement de mot de passe */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Changer le mot de passe</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={settings.password.current_password}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              password: { ...prev.password, current_password: e.target.value }
                            }))}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={settings.password.new_password}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              password: { ...prev.password, new_password: e.target.value }
                            }))}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={settings.password.confirm_password}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              password: { ...prev.password, confirm_password: e.target.value }
                            }))}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSave('password')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Changer le mot de passe
                      </button>
                    </div>
                  </div>

                  {/* Informations de sécurité */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-4">ℹ️ Comment fonctionne la 2FA</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                      <div>
                        <p className="font-medium mb-2">À chaque connexion :</p>
                        <ul className="space-y-1">
                          <li>• Un code à 6 chiffres est envoyé par email</li>
                          <li>• Le code expire après 10 minutes</li>
                          <li>• Maximum 3 tentatives par code</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium mb-2">Protection activée :</p>
                        <ul className="space-y-1">
                          <li>• Limitation du taux de demandes</li>
                          <li>• Détection d'activité suspecte</li>
                          <li>• Nettoyage automatique des codes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Gestion des données</h2>
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Sauvegarde</h3>
                    <p className="text-gray-600 mb-4">Exportez toutes vos données pour créer une sauvegarde.</p>
                    <button
                      onClick={exportData}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Exporter les données
                    </button>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Importation</h3>
                    <p className="text-gray-600 mb-4">Importez des données depuis un fichier de sauvegarde.</p>
                    <input
                      type="file"
                      accept=".json"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="font-medium text-red-900 mb-4">⚠️ Zone dangereuse</h3>
                    <p className="text-red-700 mb-4">Supprimez définitivement toutes vos données de l'application.</p>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                      Réinitialiser toutes les données
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLETS ADMIN POUR LES TESTS */}
            {activeTab === 'admin-email' && user?.email === 'rudyberthier@gmail.com' && (
              <EmailTestComponent />
            )}

            {activeTab === 'admin-2fa' && user?.email === 'rudyberthier@gmail.com' && (
              <TwoFADashboard />
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;