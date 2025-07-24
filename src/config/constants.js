// src/config/constants.js - Constantes de l'application
export const API_BASE_URL = '/gestion-locative/api';

// Statuts des appartements
export const APARTMENT_STATUS = {
  LIBRE: 'libre',
  OCCUPE: 'occupé', 
  EN_TRAVAUX: 'en_travaux'
};

export const APARTMENT_STATUS_LABELS = {
  [APARTMENT_STATUS.LIBRE]: 'Libre',
  [APARTMENT_STATUS.OCCUPE]: 'Occupé',
  [APARTMENT_STATUS.EN_TRAVAUX]: 'En travaux'
};

export const APARTMENT_STATUS_COLORS = {
  [APARTMENT_STATUS.LIBRE]: 'bg-green-100 text-green-800',
  [APARTMENT_STATUS.OCCUPE]: 'bg-red-100 text-red-800',
  [APARTMENT_STATUS.EN_TRAVAUX]: 'bg-yellow-100 text-yellow-800'
};

// Statuts des locations
export const LOCATION_STATUS = {
  ACTIVE: 'active',
  TERMINEE: 'terminee',
  RESILIEE: 'resiliee'
};

export const LOCATION_STATUS_LABELS = {
  [LOCATION_STATUS.ACTIVE]: 'Active',
  [LOCATION_STATUS.TERMINEE]: 'Terminée',
  [LOCATION_STATUS.RESILIEE]: 'Résiliée'
};

export const LOCATION_STATUS_COLORS = {
  [LOCATION_STATUS.ACTIVE]: 'bg-green-100 text-green-800',
  [LOCATION_STATUS.TERMINEE]: 'bg-gray-100 text-gray-800',
  [LOCATION_STATUS.RESILIEE]: 'bg-red-100 text-red-800'
};

// Types de documents
export const DOCUMENT_TYPES = {
  PIECE_IDENTITE: 'piece_identite',
  BULLETIN_SALAIRE: 'bulletin_salaire',
  JUSTIFICATIF_DOMICILE: 'justificatif_domicile',
  DOCUMENT_GARANT: 'document_garant',
  CONTRAT_TRAVAIL: 'contrat_travail',
  AVIS_IMPOSITION: 'avis_imposition',
  BAIL: 'bail',
  ETAT_LIEUX: 'etat_lieux',
  ASSURANCE: 'assurance',
  FACTURE: 'facture',
  QUITTANCE: 'quittance',
  AUTRE: 'autre'
};

export const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPES.PIECE_IDENTITE]: 'Pièce d\'identité',
  [DOCUMENT_TYPES.BULLETIN_SALAIRE]: 'Bulletin de salaire',
  [DOCUMENT_TYPES.JUSTIFICATIF_DOMICILE]: 'Justificatif de domicile',
  [DOCUMENT_TYPES.DOCUMENT_GARANT]: 'Document garant',
  [DOCUMENT_TYPES.CONTRAT_TRAVAIL]: 'Contrat de travail',
  [DOCUMENT_TYPES.AVIS_IMPOSITION]: 'Avis d\'imposition',
  [DOCUMENT_TYPES.BAIL]: 'Bail',
  [DOCUMENT_TYPES.ETAT_LIEUX]: 'État des lieux',
  [DOCUMENT_TYPES.ASSURANCE]: 'Assurance',
  [DOCUMENT_TYPES.FACTURE]: 'Facture',
  [DOCUMENT_TYPES.QUITTANCE]: 'Quittance',
  [DOCUMENT_TYPES.AUTRE]: 'Autre'
};

export const DOCUMENT_TYPE_ICONS = {
  [DOCUMENT_TYPES.PIECE_IDENTITE]: '🆔',
  [DOCUMENT_TYPES.BULLETIN_SALAIRE]: '💰',
  [DOCUMENT_TYPES.JUSTIFICATIF_DOMICILE]: '🏠',
  [DOCUMENT_TYPES.DOCUMENT_GARANT]: '👥',
  [DOCUMENT_TYPES.CONTRAT_TRAVAIL]: '📋',
  [DOCUMENT_TYPES.AVIS_IMPOSITION]: '📊',
  [DOCUMENT_TYPES.BAIL]: '📜',
  [DOCUMENT_TYPES.ETAT_LIEUX]: '📝',
  [DOCUMENT_TYPES.ASSURANCE]: '🛡️',
  [DOCUMENT_TYPES.FACTURE]: '🧾',
  [DOCUMENT_TYPES.QUITTANCE]: '📄',
  [DOCUMENT_TYPES.AUTRE]: '📁'
};

