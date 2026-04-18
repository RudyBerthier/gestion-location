import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persistance dans localStorage → survit aux rechargements ET aux redémarrages serveur
    storage: window.localStorage,
    persistSession: true,
    // Rafraîchit automatiquement le token avant expiration
    autoRefreshToken: true,
    // Détecte les changements d'URL pour OAuth (code Google, magic links...)
    detectSessionInUrl: true,
    // Durée du refresh token : à configurer dans Supabase Dashboard
    // Authentication > Project Settings > JWT expiry = 604800 (7j)
    // Authentication > Project Settings > Refresh token expiry = 2592000 (30j)
  },
})
