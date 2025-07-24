// src/components/apartments/ApartmentList.jsx - Version corrigée pour l'API backend
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Home, Users, Euro, MapPin, Calendar, Edit, Trash2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useSearch } from '../../hooks/useSearch';
import LoadingSpinner from '../common/LoadingSpinner';

const ApartmentList = () => {
  const navigate = useNavigate();
  const { apartments, loading, refresh, deleteApartment } = useApp();
  const { addNotification } = useNotifications();
  const [viewMode, setViewMode] = useState('grid');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [apartmentToDelete, setApartmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const searchFields = ['titre', 'adresse_complete', 'locataire_actuel'];
  const { 
    searchTerm, 
    setSearchTerm, 
    filters, 
    updateFilter, 
    clearFilters, 
    filteredItems, 
    stats 
  } = useSearch(apartments, searchFields);

  // Statistiques calculées
  const apartmentStats = {
    total: apartments.length,
    occupied: apartments.filter(apt => apt.statut === 'occupé').length,
    vacant: apartments.filter(apt => apt.statut === 'libre').length,
    underWork: apartments.filter(apt => apt.statut === 'en_travaux').length,
    monthlyRevenue: apartments
      .filter(apt => apt.statut === 'occupé' && apt.prix_loyer)
      .reduce((sum, apt) => sum + (parseFloat(apt.prix_loyer) || 0), 0)
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'libre': return 'bg-green-100 text-green-800';
      case 'occupé': return 'bg-red-100 text-red-800';
      case 'en_travaux': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'libre': return 'Libre';
      case 'occupé': return 'Occupé';
      case 'en_travaux': return 'En travaux';
      default: return status;
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `${parseFloat(price).toLocaleString('fr-FR')}€`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const handleDeleteApartment = async (apartment) => {
    setApartmentToDelete(apartment);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!apartmentToDelete) return;
    
    setDeleting(true);
    try {
      //console.log('🗑️ Suppression appartement:', apartmentToDelete.id);
      
      const result = await deleteApartment(apartmentToDelete.id);
      
      if (result.success) {
        addNotification('Appartement supprimé avec succès', 'success');
        await refresh(); // Actualiser la liste
        setShowDeleteModal(false);
        setApartmentToDelete(null);
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

  const ApartmentCard = ({ apartment }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 group flex flex-col h-full">
      <div className="relative">
        <div 
          className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center cursor-pointer"
          onClick={() => navigate(`/apartments/${apartment.id}`)}
        >
          {apartment.photo_principale ? (
            <img
              src={`/gestion-locative/api/uploads/${apartment.photo_principale.split('/').pop()}`}
              alt={apartment.titre}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Si l'image ne se charge pas, afficher l'icône par défaut
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : (
            <Home size={48} className="text-gray-400" />
          )}
          <div className="hidden w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 items-center justify-center">
            <Home size={48} className="text-gray-400" />
          </div>
        </div>

        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apartment.statut)}`}>
          {getStatusLabel(apartment.statut)}
        </div>

        {/* Actions rapides */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/apartments/${apartment.id}/edit`);
            }}
            className="bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
            title="Modifier"
          >
            <Edit size={14} className="text-blue-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteApartment(apartment);
            }}
            className="bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 size={14} className="text-red-600" />
          </button>
        </div>
      </div>

      <div 
        className="p-6 cursor-pointer flex flex-col flex-grow"
        onClick={() => navigate(`/apartments/${apartment.id}`)}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {apartment.titre}
        </h3>
        
        <div className="flex items-center text-gray-600 text-sm mb-4">
          <MapPin size={14} className="mr-1 flex-shrink-0" />
          <span className="truncate">{apartment.adresse_complete}</span>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="text-2xl font-bold text-green-600">
            {formatPrice(apartment.prix_loyer)}
            <span className="text-sm text-gray-500 font-normal">/mois</span>
          </div>
          <div className="flex space-x-3 text-sm text-gray-500">
            {apartment.surface && <span>{apartment.surface}m²</span>}
            {apartment.nb_pieces && <span>{apartment.nb_pieces}P</span>}
            {apartment.nb_chambres && <span>{apartment.nb_chambres}Ch</span>}
          </div>
        </div>

        {apartment.locataire_actuel && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center text-green-800">
              <Users size={16} className="mr-2 flex-shrink-0" />
              <span className="font-medium">{apartment.locataire_actuel}</span>
            </div>
            {apartment.location_debut && (
              <div className="text-xs text-green-600 mt-1">
                Depuis le {formatDate(apartment.location_debut)}
              </div>
            )}
          </div>
        )}

        {apartment.statut === 'libre' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center text-blue-800">
              <Home size={16} className="mr-2" />
              <span className="font-medium">Disponible à la location</span>
            </div>
          </div>
        )}

        {apartment.statut === 'en_travaux' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center text-yellow-800">
              <span className="mr-2">🔧</span>
              <span className="font-medium">Travaux en cours</span>
            </div>
          </div>
        )}

        {/* Informations supplémentaires */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-500">
          <span>Créé le {formatDate(apartment.date_creation)}</span>
          {apartment.charges && (
            <span>Charges: {formatPrice(apartment.charges)}</span>
          )}
        </div>
      </div>
    </div>
  );

  const ApartmentListItem = ({ apartment }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center space-x-6">
        {/* Image */}
        <div 
          className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
          onClick={() => navigate(`/apartments/${apartment.id}`)}
        >
          {apartment.photo_principale ? (
            <img
              src={`/gestion-locative/api/uploads/${apartment.photo_principale.split('/').pop()}`}
              alt={apartment.titre}
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : (
            <Home size={24} className="text-gray-400" />
          )}
          <div className="hidden w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg items-center justify-center">
            <Home size={24} className="text-gray-400" />
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 cursor-pointer" onClick={() => navigate(`/apartments/${apartment.id}`)}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {apartment.titre}
            </h3>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apartment.statut)}`}>
              {getStatusLabel(apartment.statut)}
            </div>
          </div>
          
          <div className="flex items-center text-gray-600 mb-2">
            <MapPin size={14} className="mr-1 flex-shrink-0" />
            <span>{apartment.adresse_complete}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
            <div>
              <p className="font-medium text-gray-700">Caractéristiques</p>
              <div className="flex space-x-3">
                {apartment.surface && <span>{apartment.surface}m²</span>}
                {apartment.nb_pieces && <span>{apartment.nb_pieces} pièces</span>}
                {apartment.nb_chambres && <span>{apartment.nb_chambres} chambres</span>}
              </div>
            </div>
            
            <div>
              <p className="font-medium text-gray-700">Financier</p>
              <div>
                <span className="text-green-600 font-semibold">{formatPrice(apartment.prix_loyer)}/mois</span>
                {apartment.charges && (
                  <span className="text-gray-500 ml-2">+ {formatPrice(apartment.charges)} charges</span>
                )}
              </div>
            </div>
            
            <div>
              <p className="font-medium text-gray-700">Locataire</p>
              {apartment.locataire_actuel ? (
                <div>
                  <span className="text-green-600">{apartment.locataire_actuel}</span>
                  {apartment.location_debut && (
                    <div className="text-xs text-gray-500">
                      Depuis le {formatDate(apartment.location_debut)}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-500">Aucun</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => navigate(`/apartments/${apartment.id}/edit`)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteApartment(apartment)}
            className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSpinner message="Chargement des appartements..." />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Appartements</h1>
            <p className="text-gray-600 mt-2">
              Gérez votre portefeuille immobilier - {apartmentStats.total} bien{apartmentStats.total > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/apartments/new')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-lg"
          >
            <Plus size={20} />
            <span>Ajouter un appartement</span>
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Home className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{apartmentStats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Occupés</p>
                <p className="text-2xl font-bold text-gray-900">{apartmentStats.occupied}</p>
                <p className="text-xs text-gray-500">
                  {apartmentStats.total > 0 ? Math.round((apartmentStats.occupied / apartmentStats.total) * 100) : 0}% du total
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Home className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Libres</p>
                <p className="text-2xl font-bold text-gray-900">{apartmentStats.vacant}</p>
                {apartmentStats.underWork > 0 && (
                  <p className="text-xs text-yellow-600">+ {apartmentStats.underWork} en travaux</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Euro className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Revenus/mois</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(apartmentStats.monthlyRevenue)}
                </p>
                {apartmentStats.occupied > 0 && (
                  <p className="text-xs text-gray-500">
                    Moyenne: {formatPrice(apartmentStats.monthlyRevenue / apartmentStats.occupied)}/bien
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
                placeholder="Rechercher par titre, adresse, locataire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={filters.statut || 'all'}
              onChange={(e) => updateFilter('statut', e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">Tous les statuts</option>
              <option value="libre">Libre</option>
              <option value="occupé">Occupé</option>
              <option value="en_travaux">En travaux</option>
            </select>

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

            {(searchTerm || Object.values(filters).some(f => f && f !== 'all')) && (
              <button
                onClick={clearFilters}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Réinitialiser les filtres"
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
            {stats.filtered} appartement{stats.filtered !== 1 ? 's' : ''} affiché{stats.filtered !== 1 ? 's' : ''}
            {stats.filtered !== stats.total && ` sur ${stats.total}`}
          </p>
          
          {stats.hasFilters && (
            <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Filtres actifs
            </div>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="max-w-md mx-auto">
            <Home size={64} className="mx-auto text-gray-300 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {searchTerm || Object.values(filters).some(f => f && f !== 'all')
                ? 'Aucun appartement trouvé'
                : 'Aucun appartement enregistré'
              }
            </h3>
            <p className="text-gray-500 mb-8">
              {searchTerm || Object.values(filters).some(f => f && f !== 'all')
                ? 'Essayez de modifier vos critères de recherche ou vos filtres'
                : 'Commencez par ajouter votre premier appartement à votre portefeuille'
              }
            </p>
            <button
              onClick={() => navigate('/apartments/new')}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2 shadow-lg"
            >
              <Plus size={20} />
              <span>Ajouter un appartement</span>
            </button>
          </div>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            : "space-y-6"
        }>
          {filteredItems.map(apartment =>
            viewMode === 'grid' ? (
              <ApartmentCard key={apartment.id} apartment={apartment} />
            ) : (
              <ApartmentListItem key={apartment.id} apartment={apartment} />
            )
          )}
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && apartmentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Supprimer l'appartement</h3>
                  <p className="text-sm text-gray-500">Cette action est irréversible</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900">{apartmentToDelete.titre}</h4>
                <p className="text-sm text-gray-600">{apartmentToDelete.adresse_complete}</p>
                {apartmentToDelete.locataire_actuel && (
                  <p className="text-sm text-orange-600 mt-2">
                    ⚠️ Cet appartement a un locataire actuel : {apartmentToDelete.locataire_actuel}
                  </p>
                )}
              </div>
              
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer cet appartement ? Cette action supprimera également :
              </p>
              
              <ul className="text-sm text-gray-600 mb-6 pl-4 space-y-1">
                <li>• Toutes les photos et documents associés</li>
                <li>• L'historique des locations</li>
                <li>• Les données financières liées</li>
              </ul>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setApartmentToDelete(null);
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

export default ApartmentList;