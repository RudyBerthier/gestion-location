import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { Building2, Loader2 } from 'lucide-react'

/**
 * Page de callback OAuth (Google, etc.)
 * Supabase redirige ici après l'authentification Google.
 * Elle finalise la session et redirige vers le dashboard.
 */
export default function Callback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase gère automatiquement l'échange du code OAuth via l'URL
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Erreur callback OAuth:', error)
          setError('Erreur lors de la connexion avec Google.')
          setTimeout(() => navigate('/login'), 3000)
          return
        }

        if (data.session) {
          // Créer le profil si c'est le premier login Google
          const user = data.session.user
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single()

          if (!existingProfile) {
            // Premier login : créer le profil avec les données Google
            const nameParts = (user.user_metadata?.full_name || '').split(' ')
            await supabase.from('profiles').insert({
              id: user.id,
              prenom: nameParts[0] || '',
              nom: nameParts.slice(1).join(' ') || '',
              avatar_url: user.user_metadata?.avatar_url || null,
            })
          }

          navigate('/dashboard', { replace: true })
        } else {
          setError('Session introuvable. Redirection...')
          setTimeout(() => navigate('/login'), 2000)
        }
      } catch (err) {
        console.error('Erreur callback:', err)
        setError('Une erreur est survenue.')
        setTimeout(() => navigate('/login'), 3000)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 gap-6">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
        <Building2 className="w-7 h-7 text-white" />
      </div>

      {error ? (
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <p className="text-slate-500 text-xs">Redirection en cours...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          <p className="text-slate-300 text-sm">Connexion avec Google en cours...</p>
        </div>
      )}
    </div>
  )
}
