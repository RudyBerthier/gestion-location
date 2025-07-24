import { useState, useEffect } from 'react';
import { tenantApi } from '../utils/api';

export const useTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await tenantApi.getAll();
      setTenants(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTenant = async (tenantData) => {
    try {
      const result = await tenantApi.create(tenantData);
      if (result.success) {
        await loadTenants();
        return { success: true, id: result.id };
      }
      throw new Error(result.message);
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateTenant = async (id, tenantData) => {
    try {
      const result = await tenantApi.update(id, tenantData);
      if (result.success) {
        await loadTenants();
        return { success: true };
      }
      throw new Error(result.message);
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteTenant = async (id) => {
    try {
      const result = await tenantApi.delete(id);
      if (result.success) {
        setTenants(prev => prev.filter(tenant => tenant.id !== id));
        return { success: true };
      }
      throw new Error(result.message);
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  return {
    tenants,
    loading,
    error,
    createTenant,
    updateTenant,
    deleteTenant,
    refreshTenants: loadTenants
  };
};