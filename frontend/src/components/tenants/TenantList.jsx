// src/components/tenants/TenantList.jsx - Version corrigée pour l'API backend
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Phone, Mail, Building, Euro, Calendar, Edit, Trash2, MapPin, User } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useSearch } from '../../hooks/useSearch';
import LoadingSpinner from '../common/LoadingSpinner';

const TenantList = () => {
  const navigate = useNavigate();
  const { tenants, apartments, loading, refresh, deleteTenant } = useApp();
  const { addNotification } = useNotifications();
  const [viewMode, setViewMode] = useState('grid');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const searchFields = ['nom', 'prenom', 'email', 'profession', 'telephone'];
  const { 
    searchTerm, 
    setSearchTerm, 
    filters, 
    updateFilter, 
    clearFilters, 
    filteredItems, 
    stats 
  } = useSearch(tenants, searchFields);

  // Statistiques calculées
  const tenantStats = {
    total: tenants.length,
    withEmail: tenants.filter(tenant => tenant.email && tenant.email.trim()).length,
    withPhone: tenants.filter(tenant => tenant.telephone && tenant.telephone.trim()).length,
    withLocation: tenants.filter(tenant => tenant.location_statut === 'active').length,
    averageSalary: tenants.filter(t => t.salaire).length > 0 
      ? tenants.filter(t => t.salaire).reduce((sum, t) => sum + parseFloat(t.salaire), 0) / tenants.filter(t => t.salaire).length
      : 0
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `${parseFloat(price).toLocaleString('fr-FR')}€`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatPhone = (phone) => {
    if (!phone) return 'Non renseigné';
    // Formatter le téléphone français : 06 12 34 56 78
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getApartmentForTenant = (tenantId) => {
    // Chercher dans les appartements celui qui a ce locataire
    return apartments.find(apt => 
      apt.locataire_actuel && 
      apt.locataire_actuel.toLowerCase().includes(
        tenants.find(t => t.id === tenantId)?.prenom?.toLowerCase() || ''
      ) &&
      apt.locataire_actuel.toLowerCase().includes(
        tenants.find(t => t.id === tenantId)?.nom?.toLowerCase() || ''
      )
    );
  };

  const handleDeleteTenant = async (tenant) => {
    setTenantToDelete(tenant);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!tenantToDelete) return;
    
    setDeleting(true);
    try {
      console.log('🗑️ Suppression locataire:', tenantToDelete.id);
      
      const result = await deleteTenant(tenantToDelete.id);
      
      if (result.success) {
        addNotification('Locataire supprimé avec succès', 'success');
        await refresh(); // Actualiser la liste
        setShowDeleteModal(false);
        setTenantToDelete(null);
      } else {
        addNotification(result.error || 'Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      addNotification('Erreur lors de la suppression', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const TenantCard = ({ tenant }) => {
    const age = calculateAge(tenant.date_naissance);
    const currentApartment = getApartmentForTenant(tenant.id);
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 group">
        <div className="p-6">
          {/* En-tête avec actions */}
          <div className="flex items-start justify-between mb-4">
            <div 
              className="flex items-center space-x-4 flex-1 cursor-pointer"
              onClick={() => navigate(`/tenants/${tenant.id}`)}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users size={24} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                  {tenant.prenom} {tenant.nom}
                </h3>
                <p className="text-gray-600 text-sm truncate">
                  {tenant.profession || 'Profession non renseignée'}
                </p>
                {age && (
                  <p className="text-gray-500 text-xs">{age} ans</p>
                )}
              </div>
            </div>

            {/* Actions rapides */}
            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/tenants/${tenant.id}/edit`);
                }}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg transition-colors"
                title="Modifier"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTenant(tenant);
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Informations de contact */}
          <div className="space-y-2 mb-4">
            {tenant.email && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">{tenant.email}</span>
              </div>
            )}
            
            {tenant.telephone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                <span>{formatPhone(tenant.telephone)}</span>
              </div>
            )}

            {tenant.salaire && (
              <div className="flex items-center text-sm text-gray-600">
                <Euro size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                <span>Salaire: {formatPrice(tenant.salaire)}/mois</span>
              </div>
            )}
          </div>

          {/* Appartement actuel */}
          {currentApartment ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center text-green-800 mb-1">
                <Building size={16} className="mr-2 flex-shrink-0" />
                <span className="font-medium text-sm truncate">{currentApartment.titre}</span>
              </div>
              <div className="flex items-center text-green-600 text-xs">
                <MapPin size={12} className="mr-1 flex-shrink-0" />
                <span className="truncate">{currentApartment.adresse_complete}</span>
              </div>
              {currentApartment.prix_loyer && (
                <div className="text-green-700 text-xs mt-1 font-medium">
                  {formatPrice(currentApartment.prix_loyer)}/mois
                </div>
              )}
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center text-orange-800">
                <Building size={16} className="mr-2" />
                <span className="font-medium text-sm">Aucune location active</span>
              </div>
            </div>
          )}

          {/* Footer avec dates */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-500">
            <span>Ajouté le {formatDate(tenant.date_creation)}</span>
            {tenant.date_naissance && (
              <span>Né(e) le {formatDate(tenant.date_naissance)}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const TenantListItem = ({ tenant }) => {
    const age = calculateAge(tenant.date_naissance);
    const currentApartment = getApartmentForTenant(tenant.id);
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200 group">
        <div className="flex items-center space-x-6">
          {/* Avatar */}
          <div 
            className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/tenants/${tenant.id}`)}
          >
            <Users size={24} className="text-blue-600" />
          </div>

          {/* Contenu principal */}
          <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tenants/${tenant.id}`)}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {tenant.prenom} {tenant.nom}
                {age && <span className="text-sm text-gray-500 font-normal ml-2">({age} ans)</span>}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
              {/* Contact */}
              <div>
                <p className="font-medium text-gray-700 mb-2">Contact</p>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <Mail size={12} className="mr-2 text-gray-400" />
                    <span className="truncate">{tenant.email || 'Email non renseigné'}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone size={12} className="mr-2 text-gray-400" />
                    <span>{formatPhone(tenant.telephone)}</span>
                  </div>
                </div>
              </div>
              
              {/* Profession et salaire */}
              <div>
                <p className="font-medium text-gray-700 mb-2">Profession</p>
                <div className="space-y-1">
                  <p className="truncate">{tenant.profession || 'Non renseignée'}</p>
                  {tenant.salaire && (
                    <div className="flex items-center text-green-600">
                      <Euro size={12} className="mr-1" />
                      <span>{formatPrice(tenant.salaire)}/mois</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Location actuelle */}
              <div>
                <p className="font-medium text-gray-700 mb-2">Location</p>
                {currentApartment ? (
                  <div className="space-y-1">
                    <div className="flex items-center text-green-600">
                      <Building size={12} className="mr-1" />
                      <span className="truncate font-medium">{currentApartment.titre}</span>
                    </div>
                    {currentApartment.prix_loyer && (
                      <div className="text-green-600 text-xs">
                        {formatPrice(currentApartment.prix_loyer)}/mois
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-orange-600">Aucune location active</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => navigate(`/tenants/${tenant.id}/edit`)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg transition-colors"
              title="Modifier"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => handleDeleteTenant(tenant)}
              className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
            {tenant.email && (
              <button
                onClick={() => window.location.href = `mailto:${tenant.email}`}
                className="bg-green-50 hover:bg-green-100 text-green-600 p-2 rounded-lg transition-colors"
                title="Envoyer un email"
              >
                <Mail size={16} />
              </button>
            )}
            {tenant.telephone && (
              <button
                onClick={() => window.location.href = `tel:${tenant.telephone}`}
                className="bg-purple-50 hover:bg-purple-100 text-purple-600 p-2 rounded-lg transition-colors"
                title="Appeler"
              >
                <Phone size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Chargement des locataires..." />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Locataires</h1>
            <p className="text-gray-600 mt-2">
              Gérez vos locataires et leurs informations - {tenantStats.total} locataire{tenantStats.total > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/tenants/new')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-lg"
          >
            <Plus size={20} />
            <span>Ajouter un locataire</span>
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{tenantStats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avec email</p>
                <p className="text-2xl font-bold text-gray-900">{tenantStats.withEmail}</p>
                <p className="text-xs text-gray-500">
                  {tenantStats.total > 0 ? Math.round((tenantStats.withEmail / tenantStats.total) * 100) : 0}% du total
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Phone className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avec téléphone</p>
                <p className="text-2xl font-bold text-gray-900">{tenantStats.withPhone}</p>
                <p className="text-xs text-gray-500">
                  {tenantStats.total > 0 ? Math.round((tenantStats.withPhone / tenantStats.total) * 100) : 0}% du total
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Building className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">En location</p>
                <p className="text-2xl font-bold text-gray-900">{tenantStats.withLocation}</p>
                {tenantStats.averageSalary > 0 && (
                  <p className="text-xs text-gray-500">
                    Salaire moyen: {formatPrice(tenantStats.averageSalary)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par nom, email, profession, téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Vue :</span>
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

            {searchTerm && (
              <button
                onClick={clearFilters}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Réinitialiser la recherche"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            {stats.filtered} locataire{stats.filtered !== 1 ? 's' : ''} affiché{stats.filtered !== 1 ? 's' : ''}
            {stats.filtered !== stats.total && ` sur ${stats.total}`}
          </p>
          
          {stats.searchActive && (
            <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Recherche active
            </div>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="max-w-md mx-auto">
            <User size={64} className="mx-auto text-gray-300 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {searchTerm ? 'Aucun locataire trouvé' : 'Aucun locataire enregistré'}
            </h3>
            <p className="text-gray-500 mb-8">
              {searchTerm
                ? 'Essayez de modifier votre recherche ou vérifiez l\'orthographe'
                : 'Commencez par ajouter votre premier locataire pour gérer vos locations'
              }
            </p>
            <button
              onClick={() => navigate('/tenants/new')}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2 shadow-lg"
            >
              <Plus size={20} />
              <span>Ajouter un locataire</span>
            </button>
          </div>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            : "space-y-6"
        }>
          {filteredItems.map(tenant =>
            viewMode === 'grid' ? (
              <TenantCard key={tenant.id} tenant={tenant} />
            ) : (
              <TenantListItem key={tenant.id} tenant={tenant} />
            )
          )}
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && tenantToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Supprimer le locataire</h3>
                  <p className="text-sm text-gray-500">Cette action est irréversible</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900">{tenantToDelete.prenom} {tenantToDelete.nom}</h4>
                <p className="text-sm text-gray-600">{tenantToDelete.email || tenantToDelete.telephone || 'Pas d\'info de contact'}</p>
                {tenantToDelete.profession && (
                  <p className="text-sm text-gray-600">{tenantToDelete.profession}</p>
                )}
                {getApartmentForTenant(tenantToDelete.id) && (
                  <p className="text-sm text-orange-600 mt-2">
                    ⚠️ Ce locataire a une location active
                  </p>
                )}
              </div>
              
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer ce locataire ? Cette action supprimera également :
              </p>
              
              <ul className="text-sm text-gray-600 mb-6 pl-4 space-y-1">
                <li>• Tous les documents associés</li>
                <li>• L'historique des locations</li>
                <li>• Les paiements enregistrés</li>
                <li>• Les données personnelles</li>
              </ul>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTenantToDelete(null);
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>Supprimer définitivement</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantList;