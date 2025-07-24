// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// Thèmes disponibles
const themes = {
  light: {
    name: 'Clair',
    colors: {
      primary: '#2563eb',
      secondary: '#7c3aed',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb'
    },
    gradient: 'from-blue-600 to-purple-600'
  },
  dark: {
    name: 'Sombre',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb',
      textSecondary: '#d1d5db',
      border: '#374151'
    },
    gradient: 'from-blue-500 to-purple-500'
  },
  blue: {
    name: 'Bleu professionnel',
    colors: {
      primary: '#1e40af',
      secondary: '#3730a3',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      background: '#ffffff',
      surface: '#eff6ff',
      text: '#1e3a8a',
      textSecondary: '#64748b',
      border: '#dbeafe'
    },
    gradient: 'from-blue-700 to-indigo-700'
  },
  green: {
    name: 'Vert nature',
    colors: {
      primary: '#059669',
      secondary: '#0d9488',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#ffffff',
      surface: '#f0fdf4',
      text: '#064e3b',
      textSecondary: '#6b7280',
      border: '#bbf7d0'
    },
    gradient: 'from-green-600 to-teal-600'
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [customColors, setCustomColors] = useState({});

  // Charger le thème sauvegardé au démarrage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedCustomColors = localStorage.getItem('customColors');
    
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
    
    if (savedCustomColors) {
      try {
        setCustomColors(JSON.parse(savedCustomColors));
      } catch (error) {
        console.error('Erreur parsing custom colors:', error);
      }
    }

    // Détecter préférence système pour le mode sombre
    if (!savedTheme) {
      // const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      // if (prefersDark) {
      //   setCurrentTheme('dark');
      // }
      setCurrentTheme('light'); // Par défaut, on utilise le thème clair
    }
  }, []);

  // Appliquer le thème au DOM
  useEffect(() => {
    const theme = themes[currentTheme];
    const colors = { ...theme.colors, ...customColors };
    
    // Appliquer les variables CSS
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--color-${key}`, value);
    });

    // Classe pour le mode sombre
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Sauvegarder les préférences
    localStorage.setItem('theme', currentTheme);
    localStorage.setItem('customColors', JSON.stringify(customColors));
  }, [currentTheme, customColors]);

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  const updateCustomColor = (colorName, colorValue) => {
    setCustomColors(prev => ({
      ...prev,
      [colorName]: colorValue
    }));
  };

  const resetCustomColors = () => {
    setCustomColors({});
  };

  const toggleDarkMode = () => {
    setCurrentTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const value = {
    currentTheme,
    theme: themes[currentTheme],
    themes,
    customColors,
    changeTheme,
    updateCustomColor,
    resetCustomColors,
    toggleDarkMode,
    isDark: currentTheme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook pour les classes CSS dynamiques
export const useThemeClasses = () => {
  const { theme, isDark } = useTheme();
  
  return {
    // Backgrounds
    bg: isDark ? 'bg-gray-900' : 'bg-gray-50',
    bgSurface: isDark ? 'bg-gray-800' : 'bg-white',
    bgCard: isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    
    // Text
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-300' : 'text-gray-600',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
    
    // Borders
    border: isDark ? 'border-gray-700' : 'border-gray-200',
    borderLight: isDark ? 'border-gray-600' : 'border-gray-100',
    
    // Hover states
    hover: isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
    hoverCard: isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
    
    // Focus states
    focus: 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    
    // Buttons
    btnPrimary: `bg-gradient-to-r ${theme.gradient} text-white hover:opacity-90`,
    btnSecondary: isDark 
      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600' 
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300',
    btnSuccess: 'bg-green-600 text-white hover:bg-green-700',
    btnWarning: 'bg-yellow-600 text-white hover:bg-yellow-700',
    btnDanger: 'bg-red-600 text-white hover:bg-red-700',
    
    // Status colors
    success: 'text-green-600 bg-green-100',
    warning: 'text-yellow-600 bg-yellow-100',
    error: 'text-red-600 bg-red-100',
    info: 'text-blue-600 bg-blue-100',
    
    // Dark mode status colors
    successDark: isDark ? 'text-green-400 bg-green-900' : 'text-green-600 bg-green-100',
    warningDark: isDark ? 'text-yellow-400 bg-yellow-900' : 'text-yellow-600 bg-yellow-100',
    errorDark: isDark ? 'text-red-400 bg-red-900' : 'text-red-600 bg-red-100',
    infoDark: isDark ? 'text-blue-400 bg-blue-900' : 'text-blue-600 bg-blue-100',
  };
};

// Composant de sélecteur de thème
export const ThemeSelector = ({ onClose }) => {
  const { currentTheme, themes, changeTheme, customColors, updateCustomColor, resetCustomColors, toggleDarkMode } = useTheme();
  const [showCustomizer, setShowCustomizer] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Thèmes</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basculer mode sombre rapidement */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Mode sombre</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Basculer rapidement</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                currentTheme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  currentTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Sélection de thèmes */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Thèmes prédéfinis</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(themes).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => changeTheme(key)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    currentTheme === key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`w-full h-8 rounded mb-2 bg-gradient-to-r ${theme.gradient}`}></div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{theme.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Personnalisation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Personnalisation</h3>
              <button
                onClick={() => setShowCustomizer(!showCustomizer)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                {showCustomizer ? 'Masquer' : 'Personnaliser'}
              </button>
            </div>

            {showCustomizer && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                {['primary', 'secondary', 'success', 'warning', 'error'].map(color => (
                  <div key={color} className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {color}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={customColors[color] || themes[currentTheme].colors[color]}
                        onChange={(e) => updateCustomColor(color, e.target.value)}
                        className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={customColors[color] || themes[currentTheme].colors[color]}
                        onChange={(e) => updateCustomColor(color, e.target.value)}
                        className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={resetCustomColors}
                  className="w-full mt-4 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                >
                  Réinitialiser les couleurs
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};

// Bouton de basculement rapide du mode sombre
export const DarkModeToggle = () => {
  const { toggleDarkMode, isDark } = useTheme();

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      title={isDark ? 'Mode clair' : 'Mode sombre'}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};