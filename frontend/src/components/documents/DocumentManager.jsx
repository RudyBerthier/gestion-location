import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Filter, Tag, Calendar, User, FileText, Download, Eye, Trash2, Upload, Plus, X, File, Image, FileX, AlertCircle, CheckCircle2, Edit3, Save, XCircle, Copy, FolderOpen, Clock, TrendingUp } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { documentApi, apartmentApi, tenantApi } from '../../utils/api';
import LoadingSpinner from '../common/LoadingSpinner';

const DocumentManager = () => {
  const { apartments, tenants, refresh } = useApp();
  const { addNotification } = useNotifications();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDocument, setEditingDocument] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [movingDocument, setMovingDocument] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    category: 'all',
    apartment: 'all',
    tenant: 'all'
  });

  // Refs et state pour maintenir la position du curseur
  const editInputRef = useRef(null);
  const [cursorPosition, setCursorPosition] = useState(0);

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

  const categories = {
    all: { name: 'Toutes catégories', icon: '📁', color: 'bg-gray-100' },
    piece_identite: { name: 'Pièces d\'identité', icon: '🆔', color: 'bg-blue-100' },
    bulletin_salaire: { name: 'Bulletins de salaire', icon: '💰', color: 'bg-green-100' },
    justificatif_domicile: { name: 'Justificatifs domicile', icon: '🏠', color: 'bg-yellow-100' },
    document_garant: { name: 'Documents garant', icon: '👥', color: 'bg-purple-100' },
    contrat_travail: { name: 'Contrats travail', icon: '📋', color: 'bg-indigo-100' },
    avis_imposition: { name: 'Avis d\'imposition', icon: '📊', color: 'bg-pink-100' },
    bail: { name: 'Baux', icon: '📜', color: 'bg-orange-100' },
    etat_lieux: { name: 'États des lieux', icon: '📝', color: 'bg-teal-100' },
    assurance: { name: 'Assurances', icon: '🛡️', color: 'bg-cyan-100' },
    facture: { name: 'Factures', icon: '🧾', color: 'bg-red-100' },
    quittance: { name: 'Quittances', icon: '📄', color: 'bg-lime-100' },
    autre: { name: 'Autres', icon: '📁', color: 'bg-gray-100' }
  };

  useEffect(() => {
    // Charger les documents quand les appartements et locataires sont disponibles
    if (apartments.length > 0 || tenants.length > 0) {
      console.log('🚀 Déclenchement du chargement des documents');
      loadAllDocuments();
    }
  }, [apartments, tenants]);

  // Effet pour restaurer la position du curseur
  useEffect(() => {
    if (editInputRef.current && editingDocument) {
      editInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [editingName, cursorPosition, editingDocument]);

  const loadAllDocuments = async () => {
    setLoading(true);
    try {
      let allDocuments = [];

      console.log('📥 Début chargement documents...');
      console.log(`🏠 ${apartments.length} appartements à traiter`);
      console.log(`👥 ${tenants.length} locataires à traiter`);

      // Charger documents des appartements en utilisant l'API
      for (const apartment of apartments) {
        try {
          console.log(`🔍 Chargement documents appartement: ${apartment.titre} (ID: ${apartment.id})`);
          
          const apartmentDocs = await apartmentApi.getDocuments(apartment.id);
          
          const docsWithMetadata = apartmentDocs.map(doc => ({
            ...doc,
            apartment_name: apartment.titre,
            apartment_id: apartment.id,
            tenant_name: null,
            source_type: 'apartment',
            category_info: categories[doc.type_document] || categories.autre
          }));
          
          allDocuments.push(...docsWithMetadata);
          console.log(`✅ ${docsWithMetadata.length} documents chargés pour appartement: ${apartment.titre}`);
          
        } catch (error) {
          console.error(`❌ Erreur chargement documents appartement ${apartment.id}:`, error);
        }
      }

      // Charger documents des locataires en utilisant l'API
      for (const tenant of tenants) {
        try {
          console.log(`🔍 Chargement documents locataire: ${tenant.prenom} ${tenant.nom} (ID: ${tenant.id})`);
          
          const tenantDocs = await tenantApi.getDocuments(tenant.id);
          
          const docsWithMetadata = tenantDocs.map(doc => ({
            ...doc,
            tenant_name: `${tenant.prenom} ${tenant.nom}`,
            tenant_id: tenant.id,
            apartment_name: null,
            source_type: 'tenant',
            category_info: categories[doc.type_document] || categories.autre
          }));
          
          allDocuments.push(...docsWithMetadata);
          console.log(`✅ ${docsWithMetadata.length} documents chargés pour locataire: ${tenant.prenom} ${tenant.nom}`);
          
        } catch (error) {
          console.error(`❌ Erreur chargement documents locataire ${tenant.id}:`, error);
        }
      }

      console.log(`🎉 Total documents chargés: ${allDocuments.length}`);
      console.log('📊 Répartition par source:', {
        apartments: allDocuments.filter(d => d.source_type === 'apartment').length,
        tenants: allDocuments.filter(d => d.source_type === 'tenant').length
      });
      
      setDocuments(allDocuments);
    } catch (error) {
      console.error('❌ Erreur générale chargement documents:', error);
      addNotification('Erreur lors du chargement des documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour séparer nom et extension
  const separateFileNameAndExtension = (fileName) => {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return { name: fileName, extension: '' };
    }
    return {
      name: fileName.substring(0, lastDotIndex),
      extension: fileName.substring(lastDotIndex)
    };
  };

  // Fonction pour maintenir la position du curseur
  const handleNameChange = (e, docId) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);
    setEditingName(newValue);
  };

  // Fonction pour renommer un document
  const handleRenameDocument = async (docId, newName) => {
    try {
      // Utiliser documentApi pour le renommage
      const result = await documentApi.rename(docId, newName);
      
      if (result.success) {
        setDocuments(prev => prev.map(doc => 
          doc.id === docId ? { ...doc, nom_document: newName } : doc
        ));
        setEditingDocument(null);
        setEditingName('');
        addNotification('Document renommé avec succès', 'success');
      } else {
        addNotification('Erreur lors du renommage: ' + (result.message || 'Erreur inconnue'), 'error');
      }
    } catch (error) {
      console.error('❌ Erreur renommage document:', error);
      addNotification('Erreur lors du renommage du document', 'error');
    }
  };

  // Fonction pour déplacer un document
  const handleMoveDocument = async (docId, newApartmentId, newTenantId) => {
    try {
      const result = await documentApi.move(docId, {
        appartement_id: newApartmentId || null,
        locataire_id: newTenantId || null
      });
      
      if (result.success) {
        // Recharger les documents pour avoir les données à jour
        await loadAllDocuments();
        setMovingDocument(null);
        
        const newLocation = newApartmentId 
          ? apartments.find(a => a.id == newApartmentId)?.titre
          : tenants.find(t => t.id == newTenantId)?.prenom + ' ' + tenants.find(t => t.id == newTenantId)?.nom;
          
        addNotification(`Document déplacé vers ${newLocation}`, 'success');
      } else {
        addNotification('Erreur lors du déplacement: ' + (result.message || 'Erreur inconnue'), 'error');
      }
    } catch (error) {
      console.error('❌ Erreur déplacement document:', error);
      addNotification('Erreur lors du déplacement du document', 'error');
    }
  };

  // Démarrer le déplacement d'un document
  const startMoving = (doc) => {
    setMovingDocument(doc);
  };

  // Annuler le déplacement
  const cancelMoving = () => {
    setMovingDocument(null);
  };

  // Démarrer l'édition d'un nom
  const startEditing = (doc) => {
    const { name } = separateFileNameAndExtension(doc.nom_document);
    setEditingDocument(doc.id);
    setEditingName(name);
    setCursorPosition(name.length); // Positionner le curseur à la fin
  };

  const cancelEditing = () => {
    setEditingDocument(null);
    setEditingName('');
    setCursorPosition(0);
  };

  // Sauvegarder le nouveau nom
  const saveNewName = (doc) => {
    const { extension } = separateFileNameAndExtension(doc.nom_document);
    const fullNewName = editingName.trim() + extension;
    
    if (fullNewName === doc.nom_document) {
      cancelEditing();
      return;
    }
    
    if (!editingName.trim()) {
      addNotification('Le nom ne peut pas être vide', 'error');
      return;
    }
    
    handleRenameDocument(doc.id, fullNewName);
  };

  // Filtrage et tri intelligent des documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents.filter(doc => {
      // Recherche textuelle
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        doc.nom_document.toLowerCase().includes(searchLower) ||
        doc.tenant_name?.toLowerCase().includes(searchLower) ||
        doc.apartment_name?.toLowerCase().includes(searchLower) ||
        doc.type_document.toLowerCase().includes(searchLower);

      // Filtre catégorie
      const matchesCategory = filters.category === 'all' || doc.type_document === filters.category;

      // Filtre appartement - Version robuste
      let matchesApartment = filters.apartment === 'all';
      if (!matchesApartment && filters.apartment) {
        // Pour les documents d'appartements
        if (doc.source_type === 'apartment') {
          matchesApartment = String(doc.apartment_id) === String(filters.apartment);
        }
        // Pour les documents de locataires liés à un appartement
        else if (doc.source_type === 'tenant') {
          // Chercher l'appartement du locataire
          const tenant = tenants.find(t => t.id === doc.tenant_id);
          if (tenant && tenant.appartement_id) {
            matchesApartment = String(tenant.appartement_id) === String(filters.apartment);
          }
        }
      }

      // Filtre locataire
      const matchesTenant = filters.tenant === 'all' || 
        String(doc.locataire_id) === String(filters.tenant) ||
        String(doc.tenant_id) === String(filters.tenant);

      return matchesSearch && matchesCategory && matchesApartment && matchesTenant;
    });

    // Tri
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          compareValue = a.nom_document.localeCompare(b.nom_document);
          break;
        case 'date':
          compareValue = new Date(a.date_upload) - new Date(b.date_upload);
          break;
        case 'category':
          compareValue = a.type_document.localeCompare(b.type_document);
          break;
        case 'source':
          compareValue = (a.tenant_name || a.apartment_name || '').localeCompare(b.tenant_name || b.apartment_name || '');
          break;
        default:
          compareValue = 0;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [documents, searchTerm, filters, sortBy, sortOrder, tenants]);

  const guessDocumentType = (filename) => {
    const name = filename.toLowerCase();
    if (name.includes('cni') || name.includes('carte') || name.includes('identite') || name.includes('passeport')) return 'piece_identite';
    if (name.includes('salaire') || name.includes('bulletin') || name.includes('paie') || name.includes('fiche_paie')) return 'bulletin_salaire';
    if (name.includes('justificatif') || name.includes('domicile') || name.includes('edf') || name.includes('gaz')) return 'justificatif_domicile';
    if (name.includes('garant') || name.includes('caution')) return 'document_garant';
    if (name.includes('contrat') || name.includes('travail') || name.includes('emploi')) return 'contrat_travail';
    if (name.includes('avis') || name.includes('imposition') || name.includes('impot')) return 'avis_imposition';
    if (name.includes('bail') || name.includes('location')) return 'bail';
    if (name.includes('etat') || name.includes('lieux') || name.includes('inventaire')) return 'etat_lieux';
    if (name.includes('assurance') || name.includes('police')) return 'assurance';
    if (name.includes('facture') || name.includes('invoice')) return 'facture';
    if (name.includes('quittance') || name.includes('recu')) return 'quittance';
    return 'autre';
  };

  const handleFileUpload = async (filesToUpload, apartmentId = null, tenantId = null) => {
    if (!filesToUpload || filesToUpload.length === 0) {
      addNotification('Aucun fichier sélectionné', 'error');
      return;
    }

    try {
      const uploadPromises = filesToUpload.map(async (fileData) => {
        const formData = new FormData();
        formData.append('document', fileData.file);
        formData.append('nom_document', fileData.name);
        formData.append('type_document', fileData.category);
        formData.append('description', fileData.description || '');
        
        if (apartmentId) formData.append('appartement_id', apartmentId);
        if (tenantId) formData.append('locataire_id', tenantId);
        
        return await apiRequest('/documents', {
          method: 'POST',
          body: formData
        });
      });

      const results = await Promise.all(uploadPromises);
      
      const successCount = results.filter(result => result.success).length;
      const errorCount = results.length - successCount;

      if (successCount > 0) {
        await loadAllDocuments();
        addNotification(`${successCount} document(s) uploadé(s) avec succès`, 'success');
      }
      
      if (errorCount > 0) {
        addNotification(`${errorCount} erreur(s) lors de l'upload`, 'error');
      }

    } catch (error) {
      console.error('❌ Erreur upload documents:', error);
      if (error.message !== 'Session expirée') {
        addNotification('Erreur lors de l\'upload des documents', 'error');
      }
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const result = await apiRequest(`/documents/${docId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
        setSelectedDocuments(prev => prev.filter(id => id !== docId));
        addNotification('Document supprimé avec succès', 'success');
      } else {
        addNotification('Erreur lors de la suppression: ' + (result.message || 'Erreur inconnue'), 'error');
      }
    } catch (error) {
      console.error('❌ Erreur suppression document:', error);
      if (error.message !== 'Session expirée') {
        addNotification('Erreur lors de la suppression du document', 'error');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.length === 0) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedDocuments.length} document(s) ?`)) return;

    try {
      const deletePromises = selectedDocuments.map(docId => 
        apiRequest(`/documents/${docId}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      
      const successCount = results.filter(result => result.success).length;
      const errorCount = results.length - successCount;

      if (successCount > 0) {
        setDocuments(prev => prev.filter(doc => !selectedDocuments.includes(doc.id)));
        setSelectedDocuments([]);
        addNotification(`${successCount} document(s) supprimé(s)`, 'success');
      }

      if (errorCount > 0) {
        addNotification(`${errorCount} erreur(s) lors de la suppression`, 'error');
      }

    } catch (error) {
      console.error('❌ Erreur suppression en lot:', error);
      if (error.message !== 'Session expirée') {
        addNotification('Erreur lors de la suppression en lot', 'error');
      }
    }
  };

  const toggleDocumentSelection = (docId) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const selectAllDocuments = () => {
    if (selectedDocuments.length === filteredAndSortedDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredAndSortedDocuments.map(doc => doc.id));
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
        return;
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
      console.error('❌ Erreur téléchargement:', error);
      addNotification('Erreur lors du téléchargement', 'error');
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      category: 'all',
      apartment: 'all',
      tenant: 'all'
    });
  };

  const duplicateDocument = (doc) => {
    const { name, extension } = separateFileNameAndExtension(doc.nom_document);
    const newName = `${name} - Copie${extension}`;
    // Note: Cette fonction nécessiterait une API pour dupliquer un document
    addNotification('Fonctionnalité de duplication en développement', 'info');
  };

  const DocumentCard = ({ document: doc }) => (
    <div className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-200 group ${
      selectedDocuments.includes(doc.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1">
            <input
              type="checkbox"
              checked={selectedDocuments.includes(doc.id)}
              onChange={() => toggleDocumentSelection(doc.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className={`w-10 h-10 rounded-lg ${doc.category_info.color} flex items-center justify-center text-lg flex-shrink-0`}>
              {doc.category_info.icon}
            </div>
            <div className="flex-1 min-w-0">
              {editingDocument === doc.id ? (
                <div className="space-y-2">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingName}
                    onChange={(e) => handleNameChange(e, doc.id)}
                    className="w-full text-sm font-medium border border-blue-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ 
                      wordBreak: 'break-all',
                      overflowWrap: 'anywhere'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNewName(doc);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    autoFocus
                  />
                  <div className="flex space-x-1">
                    <button
                      onClick={() => saveNewName(doc)}
                      className="text-green-600 hover:text-green-800 p-1"
                      title="Sauvegarder"
                    >
                      <Save size={12} />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Annuler"
                    >
                      <XCircle size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group/name">
                  <h3 
                    className="font-medium text-gray-900 text-sm leading-tight" 
                    style={{ 
                      wordBreak: 'break-all',
                      overflowWrap: 'anywhere',
                      hyphens: 'auto'
                    }}
                    title={doc.nom_document}
                  >
                    {doc.nom_document}
                  </h3>
                  <button
                    onClick={() => startEditing(doc)}
                    className="opacity-0 group-hover/name:opacity-100 transition-opacity text-blue-600 hover:text-blue-800 p-1 mt-1"
                    title="Renommer"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {doc.source_type === 'tenant' ? doc.tenant_name : doc.apartment_name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-500 mt-auto mb-3">
          <span className="px-2 py-1 bg-gray-100 rounded-full">
            {new Date(doc.date_upload).toLocaleDateString('fr-FR')}
          </span>
          <span className="px-2 py-1 bg-gray-100 rounded-full">
            {doc.category_info.name}
          </span>
        </div>

        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => previewDocument(doc)}
            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center space-x-1 transition-colors"
            title="Prévisualiser"
          >
            <Eye size={14} />
            <span>Voir</span>
          </button>
          <button 
            onClick={() => downloadDocument(doc)}
            className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center space-x-1 transition-colors"
            title="Télécharger"
          >
            <Download size={14} />
            <span>DL</span>
          </button>
          <button 
            onClick={() => startMoving(doc)}
            className="bg-purple-50 hover:bg-purple-100 text-purple-600 py-2 px-2 rounded-lg text-xs font-medium transition-colors"
            title="Déplacer"
          >
            <FolderOpen size={14} />
          </button>
          <button 
            onClick={() => handleDeleteDocument(doc.id)}
            className="bg-red-50 hover:bg-red-100 text-red-600 py-2 px-2 rounded-lg text-xs font-medium transition-colors"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  const DocumentListItem = ({ document: doc }) => (
    <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all duration-200 group ${
      selectedDocuments.includes(doc.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
      <div className="flex items-center space-x-4">
        <input
          type="checkbox"
          checked={selectedDocuments.includes(doc.id)}
          onChange={() => toggleDocumentSelection(doc.id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        
        <div className={`w-12 h-12 rounded-lg ${doc.category_info.color} flex items-center justify-center text-xl flex-shrink-0`}>
          {doc.category_info.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {editingDocument === doc.id ? (
              <div className="flex items-center space-x-2 flex-1">
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => handleNameChange(e, doc.id)}
                  className="flex-1 font-medium border border-blue-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ 
                    wordBreak: 'break-all',
                    overflowWrap: 'anywhere'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveNewName(doc);
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  autoFocus
                />
                <button
                  onClick={() => saveNewName(doc)}
                  className="text-green-600 hover:text-green-800 p-1"
                  title="Sauvegarder"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={cancelEditing}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Annuler"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 flex-1 group/name">
                <h3 
                  className="font-medium text-gray-900"
                  style={{ 
                    wordBreak: 'break-all',
                    overflowWrap: 'anywhere',
                    hyphens: 'auto'
                  }}
                >
                  {doc.nom_document}
                </h3>
                <button
                  onClick={() => startEditing(doc)}
                  className="opacity-0 group-hover/name:opacity-100 transition-opacity text-blue-600 hover:text-blue-800"
                  title="Renommer"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>
              {doc.source_type === 'tenant' ? doc.tenant_name : doc.apartment_name}
            </span>
            <span>•</span>
            <span>{new Date(doc.date_upload).toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
              {doc.category_info.name}
            </span>
            <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-full capitalize">
              {doc.source_type === 'tenant' ? 'Locataire' : 'Appartement'}
            </span>
          </div>
        </div>

        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => previewDocument(doc)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg transition-colors"
            title="Prévisualiser"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => downloadDocument(doc)}
            className="bg-green-50 hover:bg-green-100 text-green-600 p-2 rounded-lg transition-colors"
            title="Télécharger"
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => handleDeleteDocument(doc.id)}
            className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const UploadModal = () => {
    const [selectedApartment, setSelectedApartment] = useState('');
    const [selectedTenant, setSelectedTenant] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    
    const handleDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };

    const processFiles = (files) => {
      const newFiles = Array.from(files).map(file => {
        const { name, extension } = separateFileNameAndExtension(file.name);
        return {
          id: Math.random().toString(36).substr(2, 9),
          file: file,
          name: file.name, // Nom complet
          displayName: name, // Nom sans extension pour l'édition
          extension: extension, // Extension séparée
          size: file.size,
          type: file.type,
          category: guessDocumentType(file.name),
          description: '',
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        };
      });
      setPendingFiles(prev => [...prev, ...newFiles]);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    };

    const handleFileSelect = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = ''; // Reset input
      }
    };

    const updateFileProperty = (fileId, property, value) => {
      setPendingFiles(prev => prev.map(file => {
        if (file.id === fileId) {
          if (property === 'displayName') {
            // Mettre à jour le nom complet quand on change le displayName
            return { 
              ...file, 
              displayName: value,
              name: value + file.extension 
            };
          }
          return { ...file, [property]: value };
        }
        return file;
      }));
    };

    const removeFile = (fileId) => {
      setPendingFiles(prev => {
        const file = prev.find(f => f.id === fileId);
        if (file && file.preview) {
          URL.revokeObjectURL(file.preview);
        }
        return prev.filter(f => f.id !== fileId);
      });
    };

    const handleUpload = async () => {
      if (pendingFiles.length === 0) return;
      
      if (!selectedApartment && !selectedTenant) {
        addNotification('Veuillez sélectionner un appartement ou un locataire', 'error');
        return;
      }
      
      setIsUploading(true);
      try {
        await handleFileUpload(pendingFiles, selectedApartment || null, selectedTenant || null);
        setPendingFiles([]);
        setSelectedApartment('');
        setSelectedTenant('');
        setShowUploadModal(false);
      } catch (error) {
        console.error('❌ Erreur upload:', error);
      } finally {
        setIsUploading(false);
      }
    };

    const getFileIcon = (type) => {
      if (type.startsWith('image/')) return <Image size={20} className="text-blue-500" />;
      if (type.includes('pdf')) return <FileText size={20} className="text-red-500" />;
      return <File size={20} className="text-gray-500" />;
    };

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    return (
      <div className="fixed inset-0 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 bg-transparent">
        <div className="bg-white rounded-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Ajouter des documents</h3>
              <p className="text-gray-500 text-sm mt-1">
                Glissez vos fichiers ou cliquez pour les sélectionner
              </p>
            </div>
            <button 
              onClick={() => {
                setShowUploadModal(false);
                setPendingFiles([]);
                setSelectedApartment('');
                setSelectedTenant('');
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appartement
                </label>
                <select
                  value={selectedApartment}
                  onChange={(e) => {
                    setSelectedApartment(e.target.value);
                    if (e.target.value) setSelectedTenant('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner un appartement</option>
                  {apartments.map(apt => (
                    <option key={apt.id} value={apt.id}>{apt.titre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Locataire
                </label>
                <select
                  value={selectedTenant}
                  onChange={(e) => {
                    setSelectedTenant(e.target.value);
                    if (e.target.value) setSelectedApartment('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner un locataire</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.prenom} {tenant.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Validation message */}
            {!selectedApartment && !selectedTenant && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-center space-x-2">
                <AlertCircle size={16} className="text-amber-600" />
                <span className="text-sm text-amber-800">
                  Veuillez sélectionner un appartement OU un locataire avant d'uploader
                </span>
              </div>
            )}

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-6 ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload-input').click()}
            >
              <Upload className={`mx-auto mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} size={48} />
              <p className={`text-lg font-medium mb-2 ${dragActive ? 'text-blue-700' : 'text-gray-700'}`}>
                {dragActive ? 'Relâchez pour ajouter les fichiers' : 'Glissez vos fichiers ici ou cliquez pour sélectionner'}
              </p>
              <p className="text-gray-500 text-sm">
                Formats acceptés : PDF, JPG, PNG, DOC, DOCX (max 50MB par fichier)
              </p>
              <input
                id="file-upload-input"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
            </div>

            {/* Files Preview */}
            {pendingFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-medium text-gray-900">
                    Fichiers à uploader ({pendingFiles.length})
                  </h4>
                  <button
                    onClick={() => {
                      pendingFiles.forEach(file => {
                        if (file.preview) URL.revokeObjectURL(file.preview);
                      });
                      setPendingFiles([]);
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Tout supprimer
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingFiles.map(file => (
                    <div key={file.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        {/* Preview/Icon */}
                        <div className="flex-shrink-0">
                          {file.preview ? (
                            <img src={file.preview} alt={file.name} className="w-12 h-12 object-cover rounded-lg" />
                          ) : (
                            <div className="w-12 h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                              {getFileIcon(file.type)}
                            </div>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={file.displayName}
                                  onChange={(e) => updateFileProperty(file.id, 'displayName', e.target.value)}
                                  className="flex-1 font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  style={{ 
                                    wordBreak: 'break-all',
                                    overflowWrap: 'anywhere'
                                  }}
                                  placeholder="Nom du fichier (sans extension)"
                                />
                                <span className="text-sm text-gray-500 font-mono">{file.extension}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatFileSize(file.size)} • {file.type}
                              </p>
                            </div>
                            <button
                              onClick={() => removeFile(file.id)}
                              className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                              title="Supprimer"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Catégorie
                              </label>
                              <select
                                value={file.category}
                                onChange={(e) => updateFileProperty(file.id, 'category', e.target.value)}
                                className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {Object.entries(categories)
                                  .filter(([key]) => key !== 'all')
                                  .map(([key, category]) => (
                                    <option key={key} value={key}>
                                      {category.icon} {category.name}
                                    </option>
                                  ))
                                }
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Description (optionnel)
                              </label>
                              <input
                                type="text"
                                value={file.description}
                                onChange={(e) => updateFileProperty(file.id, 'description', e.target.value)}
                                className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Description du document"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {pendingFiles.length > 0 && (
                  <>
                    {pendingFiles.length} fichier{pendingFiles.length > 1 ? 's' : ''} prêt{pendingFiles.length > 1 ? 's' : ''} à uploader
                    {(selectedApartment || selectedTenant) && (
                      <span className="ml-2 text-green-600 font-medium">
                        vers {selectedApartment ? 
                          apartments.find(a => a.id == selectedApartment)?.titre : 
                          tenants.find(t => t.id == selectedTenant)?.prenom + ' ' + tenants.find(t => t.id == selectedTenant)?.nom
                        }
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setPendingFiles([]);
                    setSelectedApartment('');
                    setSelectedTenant('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isUploading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpload}
                  disabled={pendingFiles.length === 0 || isUploading || (!selectedApartment && !selectedTenant)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Upload en cours...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Uploader {pendingFiles.length > 0 ? `(${pendingFiles.length})` : ''}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {pendingFiles.length > 0 && (
              <div className="mt-4 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                💡 <strong>Astuce :</strong> Vous pouvez modifier le nom (sans extension), la catégorie et ajouter une description pour chaque fichier avant l'upload. 
                Les catégories sont automatiquement détectées selon le nom du fichier.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Chargement des documents..." />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion Documentaire</h1>
        <p className="text-gray-600">Centralisez et organisez tous vos documents immobiliers</p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{documents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Locataires</p>
              <p className="text-xl font-bold text-gray-900">
                {documents.filter(doc => doc.source_type === 'tenant').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Appartements</p>
              <p className="text-xl font-bold text-gray-900">
                {documents.filter(doc => doc.source_type === 'apartment').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Ce mois</p>
              <p className="text-xl font-bold text-gray-900">
                {documents.filter(doc => {
                  const docDate = new Date(doc.date_upload);
                  const now = new Date();
                  return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        {/* Recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher par nom de fichier, locataire, appartement, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filtres et tri */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(categories).map(([key, category]) => (
              <option key={key} value={key}>{category.icon} {category.name}</option>
            ))}
          </select>

          <select
            value={filters.apartment}
            onChange={(e) => setFilters(prev => ({ ...prev, apartment: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">🏠 Tous les appartements</option>
            {apartments.map(apt => (
              <option key={apt.id} value={apt.id}>{apt.titre}</option>
            ))}
          </select>

          <select
            value={filters.tenant}
            onChange={(e) => setFilters(prev => ({ ...prev, tenant: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">👤 Tous les locataires</option>
            {tenants.map(tenant => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.prenom} {tenant.nom}
              </option>
            ))}
          </select>

          {/* Tri */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-');
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="date-desc">📅 Plus récent</option>
            <option value="date-asc">📅 Plus ancien</option>
            <option value="name-asc">🔤 Nom A-Z</option>
            <option value="name-desc">🔤 Nom Z-A</option>
            <option value="category-asc">📁 Catégorie A-Z</option>
            <option value="source-asc">👤 Source A-Z</option>
          </select>
        </div>

        {/* Actions et contrôles */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus size={18} />
              <span className="font-medium">Ajouter documents</span>
            </button>

            {selectedDocuments.length > 0 && (
              <>
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Supprimer ({selectedDocuments.length})</span>
                </button>
                
                <button
                  onClick={() => setSelectedDocuments([])}
                  className="text-gray-600 hover:text-gray-800 px-2 py-1 text-sm"
                >
                  Désélectionner tout
                </button>
              </>
            )}

            {(searchTerm || Object.values(filters).some(f => f && f !== 'all') || sortBy !== 'date' || sortOrder !== 'desc') && (
              <button
                onClick={() => {
                  clearFilters();
                  setSortBy('date');
                  setSortOrder('desc');
                }}
                className="text-blue-600 hover:text-blue-800 px-2 py-1 text-sm font-medium"
              >
                Réinitialiser
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {filteredAndSortedDocuments.length > 0 && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedDocuments.length === filteredAndSortedDocuments.length && filteredAndSortedDocuments.length > 0}
                  onChange={selectAllDocuments}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Tout sélectionner</span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Affichage :</span>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Vue grille"
              >
                ⊞
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Vue liste"
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Documents trouvés</h2>
            <p className="text-gray-600 mt-1">
              {filteredAndSortedDocuments.length} document{filteredAndSortedDocuments.length !== 1 ? 's' : ''} 
              {filteredAndSortedDocuments.length !== documents.length && ` sur ${documents.length} au total`}
              {selectedDocuments.length > 0 && ` • ${selectedDocuments.length} sélectionné${selectedDocuments.length > 1 ? 's' : ''}`}
            </p>
          </div>
          
          {selectedDocuments.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <span className="text-blue-700 font-medium">
                {selectedDocuments.length} document{selectedDocuments.length > 1 ? 's' : ''} sélectionné{selectedDocuments.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {filteredAndSortedDocuments.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              {searchTerm || Object.values(filters).some(f => f !== 'all') ? (
                <Search size={48} className="mx-auto text-gray-400" />
              ) : (
                <FileText size={48} className="mx-auto text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || Object.values(filters).some(f => f !== 'all') 
                ? 'Aucun document trouvé' 
                : 'Aucun document'
              }
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || Object.values(filters).some(f => f !== 'all')
                ? 'Essayez de modifier vos critères de recherche ou vos filtres'
                : 'Commencez par uploader vos premiers documents'
              }
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Ajouter des documents</span>
            </button>
          </div>
        ) : (
          <>
            {/* Affichage des catégories populaires */}
            {!searchTerm && Object.values(filters).every(f => f === 'all') && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Catégories populaires</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(categories)
                    .filter(([key]) => key !== 'all')
                    .map(([key, category]) => {
                      const count = documents.filter(doc => doc.type_document === key).length;
                      if (count === 0) return null;
                      return (
                        <button
                          key={key}
                          onClick={() => setFilters(prev => ({ ...prev, category: key }))}
                          className="flex items-center space-x-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
                        >
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                          <span className="bg-white px-2 py-0.5 rounded-full text-xs font-medium">{count}</span>
                        </button>
                      );
                    })
                  }
                </div>
              </div>
            )}

            {/* Liste/Grille des documents */}
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "space-y-3"
            }>
              {filteredAndSortedDocuments.map(doc => 
                viewMode === 'grid' 
                  ? <DocumentCard key={doc.id} document={doc} />
                  : <DocumentListItem key={doc.id} document={doc} />
              )}
            </div>

            {/* Pagination si nécessaire */}
            {filteredAndSortedDocuments.length > 50 && (
              <div className="mt-8 flex justify-center">
                <div className="bg-gray-50 px-4 py-2 rounded-lg text-sm text-gray-600">
                  Affichage de {Math.min(50, filteredAndSortedDocuments.length)} documents sur {filteredAndSortedDocuments.length}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal d'upload */}
      {showUploadModal && <UploadModal />}

      {/* Modal de déplacement */}
      {movingDocument && (
        <div className="fixed inset-0 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 bg-transparent">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Déplacer le document</h3>
                <button onClick={cancelMoving} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Document à déplacer :</p>
                <p className="font-medium text-gray-900 mt-1">{movingDocument.nom_document}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Actuellement dans : {movingDocument.source_type === 'apartment' ? movingDocument.apartment_name : movingDocument.tenant_name}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Déplacer vers un appartement
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleMoveDocument(movingDocument.id, e.target.value, null);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">Sélectionner un appartement</option>
                    {apartments
                      .filter(apt => apt.id !== movingDocument.apartment_id)
                      .map(apt => (
                        <option key={apt.id} value={apt.id}>{apt.titre}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="text-center text-gray-500 text-sm">ou</div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Déplacer vers un locataire
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleMoveDocument(movingDocument.id, null, e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">Sélectionner un locataire</option>
                    {tenants
                      .filter(tenant => tenant.id !== movingDocument.tenant_id)
                      .map(tenant => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.prenom} {tenant.nom}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={cancelMoving}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast de feedback pour les actions en lot */}
      {selectedDocuments.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-40">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">
              {selectedDocuments.length} document{selectedDocuments.length > 1 ? 's' : ''} sélectionné{selectedDocuments.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleBulkDelete}
              className="bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-xs transition-colors"
            >
              Supprimer
            </button>
            <button
              onClick={() => setSelectedDocuments([])}
              className="text-blue-200 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;