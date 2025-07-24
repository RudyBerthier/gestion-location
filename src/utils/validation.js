// src/utils/validation.js - Utilitaires de validation
import { VALIDATION_PATTERNS, VALIDATION_MESSAGES } from '../config/constants';

// ==================== VALIDATIONS DE BASE ====================

/**
 * Vérifie si une valeur est requise (non vide)
 * @param {any} value - Valeur à vérifier
 * @returns {boolean} true si valide
 */
export const isRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Vérifie la longueur minimale d'une chaîne
 * @param {string} value - Valeur à vérifier
 * @param {number} minLength - Longueur minimale
 * @returns {boolean} true si valide
 */
export const minLength = (value, minLength) => {
  if (!value) return true; // Si vide, la validation required s'en occupe
  return value.toString().length >= minLength;
};

/**
 * Vérifie la longueur maximale d'une chaîne
 * @param {string} value - Valeur à vérifier
 * @param {number} maxLength - Longueur maximale
 * @returns {boolean} true si valide
 */
export const maxLength = (value, maxLength) => {
  if (!value) return true;
  return value.toString().length <= maxLength;
};

/**
 * Vérifie si une valeur est un nombre valide
 * @param {any} value - Valeur à vérifier
 * @returns {boolean} true si valide
 */
export const isNumber = (value) => {
  if (value === null || value === undefined || value === '') return true;
  return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Vérifie si une valeur est un nombre entier
 * @param {any} value - Valeur à vérifier
 * @returns {boolean} true si valide
 */
export const isInteger = (value) => {
  if (value === null || value === undefined || value === '') return true;
  return VALIDATION_PATTERNS.INTEGER.test(value.toString());
};

/**
 * Vérifie la valeur minimale d'un nombre
 * @param {any} value - Valeur à vérifier
 * @param {number} min - Valeur minimale
 * @returns {boolean} true si valide
 */
export const minValue = (value, min) => {
  if (value === null || value === undefined || value === '') return true;
  const numValue = parseFloat(value);
  return !isNaN(numValue) && numValue >= min;
};

/**
 * Vérifie la valeur maximale d'un nombre
 * @param {any} value - Valeur à vérifier
 * @param {number} max - Valeur maximale
 * @returns {boolean} true si valide
 */
export const maxValue = (value, max) => {
  if (value === null || value === undefined || value === '') return true;
  const numValue = parseFloat(value);
  return !isNaN(numValue) && numValue <= max;
};

// ==================== VALIDATIONS SPÉCIFIQUES ====================

/**
 * Valide un format d'email
 * @param {string} email - Email à valider
 * @returns {boolean} true si valide
 */
export const isValidEmail = (email) => {
  if (!email) return true; // Optionnel si pas de required
  return VALIDATION_PATTERNS.EMAIL.test(email);
};

/**
 * Valide un numéro de téléphone français
 * @param {string} phone - Numéro à valider
 * @returns {boolean} true si valide
 */
export const isValidPhone = (phone) => {
  if (!phone) return true; // Optionnel si pas de required
  const cleaned = phone.replace(/[\s\-\.]/g, '');
  return VALIDATION_PATTERNS.PHONE.test(cleaned);
};

/**
 * Valide un code postal français
 * @param {string} postalCode - Code postal à valider
 * @returns {boolean} true si valide
 */
export const isValidPostalCode = (postalCode) => {
  if (!postalCode) return true;
  return VALIDATION_PATTERNS.POSTAL_CODE.test(postalCode);
};

/**
 * Valide un format de prix
 * @param {string|number} price - Prix à valider
 * @returns {boolean} true si valide
 */
export const isValidPrice = (price) => {
  if (price === null || price === undefined || price === '') return true;
  const priceStr = price.toString();
  return VALIDATION_PATTERNS.PRICE.test(priceStr) || VALIDATION_PATTERNS.DECIMAL.test(priceStr);
};

/**
 * Valide une date
 * @param {string} date - Date au format YYYY-MM-DD
 * @returns {boolean} true si valide
 */
export const isValidDate = (date) => {
  if (!date) return true;
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

/**
 * Valide qu'une date est dans le futur
 * @param {string} date - Date à valider
 * @returns {boolean} true si valide
 */
export const isFutureDate = (date) => {
  if (!date) return true;
  const dateObj = new Date(date);
  return dateObj > new Date();
};

/**
 * Valide qu'une date est dans le passé
 * @param {string} date - Date à valider
 * @returns {boolean} true si valide
 */
export const isPastDate = (date) => {
  if (!date) return true;
  const dateObj = new Date(date);
  return dateObj < new Date();
};

/**
 * Valide qu'une date de fin est postérieure à une date de début
 * @param {string} startDate - Date de début
 * @param {string} endDate - Date de fin
 * @returns {boolean} true si valide
 */
export const isEndDateAfterStartDate = (startDate, endDate) => {
  if (!startDate || !endDate) return true;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return end > start;
};

// ==================== VALIDATIONS DE FICHIERS ====================

/**
 * Valide le type d'un fichier
 * @param {File} file - Fichier à valider
 * @param {string[]} allowedTypes - Types autorisés
 * @returns {boolean} true si valide
 */
export const isValidFileType = (file, allowedTypes) => {
  if (!file || !allowedTypes || allowedTypes.length === 0) return true;
  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase());
    }
    return file.type === type || file.type.startsWith(type.split('/')[0] + '/');
  });
};

