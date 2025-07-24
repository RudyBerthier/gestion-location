// src/components/admin/TwoFADashboard.jsx - Dashboard d'administration 2FA
import React, { useState, useEffect } from 'react';
import { Shield, Mail, Users, TrendingUp, AlertTriangle, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { authApi } from '../../utils/api';
import { useNotifications } from '../../contexts/NotificationContext';

const TwoFADashboard = () => {
  const { addNotification } = useNotifications();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalVerifications: 0,
    successfulVerifications: 0,
    expiredCodes: 0,
    uniqueUsers: 0,
    avgAttempts: 0,
    successRate: 0
  });

  useEffect(() => {
    loadTwoFAStats();
  }, []);

  const loadTwoFAStats = async () => {
    try {
      setLoading(true);
      const response = await authApi.get2FAStats();
      
      if (response.success) {
        setStats(response.data);
        
        // Calculer le résumé
        const summary = response.data.reduce((acc, day) => {
          acc.totalVerifications += day.total_verifications || 0;
          acc.successfulVerifications += day.successful_verifications || 0;
          acc.expiredCodes += day.expired_verifications || 0;
          acc.uniqueUsers += day.unique_users || 0;
          acc.avgAttempts += day.avg_attempts || 0;
          return acc;
        }, {
          totalVerifications: 0,
          successfulVerifications: 0,
          expiredCodes: 0,
          uniqueUsers: 0,
          avgAttempts: 0
        });

        // Moyennes et pourcentages
        summary.avgAttempts = summary.avgAttempts / response.data.length || 0;
        summary.successRate = summary.totalVerifications > 0 
          ? (summary.successfulVerifications / summary.totalVerifications) * 100 
          : 0;
        summary.uniqueUsers = Math.max(...response.data.map(d => d.unique_users || 0));

        setSummary(summary);
      }
    } catch (error) {
      console.error('Erreur chargement stats 2FA:', error);
      addNotification('Erreur lors du chargement des statistiques', 'error');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          <Icon size={24} className={color} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <TrendingUp size={16} className="text-green-500 mr-1" />
          <span className="text-green-500 text-sm font-medium">{trend}</span>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-3">
            <RefreshCw size={20} className="animate-spin text-blue-600" />
            <span className="text-gray-600">Chargement des statistiques 2FA...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Shield className="text-blue-600" />
            <span>Dashboard 2FA</span>
          </h1>
          <p className="text-gray-600 mt-2">Monitoring de la double authentification par email</p>
        </div>
        <button
          onClick={loadTwoFAStats}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <RefreshCw size={16} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Codes envoyés (30j)"
          value={summary.totalVerifications.toLocaleString()}
          icon={Mail}
          color="text-blue-600"
          subtitle="Demandes de vérification"
        />
        
        <StatCard
          title="Connexions réussies"
          value={summary.successfulVerifications.toLocaleString()}
          icon={CheckCircle}
          color="text-green-600"
          subtitle={`${summary.successRate.toFixed(1)}% de taux de réussite`}
        />
        
        <StatCard
          title="Codes expirés"
          value={summary.expiredCodes.toLocaleString()}
          icon={XCircle}
          color="text-red-600"
          subtitle="Non utilisés à temps"
        />
        
        <StatCard
          title="Utilisateurs actifs"
          value={summary.uniqueUsers.toLocaleString()}
          icon={Users}
          color="text-purple-600"
          subtitle="Avec 2FA activée"
        />
      </div>

      {/* Métriques détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Taux de réussite */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <TrendingUp size={20} className="text-green-600" />
            <span>Taux de réussite</span>
          </h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {summary.successRate.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${summary.successRate}%` }}
              ></div>
            </div>
            <p className="text-gray-500 text-sm mt-2">
              {summary.successfulVerifications} succès sur {summary.totalVerifications} tentatives
            </p>
          </div>
        </div>

        {/* Tentatives moyennes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Clock size={20} className="text-blue-600" />
            <span>Tentatives par code</span>
          </h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {summary.avgAttempts.toFixed(1)}
            </div>
            <p className="text-gray-500 text-sm">
              Moyenne de tentatives avant réussite
            </p>
            <div className="mt-4">
              {summary.avgAttempts <= 1.5 && (
                <div className="flex items-center justify-center text-green-600 text-sm">
                  <CheckCircle size={16} className="mr-1" />
                  Excellent
                </div>
              )}
              {summary.avgAttempts > 1.5 && summary.avgAttempts <= 2.5 && (
                <div className="flex items-center justify-center text-yellow-600 text-sm">
                  <Clock size={16} className="mr-1" />
                  Normal
                </div>
              )}
              {summary.avgAttempts > 2.5 && (
                <div className="flex items-center justify-center text-red-600 text-sm">
                  <AlertTriangle size={16} className="mr-1" />
                  À surveiller
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status système */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Shield size={20} className="text-purple-600" />
            <span>Status système</span>
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Service 2FA</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600 text-sm">Actif</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Envoi d'emails</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600 text-sm">Opérationnel</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Nettoyage auto</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600 text-sm">Actif</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique des activités journalières */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-6">Activité des 30 derniers jours</h3>
        
        {stats.length > 0 ? (
          <div className="space-y-4">
            {/* Légende */}
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Codes envoyés</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Vérifications réussies</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Codes expirés</span>
              </div>
            </div>

            {/* Graphique simplifié */}
            <div className="overflow-x-auto">
              <div className="flex items-end space-x-1 h-40 min-w-[600px]">
                {stats.slice(-14).map((day, index) => {
                  const maxValue = Math.max(...stats.map(d => d.total_verifications || 0));
                  const totalHeight = (day.total_verifications || 0) / maxValue * 120;
                  const successHeight = (day.successful_verifications || 0) / maxValue * 120;
                  const expiredHeight = (day.expired_verifications || 0) / maxValue * 120;

                  return (
                    <div key={index} className="flex flex-col items-center space-y-2 min-w-[40px]">
                      <div className="flex flex-col items-end space-y-0.5 h-32 justify-end">
                        <div 
                          className="w-6 bg-blue-500 rounded-t" 
                          style={{ height: `${totalHeight}px` }}
                          title={`${day.total_verifications || 0} codes envoyés`}
                        ></div>
                        <div 
                          className="w-6 bg-green-500" 
                          style={{ height: `${successHeight}px` }}
                          title={`${day.successful_verifications || 0} réussies`}
                        ></div>
                        <div 
                          className="w-6 bg-red-500 rounded-b" 
                          style={{ height: `${expiredHeight}px` }}
                          title={`${day.expired_verifications || 0} expirés`}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 transform rotate-45 origin-left">
                        {new Date(day.date).toLocaleDateString('fr-FR', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucune donnée d'activité disponible</p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-4 flex items-center space-x-2">
          <AlertTriangle size={20} />
          <span>Recommandations de sécurité</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <CheckCircle size={16} className="text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium">Surveillance continue</p>
              <p>Surveillez les pics d'activité inhabituels qui pourraient indiquer des tentatives d'attaque.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle size={16} className="text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium">Limitation des tentatives</p>
              <p>Le système limite automatiquement à 3 codes par heure par utilisateur.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle size={16} className="text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium">Expiration rapide</p>
              <p>Les codes expirent après 10 minutes pour limiter les risques de compromission.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle size={16} className="text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium">Nettoyage automatique</p>
              <p>Les codes expirés sont automatiquement supprimés de la base de données.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFADashboard;