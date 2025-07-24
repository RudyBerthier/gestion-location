import { useState, useEffect } from 'react';
import { apartmentApi } from '../utils/api';

export const useApartments = () => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadApartments = async () => {
    setLoading(true);
    try {
      const data = await apartmentApi.getAll();
      setApartments(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createApartment = async (apartmentData) => {
    try {
      const result = await apartmentApi.create(apartmentData);
      if (result.success) {
        await loadApartments();
        return { success: true, id: result.id };
      }
      throw new Error(result.message);
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateApartment = async (id, apartmentData) => {
    try {
      const result = await apartmentApi.update(id, apartmentData);
      if (result.success) {
        await loadApartments();
        return { success: true };
      }
      throw new Error(result.message);
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteApartment = async (id) => {
    try {
      const result = await apartmentApi.delete(id);
      if (result.success) {
        setApartments(prev => prev.filter(apt => apt.id !== id));
        return { success: true };
      }
      throw new Error(result.message);
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    loadApartments();
  }, []);

  return {
    apartments,
    loading,
    error,
    createApartment,
    updateApartment,
    deleteApartment,
    refreshApartments: loadApartments
  };
};