export const DOCUMENT_TYPE_COLORS = {
  [DOCUMENT_TYPES.PIECE_IDENTITE]: 'bg-blue-100',
  [DOCUMENT_TYPES.BULLETIN_SALAIRE]: 'bg-green-100',
  [DOCUMENT_TYPES.JUSTIFICATIF_DOMICILE]: 'bg-yellow-100',
  [DOCUMENT_TYPES.DOCUMENT_GARANT]: 'bg-purple-100',
  [DOCUMENT_TYPES.CONTRAT_TRAVAIL]: 'bg-indigo-100',
  [DOCUMENT_TYPES.AVIS_IMPOSITION]: 'bg-pink-100',
  [DOCUMENT_TYPES.BAIL]: 'bg-orange-100',
  [DOCUMENT_TYPES.ETAT_LIEUX]: 'bg-teal-100',
  [DOCUMENT_TYPES.ASSURANCE]: 'bg-cyan-100',
  [DOCUMENT_TYPES.FACTURE]: 'bg-red-100',
  [DOCUMENT_TYPES.QUITTANCE]: 'bg-lime-100',
  [DOCUMENT_TYPES.AUTRE]: 'bg-gray-100'
};

// Types de paiement
export const PAYMENT_TYPES = {
  LOYER: 'loyer',
  CHARGES: 'charges',
  DEPOT_GARANTIE: 'depot_garantie',
  AUTRE: 'autre'
};

export const PAYMENT_TYPE_LABELS = {
  [PAYMENT_TYPES.LOYER]: 'Loyer',
  [PAYMENT_TYPES.CHARGES]: 'Charges',
  [PAYMENT_TYPES.DEPOT_GARANTIE]: 'Dépôt de garantie',
  [PAYMENT_TYPES.AUTRE]: 'Autre'
};

// Méthodes de paiement
export const PAYMENT_METHODS = {
  VIREMENT: 'virement',
  CHEQUE: 'cheque',
  ESPECES: 'especes',
  CARTE: 'carte',
  PRELEVEMENT: 'prelevement'
};

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.VIREMENT]: 'Virement bancaire',
  [PAYMENT_METHODS.CHEQUE]: 'Chèque',
  [PAYMENT_METHODS.ESPECES]: 'Espèces',
  [PAYMENT_METHODS.CARTE]: 'Carte bancaire',
  [PAYMENT_METHODS.PRELEVEMENT]: 'Prélèvement automatique'
};

// Statuts des factures
export const INVOICE_STATUS = {
  EN_ATTENTE: 'en_attente',
  PAYEE: 'payée',
  EN_RETARD: 'en_retard',
  ANNULEE: 'annulée'
};

export const INVOICE_STATUS_LABELS = {
  [INVOICE_STATUS.EN_ATTENTE]: 'En attente',
  [INVOICE_STATUS.PAYEE]: 'Payée',
  [INVOICE_STATUS.EN_RETARD]: 'En retard',
  [INVOICE_STATUS.ANNULEE]: 'Annulée'
};

export const INVOICE_STATUS_COLORS = {
  [INVOICE_STATUS.EN_ATTENTE]: 'bg-yellow-100 text-yellow-800',
  [INVOICE_STATUS.PAYEE]: 'bg-green-100 text-green-800',
  [INVOICE_STATUS.EN_RETARD]: 'bg-red-100 text-red-800',
  [INVOICE_STATUS.ANNULEE]: 'bg-gray-100 text-gray-800'
};

// Types de factures
export const INVOICE_TYPES = {
  LOYER: 'loyer',
  CHARGES: 'charges',
  TRAVAUX: 'travaux',
  ASSURANCE: 'assurance',
  AUTRE: 'autre'
};

export const INVOICE_TYPE_LABELS = {
  [INVOICE_TYPES.LOYER]: 'Loyer',
  [INVOICE_TYPES.CHARGES]: 'Charges',
  [INVOICE_TYPES.TRAVAUX]: 'Travaux',
  [INVOICE_TYPES.ASSURANCE]: 'Assurance',
  [INVOICE_TYPES.AUTRE]: 'Autre'
};

// Formats de fichiers acceptés
export const ACCEPTED_FILE_TYPES = {
  IMAGES: 'image/jpeg,image/jpg,image/png,image/gif',
  VIDEOS: 'video/mp4,video/mov,video/avi,video/webm',
  DOCUMENTS: '.pdf,.doc,.docx,.xlsx,.txt',
  MEDIA: 'image/*,video/*',
  ALL: '.pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi,.webm'
};

// Tailles de fichiers maximales (en bytes)
export const MAX_FILE_SIZES = {
  IMAGE: 10 * 1024 * 1024,     // 10MB
  VIDEO: 100 * 1024 * 1024,    // 100MB
  DOCUMENT: 50 * 1024 * 1024,  // 50MB
  DEFAULT: 50 * 1024 * 1024    // 50MB
};

// Configuration pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZES: [10, 20, 50, 100],
  MAX_VISIBLE_PAGES: 5
};

// Configuration recherche
export const SEARCH_CONFIG = {
  MIN_SEARCH_LENGTH: 2,
  DEBOUNCE_DELAY: 300,
  MAX_RESULTS: 100
};

// Notifications
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

export const NOTIFICATION_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000
};

