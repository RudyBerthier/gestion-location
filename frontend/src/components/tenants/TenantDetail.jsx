// src/components/tenants/TenantDetail.jsx - Version complète avec option readonly
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, Upload, Plus, FileText, Users, Euro, Phone, Mail, 
  Calendar, Building, MapPin, Save, X, Eye, Download, Home, User
} from 'lucide-react';
import { tenantApi, documentApi, paymentApi, locationApi } from '../../utils/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { useApp } from '../../contexts/AppContext';
import LoadingSpinner from '../common/LoadingSpinner';

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { apartments, refresh } = useApp();
  
  const [tenant, setTenant] = useState(null);
  const [locations, setLocations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('locations');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [deletingLocation, setDeletingLocation] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) {
      loadTenantData();
    }
  }, [id]);

  const loadTenantData = async () => {
    setLoading(true);
    try {
      //console.log('👥 Chargement données locataire ID:', id);
      
      const [
        tenantData,
        locationsData,
        documentsData,
        paymentsData
      ] = await Promise.all([
        tenantApi.getById(id),
        tenantApi.getLocations(id),
        tenantApi.getDocuments(id),
        tenantApi.getPayments(id)
      ]);

      //console.log('✅ Données locataire reçues:', tenantData);
      //console.log('🏠 Locations reçues:', locationsData);
      //console.log('📄 Documents reçus:', documentsData);
      //console.log('💰 Paiements reçus:', paymentsData);

      setTenant(tenantData);
      setLocations(Array.isArray(locationsData) ? locationsData : []);
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    } catch (error) {
      console.error('❌ Erreur chargement locataire:', error);
      addNotification('Erreur lors du chargement des données du locataire', 'error');
      
      if (error.message.includes('404') || error.message.includes('non trouvé')) {
        navigate('/tenants');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    return locations.find(loc => loc.statut === 'active') || null;
  };

  const getLocationHistory = () => {
    return locations.filter(loc => loc.statut !== 'active').sort((a, b) => 
      new Date(b.date_debut) - new Date(a.date_debut)
    );
  };

  const deleteTenant = async () => {
    try {
      //console.log('🗑️ Suppression locataire ID:', id);
      const result = await tenantApi.delete(id);
      
      //console.log('✅ Résultat suppression:', result);
      
      if (result.success) {
        addNotification('Locataire supprimé avec succès', 'success');
        await refresh();
        navigate('/tenants');
      } else {
        addNotification(result.message || 'Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('❌ Erreur suppression locataire:', error);
      addNotification('Erreur lors de la suppression du locataire', 'error');
    }
  };

  // Modal de gestion des locations avec option readonly
  const LocationModal = () => {
    const [formData, setFormData] = useState({
      appartement_id: '',
      date_debut: new Date().toISOString().split('T')[0],
      date_fin: '',
      loyer_mensuel: '',
      charges_mensuelles: '',
      depot_garantie: '',
      statut: 'active'
    });
    
    const [customizeFinancials, setCustomizeFinancials] = useState(false);
    const [selectedApartment, setSelectedApartment] = useState(null);

    useEffect(() => {
      if (editingLocation) {
        //console.log('📝 Edition location:', editingLocation);
        const apartment = apartments.find(apt => apt.id == editingLocation.appartement_id);
        setSelectedApartment(apartment);
        
        // Vérifier si les valeurs de la location diffèrent de celles de l'appartement
        const hasCustomValues = apartment && (
          parseFloat(editingLocation.loyer_mensuel) !== parseFloat(apartment.prix_loyer) ||
          parseFloat(editingLocation.charges_mensuelles) !== parseFloat(apartment.charges) ||
          parseFloat(editingLocation.depot_garantie) !== parseFloat(apartment.depot_garantie)
        );
        
        setCustomizeFinancials(hasCustomValues);
        
        setFormData({
          appartement_id: editingLocation.appartement_id || '',
          date_debut: editingLocation.date_debut ? editingLocation.date_debut.split('T')[0] : '',
          date_fin: editingLocation.date_fin ? editingLocation.date_fin.split('T')[0] : '',
          loyer_mensuel: editingLocation.loyer_mensuel || '',
          charges_mensuelles: editingLocation.charges_mensuelles || '',
          depot_garantie: editingLocation.depot_garantie || '',
          statut: editingLocation.statut || 'active'
        });
      }
    }, [editingLocation]);

    const handleApartmentChange = (apartmentId) => {
      const apartment = apartments.find(apt => apt.id == apartmentId);
      setSelectedApartment(apartment);
      setCustomizeFinancials(false); // Reset à chaque changement d'appartement
      
      setFormData(prev => ({
        ...prev,
        appartement_id: apartmentId,
        loyer_mensuel: apartment?.prix_loyer || '',
        charges_mensuelles: apartment?.charges || '',
        depot_garantie: apartment?.depot_garantie || ''
      }));
    };

    const toggleCustomizeFinancials = (checked) => {
      setCustomizeFinancials(checked);
      if (!checked && selectedApartment) {
        // Restaurer les valeurs de l'appartement
        setFormData(prev => ({
          ...prev,
          loyer_mensuel: selectedApartment.prix_loyer || '',
          charges_mensuelles: selectedApartment.charges || '',
          depot_garantie: selectedApartment.depot_garantie || ''
        }));
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      try {
        //console.log('💾 Sauvegarde location avec données:', formData);
        
        const processedData = {
          ...formData,
          locataire_id: id,
          loyer_mensuel: parseFloat(formData.loyer_mensuel) || null,
          charges_mensuelles: parseFloat(formData.charges_mensuelles) || null,
          depot_garantie: parseFloat(formData.depot_garantie) || null,
          date_fin: formData.date_fin || null
        };

        //console.log('📊 Données processées:', processedData);

        let result;
        if (editingLocation) {
          result = await locationApi.update(editingLocation.id, processedData);
        } else {
          result = await locationApi.create(processedData);
        }

        //console.log('✅ Résultat sauvegarde:', result);

        if (result.success) {
          await loadTenantData();
          await refresh();
          setShowLocationModal(false);
          setEditingLocation(null);
          addNotification(
            editingLocation ? 'Location modifiée avec succès' : 'Location créée avec succès',
            'success'
          );
        } else {
          addNotification(result.message || 'Erreur lors de la sauvegarde', 'error');
        }
      } catch (error) {
        console.error('❌ Erreur sauvegarde location:', error);
        addNotification('Erreur lors de la sauvegarde de la location', 'error');
      }
    };

    const closeModal = () => {
      setShowLocationModal(false);
      setEditingLocation(null);
      setCustomizeFinancials(false);
      setSelectedApartment(null);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {editingLocation ? 'Modifier la location' : 'Nouvelle location'}
            </h2>
            <button
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sélection appartement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Appartement *</label>
              <select
                required
                value={formData.appartement_id}
                onChange={(e) => handleApartmentChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un appartement</option>
                {apartments.map(apt => (
                  <option key={apt.id} value={apt.id}>
                    {apt.titre} - {apt.adresse_complete}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de début *</label>
                <input
                  type="date"
                  required
                  value={formData.date_debut}
                  onChange={(e) => setFormData({...formData, date_debut: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
                <input
                  type="date"
                  value={formData.date_fin}
                  onChange={(e) => setFormData({...formData, date_fin: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Laisser vide pour un bail indéterminé</p>
              </div>
            </div>

            {/* Section financière avec option readonly */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Informations financières</h4>
                {selectedApartment && (
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={customizeFinancials}
                      onChange={(e) => toggleCustomizeFinancials(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Personnaliser les montants</span>
                  </label>
                )}
              </div>

              {selectedApartment ? (
                <>
                  {!customizeFinancials && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-green-800">
                        ✅ Les montants de l'appartement seront utilisés automatiquement
                      </p>
                    </div>
                  )}
                  
                  {customizeFinancials && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Vous personnalisez les montants pour cette location spécifique
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Loyer mensuel (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.loyer_mensuel}
                        onChange={(e) => setFormData({...formData, loyer_mensuel: e.target.value})}
                        disabled={!customizeFinancials}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg transition-colors ${
                          customizeFinancials 
                            ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                            : 'bg-gray-50 text-gray-500 cursor-not-allowed'
                        }`}
                        placeholder="1200.00"
                      />
                      {!customizeFinancials && selectedApartment.prix_loyer && (
                        <p className="text-xs text-gray-500 mt-1">
                          💡 Valeur de l'appartement: {parseFloat(selectedApartment.prix_loyer).toLocaleString('fr-FR')}€
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Charges (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.charges_mensuelles}
                        onChange={(e) => setFormData({...formData, charges_mensuelles: e.target.value})}
                        disabled={!customizeFinancials}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg transition-colors ${
                          customizeFinancials 
                            ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                            : 'bg-gray-50 text-gray-500 cursor-not-allowed'
                        }`}
                        placeholder="150.00"
                      />
                      {!customizeFinancials && selectedApartment.charges && (
                        <p className="text-xs text-gray-500 mt-1">
                          💡 Valeur de l'appartement: {parseFloat(selectedApartment.charges).toLocaleString('fr-FR')}€
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dépôt de garantie (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.depot_garantie}
                        onChange={(e) => setFormData({...formData, depot_garantie: e.target.value})}
                        disabled={!customizeFinancials}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg transition-colors ${
                          customizeFinancials 
                            ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                            : 'bg-gray-50 text-gray-500 cursor-not-allowed'
                        }`}
                        placeholder="1200.00"
                      />
                      {!customizeFinancials && selectedApartment.depot_garantie && (
                        <p className="text-xs text-gray-500 mt-1">
                          💡 Valeur de l'appartement: {parseFloat(selectedApartment.depot_garantie).toLocaleString('fr-FR')}€
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Affichage du total */}
                  {(formData.loyer_mensuel || formData.charges_mensuelles) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">Total mensuel:</span>
                        <span className="text-xl font-bold text-blue-600">
                          {((parseFloat(formData.loyer_mensuel) || 0) + (parseFloat(formData.charges_mensuelles) || 0)).toLocaleString('fr-FR')}€
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Building size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez d'abord un appartement</p>
                  <p className="text-sm mt-1">Les informations financières apparaîtront automatiquement</p>
                </div>
              )}
            </div>

            {/* Statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={formData.statut}
                onChange={(e) => setFormData({...formData, statut: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="terminee">Terminée</option>
                <option value="resiliee">Résiliée</option>
              </select>
            </div>

            <div className="flex space-x-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {editingLocation ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Modal de paiement
  const PaymentModal = () => {
    const [paymentData, setPaymentData] = useState({
      type_paiement: 'loyer',
      montant: '',
      date_paiement: new Date().toISOString().split('T')[0],
      methode_paiement: 'virement',
      description: ''
    });

    const currentLocation = getCurrentLocation();

    // Pré-remplir le montant selon le type de paiement
    const handleTypeChange = (type) => {
      setPaymentData(prev => ({ ...prev, type_paiement: type }));
      
      if (currentLocation) {
        let suggestedAmount = '';
        switch (type) {
          case 'loyer':
            suggestedAmount = currentLocation.loyer_mensuel || '';
            break;
          case 'charges':
            suggestedAmount = currentLocation.charges_mensuelles || '';
            break;
          case 'depot_garantie':
            suggestedAmount = currentLocation.depot_garantie || '';
            break;
          default:
            suggestedAmount = '';
        }
        setPaymentData(prev => ({ ...prev, montant: suggestedAmount }));
      }
    };

    const handlePaymentSubmit = async (e) => {
      e.preventDefault();
      
      try {
        const processedData = {
          ...paymentData,
          locataire_id: id,
          appartement_id: currentLocation?.appartement_id || null,
          location_id: currentLocation?.id || null,
          montant: parseFloat(paymentData.montant)
        };

        const result = await paymentApi.create(processedData);
        
        if (result.success) {
          await loadTenantData();
          setShowPaymentModal(false);
          addNotification('Paiement enregistré avec succès', 'success');
        } else {
          addNotification(result.message || 'Erreur lors de l\'enregistrement', 'error');
        }
      } catch (error) {
        console.error('Erreur création paiement:', error);
        addNotification('Erreur lors de l\'enregistrement du paiement', 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Nouveau paiement</h2>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                <select
                  required
                  value={paymentData.type_paiement}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="loyer">Loyer</option>
                  <option value="charges">Charges</option>
                  <option value="depot_garantie">Dépôt de garantie</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Montant (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentData.montant}
                  onChange={(e) => setPaymentData({...paymentData, montant: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1200.00"
                />
                {currentLocation && paymentData.type_paiement === 'loyer' && currentLocation.loyer_mensuel && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Loyer habituel: {parseFloat(currentLocation.loyer_mensuel).toLocaleString('fr-FR')}€
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de paiement *</label>
                <input
                  type="date"
                  required
                  value={paymentData.date_paiement}
                  onChange={(e) => setPaymentData({...paymentData, date_paiement: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Méthode *</label>
                <select
                  required
                  value={paymentData.methode_paiement}
                  onChange={(e) => setPaymentData({...paymentData, methode_paiement: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="virement">Virement</option>
                  <option value="cheque">Chèque</option>
                  <option value="especes">Espèces</option>
                  <option value="carte">Carte</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={paymentData.description}
                onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Loyer de janvier 2024..."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const deleteLocation = async (locationId) => {
    try {
      //console.log('🗑️ Suppression location ID:', locationId);
      const result = await locationApi.delete(locationId);
      
      //console.log('✅ Résultat suppression location:', result);
      
      if (result.success) {
        await loadTenantData();
        await refresh();
        setDeletingLocation(null);
        addNotification('Location supprimée avec succès', 'success');
      } else {
        addNotification(result.message || 'Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('❌ Erreur suppression location:', error);
      addNotification('Erreur lors de la suppression de la location', 'error');
    }
  };

  const uploadDocument = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      //console.log('📤 Upload documents pour locataire:', id, files);
      
      const uploadPromises = Array.from(files).map(async (file) => {
        return await documentApi.upload({
          file: file,
          locataire_id: id,
          nom_document: file.name,
          type_document: guessDocumentType(file.name),
          description: ''
        });
      });

      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(r => r && r.success).length;
      const errorCount = results.length - successCount;

      if (successCount > 0) {
        await loadTenantData();
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
    if (name.includes('cni') || name.includes('carte') || name.includes('identite')) return 'piece_identite';
    if (name.includes('salaire') || name.includes('bulletin') || name.includes('paie')) return 'bulletin_salaire';
    if (name.includes('justificatif') || name.includes('domicile')) return 'justificatif_domicile';
    if (name.includes('garant')) return 'document_garant';
    if (name.includes('contrat')) return 'contrat_travail';
    if (name.includes('avis') || name.includes('imposition')) return 'avis_imposition';
    return 'autre';
  };

  const deleteDocument = async (docId) => {
    if (!confirm('Supprimer ce document ?')) return;
    
    try {
      //console.log('🗑️ Suppression document ID:', docId);
      const result = await documentApi.delete(docId);
      
      if (result.success) {
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
        addNotification('Document supprimé avec succès', 'success');
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

  const formatPrice = (price) => {
    return price ? `${parseFloat(price).toLocaleString()}€` : 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getApartmentTitle = (appartementId) => {
    const apartment = apartments.find(apt => apt.id == appartementId);
    return apartment ? apartment.titre : 'Appartement inconnu';
  };

  const getStatusBadge = (statut) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      terminee: 'bg-gray-100 text-gray-800',
      resiliee: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      active: 'Active',
      terminee: 'Terminée',
      resiliee: 'Résiliée'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[statut] || badges.terminee}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Chargement du locataire..." />;
  }

  if (!tenant) {
    return (
      <div className="p-6 text-center">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <User size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Locataire non trouvé</h2>
            <p className="text-gray-600 mb-6">
              Le locataire que vous recherchez n'existe pas ou a été supprimé.
            </p>
          </div>
          <button
            onClick={() => navigate('/tenants')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
          >
            <ArrowLeft size={18} />
            <span>Retour à la liste</span>
          </button>
        </div>
      </div>
    );
  }

  const currentLocation = getCurrentLocation();
  const locationHistory = getLocationHistory();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tenants')}
              className="bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors"
              title="Retour à la liste"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Users size={24} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tenant.prenom} {tenant.nom}</h1>
                <p className="text-gray-600">{tenant.profession || 'Profession non renseignée'}</p>
                {currentLocation && (
                  <p className="text-sm text-green-600 font-medium mt-1">
                    📍 {getApartmentTitle(currentLocation.appartement_id)}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate(`/tenants/${id}/edit`)}
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
          {/* Informations personnelles */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-6">Informations personnelles</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Nom complet</p>
                <p className="text-lg font-semibold break-words">{tenant.prenom} {tenant.nom}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Email</p>
                <p className="text-lg font-semibold break-words">{tenant.email || 'Non renseigné'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                <p className="text-lg font-semibold break-words">{tenant.telephone || 'Non renseigné'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Date de naissance</p>
                <p className="text-lg font-semibold break-words">
                  {tenant.date_naissance ? formatDate(tenant.date_naissance) : 'Non renseignée'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Profession</p>
                <p className="text-lg font-semibold break-words">{tenant.profession || 'Non renseignée'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Salaire mensuel</p>
                <p className="text-lg font-semibold text-green-600 break-words">{formatPrice(tenant.salaire)}</p>
              </div>
            </div>
          </div>

          {/* Onglets de gestion */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                {[
                  { id: 'locations', label: 'Locations', icon: Building, count: locations.length },
                  { id: 'documents', label: 'Documents', icon: FileText, count: documents.length },
                  { id: 'payments', label: 'Paiements', icon: Euro, count: payments.length }
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
            {activeTab === 'locations' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Locations</h3>
                  <button
                    onClick={() => setShowLocationModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus size={16} />
                    <span>Nouvelle location</span>
                  </button>
                </div>

                {/* Location actuelle */}
                {currentLocation && (
                  <div className="mb-8">
                    <h4 className="text-md font-semibold mb-3 text-green-700">Location actuelle</h4>
                    <div className="border-2 border-green-200 bg-green-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Building size={20} className="text-green-600" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-green-900">
                              {getApartmentTitle(currentLocation.appartement_id)}
                            </h5>
                            <p className="text-sm text-green-700">
                              Depuis le {formatDate(currentLocation.date_debut)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(currentLocation.statut)}
                          <button
                            onClick={() => {
                              setEditingLocation(currentLocation);
                              setShowLocationModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingLocation(currentLocation)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-green-700">Loyer mensuel</p>
                          <p className="font-semibold text-green-900">{formatPrice(currentLocation.loyer_mensuel)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-green-700">Charges</p>
                          <p className="font-semibold text-green-900">{formatPrice(currentLocation.charges_mensuelles)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-green-700">Dépôt de garantie</p>
                          <p className="font-semibold text-green-900">{formatPrice(currentLocation.depot_garantie)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Historique des locations */}
                {locationHistory.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold mb-3 text-gray-700">Historique des locations</h4>
                    <div className="space-y-3">
                      {locationHistory.map(location => (
                        <div
                          key={location.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Building size={16} className="text-gray-600" />
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900">
                                  {getApartmentTitle(location.appartement_id)}
                                </h5>
                                <p className="text-sm text-gray-600">
                                  Du {formatDate(location.date_debut)}
                                  {location.date_fin && ` au ${formatDate(location.date_fin)}`}
                                </p>
                                <div className="flex items-center space-x-4 mt-1">
                                  <span className="text-sm text-gray-600">
                                    Loyer: {formatPrice(location.loyer_mensuel)}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    Charges: {formatPrice(location.charges_mensuelles)}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    Dépôt de garantie: {formatPrice(location.depot_garantie)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(location.statut)}
                              <button
                                onClick={() => {
                                  setEditingLocation(location);
                                  setShowLocationModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Modifier"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => setDeletingLocation(location)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {locations.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Building size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="mb-2">Aucune location enregistrée</p>
                    <p className="text-sm">Cliquez sur "Nouvelle location" pour commencer</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Documents du locataire</h3>
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
                    <p className="text-sm">Les documents du locataire apparaîtront ici</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payments' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Paiements</h3>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus size={16} />
                    <span>Nouveau paiement</span>
                  </button>
                </div>

                {payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map(payment => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Euro size={20} className="text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium capitalize">{payment.type_paiement.replace('_', ' ')}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span>{formatDate(payment.date_paiement)}</span>
                              <span>•</span>
                              <span className="capitalize">{payment.methode_paiement}</span>
                            </div>
                            {payment.description && (
                              <p className="text-sm text-gray-500 mt-1">{payment.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg text-green-600">{formatPrice(payment.montant)}</p>
                          <p className="text-xs text-gray-500">{formatDate(payment.date_creation)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Euro size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="mb-2">Aucun paiement enregistré</p>
                    <p className="text-sm">Les paiements de ce locataire apparaîtront ici</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Location actuelle (résumé) */}
          {currentLocation && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Location actuelle</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-green-700">Appartement</p>
                    <p className="font-medium text-green-900">{getApartmentTitle(currentLocation.appartement_id)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Loyer mensuel</p>
                    <p className="font-medium text-green-900">{formatPrice(currentLocation.loyer_mensuel)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Charges</p>
                    <p className="font-medium text-green-900">{formatPrice(currentLocation.charges_mensuelles)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Début de location</p>
                    <p className="font-medium text-green-900">{formatDate(currentLocation.date_debut)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Dépôt de garantie</p>
                    <p className="font-medium text-green-900">{formatPrice(currentLocation.depot_garantie)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/apartments/${currentLocation.appartement_id}`)}
                  className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Voir l'appartement
                </button>
              </div>
            </div>
          )}

          {/* Actions rapides */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
            <div className="space-y-3">
              {/* <button 
                onClick={() => setShowLocationModal(true)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Plus size={16} />
                <span>Nouvelle location</span>
              </button> */}
              <button 
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Euro size={16} />
                <span>Enregistrer paiement</span>
              </button>
              <button className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2">
                <FileText size={16} />
                <span>Générer quittance</span>
              </button>
              {tenant.email && (
                <button
                  onClick={() => window.location.href = `mailto:${tenant.email}`}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Mail size={16} />
                  <span>Envoyer email</span>
                </button>
              )}
              {tenant.telephone && (
                <button
                  onClick={() => window.location.href = `tel:${tenant.telephone}`}
                  className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Phone size={16} />
                  <span>Appeler</span>
                </button>
              )}
            </div>
          </div>

          {/* Informations générales */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Créé le:</span>
                <span className="font-medium">{formatDate(tenant.date_creation)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Modifié le:</span>
                <span className="font-medium">{formatDate(tenant.date_modification)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total locations:</span>
                <span className="font-medium">{locations.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Documents:</span>
                <span className="font-medium">{documents.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showLocationModal && <LocationModal />}
      {showPaymentModal && <PaymentModal />}

      {/* Modal de suppression de location */}
      {deletingLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer la location</h3>
              <p className="text-gray-600 mb-4">
                Êtes-vous sûr de vouloir supprimer cette location ?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg mb-6">
                <p className="text-sm font-medium text-gray-900">{getApartmentTitle(deletingLocation.appartement_id)}</p>
                <p className="text-xs text-gray-600">
                  Du {formatDate(deletingLocation.date_debut)}
                  {deletingLocation.date_fin && ` au ${formatDate(deletingLocation.date_fin)}`}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setDeletingLocation(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deleteLocation(deletingLocation.id)}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression du locataire */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer le locataire</h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer définitivement ce locataire ? 
                Cette action supprimera aussi toutes les locations, documents et paiements associés.
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
                    deleteTenant();
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

export default TenantDetail;