/**
 * Valide la taille d'un fichier
 * @param {File} file - Fichier à valider
 * @param {number} maxSize - Taille maximale en bytes
 * @returns {boolean} true si valide
 */
export const isValidFileSize = (file, maxSize) => {
  if (!file || !maxSize) return true;
  return file.size <= maxSize;
};

// ==================== VALIDATEUR COMPOSÉ ====================

/**
 * Classe pour créer et exécuter des validations complexes
 */
export class Validator {
  constructor() {
    this.rules = [];
    this.errors = {};
  }

  /**
   * Ajoute une règle de validation
   * @param {string} field - Nom du champ
   * @param {any} value - Valeur à valider
   * @param {Function} validationFn - Fonction de validation
   * @param {string} errorMessage - Message d'erreur
   * @returns {Validator} this pour chaînage
   */
  addRule(field, value, validationFn, errorMessage) {
    this.rules.push({
      field,
      value,
      validationFn,
      errorMessage
    });
    return this;
  }

  /**
   * Valide un champ requis
   * @param {string} field - Nom du champ
   * @param {any} value - Valeur
   * @param {string} errorMessage - Message personnalisé
   * @returns {Validator} this
   */
  required(field, value, errorMessage = VALIDATION_MESSAGES.REQUIRED) {
    return this.addRule(field, value, isRequired, errorMessage);
  }

  /**
   * Valide un email
   * @param {string} field - Nom du champ
   * @param {string} value - Email
   * @param {string} errorMessage - Message personnalisé
   * @returns {Validator} this
   */
  email(field, value, errorMessage = VALIDATION_MESSAGES.EMAIL_INVALID) {
    return this.addRule(field, value, isValidEmail, errorMessage);
  }

  /**
   * Valide un téléphone
   * @param {string} field - Nom du champ
   * @param {string} value - Téléphone
   * @param {string} errorMessage - Message personnalisé
   * @returns {Validator} this
   */
  phone(field, value, errorMessage = VALIDATION_MESSAGES.PHONE_INVALID) {
    return this.addRule(field, value, isValidPhone, errorMessage);
  }

  /**
   * Valide un prix
   * @param {string} field - Nom du champ
   * @param {any} value - Prix
   * @param {string} errorMessage - Message personnalisé
   * @returns {Validator} this
   */
  price(field, value, errorMessage = VALIDATION_MESSAGES.PRICE_INVALID) {
    return this.addRule(field, value, isValidPrice, errorMessage);
  }

  /**
   * Valide une longueur minimale
   * @param {string} field - Nom du champ
   * @param {string} value - Valeur
   * @param {number} min - Minimum
   * @param {string} errorMessage - Message personnalisé
   * @returns {Validator} this
   */
  min(field, value, min, errorMessage = VALIDATION_MESSAGES.MIN_LENGTH(min)) {
    return this.addRule(field, value, (val) => minLength(val, min), errorMessage);
  }

  /**
   * Valide une longueur maximale
   * @param {string} field - Nom du champ
   * @param {string} value - Valeur
   * @param {number} max - Maximum
   * @param {string} errorMessage - Message personnalisé
   * @returns {Validator} this
   */
  max(field, value, max, errorMessage = VALIDATION_MESSAGES.MAX_LENGTH(max)) {
    return this.addRule(field, value, (val) => maxLength(val, max), errorMessage);
  }

  /**
   * Exécute toutes les validations
   * @returns {object} Résultat de validation
   */
  validate() {
    this.errors = {};
    let isValid = true;

    this.rules.forEach(({ field, value, validationFn, errorMessage }) => {
      if (!validationFn(value)) {
        this.errors[field] = this.errors[field] || [];
        this.errors[field].push(errorMessage);
        isValid = false;
      }
    });

    return {
      isValid,
      errors: this.errors,
      hasError: (field) => !!(this.errors[field] && this.errors[field].length > 0),
      getError: (field) => this.errors[field] ? this.errors[field][0] : null,
      getAllErrors: () => Object.values(this.errors).flat()
    };
  }

  /**
   * Remet à zéro le validateur
   */
  reset() {
    this.rules = [];
    this.errors = {};
  }
}