// URLs et endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register', 
  VERIFY: '/auth/verify',
  PROFILE: '/auth/profile',
  
  // Apartments
  APARTMENTS: '/apartments',
  APARTMENT_BY_ID: (id) => `/apartments/${id}`,
  APARTMENT_TENANTS: (id) => `/apartments/${id}/tenants`,
  APARTMENT_DOCUMENTS: (id) => `/apartments/${id}/documents`,
  APARTMENT_MEDIA: (id) => `/apartments/${id}/media`,
  APARTMENT_INVOICES: (id) => `/apartments/${id}/invoices`,
  APARTMENT_AVAILABILITY: (id) => `/apartments/${id}/availability`,
  
  // Tenants
  TENANTS: '/tenants',
  TENANT_BY_ID: (id) => `/tenants/${id}`,
  TENANT_LOCATIONS: (id) => `/tenants/${id}/locations`,
  TENANT_CURRENT_RENTAL: (id) => `/tenants/${id}/current-rental`,
  TENANT_RENTAL_HISTORY: (id) => `/tenants/${id}/rental-history`,
  TENANT_DOCUMENTS: (id) => `/tenants/${id}/documents`,
  TENANT_PAYMENTS: (id) => `/tenants/${id}/payments`,
  
  // Locations
  LOCATIONS: '/locations',
  LOCATION_BY_ID: (id) => `/locations/${id}`,
  LOCATION_TERMINATE: (id) => `/locations/${id}/terminate`,
  LOCATION_STATS: '/locations/stats',
  
  // Documents
  DOCUMENTS: '/documents',
  DOCUMENT_BY_ID: (id) => `/documents/${id}`,
  
  // Media
  MEDIA_BY_ID: (id) => `/media/${id}`,
  
  // Payments
  PAYMENTS: '/payments',
  
  // Invoices  
  INVOICES: '/invoices',
  
  // Dashboard
  DASHBOARD_STATS: '/dashboard/stats',
  DASHBOARD_REVENUE_CHART: '/dashboard/revenue-chart',
  
  // Admin
  ADMIN_SYNC_STATUSES: '/admin/sync-statuses',
  
  // Export
  EXPORT_DATA: '/export/data'
};

// Messages par défaut
export const DEFAULT_MESSAGES = {
  LOADING: 'Chargement...',
  ERROR_GENERIC: 'Une erreur est survenue',
  ERROR_NETWORK: 'Erreur de connexion réseau',
  ERROR_AUTH: 'Session expirée, veuillez vous reconnecter',
  SUCCESS_SAVE: 'Enregistré avec succès',
  SUCCESS_DELETE: 'Supprimé avec succès',
  SUCCESS_UPDATE: 'Mis à jour avec succès',
  CONFIRM_DELETE: 'Êtes-vous sûr de vouloir supprimer ?',
  NO_DATA: 'Aucune donnée disponible',
  NO_RESULTS: 'Aucun résultat trouvé'
};

// Configuration par défaut des tableaux
export const TABLE_CONFIG = {
  DEFAULT_SORT: 'date_creation',
  DEFAULT_ORDER: 'desc',
  ROWS_PER_PAGE: 10,
  SHOW_PAGINATION: true,
  SHOW_SEARCH: true,
  SHOW_FILTERS: true
};

// Validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^(\+33|0)[1-9](\d{8})$/,
  POSTAL_CODE: /^\d{5}$/,
  PRICE: /^\d+(\.\d{2})?$/,
  INTEGER: /^\d+$/,
  DECIMAL: /^\d+(\.\d+)?$/
};

// Messages de validation
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Ce champ est obligatoire',
  EMAIL_INVALID: 'Format d\'email invalide',
  PHONE_INVALID: 'Numéro de téléphone invalide',
  POSTAL_CODE_INVALID: 'Code postal invalide',
  PRICE_INVALID: 'Montant invalide',
  INTEGER_INVALID: 'Nombre entier requis',
  DECIMAL_INVALID: 'Nombre décimal invalide',
  MIN_LENGTH: (min) => `Minimum ${min} caractères`,
  MAX_LENGTH: (max) => `Maximum ${max} caractères`,
  MIN_VALUE: (min) => `Valeur minimale: ${min}`,
  MAX_VALUE: (max) => `Valeur maximale: ${max}`
};

export default {
  API_BASE_URL,
  APARTMENT_STATUS,
  APARTMENT_STATUS_LABELS,
  APARTMENT_STATUS_COLORS,
  LOCATION_STATUS,
  LOCATION_STATUS_LABELS,
  LOCATION_STATUS_COLORS,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_ICONS,
  DOCUMENT_TYPE_COLORS,
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  INVOICE_STATUS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_TYPES,
  INVOICE_TYPE_LABELS,
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZES,
  PAGINATION,
  SEARCH_CONFIG,
  NOTIFICATION_TYPES,
  NOTIFICATION_DURATION,
  ENDPOINTS,
  DEFAULT_MESSAGES,
  TABLE_CONFIG,
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES
};