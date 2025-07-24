import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../utils/api';

export default function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Connexion en cours...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      setError("Aucun code d'autorisation trouvé dans l'URL.");
      setMessage(null);
      return;
    }

    const exchangeCode = async () => {
      try {
        const response = await authApi.exchangeOAuthCode(code);

        if (response.success && response.token) {
          localStorage.setItem('token', response.token);
          setMessage('Connexion réussie ! Redirection en cours...');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          throw new Error(response.message || 'Échec de la connexion');
        }
      } catch (err) {
        setError(err.message);
        setMessage(null);
      }
    };

    exchangeCode();
  }, [searchParams, navigate]);

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      {message && <p>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
