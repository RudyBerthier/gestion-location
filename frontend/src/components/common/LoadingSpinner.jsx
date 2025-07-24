// src/components/common/LoadingSpinner.jsx - Spinner amélioré
import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ 
  message = "Chargement...", 
  size = "large",
  className = "",
  showMessage = true,
  centered = true 
}) => {
  //console.log('LoadingSpinner: message =', message);
  
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8", 
    large: "w-12 h-12",
    xlarge: "w-16 h-16"
  };

  const containerClasses = centered 
    ? "flex flex-col items-center justify-center min-h-[200px] p-8"
    : "flex flex-col items-center p-4";

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="relative">
        <Loader2 
          className={`${sizeClasses[size]} text-blue-600 animate-spin`}
        />
        
        {/* Animation d'arrière-plan pour plus d'effet visuel */}
        <div className={`${sizeClasses[size]} absolute inset-0 border-2 border-blue-100 rounded-full animate-pulse`} />
      </div>
      
      {showMessage && message && (
        <div className="mt-4 text-center">
          <p className="text-gray-600 font-medium">{message}</p>
          
          {/* Points d'animation */}
          <div className="flex justify-center mt-2 space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" 
                 style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" 
                 style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" 
                 style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );
};

// Composant pour les états de chargement inline
export const InlineSpinner = ({ message, className = "" }) => (
  <LoadingSpinner 
    message={message}
    size="small"
    centered={false}
    className={`inline-flex items-center space-x-2 ${className}`}
  />
);

// Composant pour les overlays de chargement
export const LoadingOverlay = ({ message = "Chargement...", show = true }) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 shadow-2xl">
        <LoadingSpinner 
          message={message}
          size="large"
          centered={true}
        />
      </div>
    </div>
  );
};

// Composant pour les boutons en état de chargement
export const LoadingButton = ({ 
  children, 
  loading = false, 
  loadingText = "Chargement...",
  className = "",
  ...props 
}) => (
  <button 
    {...props}
    disabled={loading || props.disabled}
    className={`flex items-center justify-center space-x-2 ${className} ${
      loading ? 'cursor-not-allowed opacity-75' : ''
    }`}
  >
    {loading ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{loadingText}</span>
      </>
    ) : (
      children
    )}
  </button>
);

export default LoadingSpinner;