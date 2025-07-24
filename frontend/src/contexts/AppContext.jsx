// src/contexts/AppContext.jsx - Version corrigée
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const { isAuthenticated, user, hasToken } = useAuth();
  const { addNotification } = useNotifications();
  
  const [apartments, setApartments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // Fonction utilitaire pour les requêtes API - CORRIGÉE
  const apiRequest = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    
    //console.log(`🌐 API Request ${endpoint}:`, { hasToken: !!token, method: options.method || 'GET' });
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const response = await fetch(`/gestion-locative/api${endpoint}`, config);
    
    //console.log(`🌐 API Response ${endpoint}:`, { status: response.status, statusText: response.statusText, ok: response.ok });
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Session expirée');
    }

    const data = await response.json();
    //console.log(`📄 API Data ${endpoint}:`, data);
    
    // CORRECTION PRINCIPALE: Retourner directement les données pour les arrays
    if (Array.isArray(data)) {
      return data;
    } else {
      return { ...data, status: response.status };
    }
  };

  // Log l'état d'authentification pour le debug
  useEffect(() => {
    //console.log('📊 AppContext - État auth changé:', { isAuthenticated, user: user ? user : null, hasToken });
  }, [isAuthenticated, user, hasToken]);

  // Charger les données initiales
  useEffect(() => {
    
    if (isAuthenticated && user) {
      //console.log('📊 Conditions remplies, chargement des données...');
      loadAllData();
    } else {
      //console.log('📊 Conditions non remplies, reset des données');
      resetData();
    }
  }, [isAuthenticated, user]);

  const resetData = () => {
    //console.log('🔄 Reset des données AppContext');
    setApartments([]);
    setTenants([]);
    setLoading(false);
    setLastSync(null);
  };

  const loadAllData = async (showNotification = false) => {
    const authState = { isAuthenticated, hasUser: !!user, showNotification };
    //console.log('📊 loadAllData appelé:', authState);
    
    if (!isAuthenticated || !user) {
      //console.log('📊 Pas de chargement, utilisateur non connecté ou non défini');
      return;
    }

    setLoading(true);
    try {
      //console.log('📊 Début du chargement des données...');
      
      // Chargement parallèle des données
      const [apartmentsResponse, tenantsResponse] = await Promise.all([
        apiRequest('/apartments'),
        apiRequest('/tenants')
      ]);

      //console.log('🧪 Résultat apartments:', apartmentsResponse);
      //console.log('🧪 Résultat tenants:', tenantsResponse);

      // CORRECTION: Extraction directe des données car apiRequest retourne déjà les bonnes données
      const apartmentsData = Array.isArray(apartmentsResponse) ? apartmentsResponse : [];
      const tenantsData = Array.isArray(tenantsResponse) ? tenantsResponse : [];

      // console.log('📊 Données finales:', { 
      //   apartments: apartmentsData.length, 
      //   tenants: tenantsData.length 
      // });
      //console.log('📊 Appartements extraits:', apartmentsData);
      //console.log('📊 Locataires extraits:', tenantsData);

      setApartments(apartmentsData);
      setTenants(tenantsData);
      setLastSync(new Date());

      //console.log('✅ Chargement terminé avec succès');

    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      
      if (error.message !== 'Session expirée') {
        addNotification('Erreur lors du chargement des données', 'error');
      }
    } finally {
      setLoading(false);
      //console.log('📊 Chargement terminé (finally)');
    }
  };

  // ==================== GESTION APPARTEMENTS ====================

  const createApartment = async (apartmentData) => {
    try {
      //console.log('🏠 Création appartement avec données:', apartmentData);
      
      const result = await apiRequest('/apartments', {
        method: 'POST',
        body: JSON.stringify(apartmentData)
      });
      
      //console.log('🏠 Résultat création appartement:', result);

      if (result.success) {
        await loadAllData();
        return { success: true, id: result.id };
      } else {
        return { success: false, error: result.message || 'Erreur lors de la création' };
      }
    } catch (error) {
      console.error('❌ Erreur création appartement:', error);
      return { success: false, error: error.message || 'Erreur serveur' };
    }
  };

  const updateApartment = async (id, apartmentData) => {
    try {
      //console.log('🏠 Mise à jour appartement ID:', id, 'avec données:', apartmentData);
      
      const result = await apiRequest(`/apartments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(apartmentData)
      });
      
      //console.log('🏠 Résultat mise à jour appartement:', result);

      if (result.success) {
        await loadAllData();
        return { success: true };
      } else {
        return { success: false, error: result.message || 'Erreur lors de la modification' };
      }
    } catch (error) {
      console.error('❌ Erreur modification appartement:', error);
      return { success: false, error: error.message || 'Erreur serveur' };
    }
  };

  const deleteApartment = async (id) => {
    try {
      //console.log('🗑️ Suppression appartement ID:', id);
      
      const result = await apiRequest(`/apartments/${id}`, {
        method: 'DELETE'
      });
      
      //console.log('🗑️ Résultat suppression appartement:', result);

      if (result.success) {
        setApartments(prev => prev.filter(apt => apt.id !== parseInt(id)));
        return { success: true };
      } else {
        return { success: false, error: result.message || 'Erreur lors de la suppression' };
      }
    } catch (error) {
      console.error('❌ Erreur suppression appartement:', error);
      return { success: false, error: error.message || 'Erreur serveur' };
    }
  };

  // ==================== GESTION LOCATAIRES ====================

  const createTenant = async (tenantData) => {
    try {
      //console.log('👥 Création locataire avec données:', tenantData);

      const result = await apiRequest('/tenants', {
        method: 'POST',
        body: JSON.stringify(tenantData)
      });
      
      //console.log('👥 Résultat création locataire:', result);

      if (result.success) {
        await loadAllData();
        return { success: true, id: result.id };
      } else {
        return { success: false, error: result.message || 'Erreur lors de la création' };
      }
    } catch (error) {
      console.error('❌ Erreur création locataire:', error);
      return { success: false, error: error.message || 'Erreur serveur' };
    }
  };

  const updateTenant = async (id, tenantData) => {
    try {
      //console.log('👥 Mise à jour locataire ID:', id, 'avec données:', tenantData);

      const result = await apiRequest(`/tenants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(tenantData)
      });
      
      //console.log('👥 Résultat mise à jour locataire:', result);

      if (result.success) {
        await loadAllData();
        return { success: true };
      } else {
        return { success: false, error: result.message || 'Erreur lors de la modification' };
      }
    } catch (error) {
      console.error('❌ Erreur modification locataire:', error);
      return { success: false, error: error.message || 'Erreur serveur' };
    }
  };

  const deleteTenant = async (id) => {
    try {
      //console.log('🗑️ Suppression locataire ID:', id);

      const result = await apiRequest(`/tenants/${id}`, {
        method: 'DELETE'
      });

      //console.log('🗑️ Résultat suppression locataire:', result);

      if (result.success) {
        setTenants(prev => prev.filter(tenant => tenant.id !== parseInt(id)));
        return { success: true };
      } else {
        return { success: false, error: result.message || 'Erreur lors de la suppression' };
      }
    } catch (error) {
      console.error('❌ Erreur suppression locataire:', error);
      return { success: false, error: error.message || 'Erreur serveur' };
    }
  };

  // ==================== UTILITAIRES ====================

  const syncStatuses = async () => {
    try {
      //console.log('🔄 Synchronisation des statuts...');
      const result = await apiRequest('/admin/sync-statuses');
      
      if (result.success) {
        await loadAllData(true);
        return { success: true };
      } else {
        addNotification('Erreur lors de la synchronisation', 'error');
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      addNotification('Erreur lors de la synchronisation', 'error');
      return { success: false };
    }
  };

  const refresh = async () => {
    //console.log('🔄 Actualisation manuelle des données...');
    await loadAllData(true);
  };

  const getApartmentById = (id) => {
    return apartments.find(apt => apt.id === parseInt(id));
  };

  const getTenantById = (id) => {
    return tenants.find(tenant => tenant.id === parseInt(id));
  };

  const getAvailableApartments = () => {
    return apartments.filter(apt => apt.statut === 'libre');
  };

  const getActiveTenants = () => {
    return tenants.filter(tenant => tenant.location_statut === 'active');
  };

  const getQuickStats = () => {
    const totalApartments = apartments.length;
    const occupiedApartments = apartments.filter(apt => apt.statut === 'occupé').length;
    const vacantApartments = apartments.filter(apt => apt.statut === 'libre').length;
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(tenant => tenant.location_statut === 'active').length;
    
    return {
      totalApartments,
      occupiedApartments,
      vacantApartments,
      totalTenants,
      activeTenants,
      occupancyRate: totalApartments > 0 ? (occupiedApartments / totalApartments) * 100 : 0
    };
  };

  const contextValue = {
    // Données
    apartments,
    tenants,
    loading,
    lastSync,
    
    // Actions appartements
    createApartment,
    updateApartment,
    deleteApartment,
    
    // Actions locataires  
    createTenant,
    updateTenant,
    deleteTenant,
    
    // Actions générales
    loadAllData,
    refresh,
    syncStatuses,
    
    // Utilitaires
    getApartmentById,
    getTenantById,
    getAvailableApartments,
    getActiveTenants,
    getQuickStats
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};