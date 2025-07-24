// src/components/apartments/ApartmentDetail.jsx - Version corrigée finale
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Upload, Plus, FileText, Users, Euro, Calendar, Eye, Download, X, Home } from 'lucide-react';
import { apartmentApi, documentApi } from '../../utils/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { useApp } from '../../contexts/AppContext';
import LoadingSpinner from '../common/LoadingSpinner';

const ApartmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { refresh } = useApp();
  
  const [apartment, setApartment] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [medias, setMedias] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tenants');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) {
      loadApartmentData();
    }
  }, [id]);

  const loadApartmentData = async () => {
    setLoading(true);
    try {
      ////console.log('🏠 Chargement données appartement ID:', id);
      
      // ÉTAPE 1: Charger l'appartement principal
      ////console.log('📡 1. Chargement appartement...');
      const apartmentData = await apartmentApi.getById(id);
      ////console.log('✅ 1. Appartement reçu:', apartmentData);

      if (!apartmentData || apartmentData.status === 404) {
        console.error('❌ Appartement non trouvé');
        setApartment(null);
        setLoading(false);
        return;
      }
      
      setApartment(apartmentData);
      
      // ÉTAPE 2: Charger les données avec fetch direct (car le backend fonctionne)
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Charger les locataires
      //console.log('📡 2. Chargement locataires...');
      try {
        const tenantsResponse = await fetch(`/gestion-locative/api/apartments/${id}/tenants`, { headers });
        if (tenantsResponse.ok) {
          const tenantsData = await tenantsResponse.json();
          //console.log('✅ 2. Locataires reçus:', tenantsData);
          setTenants(Array.isArray(tenantsData) ? tenantsData : []);
        } else {
          console.error('❌ 2. Erreur tenants:', tenantsResponse.status);
          setTenants([]);
        }
      } catch (error) {
        console.error('❌ 2. Erreur catch tenants:', error);
        setTenants([]);
      }
      
      // Charger les médias
      //console.log('📡 3. Chargement médias...');
      try {
        const mediasResponse = await fetch(`/gestion-locative/api/apartments/${id}/media`, { headers });
        if (mediasResponse.ok) {
          const mediasData = await mediasResponse.json();
          //console.log('✅ 3. Médias reçus:', mediasData);
          setMedias(Array.isArray(mediasData) ? mediasData : []);
        } else {
          console.error('❌ 3. Erreur médias:', mediasResponse.status);
          setMedias([]);
        }
      } catch (error) {
        console.error('❌ 3. Erreur catch médias:', error);
        setMedias([]);
      }
      
      // Charger les documents
      //console.log('📡 4. Chargement documents...');
      try {
        const documentsResponse = await fetch(`/gestion-locative/api/apartments/${id}/documents`, { headers });
        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();
          //console.log('✅ 4. Documents reçus:', documentsData);
          setDocuments(Array.isArray(documentsData) ? documentsData : []);
        } else {
          console.error('❌ 4. Erreur documents:', documentsResponse.status);
          setDocuments([]);
        }
      } catch (error) {
        console.error('❌ 4. Erreur catch documents:', error);
        setDocuments([]);
      }
      
      // Charger les factures
      //console.log('📡 5. Chargement factures...');
      try {
        const invoicesResponse = await fetch(`/gestion-locative/api/apartments/${id}/invoices`, { headers });
        if (invoicesResponse.ok) {
          const invoicesData = await invoicesResponse.json();
          //console.log('✅ 5. Factures reçues:', invoicesData);
          setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
        } else {
          console.error('❌ 5. Erreur factures:', invoicesResponse.status);
          setInvoices([]);
        }
      } catch (error) {
        console.error('❌ 5. Erreur catch factures:', error);
        setInvoices([]);
      }
      
      //console.log('✅ Chargement terminé - Résumé:');
      //console.log(`📊 Locataires: ${tenants.length}, Médias: ${medias.length}, Documents: ${documents.length}, Factures: ${invoices.length}`);
      
    } catch (error) {
      console.error('❌ Erreur générale chargement appartement:', error);
      addNotification('Erreur lors du chargement des données de l\'appartement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteApartment = async () => {
    try {
      //console.log('🗑️ Suppression appartement ID:', id);
      const result = await apartmentApi.delete(id);
      
      //console.log('✅ Résultat suppression:', result);
      
      if (result.success) {
        addNotification('Appartement supprimé avec succès', 'success');
        await refresh(); // Rafraîchir les données globales
        navigate('/apartments');
      } else {
        addNotification(result.message || 'Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('❌ Erreur suppression appartement:', error);
      addNotification('Erreur lors de la suppression de l\'appartement', 'error');
    }
  };

  const uploadMedia = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      //console.log('📤 Upload médias pour appartement:', id, files);
      const result = await apartmentApi.uploadMedia(id, files);
      
      //console.log('✅ Résultat upload médias:', result);
      
      if (result.success) {
        await loadApartmentData(); // Recharger toutes les données
        addNotification(result.message || 'Médias uploadés avec succès', 'success');
      } else {
        addNotification(result.message || 'Erreur lors de l\'upload', 'error');
      }
    } catch (error) {
      console.error('❌ Erreur upload médias:', error);
      addNotification('Erreur lors de l\'upload des médias', 'error');
    } finally {
      setUploading(false);
    }
  };

  const uploadDocument = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      //console.log('📤 Upload documents pour appartement:', id, files);
      
      const uploadPromises = Array.from(files).map(async (file) => {
        return await documentApi.upload({
          file: file,
          appartement_id: id,
          nom_document: file.name,
          type_document: guessDocumentType(file.name),
          description: ''
        });
      });

      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(r => r && r.success).length;
      const errorCount = results.length - successCount;

      if (successCount > 0) {
        await loadApartmentData(); // Recharger toutes les données
        addNotification(`${successCount} document(s) uploadé(s) avec succès`, 'success');
      }
      
      if (errorCount > 0) {
        addNotification(`${errorCount} erreur(s) lors de l'upload`, 'error');
      }

    } catch (error) {
      console.error('❌ Erreur upload documents:', error);
      addNotification('Erreur lors de l\'upload des documents', 'error');
    } finally {
      setUploading(false);
    }
  };

  const guessDocumentType = (filename) => {
    const name = filename.toLowerCase();
    if (name.includes('bail') || name.includes('contrat')) return 'bail';
    if (name.includes('etat') || name.includes('lieux')) return 'etat_lieux';
    if (name.includes('assurance')) return 'assurance';
    if (name.includes('facture') || name.includes('invoice')) return 'facture';
    if (name.includes('quittance') || name.includes('recu')) return 'quittance';
    return 'autre';
  };

  const deleteMedia = async (mediaId) => {
    if (!confirm('Supprimer ce média ?')) return;
    
    try {
      //console.log('🗑️ Suppression média ID:', mediaId);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/gestion-locative/api/media/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        addNotification('Session expirée, veuillez vous reconnecter', 'error');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        // Recharger les médias après suppression
        await loadApartmentData();
        addNotification('Média supprimé avec succès', 'success');
        //console.log('✅ Média supprimé avec succès');
      } else {
        addNotification(result.message || 'Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('❌ Erreur suppression média:', error);
      addNotification('Erreur lors de la suppression du média', 'error');
    }
  };

  const deleteDocument = async (docId) => {
    if (!confirm('Supprimer ce document ?')) return;
    
    try {
      //console.log('🗑️ Suppression document ID:', docId);
      const result = await documentApi.delete(docId);
      
      if (result.success) {
        await loadApartmentData(); // Recharger les données
        addNotification('Document supprimé avec succès', 'success');
        //console.log('✅ Document supprimé avec succès');
      } else {
        addNotification(result.message || 'Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('❌ Erreur suppression document:', error);
      addNotification('Erreur lors de la suppression du document', 'error');
    }
  };

  const previewDocument = (doc) => {
    const token = localStorage.getItem('token');
    const url = doc.url.startsWith('/') ? `/gestion-locative/api${doc.url}` : `/gestion-locative/api/${doc.url}`;
    const previewUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
    window.open(previewUrl, '_blank');
  };

  const downloadDocument = (doc) => {
    const token = localStorage.getItem('token');
    const url = doc.url.startsWith('/') ? `/gestion-locative/api${doc.url}` : `/gestion-locative/api/${doc.url}`;
    
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (response.status === 401) {
        addNotification('Session expirée. Veuillez vous reconnecter.', 'error');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return null;
      }
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      return response.blob();
    })
    .then(blob => {
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.nom_document;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    })
    .catch(error => {
      console.error('Erreur téléchargement:', error);
      addNotification('Erreur lors du téléchargement', 'error');
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'libre': return 'bg-green-100 text-green-800';
      case 'occupé': return 'bg-red-100 text-red-800';
      case 'en_travaux': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price) => {
    return price ? `${parseFloat(price).toLocaleString()}€` : 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return <LoadingSpinner message="Chargement de l'appartement..." />;
  }

  if (!apartment) {
    return (
      <div className="p-6 text-center">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <Home size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Appartement non trouvé</h2>
            <p className="text-gray-600 mb-6">
              L'appartement que vous recherchez n'existe pas ou a été supprimé.
            </p>
          </div>
          <button
            onClick={() => navigate('/apartments')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
          >
            <ArrowLeft size={18} />
            <span>Retour à la liste</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/apartments')}
              className="bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors"
              title="Retour à la liste"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                <Home size={24} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{apartment.titre}</h1>
                <p className="text-gray-600 flex items-center mt-1">
                  <span className="mr-1">📍</span>
                  {apartment.adresse_complete}
                </p>
                {apartment.locataire_actuel && (
                  <p className="text-sm text-green-600 font-medium mt-1">
                    👤 Occupé par {apartment.locataire_actuel}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(apartment.statut)}`}>
              {apartment.statut === 'en_travaux'
                ? 'En travaux'
                : apartment.statut.charAt(0).toUpperCase() + apartment.statut.slice(1)}
            </span>
            <button 
              onClick={() => navigate(`/apartments/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Edit size={16} />
              <span>Modifier</span>
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
            >
              <Trash2 size={16} />
              <span>Supprimer</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Debug info */}
          {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p><strong>Debug:</strong> Locataires: {tenants.length}, Médias: {medias.length}, Documents: {documents.length}, Factures: {invoices.length}</p>
          </div> */}

          {/* Galerie photos et vidéos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Photos et Vidéos ({medias.length})</h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => document.getElementById('media-upload').click()}
                  disabled={uploading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  <span>Ajouter</span>
                </button>
                <input
                  id="media-upload"
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => uploadMedia(e.target.files)}
                />
              </div>
            </div>

            {medias.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {medias.map((media, index) => (
                  <div key={media.id} className="relative group">
                    {media.type_media === 'photo' ? (
                      <img
                        src={`/gestion-locative/api/${media.url}`}
                        alt={`Média ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => window.open(`/gestion-locative/api/${media.url}`, '_blank')}
                        onError={(e) => {
                          console.error('Erreur chargement image:', media.url);
                          e.target.src = '/placeholder-image.jpg';
                          e.target.alt = 'Image non disponible';
                        }}
                      />
                    ) : (
                      <video
                        src={`/gestion-locative/api/${media.url}`}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer"
                        controls
                        onError={(e) => {
                          console.error('Erreur chargement vidéo:', e);
                        }}
                      />
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => deleteMedia(media.id)}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                        title="Supprimer ce média"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {index === 0 && (
                      <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        Photo principale
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Upload size={48} className="mx-auto mb-4 opacity-50" />
                <p className="mb-2">Aucune photo ou vidéo</p>
                <p className="text-sm">Cliquez sur "Ajouter" pour uploader des médias</p>
              </div>
            )}
          </div>

          {/* Informations détaillées */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-6">Informations détaillées</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Surface</p>
                <p className="text-lg font-semibold">{apartment.surface ? `${apartment.surface} m²` : 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Pièces</p>
                <p className="text-lg font-semibold">{apartment.nb_pieces || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Chambres</p>
                <p className="text-lg font-semibold">{apartment.nb_chambres || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Loyer mensuel</p>
                <p className="text-lg font-semibold text-green-600">{formatPrice(apartment.prix_loyer)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Charges</p>
                <p className="text-lg font-semibold">{formatPrice(apartment.charges)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Dépôt de garantie</p>
                <p className="text-lg font-semibold">{formatPrice(apartment.depot_garantie)}</p>
              </div>
            </div>

            {apartment.description && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">{apartment.description}</p>
              </div>
            )}
          </div>

          {/* Onglets de gestion */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                {[
                  { id: 'tenants', label: 'Locataires', icon: Users, count: tenants.length },
                  { id: 'documents', label: 'Documents', icon: FileText, count: documents.length },
                  { id: 'finances', label: 'Finances', icon: Euro, count: invoices.length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs min-w-[20px] text-center">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Contenu des onglets */}
            {activeTab === 'tenants' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Locataires de cet appartement ({tenants.length})</h3>
                  <button 
                    onClick={() => navigate('/tenants/new')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus size={16} />
                    <span>Ajouter locataire</span>
                  </button>
                </div>

                {tenants.length > 0 ? (
                  <div className="space-y-4">
                    {tenants.map(tenant => (
                      <div
                        key={`${tenant.id}-${tenant.location_id}`}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/tenants/${tenant.id}`)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users size={20} className="text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{tenant.prenom} {tenant.nom}</h4>
                            <p className="text-sm text-gray-600">
                              {tenant.date_debut && `Du ${formatDate(tenant.date_debut)}`}
                              {tenant.date_fin ? ` au ${formatDate(tenant.date_fin)}` : ' à aujourd\'hui'}
                            </p>
                            {tenant.email && (
                              <p className="text-xs text-gray-500">{tenant.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            {formatPrice(tenant.loyer_mensuel)}/mois
                          </p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            tenant.location_statut === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {tenant.location_statut === 'active' ? 'Actuel' : 'Ancien'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="mb-2">Aucun locataire enregistré</p>
                    <p className="text-sm">Cet appartement n'a pas encore de locataire</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Documents de l'appartement ({documents.length})</h3>
                  <button
                    onClick={() => document.getElementById('document-upload').click()}
                    disabled={uploading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )}
                    <span>Ajouter document</span>
                  </button>
                  <input
                    id="document-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                    className="hidden"
                    onChange={(e) => uploadDocument(e.target.files)}
                  />
                </div>

                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <FileText size={20} className="text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{doc.nom_document}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span>{formatDate(doc.date_upload)}</span>
                              <span>•</span>
                              <span className="capitalize">{doc.type_document.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => previewDocument(doc)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Prévisualiser"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => downloadDocument(doc)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Télécharger"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="mb-2">Aucun document uploadé</p>
                    <p className="text-sm">Cliquez sur "Ajouter document" pour uploader des fichiers</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'finances' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Finances de l'appartement ({invoices.length})</h3>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                    <Plus size={16} />
                    <span>Nouvelle facture</span>
                  </button>
                </div>

                {/* Résumé financier */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-gray-200 rounded-lg p-6 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Résumé financier</h4>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Loyer mensuel</p>
                      <p className="text-xl font-bold text-green-600">{formatPrice(apartment.prix_loyer)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Charges mensuelles</p>
                      <p className="text-xl font-bold text-blue-600">{formatPrice(apartment.charges)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total mensuel</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatPrice((parseFloat(apartment.prix_loyer) || 0) + (parseFloat(apartment.charges) || 0))}
                      </p>
                    </div>
                  </div>
                </div>

                {invoices.length > 0 ? (
                  <div className="space-y-3">
                    {invoices.map(invoice => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            invoice.statut === 'payée' ? 'bg-green-100' :
                            invoice.statut === 'en_retard' ? 'bg-red-100' :
                            'bg-yellow-100'
                          }`}>
                            <Euro size={20} className={
                              invoice.statut === 'payée' ? 'text-green-600' :
                              invoice.statut === 'en_retard' ? 'text-red-600' :
                              'text-yellow-600'
                            } />
                          </div>
                          <div>
                            <h4 className="font-medium capitalize">{invoice.type_facture.replace('_', ' ')}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span>{formatDate(invoice.date_facture)}</span>
                              {invoice.date_echeance && (
                                <>
                                  <span>•</span>
                                  <span>Échéance: {formatDate(invoice.date_echeance)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">{formatPrice(invoice.montant)}</p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            invoice.statut === 'payée' ? 'bg-green-100 text-green-800' :
                            invoice.statut === 'en_retard' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invoice.statut.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Euro size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="mb-2">Aucune facture enregistrée</p>
                    <p className="text-sm">Les factures liées à cet appartement apparaîtront ici</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions rapides */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
            <div className="space-y-3">
              {/* <button 
                onClick={() => navigate(`/apartments/${id}/edit`)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Edit size={16} />
                <span>Modifier l'appartement</span>
              </button> */}
              <button className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2">
                <FileText size={16} />
                <span>Générer un bail</span>
              </button>
              <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2">
                <Calendar size={16} />
                <span>Planifier visite</span>
              </button>
              <button 
                onClick={() => window.print()}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Download size={16} />
                <span>Exporter données</span>
              </button>
            </div>
          </div>

          {/* Locataire actuel */}
          {apartment.locataire_actuel && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Locataire actuel</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Users size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900">{apartment.locataire_actuel}</h4>
                    {apartment.locataire_email && (
                      <p className="text-sm text-green-700">{apartment.locataire_email}</p>
                    )}
                    {apartment.locataire_telephone && (
                      <p className="text-sm text-green-700">{apartment.locataire_telephone}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {apartment.loyer_mensuel && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Loyer mensuel:</span>
                      <span className="font-medium text-green-900">{formatPrice(apartment.loyer_mensuel)}</span>
                    </div>
                  )}
                  {apartment.charges_mensuelles && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Charges:</span>
                      <span className="font-medium text-green-900">{formatPrice(apartment.charges_mensuelles)}</span>
                    </div>
                  )}
                </div>
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm mt-4">
                  Voir le profil complet
                </button>
              </div>
            </div>
          )}

          {/* Informations générales */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Créé le:</span>
                <span className="font-medium">{formatDate(apartment.date_creation)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Modifié le:</span>
                <span className="font-medium">{formatDate(apartment.date_modification)}</span>
              </div>
              {apartment.code_postal && apartment.ville && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Code postal:</span>
                    <span className="font-medium">{apartment.code_postal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ville:</span>
                    <span className="font-medium">{apartment.ville}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer l'appartement</h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer définitivement cet appartement ? 
                Cette action supprimera aussi tous les documents, médias et données associées.
                <br /><br />
                <strong>Cette action est irréversible.</strong>
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    deleteApartment();
                    setShowDeleteModal(false);
                  }}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApartmentDetail;