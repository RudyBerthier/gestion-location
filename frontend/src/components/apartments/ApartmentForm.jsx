// src/components/apartments/ApartmentForm.jsx - Version corrigée complète
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, MapPin, Upload, X, AlertCircle, CheckCircle2, Image as ImageIcon, Video } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';

const ApartmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh } = useApp();
  const { addNotification } = useNotifications();
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!id);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressTimeout, setAddressTimeout] = useState(null);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    titre: '',
    adresse_complete: '',
    surface: '',
    nb_pieces: '',
    nb_chambres: '',
    prix_loyer: '',
    charges: '',
    depot_garantie: '',
    statut: 'libre',
    description: ''
  });

  const isEdit = !!id;

  // Fonction utilitaire pour les requêtes API
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

    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const response = await fetch(`/gestion-locative/api${endpoint}`, config);
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Session expirée');
    }

    const data = await response.json();
    return { ...data, status: response.status };
  };

  useEffect(() => {
    if (isEdit) {
      loadApartmentData();
    }
  }, [id]);

  const loadApartmentData = async () => {
    setLoadingData(true);
    try {
      //console.log('🏠 Chargement appartement ID:', id);
      
      const [apartmentResponse, mediasResponse] = await Promise.all([
        apiRequest(`/apartments/${id}`),
        apiRequest(`/apartments/${id}/media`)
      ]);
      
      //console.log('🏠 Données appartement:', apartmentResponse);
      //console.log('🖼️ Médias:', mediasResponse);

      // Traiter les données de l'appartement
      if (apartmentResponse) {
        const apartment = apartmentResponse; // L'API retourne directement l'objet
        setFormData({
          titre: apartment.titre || '',
          adresse_complete: apartment.adresse_complete || '',
          surface: apartment.surface || '',
          nb_pieces: apartment.nb_pieces || '',
          nb_chambres: apartment.nb_chambres || '',
          prix_loyer: apartment.prix_loyer || '',
          charges: apartment.charges || '',
          depot_garantie: apartment.depot_garantie || '',
          statut: apartment.statut || 'libre',
          description: apartment.description || ''
        });
      }

      // Traiter les médias
      if (mediasResponse) {
        const medias = Array.isArray(mediasResponse) ? mediasResponse : [];
        const photos = medias.filter(m => m.type_media === 'photo');
        setUploadedPhotos(photos);
        //console.log('🖼️ Photos chargées:', photos.length);
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement appartement:', error);
      addNotification('Erreur lors du chargement', 'error');
      navigate('/apartments');
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validation champs requis
    if (!formData.titre.trim()) newErrors.titre = 'Le titre est obligatoire';
    if (!formData.adresse_complete.trim()) newErrors.adresse_complete = 'L\'adresse est obligatoire';
    
    // Validation surface
    if (formData.surface && (isNaN(formData.surface) || parseFloat(formData.surface) <= 0)) {
      newErrors.surface = 'La surface doit être un nombre positif';
    }
    
    // Validation nombre de pièces
    if (formData.nb_pieces && (isNaN(formData.nb_pieces) || parseInt(formData.nb_pieces) <= 0)) {
      newErrors.nb_pieces = 'Le nombre de pièces doit être un nombre positif';
    }
    
    // Validation nombre de chambres
    if (formData.nb_chambres && (isNaN(formData.nb_chambres) || parseInt(formData.nb_chambres) < 0)) {
      newErrors.nb_chambres = 'Le nombre de chambres doit être un nombre positif ou zéro';
    }
    
    // Validation prix
    if (formData.prix_loyer && (isNaN(formData.prix_loyer) || parseFloat(formData.prix_loyer) < 0)) {
      newErrors.prix_loyer = 'Le loyer doit être un nombre positif';
    }
    
    if (formData.charges && (isNaN(formData.charges) || parseFloat(formData.charges) < 0)) {
      newErrors.charges = 'Les charges doivent être un nombre positif';
    }
    
    if (formData.depot_garantie && (isNaN(formData.depot_garantie) || parseFloat(formData.depot_garantie) < 0)) {
      newErrors.depot_garantie = 'Le dépôt de garantie doit être un nombre positif';
    }

    // Validation cohérence chambres/pièces
    if (formData.nb_pieces && formData.nb_chambres && 
        parseInt(formData.nb_chambres) > parseInt(formData.nb_pieces)) {
      newErrors.nb_chambres = 'Le nombre de chambres ne peut pas dépasser le nombre de pièces';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const searchAddress = async (query) => {
    if (addressTimeout) clearTimeout(addressTimeout);
    
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        //console.log('🔍 Recherche adresse:', query);
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        setAddressSuggestions(data.features || []);
        //console.log('🔍 Suggestions reçues:', data.features?.length || 0);
      } catch (error) {
        console.error('❌ Erreur API adresse:', error);
        setAddressSuggestions([]);
      }
    }, 300);

    setAddressTimeout(timeout);
  };

  const handlePhotoUpload = async (files) => {
    if (!files || files.length === 0) return;

    if (!isEdit) {
      // Pour la création, on stocke temporairement les fichiers
      const newPhotos = Array.from(files).map(file => ({
        file,
        nom_fichier: file.name,
        type_media: file.type.startsWith('image/') ? 'photo' : 'video',
        preview: URL.createObjectURL(file),
        isNew: true,
        size: file.size
      }));
      setUploadedPhotos(prev => [...prev, ...newPhotos]);
      //console.log('📸 Photos ajoutées temporairement:', newPhotos.length);
      return;
    }

    // Pour la modification, upload immédiat
    try {
      //console.log('📤 Upload photos pour appartement:', id);
      
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('media', file);
      });

      const result = await apiRequest(`/apartments/${id}/media`, {
        method: 'POST',
        body: formData
      });

      //console.log('📤 Résultat upload:', result);
      
      if (result.success) {
        // Recharger les médias
        const mediasResponse = await apiRequest(`/apartments/${id}/media`);
        const medias = Array.isArray(mediasResponse) ? mediasResponse : [];
        setUploadedPhotos(medias.filter(m => m.type_media === 'photo'));
        addNotification('Photos ajoutées avec succès', 'success');
      } else {
        addNotification(result.message || 'Erreur lors de l\'upload', 'error');
      }
    } catch (error) {
      console.error('❌ Erreur upload photos:', error);
      addNotification('Erreur lors de l\'upload des photos', 'error');
    }
  };

  const removePhoto = async (photoIndex, photoId = null) => {
    if (photoId && isEdit) {
      // Supprimer du serveur
      try {
        //console.log('🗑️ Suppression photo ID:', photoId);
        
        const result = await apiRequest(`/media/${photoId}`, {
          method: 'DELETE'
        });
        
        //console.log('🗑️ Résultat suppression:', result);
        
        if (result.success) {
          setUploadedPhotos(prev => prev.filter((_, index) => index !== photoIndex));
          addNotification('Photo supprimée', 'success');
        } else {
          addNotification('Erreur lors de la suppression', 'error');
        }
      } catch (error) {
        console.error('❌ Erreur suppression photo:', error);
        addNotification('Erreur lors de la suppression', 'error');
      }
    } else {
      // Supprimer localement
      const photo = uploadedPhotos[photoIndex];
      if (photo && photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
      setUploadedPhotos(prev => prev.filter((_, index) => index !== photoIndex));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      addNotification('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      //console.log('💾 Début sauvegarde appartement...');

      // Préparer les données pour l'API
      const apartmentData = {
        titre: formData.titre.trim(),
        adresse_complete: formData.adresse_complete.trim(),
        surface: formData.surface ? parseFloat(formData.surface) : null,
        nb_pieces: formData.nb_pieces ? parseInt(formData.nb_pieces) : null,
        nb_chambres: formData.nb_chambres ? parseInt(formData.nb_chambres) : null,
        prix_loyer: formData.prix_loyer ? parseFloat(formData.prix_loyer) : null,
        charges: formData.charges ? parseFloat(formData.charges) : null,
        depot_garantie: formData.depot_garantie ? parseFloat(formData.depot_garantie) : null,
        statut: formData.statut,
        description: formData.description.trim() || null
      };

      //console.log('🏠 Données à sauvegarder:', apartmentData);

      let result;
      let apartmentId;

      if (isEdit) {
        // Modification
        result = await apiRequest(`/apartments/${id}`, {
          method: 'PUT',
          body: JSON.stringify(apartmentData)
        });
        apartmentId = id;
      } else {
        // Création
        result = await apiRequest('/apartments', {
          method: 'POST',
          body: JSON.stringify(apartmentData)
        });
        apartmentId = result.id;
      }

      //console.log('📤 Résultat sauvegarde appartement:', result);

      if (!result.success) {
        throw new Error(result.message || 'Erreur lors de la sauvegarde');
      }

      // Upload des photos pour les nouveaux appartements
      if (!isEdit && uploadedPhotos.length > 0) {
        //console.log('📸 Upload photos après création...');
        
        try {
          const newPhotos = uploadedPhotos.filter(p => p.isNew);
          if (newPhotos.length > 0) {
            const mediaFormData = new FormData();
            newPhotos.forEach(photo => {
              mediaFormData.append('media', photo.file);
            });

            const mediaResult = await apiRequest(`/apartments/${apartmentId}/media`, {
              method: 'POST',
              body: mediaFormData
            });

            //console.log('📸 Résultat upload photos:', mediaResult);
            
            if (!mediaResult.success) {
              addNotification('Appartement créé mais erreur avec les photos', 'warning');
            }
          }
        } catch (photoError) {
          console.error('❌ Erreur upload photos:', photoError);
          addNotification('Appartement créé mais erreur avec les photos', 'warning');
        }
      }

      // Rafraîchir les données globales
      await refresh();
      
      addNotification(
        isEdit ? 'Appartement modifié avec succès!' : 'Appartement créé avec succès!', 
        'success'
      );
      
      navigate(isEdit ? `/apartments/${id}` : '/apartments');

    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      addNotification('Erreur lors de la sauvegarde: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    if (field === 'adresse_complete') {
      searchAddress(value);
    }
  };

  const selectAddress = (address) => {
    setFormData(prev => ({ ...prev, adresse_complete: address.properties.label }));
    setAddressSuggestions([]);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loadingData) {
    return <LoadingSpinner message="Chargement de l'appartement..." />;
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => navigate('/apartments')}
            className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Modifier l\'appartement' : 'Nouvel appartement'}
            </h1>
            <p className="text-gray-600">
              {isEdit ? 'Modifiez les informations de votre appartement' : 'Ajoutez un nouvel appartement à votre portefeuille'}
            </p>
          </div>
        </div>

        {/* Indicateur d'erreurs */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Veuillez corriger les erreurs suivantes :</p>
              <ul className="text-red-700 text-sm mt-1">
                {Object.values(errors).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire principal */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre de l'annonce *
                </label>
                <input
                  type="text"
                  required
                  value={formData.titre}
                  onChange={(e) => handleInputChange('titre', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.titre ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Ex: Appartement T2 centre-ville avec terrasse"
                />
                {errors.titre && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.titre}
                  </p>
                )}
              </div>

              {/* Adresse */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse complète *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.adresse_complete}
                    onChange={(e) => handleInputChange('adresse_complete', e.target.value)}
                    className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.adresse_complete ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="Commencez à taper l'adresse..."
                  />
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                </div>
                {errors.adresse_complete && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.adresse_complete}
                  </p>
                )}
                
                {addressSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-lg max-h-48 overflow-y-auto z-10 shadow-lg">
                    {addressSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectAddress(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium">{suggestion.properties.label}</div>
                        <div className="text-sm text-gray-500">{suggestion.properties.context}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Caractéristiques */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Surface (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.surface}
                    onChange={(e) => handleInputChange('surface', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.surface ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="45.5"
                  />
                  {errors.surface && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.surface}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de pièces
                  </label>
                  <input
                    type="number"
                    value={formData.nb_pieces}
                    onChange={(e) => handleInputChange('nb_pieces', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.nb_pieces ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="3"
                  />
                  {errors.nb_pieces && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.nb_pieces}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de chambres
                  </label>
                  <input
                    type="number"
                    value={formData.nb_chambres}
                    onChange={(e) => handleInputChange('nb_chambres', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.nb_chambres ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="2"
                  />
                  {errors.nb_chambres && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.nb_chambres}
                    </p>
                  )}
                </div>
              </div>

              {/* Informations financières */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loyer mensuel (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.prix_loyer}
                    onChange={(e) => handleInputChange('prix_loyer', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.prix_loyer ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="1200"
                  />
                  {errors.prix_loyer && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.prix_loyer}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Charges (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.charges}
                    onChange={(e) => handleInputChange('charges', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.charges ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="150"
                  />
                  {errors.charges && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.charges}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dépôt de garantie (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.depot_garantie}
                    onChange={(e) => handleInputChange('depot_garantie', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.depot_garantie ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="1200"
                  />
                  {errors.depot_garantie && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.depot_garantie}
                    </p>
                  )}
                </div>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={formData.statut}
                  onChange={(e) => handleInputChange('statut', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="libre">Libre</option>
                  <option value="occupé">Occupé</option>
                  <option value="en_travaux">En travaux</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Décrivez l'appartement (équipements, proximités, particularités...)"
                />
              </div>

              {/* Boutons */}
              <div className="flex space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => navigate('/apartments')}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sauvegarde...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>{isEdit ? 'Modifier' : 'Créer'} l'appartement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar photos et résumé */}
        <div className="space-y-6">
          {/* Section Photos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Photos</h3>
            
            {/* Zone d'upload */}
            <div className="mb-4">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handlePhotoUpload(e.target.files)}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <Upload size={24} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-600 font-medium">Cliquez pour ajouter des photos</span>
                <span className="text-xs text-gray-500 mt-1">Images et vidéos acceptées</span>
              </label>
            </div>

            {/* Photos uploadées */}
            {uploadedPhotos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    {uploadedPhotos.length} photo{uploadedPhotos.length > 1 ? 's' : ''}
                  </p>
                  {uploadedPhotos.some(p => p.isNew) && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {uploadedPhotos.filter(p => p.isNew).length} nouvelle(s)
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {uploadedPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <div className="relative">
                        <img
                          src={photo.preview || `/gestion-locative/api/${photo.url}`}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.src = '/placeholder-image.jpg';
                            e.target.alt = 'Image non disponible';
                          }}
                        />
                        {photo.type_media === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Video size={20} className="text-white drop-shadow-lg" />
                          </div>
                        )}
                        {photo.isNew && (
                          <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                            Nouveau
                          </div>
                        )}
                        {index === 0 && (
                          <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                            Principal
                          </div>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => removePhoto(index, photo.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer cette photo"
                      >
                        <X size={12} />
                      </button>
                      
                      {photo.size && (
                        <div className="text-xs text-gray-500 mt-1 text-center">
                          {formatFileSize(photo.size)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                  💡 La première photo sera utilisée comme image principale
                </div>
              </div>
            )}
          </div>

          {/* Résumé */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Résumé</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Titre:</span>
                <span className="font-medium">
                  {formData.titre || 'Non renseigné'}
                </span>
              </div>
              
              {formData.surface && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Surface:</span>
                  <span className="font-medium">{formData.surface} m²</span>
                </div>
              )}
              
              {formData.nb_pieces && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pièces:</span>
                  <span className="font-medium">{formData.nb_pieces}</span>
                </div>
              )}
              
              {formData.nb_chambres && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Chambres:</span>
                  <span className="font-medium">{formData.nb_chambres}</span>
                </div>
              )}
              
              {formData.prix_loyer && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Loyer:</span>
                  <span className="font-medium text-green-600">
                    {parseFloat(formData.prix_loyer).toLocaleString()}€
                  </span>
                </div>
              )}
              
              {formData.charges && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Charges:</span>
                  <span className="font-medium">
                    {parseFloat(formData.charges).toLocaleString()}€
                  </span>
                </div>
              )}
              
              {formData.prix_loyer && formData.charges && (
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600 font-medium">Total mensuel:</span>
                  <span className="font-bold text-blue-600">
                    {(parseFloat(formData.prix_loyer) + parseFloat(formData.charges)).toLocaleString()}€
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Statut:</span>
                <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                  formData.statut === 'libre' ? 'bg-green-100 text-green-800' :
                  formData.statut === 'occupé' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {formData.statut === 'en_travaux' ? 'En travaux' : 
                   formData.statut.charAt(0).toUpperCase() + formData.statut.slice(1)}
                </span>
              </div>
              
              {uploadedPhotos.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Photos:</span>
                  <span className="font-medium">
                    {uploadedPhotos.length}
                    {uploadedPhotos.filter(p => p.isNew).length > 0 && 
                      ` (+${uploadedPhotos.filter(p => p.isNew).length})`
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Aide */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center">
              <CheckCircle2 size={16} className="mr-2" />
              Conseils
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• Le titre et l'adresse sont obligatoires</p>
              <p>• Ajoutez des photos pour rendre votre annonce attractive</p>
              <p>• Une description détaillée aide à la location</p>
              <p>• Vérifiez la cohérence des informations financières</p>
              {Object.keys(errors).length > 0 && (
                <p className="text-red-700 font-medium flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  Corrigez les erreurs avant de sauvegarder
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApartmentForm;