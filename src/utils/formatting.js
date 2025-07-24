// src/utils/formatting.js - Utilitaires de formatage
import { 
  APARTMENT_STATUS_LABELS, 
  APARTMENT_STATUS_COLORS,
  LOCATION_STATUS_LABELS,
  LOCATION_STATUS_COLORS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_ICONS,
  DOCUMENT_TYPE_COLORS,
  PAYMENT_METHOD_LABELS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS
} from '../config/constants';

// ==================== FORMATAGE DES PRIX ====================

/**
 * Formate un prix en euros
 * @param {number|string} price - Le prix à formater
 * @param {boolean} showDecimals - Afficher les décimales si elles sont nulles
 * @returns {string} Prix formaté
 */
export const formatPrice = (price, showDecimals = false) => {
  if (price === null || price === undefined || price === '') {
    return 'N/A';
  }

  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) {
    return 'N/A';
  }

  if (showDecimals) {
    return `${numPrice.toFixed(2)}€`;
  }

  // Si c'est un nombre entier, ne pas afficher les décimales
  return numPrice % 1 === 0 ? `${numPrice}€` : `${numPrice.toFixed(2)}€`;
};

/**
 * Formate un prix avec séparateurs de milliers
 * @param {number|string} price - Le prix à formater
 * @returns {string} Prix formaté avec séparateurs
 */
export const formatPriceWithSeparators = (price) => {
  if (price === null || price === undefined || price === '') {
    return 'N/A';
  }

  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) {
    return 'N/A';
  }

  return `${numPrice.toLocaleString('fr-FR', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  })}€`;
};

// ==================== FORMATAGE DES DATES ====================

/**
 * Formate une date en français
 * @param {string|Date} date - Date à formater
 * @param {string} format - Format de sortie ('short', 'long', 'relative')
 * @returns {string} Date formatée
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return 'N/A';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Date invalide';

  const now = new Date();
  const diffInDays = Math.floor((now - dateObj) / (1000 * 60 * 60 * 24));

  switch (format) {
    case 'relative':
      if (diffInDays === 0) return "Aujourd'hui";
      if (diffInDays === 1) return "Hier";
      if (diffInDays === -1) return "Demain";
      if (diffInDays > 0) return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
      return `Dans ${Math.abs(diffInDays)} jour${Math.abs(diffInDays) > 1 ? 's' : ''}`;
      
    case 'long':
      return dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
    case 'short':
    default:
      return dateObj.toLocaleDateString('fr-FR');
  }
};

/**
 * Formate une date et heure
 * @param {string|Date} datetime - Date/heure à formater
 * @returns {string} Date et heure formatées
 */
