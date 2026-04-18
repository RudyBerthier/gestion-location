import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

function Toast({ message, type, onClose }) {
  const styles = {
    success: { border: 'border-emerald-500/30', icon: <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /> },
    error:   { border: 'border-red-500/30',     icon: <XCircle    className="w-4 h-4 text-red-400 flex-shrink-0" /> },
    warning: { border: 'border-amber-500/30',   icon: <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" /> },
  }
  const s = styles[type] || styles.success
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-900 shadow-2xl min-w-64 max-w-sm animate-in slide-in-from-right ${s.border}`}>
      {s.icon}
      <p className="text-sm text-slate-200 flex-1">{message}</p>
      <button onClick={onClose} className="text-slate-500 hover:text-white transition ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast {...t} onClose={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
