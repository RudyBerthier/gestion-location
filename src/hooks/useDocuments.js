import { useState, useEffect } from 'react';
import { documentApi, apartmentApi, tenantApi } from '../utils/api';

export const useDocuments = (apartmentId = null, tenantId = null) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      let docs = [];
      
      if (apartmentId) {
        docs = await apartmentApi.getDocuments(apartmentId);
      } else if (tenantId) {
        docs = await tenantApi.getDocuments(tenantId);
      } else {
        // Charger tous les documents
        const [apartments, tenants] = await Promise.all([
          apartmentApi.getAll(),
          tenantApi.getAll()
        ]);

        const allDocsPromises = [
          ...apartments.map(async apt => {
            const aptDocs = await apartmentApi.getDocuments(apt.id);
            return aptDocs.map(doc => ({
              ...doc,
              apartment_name: apt.titre,
              source_type: 'apartment'
            }));
          }),
          ...tenants.map(async tenant => {
            const tenantDocs = await tenantApi.getDocuments(tenant.id);
            return tenantDocs.map(doc => ({
              ...doc,
              tenant_name: `${tenant.prenom} ${tenant.nom}`,
              apartment_name: tenant.appartement_titre || 'N/A',
              source_type: 'tenant'
            }));
          })
        ];

        const allDocsArrays = await Promise.all(allDocsPromises);
        docs = allDocsArrays.flat();
      }
      
      setDocuments(docs);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (files, metadata = {}) => {
    try {
      const uploadData = {
        files,
        ...metadata
      };
      
      if (apartmentId) uploadData.appartement_id = apartmentId;
      if (tenantId) uploadData.locataire_id = tenantId;

      const result = await documentApi.upload(uploadData);
      
      if (result.success) {
        await loadDocuments();
        return { success: true };
      }
      throw new Error(result.message);
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteDocument = async (docId) => {
    try {
      const result = await documentApi.delete(docId);
      if (result.success) {
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
        return { success: true };
      }
      throw new Error(result.message);
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const bulkDeleteDocuments = async (docIds) => {
    try {
      const results = await Promise.all(
        docIds.map(id => documentApi.delete(id))
      );
      
      const hasErrors = results.some(res => !res.success);
      if (!hasErrors) {
        setDocuments(prev => prev.filter(doc => !docIds.includes(doc.id)));
        return { success: true };
      }
      throw new Error('Erreur lors de la suppression en lot');
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const guessDocumentType = (filename) => {
    const name = filename.toLowerCase();
    if (name.includes('cni') || name.includes('carte') || name.includes('identite')) return 'piece_identite';
    if (name.includes('salaire') || name.includes('bulletin') || name.includes('paie')) return 'bulletin_salaire';
    if (name.includes('justificatif') || name.includes('domicile')) return 'justificatif_domicile';
    if (name.includes('garant')) return 'document_garant';
    if (name.includes('bail')) return 'bail';
    if (name.includes('etat') || name.includes('lieux')) return 'etat_lieux';
    if (name.includes('facture')) return 'facture';
    return 'autre';
  };

  useEffect(() => {
    loadDocuments();
  }, [apartmentId, tenantId]);

  return {
    documents,
    loading,
    error,
    uploadDocument,
    deleteDocument,
    bulkDeleteDocuments,
    guessDocumentType,
    refreshDocuments: loadDocuments
  };
};