export const formatDateTime = (datetime) => {
  if (!datetime) return 'N/A';

  const dateObj = typeof datetime === 'string' ? new Date(datetime) : datetime;
  if (isNaN(dateObj.getTime())) return 'Date invalide';

  return `${formatDate(dateObj)} à ${dateObj.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
};

/**
 * Calcule l'âge en années
 * @param {string|Date} birthDate - Date de naissance
 * @returns {number|string} Âge en années ou 'N/A'
 */
export const calculateAge = (birthDate) => {
  if (!birthDate) return 'N/A';

  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  if (isNaN(birth.getTime())) return 'N/A';

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

// ==================== FORMATAGE DES STATUTS ====================

/**
 * Retourne les informations de style pour un statut d'appartement
 * @param {string} status - Statut de l'appartement
 * @returns {object} Classes CSS et label
 */
export const getApartmentStatusInfo = (status) => {
  return {
    label: APARTMENT_STATUS_LABELS[status] || status,
    className: APARTMENT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  };
};

/**
 * Retourne les informations de style pour un statut de location
 * @param {string} status - Statut de la location
 * @returns {object} Classes CSS et label
 */
export const getLocationStatusInfo = (status) => {
  return {
    label: LOCATION_STATUS_LABELS[status] || status,
    className: LOCATION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  };
};

/**
 * Retourne les informations pour un type de document
 * @param {string} type - Type de document
 * @returns {object} Icône, label et classe CSS
 */
export const getDocumentTypeInfo = (type) => {
  return {
    icon: DOCUMENT_TYPE_ICONS[type] || '📁',
    label: DOCUMENT_TYPE_LABELS[type] || type,
    className: DOCUMENT_TYPE_COLORS[type] || 'bg-gray-100'
  };
};

/**
 * Retourne le label d'une méthode de paiement
 * @param {string} method - Méthode de paiement
 * @returns {string} Label formaté
 */
export const getPaymentMethodLabel = (method) => {
  return PAYMENT_METHOD_LABELS[method] || method;
};

/**
 * Retourne les informations de style pour un statut de facture
 * @param {string} status - Statut de la facture
 * @returns {object} Classes CSS et label
 */
export const getInvoiceStatusInfo = (status) => {
  return {
    label: INVOICE_STATUS_LABELS[status] || status,
    className: INVOICE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  };
};

// ==================== FORMATAGE DES TEXTES ====================

/**
 * Capitalise la première lettre d'une chaîne
 * @param {string} str - Chaîne à capitaliser
 * @returns {string} Chaîne capitalisée
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Formate un nom complet
 * @param {string} firstName - Prénom
 * @param {string} lastName - Nom
 * @returns {string} Nom complet formaté
 */
export const formatFullName = (firstName, lastName) => {
  if (!firstName && !lastName) return 'N/A';
  if (!firstName) return lastName;
  if (!lastName) return firstName;
  return `${capitalize(firstName)} ${capitalize(lastName.toUpperCase())}`;
};

/**
 * Tronque un texte avec ellipses
 * @param {string} text - Texte à tronquer
 * @param {number} maxLength - Longueur maximale
 * @returns {string} Texte tronqué
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Formate un numéro de téléphone français
 * @param {string} phone - Numéro de téléphone
 * @returns {string} Numéro formaté
 */
export const formatPhone = (phone) => {
  if (!phone) return 'N/A';
  
  // Supprimer tous les caractères non numériques
  const cleaned = phone.replace(/\D/g, '');
  
  // Formatter selon la longueur
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  
  return phone; // Retourner tel quel si format non reconnu
};

// ==================== FORMATAGE DES ADRESSES ====================

/**
 * Extrait le code postal et la ville d'une adresse complète
 * @param {string} address - Adresse complète
 * @returns {object} Code postal et ville séparés
 */
export const parseAddress = (address) => {
  if (!address) return { postalCode: '', city: '' };
  
  const match = address.match(/(\d{5})\s+(.+)$/);
  return {
    postalCode: match ? match[1] : '',
    city: match ? match[2] : ''
  };
};

/**
 * Formate une adresse courte (sans répéter ville/code postal)
 * @param {string} fullAddress - Adresse complète
 * @returns {string} Adresse courte
 */
export const formatShortAddress = (fullAddress) => {
  if (!fullAddress) return 'N/A';
  
  // Si l'adresse contient un code postal, prendre seulement la partie avant
  const match = fullAddress.match(/^(.+?)(?:\s+\d{5})/);
  return match ? match[1] : fullAddress;
};

// ==================== FORMATAGE DES TAILLES DE FICHIER ====================

/**
 * Formate une taille de fichier en bytes vers une unité lisible
 * @param {number} bytes - Taille en bytes
 * @returns {string} Taille formatée
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Byte';
  if (!bytes) return 'N/A';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ==================== FORMATAGE DES POURCENTAGES ====================

/**
 * Formate un pourcentage
 * @param {number} value - Valeur à formater (entre 0 et 100)
 * @param {number} decimals - Nombre de décimales
 * @returns {string} Pourcentage formaté
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  
  return `${parseFloat(value).toFixed(decimals)}%`;
};

// ==================== FORMATAGE POUR URLS ====================

/**
 * Crée un slug à partir d'une chaîne
 * @param {string} text - Texte à transformer
 * @returns {string} Slug formaté
 */
export const createSlug = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[àáâäãå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôöõ]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// Export des utilitaires par défaut
export default {
  formatPrice,
  formatPriceWithSeparators,
  formatDate,
  formatDateTime,
  calculateAge,
  getApartmentStatusInfo,
  getLocationStatusInfo,
  getDocumentTypeInfo,
  getPaymentMethodLabel,
  getInvoiceStatusInfo,
  capitalize,
  formatFullName,
  truncateText,
  formatPhone,
  parseAddress,
  formatShortAddress,
  formatFileSize,
  formatPercentage,
  createSlug
};