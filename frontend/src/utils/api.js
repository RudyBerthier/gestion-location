// src/utils/api.js - MISE À JOUR AVEC LES ROUTES 2FA
const API_BASE_URL = '/gestion-locative/api';

// Fonction utilitaire pour les requêtes
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  // Si c'est un FormData, on supprime le Content-Type pour laisser le navigateur le définir
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  // Gestion de l'expiration du token
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Session expirée');
  }

  // Gestion des erreurs HTTP
  if (!response.ok) {
    if (response.status === 404) {
      return { success: false, status: 404, message: 'Ressource non trouvée' };
    }
    throw new Error(`Erreur HTTP: ${response.status}`);
  }

  const data = await response.json();
  return { ...data, status: response.status };
};

// ========================= API AUTHENTIFICATION AVEC 2FA =========================
export const authApi = {
  // NOUVELLE MÉTHODE : Demander un code de vérification (étape 1)
  requestVerificationCode: async (email, password) => {
    return await apiRequest('/auth/login-request', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  // NOUVELLE MÉTHODE : Vérifier le code (étape 2)
  verifyCode: async (email, code, rememberMe = false) => {
    return await apiRequest('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code, rememberMe })
    });
  },

  // NOUVELLE MÉTHODE : Renvoyer un code
  resendCode: async (email) => {
    return await apiRequest('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  // NOUVELLE MÉTHODE : Demander une réinitialisation de mot de passe
  forgotPassword: async (email, clientUrl = null) => {
    return await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ 
        email: email.toLowerCase().trim(),
        clientUrl: clientUrl || window.location.origin
      })
    });
  },

  // NOUVELLE MÉTHODE : Valider un token de réinitialisation
  validateResetToken: async (token, email) => {
    return await apiRequest('/auth/validate-reset-token', {
      method: 'POST',
      body: JSON.stringify({ token, email })
    });
  },

  // NOUVELLE MÉTHODE : Réinitialiser le mot de passe avec token
  resetPassword: async (token, email, newPassword, confirmPassword) => {
    return await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ 
        token, 
        email, 
        newPassword, 
        confirmPassword 
      })
    });
  },

  // NOUVELLE MÉTHODE : Changer le mot de passe (utilisateur connecté)
  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    return await apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ 
        currentPassword, 
        newPassword, 
        confirmPassword 
      })
    });
  },

  // Connexion (méthode conservée pour compatibilité - maintenant redirige vers 2FA)
  login: async (credentials) => {
    // Cette méthode peut maintenant utiliser soit l'ancien système soit le nouveau
    return await authApi.requestVerificationCode(credentials.email, credentials.password);
  },

  // Inscription (inchangée)
  register: async (userData) => {
    return await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  // Vérifier le token (inchangée)
  verifyToken: async () => {
    return await apiRequest('/auth/verify');
  },

  // Mettre à jour le profil (inchangée)
  updateProfile: async (data) => {
    return await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // NOUVELLE MÉTHODE : Statistiques 2FA (admin)
  get2FAStats: async () => {
    return await apiRequest('/admin/2fa-stats');
  },

  // NOUVELLE MÉTHODE : Tester la configuration email (dev)
  testEmail: async (email) => {
    return await apiRequest('/test-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }
};

// ========================= API APPARTEMENTS =========================
export const apartmentApi = {
  // Récupérer tous les appartements
  getAll: async () => {
    const response = await apiRequest('/apartments');
    return Array.isArray(response) ? response : (response.data || []);
  },

  // Récupérer un appartement par ID
  getById: async (id) => {
    const response = await apiRequest(`/apartments/${id}`);
    if (response.status === 404) {
      return null;
    }
    return response.data || response;
  },

  // Créer un appartement
  create: async (data) => {
    return await apiRequest('/apartments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Modifier un appartement
  update: async (id, data) => {
    return await apiRequest(`/apartments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Supprimer un appartement
  delete: async (id) => {
    return await apiRequest(`/apartments/${id}`, {
      method: 'DELETE'
    });
  },

  // Récupérer les locataires d'un appartement
  getTenants: async (id) => {
    try {
      const response = await apiRequest(`/apartments/${id}/tenants`);
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      console.error('Erreur récupération locataires:', error);
      return [];
    }
  },

  // Récupérer les documents d'un appartement
  getDocuments: async (id) => {
    try {
      const response = await apiRequest(`/apartments/${id}/documents`);
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      console.error('Erreur récupération documents:', error);
      return [];
    }
  },

  // Récupérer les médias d'un appartement
  getMedia: async (id) => {
    try {
      const response = await apiRequest(`/apartments/${id}/media`);
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      console.error('Erreur récupération médias:', error);
      return [];
    }
  },

  // Récupérer les factures d'un appartement
  getInvoices: async (id) => {
    try {
      const response = await apiRequest(`/apartments/${id}/invoices`);
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      console.error('Erreur récupération factures:', error);
      return [];
    }
  },

  // Uploader des médias
  uploadMedia: async (id, files) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('media', file);
    });

    return await apiRequest(`/apartments/${id}/media`, {
      method: 'POST',
      body: formData
    });
  },

  // Vérifier la disponibilité
  checkAvailability: async (id, dateDebut, dateFin) => {
    const params = new URLSearchParams();
    if (dateDebut) params.append('date_debut', dateDebut);
    if (dateFin) params.append('date_fin', dateFin);
    
    return await apiRequest(`/apartments/${id}/availability?${params.toString()}`);
  }
};

// ========================= API LOCATAIRES =========================
export const tenantApi = {
  // Récupérer tous les locataires
  getAll: async () => {
    const response = await apiRequest('/tenants');
    return Array.isArray(response) ? response : (response.data || []);
  },

  // Récupérer un locataire par ID
  getById: async (id) => {
    try {
      const response = await apiRequest(`/tenants/${id}`);
      if (response.status === 404) {
        return null;
      }
      return response.data || response; // L'API renvoie { success: true, data: tenant }
    } catch (error) {
      console.error('Erreur récupération locataire:', error);
      return null;
    }
  },

  // Créer un locataire
  create: async (data) => {
    return await apiRequest('/tenants', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Modifier un locataire
  update: async (id, data) => {
    return await apiRequest(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Supprimer un locataire
  delete: async (id) => {
    return await apiRequest(`/tenants/${id}`, {
      method: 'DELETE'
    });
  },

  // Récupérer toutes les locations d'un locataire
  getLocations: async (id) => {
    try {
      const response = await apiRequest(`/tenants/${id}/locations`);
      return response.data || response || [];
    } catch (error) {
      console.error('Erreur récupération locations:', error);
      return [];
    }
  },

  // Récupérer la location actuelle d'un locataire
  getCurrentRental: async (id) => {
    try {
      const response = await apiRequest(`/tenants/${id}/current-rental`);
      return response.data || null;
    } catch (error) {
      console.error('Erreur récupération location actuelle:', error);
      return null;
    }
  },

  // Récupérer l'historique des locations d'un locataire
  getRentalHistory: async (id) => {
    try {
      const response = await apiRequest(`/tenants/${id}/rental-history`);
      return response.data || [];
    } catch (error) {
      console.error('Erreur récupération historique:', error);
      return [];
    }
  },

  // Récupérer les documents d'un locataire
  getDocuments: async (id) => {
    try {
      const response = await apiRequest(`/tenants/${id}/documents`);
      return response.data || response || [];
    } catch (error) {
      console.error('Erreur récupération documents locataire:', error);
      return [];
    }
  },

  // Récupérer les paiements d'un locataire
  getPayments: async (id) => {
    try {
      const response = await apiRequest(`/tenants/${id}/payments`);
      return response.data || response || [];
    } catch (error) {
      console.error('Erreur récupération paiements:', error);
      return [];
    }
  }
};

// ========================= API LOCATIONS =========================
export const locationApi = {
  // Récupérer toutes les locations
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    const response = await apiRequest(`/locations?${params.toString()}`);
    return response.data || response;
  },

  // Récupérer une location par ID
  getById: async (id) => {
    const response = await apiRequest(`/locations/${id}`);
    return response.data || response;
  },

  // Créer une location
  create: async (data) => {
    return await apiRequest('/locations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Modifier une location
  update: async (id, data) => {
    return await apiRequest(`/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Supprimer une location
  delete: async (id) => {
    return await apiRequest(`/locations/${id}`, {
      method: 'DELETE'
    });
  },

  // Terminer une location
  terminate: async (id, data) => {
    return await apiRequest(`/locations/${id}/terminate`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Récupérer les statistiques des locations
  getStats: async () => {
    const response = await apiRequest('/locations/stats');
    return response.data || response;
  }
};

// ========================= API DOCUMENTS (MISE À JOUR) =========================
export const documentApi = {
  // Uploader un document
  upload: async (data) => {
    const formData = new FormData();
    
    if (data.files) {
      Array.from(data.files).forEach(file => {
        formData.append('document', file);
      });
    } else if (data.file) {
      formData.append('document', data.file);
    }

    if (data.appartement_id) formData.append('appartement_id', data.appartement_id);
    if (data.locataire_id) formData.append('locataire_id', data.locataire_id);
    if (data.location_id) formData.append('location_id', data.location_id);
    if (data.nom_document) formData.append('nom_document', data.nom_document);
    if (data.type_document) formData.append('type_document', data.type_document);
    if (data.description) formData.append('description', data.description);

    return await apiRequest('/documents', {
      method: 'POST',
      body: formData
    });
  },

  // NOUVELLE MÉTHODE : Renommer un document
  rename: async (id, newName) => {
    return await apiRequest(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nom_document: newName
      })
    });
  },

  // NOUVELLE MÉTHODE : Déplacer un document
  move: async (id, destination) => {
    return await apiRequest(`/documents/${id}/move`, {
      method: 'PUT',
      body: JSON.stringify(destination)
    });
  },

  // Supprimer un document
  delete: async (id) => {
    return await apiRequest(`/documents/${id}`, {
      method: 'DELETE'
    });
  }
};

// ========================= API PAIEMENTS =========================
export const paymentApi = {
  // Créer un paiement
  create: async (data) => {
    return await apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// ========================= API FACTURES =========================
export const invoiceApi = {
  // Créer une facture
  create: async (data) => {
    return await apiRequest('/invoices', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// ========================= API DASHBOARD =========================
export const dashboardApi = {
  // Récupérer les statistiques du dashboard
  getStats: async () => {
    const response = await apiRequest('/dashboard/stats');
    return response.data || response;
  },

  // Récupérer les données du graphique des revenus
  getRevenueChart: async () => {
    const response = await apiRequest('/dashboard/revenue-chart');
    return response.data || response;
  },

  // Synchroniser manuellement les statuts (admin)
  syncStatuses: async () => {
    return await apiRequest('/admin/sync-statuses');
  }
};

// ========================= API GOCARDLESS =========================
export const goCardlessApi = {
  // Récupérer les institutions bancaires par pays
  getInstitutions: async (country = 'FR') => {
    try {
      const response = await apiRequest(`/gocardless/institutions/${country}`);
      return response.data || response;
    } catch (error) {
      console.error('Erreur récupération institutions:', error);
      throw error;
    }
  },

  // Créer un accord utilisateur final (optionnel)
  createAgreement: async (data) => {
    try {
      return await apiRequest('/gocardless/agreements', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Erreur création accord:', error);
      throw error;
    }
  },

  // Créer une réquisition (lien de connexion bancaire)
  createRequisition: async (data) => {
    try {
      return await apiRequest('/gocardless/requisitions', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Erreur création réquisition:', error);
      throw error;
    }
  },

  // Récupérer les comptes bancaires connectés
  getAccounts: async (customUrl = null) => {
    try {
      const url = customUrl || '/gocardless/accounts';
      const response = await apiRequest(url);
      return response.data || response;
    } catch (error) {
      console.error('Erreur récupération comptes:', error);
      throw error;
    }
  },

  // Récupérer les détails d'un compte
  getAccountDetails: async (customUrl) => {
    try {
      const url = typeof customUrl === 'string' && customUrl.includes('?') 
        ? `/gocardless/accounts/${customUrl}`
        : `/gocardless/accounts/${customUrl}/details`;
      const response = await apiRequest(url);
      return response.data || response;
    } catch (error) {
      console.error('Erreur récupération détails compte:', error);
      throw error;
    }
  },

  // Récupérer les soldes d'un compte
  getAccountBalances: async (customUrl) => {
    try {
      const url = typeof customUrl === 'string' && customUrl.includes('?') 
        ? `/gocardless/accounts/${customUrl}`
        : `/gocardless/accounts/${customUrl}/balances`;
      const response = await apiRequest(url);
      return response.data || response;
    } catch (error) {
      console.error('Erreur récupération soldes:', error);
      throw error;
    }
  },

  // Récupérer les transactions d'un compte
  getAccountTransactions: async (accountId, options = {}) => {
    try {
      const params = new URLSearchParams();
      if (options.date_from) params.append('date_from', options.date_from);
      if (options.date_to) params.append('date_to', options.date_to);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await apiRequest(`/gocardless/accounts/${accountId}/transactions${queryString}`);
      return response.data || response;
    } catch (error) {
      console.error('Erreur récupération transactions:', error);
      throw error;
    }
  },

  // Supprimer une réquisition (déconnexion bancaire)
  deleteRequisition: async (requisitionId) => {
    try {
      return await apiRequest(`/gocardless/requisitions/${requisitionId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Erreur suppression réquisition:', error);
      throw error;
    }
  },

  // Synchroniser les données bancaires
  syncBankData: async () => {
    try {
      // Cette méthode pourra être implémentée plus tard pour synchroniser
      // automatiquement les transactions avec les paiements de loyers
      return await apiRequest('/gocardless/sync', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Erreur synchronisation:', error);
      throw error;
    }
  }
};

// ========================= API EXPORT =========================
export const exportApi = {
  // Exporter toutes les données
  exportData: async () => {
    return await apiRequest('/export/data');
  }
};

// ========================= UTILITIES 2FA =========================
export const twoFAUtils = {
  // Formater le temps restant en minutes:secondes
  formatTimeLeft: (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  // Masquer l'email pour l'affichage
  maskEmail: (email) => {
    if (!email || !email.includes('@')) return email;
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return email;
    
    const visibleChars = Math.min(2, localPart.length - 1);
    const masked = localPart.substring(0, visibleChars) + '***';
    return `${masked}@${domain}`;
  },

  // Valider un code de vérification (6 chiffres)
  validateCode: (code) => {
    if (!code) return false;
    if (code.length !== 6) return false;
    if (!/^\d{6}$/.test(code)) return false;
    return true;
  },

  // Formater le code pour l'affichage (ajouter des espaces)
  formatCodeDisplay: (code) => {
    if (!code) return '';
    return code.replace(/(\d{3})(\d{3})/, '$1 $2');
  },

  // Détecter si un email est probablement valide
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};