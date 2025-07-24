// src/components/Layout.jsx - Version mise à jour avec dashboard et nouvelles fonctionnalités
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Users, FileText, Settings, LogOut, User, ChevronDown, 
  BarChart3, Palette, Bell, FileCheck, Moon, Sun 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ThemeSelector, DarkModeToggle, useThemeClasses } from '../contexts/ThemeContext';
import NotificationSystem from './notifications/NotificationSystem';

import logo from '../assets/images/logo.png';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currentTheme } = useTheme();
  const themeClasses = useThemeClasses();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Appartements', href: '/apartments', icon: Home },
    { name: 'Locataires', href: '/tenants', icon: Users },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Paramètres', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} transition-colors duration-200`}>
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 ${themeClasses.bgSurface} shadow-lg border-r ${themeClasses.border} transition-colors duration-200`}>
        <div className="flex flex-col h-full">
          {/* Logo avec image PNG */}
          <div className="flex items-center justify-center h-16 bg-gradient-to-r from-blue-600 to-purple-600 px-4">
            <div className="flex items-center space-x-3">
              <img 
                src={logo}
                alt="Logo" 
                className="h-10 w-auto object-contain"
              />
              <h1 className="text-l font-bold text-white">
                Gestion Locative
              </h1>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? `bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 shadow-sm`
                      : `${themeClasses.text} hover:${themeClasses.hover} hover:${themeClasses.text}`
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Controls section */}
          <div className={`p-4 border-t ${themeClasses.border} space-y-3`}>
            {/* Theme and notifications controls */}
            <div className="flex items-center justify-between">
              <DarkModeToggle />
              
              <button
                onClick={() => setShowThemeSelector(true)}
                className={`p-2 ${themeClasses.textSecondary} hover:${themeClasses.text} hover:${themeClasses.hover} rounded-lg transition-colors`}
                title="Changer le thème"
              >
                <Palette size={20} />
              </button>
              
              <NotificationSystem />
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center w-full px-4 py-3 text-sm font-medium ${themeClasses.text} hover:${themeClasses.hover} rounded-lg transition-colors`}
              >
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                  <User size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{user?.prenom} {user?.nom}</p>
                  <p className={`text-xs ${themeClasses.textMuted}`}>{user?.email}</p>
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showUserMenu && (
                <div className={`absolute bottom-full left-0 right-0 mb-2 ${themeClasses.bgSurface} border ${themeClasses.border} rounded-lg shadow-lg py-2 z-50`}>
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className={`flex items-center px-4 py-2 text-sm ${themeClasses.text} hover:${themeClasses.hover} transition-colors`}
                  >
                    <Settings size={16} className="mr-3" />
                    Paramètres
                  </Link>
                  
                  <button
                    onClick={() => setShowThemeSelector(true)}
                    className={`flex items-center w-full px-4 py-2 text-sm ${themeClasses.text} hover:${themeClasses.hover} transition-colors`}
                  >
                    <Palette size={16} className="mr-3" />
                    Personnaliser
                  </button>
                  
                  <hr className={`my-2 border-t ${themeClasses.border}`} />
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
                  >
                    <LogOut size={16} className="mr-3" />
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>

            {/* Version info */}
            <p className={`text-xs ${themeClasses.textMuted} text-center mt-4`}>
              Version 2.1 - React Edition
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>

      {/* Theme selector modal */}
      {showThemeSelector && (
        <ThemeSelector onClose={() => setShowThemeSelector(false)} />
      )}
    </div>
  );
};

export default Layout;