// ==================== SCHÉMAS DE VALIDATION PRÉDÉFINIS ====================

/**
 * Valide les données d'un appartement
 * @param {object} data - Données à valider
 * @returns {object} Résultat de validation
 */
export const validateApartmentData = (data) => {
  const validator = new Validator();

  return validator
    .required('titre', data.titre)
    .min('titre', data.titre, 3)
    .max('titre', data.titre, 200)
    .required('adresse_complete', data.adresse_complete)
    .min('adresse_complete', data.adresse_complete, 5)
    .price('prix_loyer', data.prix_loyer)
    .price('charges', data.charges)
    .price('depot_garantie', data.depot_garantie)
    .addRule('surface', data.surface, (val) => !val || (isNumber(val) && parseFloat(val) > 0), 'Surface invalide')
    .addRule('nb_pieces', data.nb_pieces, (val) => !val || (isInteger(val) && parseInt(val) > 0), 'Nombre de pièces invalide')
    .addRule('nb_chambres', data.nb_chambres, (val) => !val || (isInteger(val) && parseInt(val) >= 0), 'Nombre de chambres invalide')
    .validate();
};

/**
 * Valide les données d'un locataire
 * @param {object} data - Données à valider
 * @returns {object} Résultat de validation
 */
export const validateTenantData = (data) => {
  const validator = new Validator();

  return validator
    .required('nom', data.nom)
    .min('nom', data.nom, 2)
    .max('nom', data.nom, 50)
    .required('prenom', data.prenom)
    .min('prenom', data.prenom, 2)
    .max('prenom', data.prenom, 50)
    .email('email', data.email)
    .phone('telephone', data.telephone)
    .price('salaire', data.salaire)
    .addRule('date_naissance', data.date_naissance, isValidDate, 'Date de naissance invalide')
    .validate();
};

/**
 * Valide les données d'une location
 * @param {object} data - Données à valider
 * @returns {object} Résultat de validation
 */
export const validateLocationData = (data) => {
  const validator = new Validator();

  const result = validator
    .required('appartement_id', data.appartement_id, 'Appartement requis')
    .required('locataire_id', data.locataire_id, 'Locataire requis')
    .required('date_debut', data.date_debut, 'Date de début requise')
    .addRule('date_debut', data.date_debut, isValidDate, 'Date de début invalide')
    .addRule('date_fin', data.date_fin, isValidDate, 'Date de fin invalide')
    .price('loyer_mensuel', data.loyer_mensuel)
    .price('charges_mensuelles', data.charges_mensuelles)
    .price('depot_garantie', data.depot_garantie)
    .validate();

  // Validation spéciale : date de fin après date de début
  if (data.date_debut && data.date_fin && !isEndDateAfterStartDate(data.date_debut, data.date_fin)) {
    result.errors.date_fin = result.errors.date_fin || [];
    result.errors.date_fin.push('La date de fin doit être postérieure à la date de début');
    result.isValid = false;
  }

  return result;
};

/**
 * Valide les données de connexion
 * @param {object} data - Données à valider
 * @returns {object} Résultat de validation
 */
export const validateLoginData = (data) => {
  const validator = new Validator();

  return validator
    .required('email', data.email)
    .email('email', data.email)
    .required('password', data.password)
    .min('password', data.password, 6)
    .validate();
};

/**
 * Valide les données d'inscription
 * @param {object} data - Données à valider
 * @returns {object} Résultat de validation
 */
export const validateRegisterData = (data) => {
  const validator = new Validator();

  const result = validator
    .required('nom', data.nom)
    .min('nom', data.nom, 2)
    .max('nom', data.nom, 50)
    .required('prenom', data.prenom)
    .min('prenom', data.prenom, 2)
    .max('prenom', data.prenom, 50)
    .required('email', data.email)
    .email('email', data.email)
    .required('password', data.password)
    .min('password', data.password, 8)
    .phone('telephone', data.telephone)
    .validate();

  // Validation spéciale : confirmation mot de passe
  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    result.errors.confirmPassword = result.errors.confirmPassword || [];
    result.errors.confirmPassword.push('Les mots de passe ne correspondent pas');
    result.isValid = false;
  }

  return result;
};

// Export par défaut
export default {
  // Validations de base
  isRequired,
  minLength,
  maxLength,
  isNumber,
  isInteger,
  minValue,
  maxValue,
  
  // Validations spécifiques
  isValidEmail,
  isValidPhone,
  isValidPostalCode,
  isValidPrice,
  isValidDate,
  isFutureDate,
  isPastDate,
  isEndDateAfterStartDate,
  
  // Validations fichiers
  isValidFileType,
  isValidFileSize,
  
  // Validator class
  Validator,
  
  // Schémas prédéfinis
  validateApartmentData,
  validateTenantData,
  validateLocationData,
  validateLoginData,
  validateRegisterData
};