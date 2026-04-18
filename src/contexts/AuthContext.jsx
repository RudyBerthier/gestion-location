import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { profiles } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupère la session active au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Écoute les changements d'auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await profiles.get(userId)
      if (!error && data) {
        setProfile(data)
      } else {
        // Pas de profil → vérifier si c'est un login OAuth (Google)
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.app_metadata?.provider === 'google') {
          const meta = authUser.user_metadata || {}
          const prenom = meta.given_name || meta.full_name?.split(' ')[0] || ''
          const nom = meta.family_name || meta.full_name?.split(' ').slice(1).join(' ') || ''
          const email = authUser.email || ''

          // Créer le profil en attente
          await supabase.from('profiles').insert({
            id: userId,
            prenom,
            nom,
            email,
            status: 'pending',
          })

          // Notifier l'admin
          fetch('/api/admin/notify-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, prenom, nom, userId }),
          }).catch(() => {})

          // Recharger le profil fraîchement créé
          const { data: newProfile } = await profiles.get(userId)
          setProfile(newProfile)
        }
      }
    } catch (err) {
      console.error('Erreur chargement profil:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = () => user && fetchProfile(user.id)

  const value = {
    user,
    profile,
    loading,
    refreshProfile,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
