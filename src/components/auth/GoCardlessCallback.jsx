// src/components/auth/GoCardlessCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { goCardlessApi } from '../../utils/api';

const GoCardlessCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addNotification } = useNotifications();
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [message, setMessage] = useState('Traitement de la connexion bancaire...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const ref = searchParams.get('ref');
        const error = searchParams.get('error');
        
        if (error) {
          setStatus('error');
          setMessage('Erreur lors de la connexion bancaire: ' + error);
          addNotification('Erreur lors de la connexion bancaire', 'error');
          return;
        }

        if (!ref) {
          setStatus('error');
          setMessage('Référence manquante dans la réponse');
          addNotification('Données de connexion invalides', 'error');
          return;
        }

        // Attendre un peu pour que le backend traite la connexion
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Vérifier que la connexion a bien été établie
        const accounts = await goCardlessApi.getAccounts();
        
        if (accounts && accounts.accounts && accounts.accounts.length > 0) {
          setStatus('success');
          setMessage(`Connexion réussie ! ${accounts.accounts.length} compte(s) détecté(s).`);
          addNotification('Banque connectée avec succès', 'success');
        } else {
          setStatus('error');
          setMessage('Aucun compte trouvé après la connexion');
          addNotification('Aucun compte bancaire détecté', 'warning');
        }

      } catch (error) {
        console.error('Erreur traitement callback:', error);
        setStatus('error');
        setMessage('Erreur lors de la vérification de la connexion');
        addNotification('Erreur lors de la vérification', 'error');
      }
    };

    processCallback();
  }, [searchParams, addNotification]);

  const handleRedirect = () => {
    // Rediriger vers les paramètres avec l'onglet banking ouvert
    navigate('/settings?tab=banking');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <RefreshCw size={48} className="mx-auto text-blue-500 animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connexion en cours
              </h2>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connexion réussie !
              </h2>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <button
                onClick={handleRedirect}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Accéder à mes paramètres
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={48} className="mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Erreur de connexion
              </h2>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleRedirect}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Réessayer
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Retour à l'accueil
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoCardlessCallback;