// src/hooks/useSearch.js - Hook de recherche corrigé
import { useState, useMemo } from 'react';

export const useSearch = (items = [], searchFields = []) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});

  //console.log('useSearch: items received =', items?.length || 0);
  //console.log('useSearch: searchFields =', searchFields);

  const updateFilter = (filterKey, value) => {
    //console.log('useSearch: updating filter', filterKey, '=', value);
    setFilters(prev => ({
      ...prev,
      [filterKey]: value === 'all' ? null : value
    }));
  };

  const clearFilters = () => {
    //console.log('useSearch: clearing all filters');
    setSearchTerm('');
    setFilters({});
  };

  const filteredItems = useMemo(() => {
    if (!items || !Array.isArray(items)) {
      //console.log('useSearch: items is not an array, returning empty');
      return [];
    }

    let filtered = [...items];
    //console.log('useSearch: starting with', filtered.length, 'items');

    // Appliquer la recherche textuelle
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase().trim();
      
      filtered = filtered.filter(item => {
        // Rechercher dans les champs spécifiés
        const matchesFields = searchFields.some(field => {
          const fieldValue = item[field];
          return fieldValue && 
                 String(fieldValue).toLowerCase().includes(searchLower);
        });

        // Recherche étendue dans d'autres champs communs si pas de match
        if (!matchesFields) {
          const commonFields = ['nom', 'prenom', 'titre', 'adresse_complete', 'email'];
          return commonFields.some(field => {
            const fieldValue = item[field];
            return fieldValue && 
                   String(fieldValue).toLowerCase().includes(searchLower);
          });
        }

        return matchesFields;
      });

      //console.log('useSearch: after search filtering =', filtered.length, 'items');
    }

    // Appliquer les filtres
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter(item => {
          // Gestion spéciale pour certains filtres
          if (key === 'statut') {
            return item.statut === value;
          }
          
          // Filtres génériques
          return String(item[key]) === String(value);
        });
        
        //console.log('useSearch: after filter', key, '=', value, ':', filtered.length, 'items');
      }
    });

    return filtered;
  }, [items, searchTerm, filters, searchFields]);

  const stats = useMemo(() => {
    const total = items?.length || 0;
    const filtered = filteredItems.length;
    
    return {
      total,
      filtered,
      hasFilters: searchTerm !== '' || Object.values(filters).some(f => f && f !== 'all'),
      searchActive: searchTerm !== '',
      filtersActive: Object.values(filters).some(f => f && f !== 'all')
    };
  }, [items, filteredItems, searchTerm, filters]);

  //console.log('useSearch: final stats =', stats);

  return {
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter,
    clearFilters,
    filteredItems,
    stats
  };
};