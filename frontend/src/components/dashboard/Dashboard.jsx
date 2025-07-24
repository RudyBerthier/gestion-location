// src/components/dashboard/Dashboard.jsx - Version corrigée pour éviter le freeze
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, Users, Euro, TrendingUp, TrendingDown, AlertTriangle, 
  Calendar, FileText, Plus, ArrowRight, DollarSign, Percent,
  MapPin, Clock, Star, Target, RefreshCw, ChevronDown, CalendarIcon
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';

const Dashboard = () => {
  const navigate = useNavigate();
  const { apartments, tenants, loading: appLoading, refresh } = useApp();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // États locaux pour les données dashboard
  const [stats, setStats] = useState({
    totalApartments: 0,
    occupiedApartments: 0,
    vacantApartments: 0,
    underWorkApartments: 0,
    totalMonthlyRevenue: 0,
    averageRent: 0,
    occupancyRate: 0,
    totalTenants: 0,
    activeTenants: 0,
    annualRevenue: 0
  });
  
  const [revenueData, setRevenueData] = useState([]);
  const [occupancyData, setOccupancyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);

  // États pour le contrôle du graphique de revenus
  const [selectedPeriod, setSelectedPeriod] = useState('12months');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomPeriod, setShowCustomPeriod] = useState(false);
  const [isGeneratingChart, setIsGeneratingChart] = useState(false);

  // Options de période prédéfinies - utilisé useMemo pour éviter les re-créations
  const periodOptions = useMemo(() => [
    { value: '6months', label: '6 derniers mois', months: 6, offset: -6 },
    { value: '12months', label: '12 derniers mois', months: 12, offset: -12 },
    { value: '18months', label: '18 derniers mois', months: 18, offset: -18 },
    { value: '24months', label: '2 dernières années', months: 24, offset: -24 },
    { value: 'current_year', label: 'Année en cours', months: 'current_year' },
    { value: 'last_year', label: 'Année dernière', months: 'last_year' },
    { value: 'future_12', label: '12 prochains mois (prév.)', months: 12, offset: 0 },
    { value: 'custom', label: 'Période personnalisée', months: 'custom' }
  ], []);

  // Couleurs pour le graphique en secteurs
  const CHART_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Fonction utilitaire pour les requêtes API sécurisées
  const apiRequest = async (endpoint, options = {}) => {
    try {
      const token = localStorage.getItem('token');
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers
        },
        ...options
      };

      const response = await fetch(`/gestion-locative/api${endpoint}`, config);
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Session expirée');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { ...data, status: response.status };
    } catch (error) {
      console.error('❌ Erreur API:', error);
      throw error;
    }
  };

  // Génération des données de revenus avec useCallback pour éviter les re-créations
  const generateRevenueData = useCallback((period, customStart = null, customEnd = null, currentRevenue = 220) => {
    // Validation des entrées pour éviter les calculs inutiles
    if (!period || currentRevenue <= 0) return [];
    
    const data = [];
    let startMonth, endMonth, monthsToGenerate;
    const today = new Date();
    
    try {
      if (period === 'custom' && customStart && customEnd) {
        startMonth = new Date(customStart + '-01'); // Ajouter le jour
        endMonth = new Date(customEnd + '-01');
        
        // Validation des dates
        if (startMonth > endMonth) {
          console.warn('Date de début postérieure à la date de fin');
          return [];
        }
        
        monthsToGenerate = Math.abs(endMonth.getFullYear() - startMonth.getFullYear()) * 12 + 
                          Math.abs(endMonth.getMonth() - startMonth.getMonth()) + 1;
        
        // Limite de sécurité pour éviter trop de données
        if (monthsToGenerate > 60) {
          console.warn('Période trop importante, limitation à 60 mois');
          monthsToGenerate = 60;
        }
      } else {
        const selectedOption = periodOptions.find(opt => opt.value === period);
        if (!selectedOption) return [];
        
        if (selectedOption.months === 'current_year') {
          startMonth = new Date(today.getFullYear(), 0, 1);
          endMonth = new Date(today.getFullYear(), 11, 31);
          monthsToGenerate = 12;
        } else if (selectedOption.months === 'last_year') {
          startMonth = new Date(today.getFullYear() - 1, 0, 1);
          endMonth = new Date(today.getFullYear() - 1, 11, 31);
          monthsToGenerate = 12;
        } else {
          monthsToGenerate = selectedOption.months;
          startMonth = new Date(today.getFullYear(), today.getMonth() + selectedOption.offset, 1);
          endMonth = new Date(today.getFullYear(), today.getMonth() + selectedOption.offset + monthsToGenerate - 1, 31);
        }
      }
      
      for (let i = 0; i < monthsToGenerate; i++) {
        const currentDate = new Date(startMonth);
        currentDate.setMonth(startMonth.getMonth() + i);
        
        const monthName = currentDate.toLocaleDateString('fr-FR', { 
          month: 'short', 
          year: 'numeric' 
        });
        
        // Déterminer si c'est du passé, présent ou futur
        const isPast = currentDate < new Date(today.getFullYear(), today.getMonth(), 1);
        const isFuture = currentDate > new Date(today.getFullYear(), today.getMonth(), 31);
        const isCurrent = !isPast && !isFuture;
        
        let revenue;
        if (isPast) {
          // Données historiques avec variations réalistes
          const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
          revenue = Math.round(currentRevenue * (1 + variation));
        } else if (isCurrent) {
          // Mois actuel - valeur réelle
          revenue = Math.round(currentRevenue);
        } else {
          // Prévisions futures avec croissance légère
          const monthsInFuture = Math.abs(currentDate.getMonth() - today.getMonth()) + 
                                (currentDate.getFullYear() - today.getFullYear()) * 12;
          const growthRate = 0.02; // 2% de croissance par mois
          const futureVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
          revenue = Math.round(currentRevenue * (1 + growthRate * monthsInFuture + futureVariation));
        }
        
        data.push({
          month: monthName,
          revenue: revenue,
          target: Math.round(currentRevenue),
          isPast,
          isCurrent,
          isFuture,
          type: isPast ? 'historique' : isCurrent ? 'actuel' : 'prévision'
        });
      }
      
      return data;
    } catch (error) {
      console.error('Erreur génération données revenus:', error);
      return [];
    }
  }, [periodOptions]);

  // Chargement des données depuis l'API
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Mise à jour des données de revenus avec debounce pour éviter les calculs excessifs
  useEffect(() => {
    if (stats.totalMonthlyRevenue > 0) {
      setIsGeneratingChart(true);
      
      // Utiliser setTimeout pour éviter le blocage de l'UI
      const timer = setTimeout(() => {
        try {
          const newRevenueData = generateRevenueData(selectedPeriod, startDate, endDate, stats.totalMonthlyRevenue);
          setRevenueData(newRevenueData);
        } catch (error) {
          console.error('Erreur génération graphique:', error);
          addNotification('Erreur lors de la génération du graphique', 'error');
        } finally {
          setIsGeneratingChart(false);
        }
      }, 100); // Délai court pour permettre le re-render
      
      return () => clearTimeout(timer);
    }
  }, [selectedPeriod, startDate, endDate, stats.totalMonthlyRevenue, generateRevenueData, addNotification]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      //console.log('🔄 Chargement des données dashboard...');
      
      // Charger les statistiques
      const statsResponse = await apiRequest('/dashboard/stats').catch(err => {
        console.error('Erreur stats:', err);
        return { success: false, data: {} };
      });

      //console.log('📊 Réponse statistiques:', statsResponse);

      if (statsResponse.success && statsResponse.data) {
        const newStats = {
          totalApartments: Number(statsResponse.data.total_apartments) || 0,
          occupiedApartments: Number(statsResponse.data.occupied_apartments) || 0,
          vacantApartments: Number(statsResponse.data.vacant_apartments) || 0,
          underWorkApartments: Number(statsResponse.data.under_work_apartments) || 0,
          totalMonthlyRevenue: Number(statsResponse.data.monthly_revenue) || 0,
          averageRent: Number(statsResponse.data.average_rent) || 0,
          occupancyRate: Number(statsResponse.data.occupancy_rate) || 0,
          totalTenants: Number(statsResponse.data.total_tenants) || 0,
          activeTenants: Number(statsResponse.data.active_tenants) || 0,
          annualRevenue: Number(statsResponse.data.annual_revenue) || 0
        };

        //console.log('✅ Statistiques traitées:', newStats);
        setStats(newStats);

        // Générer les données d'occupation pour le graphique
        const occupancyChartData = [];
        if (newStats.occupiedApartments > 0) {
          occupancyChartData.push({ 
            name: 'Occupés', 
            value: newStats.occupiedApartments, 
            color: '#10B981' 
          });
        }
        if (newStats.vacantApartments > 0) {
          occupancyChartData.push({ 
            name: 'Libres', 
            value: newStats.vacantApartments, 
            color: '#F59E0B' 
          });
        }
        if (newStats.underWorkApartments > 0) {
          occupancyChartData.push({ 
            name: 'En travaux', 
            value: newStats.underWorkApartments, 
            color: '#EF4444' 
          });
        }
        
        setOccupancyData(occupancyChartData.sort((a, b) => b.value - a.value));
        //console.log('📊 Données graphique occupation:', occupancyChartData);
      } else {
        console.error('❌ Erreur chargement statistiques:', statsResponse.message);
        addNotification('Erreur lors du chargement des statistiques', 'error');
      }

      setLastSync(new Date());

    } catch (error) {
      console.error('❌ Erreur générale chargement dashboard:', error);
      addNotification('Erreur lors du chargement du dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour synchroniser manuellement
  const handleManualSync = async () => {
    try {
      addNotification('Synchronisation en cours...', 'info');
      
      await Promise.all([
        loadDashboardData(),
        refresh()
      ]);
      
      addNotification('Synchronisation terminée avec succès', 'success');
    } catch (error) {
      console.error('Erreur synchronisation manuelle:', error);
      addNotification('Erreur lors de la synchronisation', 'error');
    }
  };

  // Gestion du changement de période avec optimisation
  const handlePeriodChange = useCallback((period) => {
    setSelectedPeriod(period);
    if (period === 'custom') {
      setShowCustomPeriod(true);
      // Initialiser avec les 12 derniers mois par défaut
      const today = new Date();
      const startDefault = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      const endDefault = new Date(today.getFullYear(), today.getMonth(), 31);
      setStartDate(startDefault.toISOString().substring(0, 7)); // Format YYYY-MM
      setEndDate(endDefault.toISOString().substring(0, 7));
    } else {
      setShowCustomPeriod(false);
      setStartDate('');
      setEndDate('');
    }
  }, []);

  // Gestionnaires optimisés pour les changements de dates
  const handleStartDateChange = useCallback((e) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    
    // Validation et ajustement automatique de la date de fin si nécessaire
    if (endDate && newStartDate > endDate) {
      setEndDate(newStartDate);
    }
  }, [endDate]);

  const handleEndDateChange = useCallback((e) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    
    // Validation et ajustement automatique de la date de début si nécessaire
    if (startDate && newEndDate < startDate) {
      setStartDate(newEndDate);
    }
  }, [startDate]);

  // Tooltip personnalisé pour le graphique
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name === 'revenue' ? 'Revenus' : 'Objectif'}: {entry.value}€
            </p>
          ))}
          <p className="text-xs text-gray-500 mt-1 capitalize">
            📊 {data.type}
          </p>
        </div>
      );
    }
    return null;
  };

  // Fonction utilitaire pour formater les nombres
  const safeNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  // Composant de carte statistique
  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = "blue", onClick }) => (
    <div 
      className={`bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && trendValue && (
            <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
              {trend === 'up' ? <TrendingUp size={16} className="mr-1" /> : 
               trend === 'down' ? <TrendingDown size={16} className="mr-1" /> : null}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  // Composant d'action rapide
  const QuickAction = ({ title, description, icon: Icon, color, onClick }) => (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 text-left group cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 bg-${color}-100 rounded-lg group-hover:bg-${color}-200 transition-colors`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
    </button>
  );

  if (loading || appLoading) {
    return <LoadingSpinner message="Chargement du tableau de bord..." />;
  }

  return (
    <div className="p-6">
      {/* En-tête avec salutation */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Bonjour {user?.prenom || 'Utilisateur'} ! 👋
            </h1>
            <p className="text-gray-600 mt-2">
              Voici un aperçu de votre portefeuille immobilier aujourd'hui
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {stats.totalApartments} bien{stats.totalApartments > 1 ? 's' : ''} géré{stats.totalApartments > 1 ? 's' : ''}
              </p>
              {lastSync && (
                <p className="text-xs text-gray-400 mt-1">
                  Dernière maj: {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <button
              onClick={handleManualSync}
              className="bg-blue-100 text-blue-600 p-3 rounded-lg hover:bg-blue-200 transition-colors"
              title="Synchroniser les données"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Revenus mensuels"
          value={`${safeNumber(stats.totalMonthlyRevenue).toLocaleString()}€`}
          icon={Euro}
          trend="up"
          trendValue="+12% ce mois"
          color="green"
          onClick={() => navigate('/apartments')}
        />
        <StatCard
          title="Taux d'occupation"
          value={`${safeNumber(stats.occupancyRate, 0).toFixed(1)}%`}
          icon={Percent}
          trend={stats.occupancyRate >= 90 ? "up" : stats.occupancyRate >= 70 ? "neutral" : "down"}
          trendValue={`${stats.occupiedApartments}/${stats.totalApartments} occupés`}
          color="blue"
          onClick={() => navigate('/apartments')}
        />
        <StatCard
          title="Appartements"
          value={stats.totalApartments}
          icon={Home}
          trend="neutral"
          trendValue={`${stats.vacantApartments} libre${stats.vacantApartments > 1 ? 's' : ''}`}
          color="purple"
          onClick={() => navigate('/apartments')}
        />
        <StatCard
          title="Locataires actifs"
          value={stats.activeTenants}
          icon={Users}
          trend="up"
          trendValue={`${stats.totalTenants} au total`}
          color="orange"
          onClick={() => navigate('/tenants')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Graphique des revenus amélioré */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Évolution des revenus</h2>
              <p className="text-gray-500 text-sm mt-1">
                Analyse sur {periodOptions.find(p => p.value === selectedPeriod)?.label.toLowerCase()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                {safeNumber(stats.annualRevenue).toLocaleString()}€
              </p>
              <p className="text-sm text-gray-500">Projection annuelle</p>
            </div>
          </div>
          
          {/* Contrôles de période */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {periodOptions.slice(0, 7).map(option => (
                <button
                  key={option.value}
                  onClick={() => handlePeriodChange(option.value)}
                  disabled={isGeneratingChart}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedPeriod === option.value
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <button
                onClick={() => handlePeriodChange('custom')}
                disabled={isGeneratingChart}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedPeriod === 'custom'
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <CalendarIcon size={14} />
                <span>Personnalisée</span>
              </button>
            </div>
            
            {/* Sélecteur de période personnalisée */}
            {showCustomPeriod && (
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
                  <input
                    type="month"
                    value={startDate}
                    onChange={handleStartDateChange}
                    disabled={isGeneratingChart}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
                  <input
                    type="month"
                    value={endDate}
                    onChange={handleEndDateChange}
                    disabled={isGeneratingChart}
                    min={startDate}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                {isGeneratingChart && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="text-sm">Mise à jour...</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {revenueData.length > 0 && !isGeneratingChart ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke="#d1d5db" 
                    strokeDasharray="5 5"
                    name="target"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={(props) => {
                      const { payload } = props;
                      if (payload.isCurrent) {
                        return <circle {...props} fill="#1D4ED8" r={7} stroke="#ffffff" strokeWidth={3} />;
                      } else if (payload.isFuture) {
                        return <circle {...props} fill="#F59E0B" r={4} stroke="#ffffff" strokeWidth={2} opacity={0.9} />;
                      }
                      return <circle {...props} fill="#10B981" r={4} stroke="#ffffff" strokeWidth={2} />;
                    }}
                    name="revenue"
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                {isGeneratingChart ? (
                  <>
                    <RefreshCw size={48} className="mx-auto mb-4 opacity-50 animate-spin" />
                    <p>Génération du graphique en cours...</p>
                  </>
                ) : (
                  <>
                    <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Génération des données en cours...</p>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Légende */}
          <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Données historiques</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
              <span className="text-gray-600">Mois actuel</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-gray-600">Prévisions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-1 bg-gray-300"></div>
              <span className="text-gray-600">Objectif</span>
            </div>
          </div>
        </div>

        {/* Répartition des appartements */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Répartition des biens</h2>
          
          {stats.totalApartments === 0 ? (
            <div className="h-64 mb-6 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Home className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">Aucun bien enregistré</p>
                <p className="text-sm mt-1">Commencez par ajouter votre premier appartement</p>
              </div>
            </div>
          ) : (
            <>
              {occupancyData.length > 0 ? (
                <div className="h-64 mb-6 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={occupancyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {occupancyData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke={occupancyData.length > 1 ? "#fff" : "none"}
                            strokeWidth={occupancyData.length > 1 ? 5 : 0}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => {
                          const total = occupancyData.reduce((sum, d) => sum + d.value, 0);
                          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                          return [`${percentage}% (${value} bien${value > 1 ? 's' : ''})`, name];
                        }}
                        labelStyle={{ display: 'none' }}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">{stats.totalApartments}</div>
                      <div className="text-sm text-gray-500 font-medium">biens</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 mb-6 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-3xl font-bold text-gray-900 mb-2">{stats.totalApartments}</div>
                    <div className="text-sm text-gray-500 font-medium">biens</div>
                  </div>
                </div>
              )}
              
              {/* Légende */}
              <div className="space-y-3">
                {occupancyData.map((item, index) => {
                  const total = occupancyData.reduce((sum, d) => sum + d.value, 0);
                  const percentage = total > 0 ? (item.value / total) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {item.value} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <QuickAction
          title="Ajouter un appartement"
          description="Créer une nouvelle fiche bien"
          icon={Home}
          color="blue"
          onClick={() => navigate('/apartments/new')}
        />
        <QuickAction
          title="Nouveau locataire"
          description="Enregistrer un nouveau locataire"
          icon={Users}
          color="green"
          onClick={() => navigate('/tenants/new')}
        />
        <QuickAction
          title="Gérer les documents"
          description="Organiser vos fichiers"
          icon={FileText}
          color="purple"
          onClick={() => navigate('/documents')}
        />
      </div>

      {/* Alertes et rappels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Alertes importantes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-900">Alertes importantes</h2>
          </div>
          <div className="space-y-4">
            {stats.vacantApartments > 0 && (
              <button
                onClick={() => navigate('/apartments')}
                className="w-full flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 hover:border-yellow-300 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <Home className="h-5 w-5 text-yellow-600" />
                  <div className="text-left">
                    <p className="font-medium text-yellow-800">
                      {stats.vacantApartments} appartement{stats.vacantApartments > 1 ? 's' : ''} vacant{stats.vacantApartments > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-yellow-600">À remettre en location</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-yellow-600 group-hover:text-yellow-800 transition-colors" />
              </button>
            )}
            
            {stats.underWorkApartments > 0 && (
              <button
                onClick={() => navigate('/apartments')}
                className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-red-600" />
                  <div className="text-left">
                    <p className="font-medium text-red-800">
                      {stats.underWorkApartments} bien{stats.underWorkApartments > 1 ? 's' : ''} en travaux
                    </p>
                    <p className="text-sm text-red-600">Suivi nécessaire</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-red-600 group-hover:text-red-800 transition-colors" />
              </button>
            )}
            
            {stats.vacantApartments === 0 && stats.underWorkApartments === 0 && (
              <div className="flex items-center justify-center p-8 text-gray-500">
                <div className="text-center">
                  <Star className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="font-medium">Tout va bien ! 🎉</p>
                  <p className="text-sm">Aucune alerte à signaler</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prochaines échéances */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Calendar className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">Prochaines échéances</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Euro className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Loyers du mois</p>
                  <p className="text-sm text-blue-600">Échéance dans 5 jours</p>
                </div>
              </div>
              <span className="text-blue-600 font-semibold">
                {safeNumber(stats.totalMonthlyRevenue).toLocaleString()}€
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-800">Quittances à générer</p>
                  <p className="text-sm text-gray-600">Pour ce mois-ci</p>
                </div>
              </div>
              <span className="text-gray-600 font-semibold">
                {stats.activeTenants}
              </span>
            </div>

            <div className="text-center pt-4">
              <button 
                onClick={() => navigate('/receipts')}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center mx-auto space-x-2"
              >
                <span>Voir le calendrier complet</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;