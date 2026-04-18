import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, ShieldAlert, LogOut } from 'lucide-react'
import { auth } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

export default function WaitingPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  // Si le profil n'est plus en attente, on redirige vers le dashboard
  useEffect(() => {
    if (profile && profile.status !== 'pending') {
      navigate('/dashboard')
    }
  }, [profile, navigate])

  useEffect(() => {
    const notifyAdmin = async () => {
      if (!user) return

      const storageKey = `admin_notified_${user.id}`
      // Si on l'a déjà notifié localement, on ne re-spam pas
      if (localStorage.getItem(storageKey)) return

      const prenom = user.user_metadata?.prenom || ''
      const nom = user.user_metadata?.nom || ''
      const email = user.email

      try {
        const res = await fetch('/api/admin/notify-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, prenom, nom, userId: user.id }),
        })
        
        if (res.ok) {
          localStorage.setItem(storageKey, 'true')
        }
      } catch (err) {
        console.warn('Erreur lors de la notification admin:', err)
      }
    }

    notifyAdmin()
  }, [user])

  const handleLogout = async () => {
    await auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 max-w-md w-full relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
        
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-slate-900 border border-slate-700">
          <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-3">Compte en attente</h1>
        
        <p className="text-slate-400 text-center mb-6 leading-relaxed">
          Bonjour {user?.user_metadata?.prenom || ''}, votre inscription a bien été enregistrée. Pour des raisons de sécurité, votre compte doit d'abord être validé manuellement par l'administrateur.
        </p>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-start gap-4 mb-8">
          <ShieldAlert className="w-6 h-6 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300">
            Un e-mail de notification a été envoyé. Vous recevrez un avertissement ou vous pourrez essayer de vous reconnecter plus tard.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => refreshProfile()}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition duration-200"
          >
            Rafraîchir la page
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-transparent border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-400 hover:text-white font-medium rounded-xl transition duration-200 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
