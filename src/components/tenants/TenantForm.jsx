// src/components/tenants/TenantForm.jsx - Version corrigée complète
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, X, User, Building, Euro, Calendar, FileText, AlertCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';

const TenantForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apartments, refresh } = useApp();
  const { addNotification } = useNotifications();
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!id);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('personal');
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    date_naissance: '',
    profession: '',
    salaire: ''
  });

  const [locationData, setLocationData] = useState({
    appartement_id: '',
    date_debut: '',
    date_fin: '',
    loyer_mensuel: '',
    charges_mensuelles: '',
    depot_garantie: '',
    statut: 'active'
  });

  const [currentLocation, setCurrentLocation] = useState(null);
  const [errors, setErrors] = useState({});

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
      loadTenantData();
    }
  }, [id]);

  const loadTenantData = async () => {
    setLoadingData(true);
    try {
      //console.log('🔍 Chargement données locataire ID:', id);
      
      const [
        tenantResponse,
        locationsResponse,
        documentsResponse
      ] = await Promise.all([
        apiRequest(`/tenants/${id}`),
        apiRequest(`/tenants/${id}/locations`),
        apiRequest(`/tenants/${id}/documents`)
      ]);

      //console.log('👤 Données locataire:', tenantResponse);
      //console.log('🏠 Locations:', locationsResponse);
      //console.log('📄 Documents:', documentsResponse);

      // Traiter les données du locataire
      if (tenantResponse.success && tenantResponse.data) {
        const tenant = tenantResponse.data;
        setFormData({
          nom: tenant.nom || '',
          prenom: tenant.prenom || '',
          email: tenant.email || '',
          telephone: tenant.telephone || '',
          date_naissance: tenant.date_naissance ? tenant.date_naissance.split('T')[0] : '',
          profession: tenant.profession || '',
          salaire: tenant.salaire || ''
        });
      }

      // Traiter les locations
      if (locationsResponse.success && locationsResponse.data) {
        const locations = locationsResponse.data;
        const activeLocation = locations.find(loc => loc.statut === 'active');
        
        if (activeLocation) {
          setCurrentLocation(activeLocation);
          setLocationData({
            appartement_id: activeLocation.appartement_id || '',
            date_debut: activeLocation.date_debut ? activeLocation.date_debut.split('T')[0] : '',
            date_fin: activeLocation.date_fin ? activeLocation.date_fin.split('T')[0] : '',
            loyer_mensuel: activeLocation.loyer_mensuel || '',
            charges_mensuelles: activeLocation.charges_mensuelles || '',
            depot_garantie: activeLocation.depot_garantie || '',
            statut: activeLocation.statut || 'active'
          });
        }
      }

      // Traiter les documents
      if (documentsResponse.success && documentsResponse.data) {
        setUploadedDocuments(documentsResponse.data || []);
      }

    } catch (error) {
      console.error('❌ Erreur chargement locataire:', error);
      addNotification('Erreur lors du chargement des données', 'error');
      navigate('/tenants');
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validation champs requis
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est obligatoire';
    if (!formData.prenom.trim()) newErrors.prenom = 'Le prénom est obligatoire';
    
    // Validation email si fourni
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    // Validation téléphone si fourni
    if (formData.telephone && !/^(\+33|0)[1-9](\d{8})$/.test(formData.telephone.replace(/[\s\-\.]/g, ''))) {
      newErrors.telephone = 'Format de téléphone invalide';
    }

    // Validation salaire si fourni
    if (formData.salaire && (isNaN(formData.salaire) || parseFloat(formData.salaire) < 0)) {
      newErrors.salaire = 'Le salaire doit être un nombre positif';
    }

    // Validation location si fournie
    if (locationData.appartement_id) {
      if (!locationData.date_debut) {
        newErrors.date_debut = 'La date de début est obligatoire';
      }
      if (locationData.date_fin && locationData.date_debut && locationData.date_fin <= locationData.date_debut) {
        newErrors.date_fin = 'La date de fin doit être postérieure à la date de début';
      }
      if (locationData.loyer_mensuel && (isNaN(locationData.loyer_mensuel) || parseFloat(locationData.loyer_mensuel) < 0)) {
        newErrors.loyer_mensuel = 'Le loyer doit être un nombre positif';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDocumentUpload = async (files) => {
    if (!files || files.length === 0) return;

    if (!isEdit) {
      // Pour la création, on stocke temporairement les fichiers
      const newDocs = Array.from(files).map(file => ({
        file,
        nom_document: file.name,
        type_document: guessDocumentType(file.name),
        isNew: true,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      }));
      setUploadedDocuments(prev => [...prev, ...newDocs]);
      return;
    }

    // Pour la modification, upload immédiat
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('locataire_id', id);
        formData.append('nom_document', file.name);
        formData.append('type_document', guessDocumentType(file.name));
        formData.append('description', '');

        return await apiRequest('/documents', {
          method: 'POST',
          body: formData
        });
      });

      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;

      if (successCount > 0) {
        // Recharger les documents
        const documentsResponse = await apiRequest(`/tenants/${id}/documents`);
        if (documentsResponse.success) {
          setUploadedDocuments(documentsResponse.data || []);
        }
        addNotification(`${successCount} document(s) ajouté(s) avec succès`, 'success');
      }
      
      if (errorCount > 0) {
        addNotification(`${errorCount} erreur(s) lors de l'upload`, 'error');
      }

    } catch (error) {
      console.error('❌ Erreur upload documents:', error);
      addNotification('Erreur lors de l\'upload des documents', 'error');
    }
  };

  const guessDocumentType = (filename) => {
    const name = filename.toLowerCase();
    if (name.includes('cni') || name.includes('carte') || name.includes('identite') || name.includes('passeport')) return 'piece_identite';
    if (name.includes('salaire') || name.includes('bulletin') || name.includes('paie') || name.includes('fiche_paie')) return 'bulletin_salaire';
    if (name.includes('justificatif') || name.includes('domicile') || name.includes('edf') || name.includes('gaz')) return 'justificatif_domicile';
    if (name.includes('garant') || name.includes('caution')) return 'document_garant';
    if (name.includes('contrat') || name.includes('travail') || name.includes('emploi')) return 'contrat_travail';
    if (name.includes('avis') || name.includes('imposition') || name.includes('impot')) return 'avis_imposition';
    return 'autre';
  };

  const removeDocument = async (docIndex, docId = null) => {
    if (docId && isEdit) {
      try {
        const result = await apiRequest(`/documents/${docId}`, {
          method: 'DELETE'
        });
        
        if (result.success) {
          setUploadedDocuments(prev => prev.filter((_, index) => index !== docIndex));
          addNotification('Document supprimé', 'success');
        } else {
          addNotification('Erreur lors de la suppression', 'error');
        }
      } catch (error) {
        console.error('❌ Erreur suppression document:', error);
        addNotification('Erreur lors de la suppression', 'error');
      }
    } else {
      // Supprimer localement
      const doc = uploadedDocuments[docIndex];
      if (doc && doc.preview) {
        URL.revokeObjectURL(doc.preview);
      }
      setUploadedDocuments(prev => prev.filter((_, index) => index !== docIndex));
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
      //console.log('💾 Début sauvegarde locataire...');

      // Préparer les données du locataire
      const tenantData = {
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        email: formData.email.trim() || null,
        telephone: formData.telephone.trim() || null,
        date_naissance: formData.date_naissance || null,
        profession: formData.profession.trim() || null,
        salaire: formData.salaire ? parseFloat(formData.salaire) : null
      };

      //console.log('👤 Données locataire à sauvegarder:', tenantData);

      // 1. Créer ou modifier le locataire
      let tenantResult;
      if (isEdit) {
        tenantResult = await apiRequest(`/tenants/${id}`, {
          method: 'PUT',
          body: JSON.stringify(tenantData)
        });
      } else {
        tenantResult = await apiRequest('/tenants', {
          method: 'POST',
          body: JSON.stringify(tenantData)
        });
      }

      //console.log('📤 Résultat sauvegarde locataire:', tenantResult);

      if (!tenantResult.success) {
        throw new Error(tenantResult.message || 'Erreur lors de la sauvegarde du locataire');
      }

      const tenantId = isEdit ? id : tenantResult.id;

      // 2. Gérer la location si fournie
      if (locationData.appartement_id && locationData.date_debut) {
        //console.log('🏠 Traitement de la location...');
        
        const locationRequestData = {
          appartement_id: parseInt(locationData.appartement_id),
          locataire_id: parseInt(tenantId),
          date_debut: locationData.date_debut,
          date_fin: locationData.date_fin || null,
          loyer_mensuel: locationData.loyer_mensuel ? parseFloat(locationData.loyer_mensuel) : null,
          charges_mensuelles: locationData.charges_mensuelles ? parseFloat(locationData.charges_mensuelles) : null,
          depot_garantie: locationData.depot_garantie ? parseFloat(locationData.depot_garantie) : null,
          statut: locationData.statut || 'active'
        };

        //console.log('🏠 Données location à sauvegarder:', locationRequestData);

        try {
          let locationResult;
          if (currentLocation) {
            // Modifier la location existante
            locationResult = await apiRequest(`/locations/${currentLocation.id}`, {
              method: 'PUT',
              body: JSON.stringify(locationRequestData)
            });
          } else {
            // Créer nouvelle location
            locationResult = await apiRequest('/locations', {
              method: 'POST',
              body: JSON.stringify(locationRequestData)
            });
          }

          //console.log('📤 Résultat sauvegarde location:', locationResult);

          if (!locationResult.success) {
            addNotification('Locataire sauvegardé mais erreur avec la location: ' + locationResult.message, 'warning');
          }
        } catch (locationError) {
          console.error('❌ Erreur location:', locationError);
          addNotification('Locataire sauvegardé mais erreur avec la location', 'warning');
        }
      }

      // 3. Upload des documents pour les nouveaux locataires
      if (!isEdit && uploadedDocuments.length > 0) {
        //console.log('📄 Upload des documents...');
        
        try {
          const newDocuments = uploadedDocuments.filter(doc => doc.isNew);
          if (newDocuments.length > 0) {
            const uploadPromises = newDocuments.map(async (docData) => {
              const formData = new FormData();
              formData.append('document', docData.file);
              formData.append('locataire_id', tenantId);
              formData.append('nom_document', docData.nom_document);
              formData.append('type_document', docData.type_document);
              formData.append('description', '');

              return await apiRequest('/documents', {
                method: 'POST',
                body: formData
              });
            });

            await Promise.all(uploadPromises);
            //console.log('📄 Documents uploadés avec succès');
          }
        } catch (docError) {
          console.error('❌ Erreur upload documents:', docError);
          addNotification('Locataire créé mais erreur avec les documents', 'warning');
        }
      }

      // 4. Rafraîchir les données et rediriger
      await refresh();
      
      addNotification(
        isEdit ? 'Locataire modifié avec succès!' : 'Locataire créé avec succès!',
        'success'
      );
      
      navigate(isEdit ? `/tenants/${id}` : '/tenants');

    } catch (error) {
      console.error('❌ Erreur sauvegarde générale:', error);
      addNotification('Erreur lors de la sauvegarde: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value, isLocation = false) => {
    if (isLocation) {
      setLocationData(prev => ({ ...prev, [field]: value }));
      // Clear location errors when user types
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
      // Clear errors when user types
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  if (loadingData) {
    return <LoadingSpinner message="Chargement du locataire..." />;
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => navigate('/tenants')}
            className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Modifier le locataire' : 'Nouveau locataire'}
            </h1>
            <p className="text-gray-600">
              {isEdit ? 'Modifiez les informations du locataire' : 'Ajoutez un nouveau locataire à votre portefeuille'}
            </p>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'personal', label: 'Informations personnelles', icon: User },
              { id: 'location', label: 'Location', icon: Building },
              { id: 'documents', label: 'Documents', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
                {/* Indicateur d'erreurs */}
                {((tab.id === 'personal' && (errors.nom || errors.prenom || errors.email || errors.telephone || errors.salaire)) ||
                  (tab.id === 'location' && (errors.date_debut || errors.date_fin || errors.loyer_mensuel))) && (
                  <AlertCircle size={14} className="text-red-500" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire principal */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Onglet Informations personnelles */}
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prénom *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.prenom}
                        onChange={(e) => handleInputChange('prenom', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                          errors.prenom ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="Prénom"
                      />
                      {errors.prenom && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle size={14} className="mr-1" />
                          {errors.prenom}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nom}
                        onChange={(e) => handleInputChange('nom', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                          errors.nom ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="Nom"
                      />
                      {errors.nom && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle size={14} className="mr-1" />
                          {errors.nom}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="email@exemple.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => handleInputChange('telephone', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.telephone ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="06 12 34 56 78"
                    />
                    {errors.telephone && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        {errors.telephone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de naissance
                    </label>
                    <input
                      type="date"
                      value={formData.date_naissance}
                      onChange={(e) => handleInputChange('date_naissance', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profession
                    </label>
                    <input
                      type="text"
                      value={formData.profession}
                      onChange={(e) => handleInputChange('profession', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Ingénieur, Professeur..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salaire mensuel (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.salaire}
                      onChange={(e) => handleInputChange('salaire', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.salaire ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="3000"
                    />
                    {errors.salaire && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        {errors.salaire}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Onglet Location */}
              {activeTab === 'location' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-blue-800">
                      <Building size={16} />
                      <span className="font-medium">
                        {currentLocation ? 'Location actuelle' : 'Nouvelle location'}
                      </span>
                    </div>
                    {currentLocation && (
                      <p className="text-sm text-blue-700 mt-1">
                        Vous modifiez la location active de ce locataire.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appartement
                    </label>
                    <select
                      value={locationData.appartement_id}
                      onChange={(e) => handleInputChange('appartement_id', e.target.value, true)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sélectionner un appartement</option>
                      {apartments
                        .filter(apt => 
                          apt.statut === 'libre' || 
                          apt.id == locationData.appartement_id ||
                          (!isEdit && apt.statut !== 'occupé')
                        )
                        .map(apt => (
                          <option key={apt.id} value={apt.id}>
                            {apt.titre} {apt.statut === 'occupé' && apt.id != locationData.appartement_id && ' (Occupé)'}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date de début
                      </label>
                      <input
                        type="date"
                        value={locationData.date_debut}
                        onChange={(e) => handleInputChange('date_debut', e.target.value, true)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                          errors.date_debut ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                      />
                      {errors.date_debut && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle size={14} className="mr-1" />
                          {errors.date_debut}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date de fin (optionnel)
                      </label>
                      <input
                        type="date"
                        value={locationData.date_fin}
                        onChange={(e) => handleInputChange('date_fin', e.target.value, true)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                          errors.date_fin ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                      />
                      {errors.date_fin && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle size={14} className="mr-1" />
                          {errors.date_fin}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loyer mensuel (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={locationData.loyer_mensuel}
                        onChange={(e) => handleInputChange('loyer_mensuel', e.target.value, true)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                          errors.loyer_mensuel ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="1200"
                      />
                      {errors.loyer_mensuel && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle size={14} className="mr-1" />
                          {errors.loyer_mensuel}
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
                        value={locationData.charges_mensuelles}
                        onChange={(e) => handleInputChange('charges_mensuelles', e.target.value, true)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="150"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dépôt de garantie (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={locationData.depot_garantie}
                        onChange={(e) => handleInputChange('depot_garantie', e.target.value, true)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="1200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Statut de la location
                    </label>
                    <select
                      value={locationData.statut}
                      onChange={(e) => handleInputChange('statut', e.target.value, true)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="terminee">Terminée</option>
                      <option value="resiliee">Résiliée</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Onglet Documents */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  {/* Zone d'upload */}
                  <div>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload(e.target.files)}
                      className="hidden"
                      id="document-upload"
                    />
                    <label
                      htmlFor="document-upload"
                      className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                    >
                      <Upload size={24} className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600 font-medium">Cliquez pour ajouter des documents</span>
                      <span className="text-xs text-gray-500 mt-1">PDF, DOC, JPG, PNG acceptés (max 50MB par fichier)</span>
                    </label>
                  </div>

                  {/* Documents uploadés */}
                  {uploadedDocuments.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Documents ({uploadedDocuments.length})</h4>
                        <span className="text-sm text-gray-500">
                          {uploadedDocuments.filter(doc => doc.isNew).length} nouveau(x)
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {uploadedDocuments.map((doc, index) => (
                          <div key={index} className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                            doc.isNew ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border">
                                {doc.preview ? (
                                  <img src={doc.preview} alt="" className="w-8 h-8 object-cover rounded" />
                                ) : (
                                  <FileText size={16} className="text-gray-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{doc.nom_document}</p>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <span className="capitalize">{doc.type_document.replace('_', ' ')}</span>
                                  {doc.isNew && <span className="text-blue-600 font-medium">• Nouveau</span>}
                                  {doc.date_upload && <span>• {new Date(doc.date_upload).toLocaleDateString()}</span>}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDocument(index, doc.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-lg transition-all"
                              title="Supprimer le document"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => navigate('/tenants')}
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
                      <span>{isEdit ? 'Modifier' : 'Créer'} le locataire</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar résumé */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Résumé</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <User size={16} className="text-gray-400" />
                <span className="text-sm">
                  {formData.prenom || formData.nom ? `${formData.prenom} ${formData.nom}`.trim() : 'Nom non renseigné'}
                </span>
              </div>
              
              {formData.email && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">📧</span>
                  <span className="text-sm">{formData.email}</span>
                </div>
              )}
              
              {formData.telephone && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">📞</span>
                  <span className="text-sm">{formData.telephone}</span>
                </div>
              )}
              
              {formData.profession && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">💼</span>
                  <span className="text-sm">{formData.profession}</span>
                </div>
              )}
              
              {formData.salaire && (
                <div className="flex items-center space-x-2">
                  <Euro size={16} className="text-gray-400" />
                  <span className="text-sm">{parseFloat(formData.salaire).toLocaleString()}€/mois</span>
                </div>
              )}
              
              {locationData.appartement_id && (
                <div className="flex items-center space-x-2">
                  <Building size={16} className="text-gray-400" />
                  <span className="text-sm">
                    {apartments.find(apt => apt.id == locationData.appartement_id)?.titre || 'Appartement sélectionné'}
                  </span>
                </div>
              )}
              
              {locationData.date_debut && (
                <div className="flex items-center space-x-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-sm">Début: {new Date(locationData.date_debut).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
              
              {uploadedDocuments.length > 0 && (
                <div className="flex items-center space-x-2">
                  <FileText size={16} className="text-gray-400" />
                  <span className="text-sm">
                    {uploadedDocuments.length} document(s)
                    {uploadedDocuments.filter(doc => doc.isNew).length > 0 && 
                      ` (${uploadedDocuments.filter(doc => doc.isNew).length} nouveau)`
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Aide */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center">
              <span className="mr-2">💡</span>
              Conseils
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• Remplissez d'abord les informations personnelles obligatoires</p>
              <p>• La location est optionnelle mais recommandée</p>
              <p>• Les documents peuvent être ajoutés maintenant ou plus tard</p>
              {Object.keys(errors).length > 0 && (
                <p className="text-red-700 font-medium">• Corrigez les erreurs avant de sauvegarder</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantForm;