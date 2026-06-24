import { supabase } from './supabase.js'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ============================================================
// AUTH
// ============================================================
export const auth = {
  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  }),
  updatePassword: (password) => supabase.auth.updateUser({ password }),
  getSession: () => supabase.auth.getSession(),
}

// ============================================================
// PROFIL
// ============================================================
export const profiles = {
  get: (userId) => supabase.from('profiles').select('*').eq('id', userId).single(),
  update: (userId, data) => supabase.from('profiles').update(data).eq('id', userId),
}

// ============================================================
// APPARTEMENTS
// ============================================================
export const appartements = {
  getAll: () => supabase.from('appartements').select(`*, medias(*)`).order('created_at', { ascending: false }),
  getById: (id) => supabase.from('appartements').select(`*, medias(*), locations(*, locataires(*), paiements(*)), documents(*), incidents(*)`).eq('id', id).single(),
  create: (data) => supabase.from('appartements').insert(data).select().single(),
  update: (id, data) => supabase.from('appartements').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('appartements').delete().eq('id', id),
}

// ============================================================
// LOCATAIRES
// ============================================================
export const locataires = {
  getAll: () => supabase.from('locataires').select(`*, locations(*, appartements(titre))`).order('nom'),
  getById: (id) => supabase.from('locataires').select(`*, locations(*, appartements(*))`).eq('id', id).single(),
  create: (data) => supabase.from('locataires').insert(data).select().single(),
  update: (id, data) => supabase.from('locataires').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('locataires').delete().eq('id', id),
}

// ============================================================
// LOCATIONS (BAUX)
// ============================================================
export const locations = {
  getAll: () => supabase.from('locations').select(`*, appartements(titre, adresse), locataires(nom, prenom)`).order('date_debut', { ascending: false }),
  getById: (id) => supabase.from('locations').select(`*, appartements(*), locataires(*)`).eq('id', id).single(),
  create: (data) => supabase.from('locations').insert(data).select().single(),
  update: (id, data) => supabase.from('locations').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('locations').delete().eq('id', id),
}

// ============================================================
// PAIEMENTS
// ============================================================
export const paiements = {
  getAll: (filters = {}) => {
    let query = supabase.from('paiements').select(`*, locations(locataires(nom, prenom, email), appartements(titre))`).order('date_paiement', { ascending: false })
    if (filters.statut) query = query.eq('statut', filters.statut)
    return query
  },
  create: (data) => supabase.from('paiements').insert(data).select().single(),
  update: (id, data) => supabase.from('paiements').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('paiements').delete().eq('id', id),
}

// ============================================================
// DOCUMENTS
// ============================================================
export const documents = {
  getAll: (filters = {}) => {
    let query = supabase.from('documents').select('*').order('created_at', { ascending: false })
    if (filters.appartement_id) query = query.eq('appartement_id', filters.appartement_id)
    if (filters.locataire_id) query = query.eq('locataire_id', filters.locataire_id)
    if (filters.location_id) query = query.eq('location_id', filters.location_id)
    return query
  },
  create: (data) => supabase.from('documents').insert(data).select().single(),
  delete: (id) => supabase.from('documents').delete().eq('id', id),
  // Deletes from Storage AND the DB row
  deleteWithFile: async (doc) => {
    const filePath = doc.path || doc.storage_path
    if (filePath) {
      // All docs use the 'documents' bucket
      await supabase.storage.from('documents').remove([filePath])
    }
    return supabase.from('documents').delete().eq('id', doc.id)
  },
}

// ============================================================
// QUITTANCES
// ============================================================
export const quittances = {
  getAll: () => supabase.from('quittances').select(`*, locations(locataires(nom, prenom), appartements(titre))`).order('created_at', { ascending: false }),
  create: (data) => supabase.from('quittances').insert(data).select().single(),
}

// ============================================================
// MEDIAS (Photos)
// ============================================================
export const medias = {
  create: (data) => supabase.from('medias').insert(data).select().single(),
  delete: (id) => supabase.from('medias').delete().eq('id', id),
  // Reset all to not principal, then set one
  setPrincipale: async (appartementId, mediaId) => {
    await supabase.from('medias').update({ est_principale: false }).eq('appartement_id', appartementId)
    return supabase.from('medias').update({ est_principale: true }).eq('id', mediaId)
  }
}

// ============================================================
// STORAGE (Supabase Storage)
// ============================================================
export const storage = {
  uploadMedia: async (file, bucket = 'medias', userId = null) => {
    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`
    // For private buckets (documents), prefix with userId so RLS policies match
    const path = userId ? `${userId}/${filename}` : filename
    const { data, error } = await supabase.storage.from(bucket).upload(path, file)
    if (error) throw error
    // Public buckets → getPublicUrl, private buckets → createSignedUrl (1 year)
    if (bucket === 'medias') {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
      return { path, url: urlData.publicUrl }
    } else {
      const { data: signedData, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365)
      if (signErr) throw signErr
      return { path, url: signedData.signedUrl }
    }
  },
  deleteFile: (path, bucket = 'medias') => supabase.storage.from(bucket).remove([path]),
  getSignedUrl: async (path, bucket = 'documents', expiresIn = 3600) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
    if (error) {
      console.warn(`createSignedUrl failed for ${bucket}/${path}, falling back to getPublicUrl:`, error.message);
      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(path)
      return pubData?.publicUrl;
    }
    return data.signedUrl
  },
  downloadFile: async (path, bucket = 'documents') => {
    const { data: blob, error } = await supabase.storage.from(bucket).download(path)
    if (error) throw error
    return blob
  }
}

// ============================================================
// SERVER API (Express) - pour les actions privilegiées
// ============================================================
export const serverApi = axios.create({
  baseURL: API_URL + '/api',
  withCredentials: true,
})

// ============================================================
// MESSAGERIE
// ============================================================
export const emailAccounts = {
  list: async () => {
    const res = await serverApi.get('/email-accounts')
    return res.data
  },
  create: async (data) => {
    const res = await serverApi.post('/email-accounts', data)
    return res.data
  },
  delete: async (id) => {
    const res = await serverApi.delete(`/email-accounts/${id}`)
    return res.data
  }
}

export const mailbox = {
  fetchEmails: async (accountId, userId = null, limit = 25) => {
    let url = `/emails?accountId=${accountId}&limit=${limit}`;
    if (userId) url += `&userId=${userId}`;
    const res = await serverApi.get(url)
    return res.data
  },
  fetchHistorique: async (userId, limit = 50, accountId = 'all') => {
    const res = await serverApi.get(`/emails/historique?userId=${userId}&limit=${limit}&accountId=${accountId}`)
    return res.data
  },
  getEmail: async (accountId, uid, mailboxPath = 'INBOX') => {
    const res = await serverApi.get(`/emails/${uid}?accountId=${accountId}&mailboxPath=${encodeURIComponent(mailboxPath)}`)
    return res.data
  },
  searchEmails: async (accountId, userId = null, query) => {
    let url = `/emails/search?accountId=${accountId}&q=${encodeURIComponent(query)}`;
    if (userId) url += `&userId=${userId}`;
    const res = await serverApi.get(url)
    return res.data
  },
  sendEmail: async (data) => {
    // data: { to, subject, html, replyToAddress }
    const res = await serverApi.post('/emails/send', data)
    return res.data
  }
}

// ============================================================
// CALENDRIER (Rendez-vous manuels)
// ============================================================
export const calendarEvents = {
  getAll: () => supabase.from('calendar_events').select(`*, appartements(titre), locataires(nom, prenom)`).order('date'),
  create: (data) => supabase.from('calendar_events').insert(data).select().single(),
  update: (id, data) => supabase.from('calendar_events').update(data).eq('id', id),
  delete: (id) => supabase.from('calendar_events').delete().eq('id', id),
}

// ============================================================
// CONTACTS (PRESTATAIRES, SYNDIC)
// ============================================================
export const contacts = {
  getAll: () => supabase.from('contacts').select('*').order('nom'),
  getById: (id) => supabase.from('contacts').select('*').eq('id', id).single(),
  create: (data) => supabase.from('contacts').insert(data).select().single(),
  update: (id, data) => supabase.from('contacts').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('contacts').delete().eq('id', id),
}

// ============================================================
// QUITTANCES (PDFs auto-générés)
// ============================================================
export const quittancesApi = {
  download: (paiementId) => {
    window.open(`${API_URL}/api/documents/quittance/${paiementId}/download`, '_blank')
  },
  sendEmail: async (paiementId, accountId = null) => {
    const res = await serverApi.post(`/documents/quittance/${paiementId}/send`, { accountId })
    return res.data
  }
}

// ============================================================
// ÉTAT DES LIEUX (Express via serverApi)
// ============================================================
export const etatsLieux = {
  getByLocation: async (locationId) => {
    const res = await serverApi.get(`/etats-des-lieux/bail/${locationId}`)
    return res.data
  },
  getById: async (id) => {
    const res = await serverApi.get(`/etats-des-lieux/${id}`)
    return res.data
  },
  create: async (data) => {
    const res = await serverApi.post('/etats-des-lieux', data)
    return res.data
  },
  update: async (id, data) => {
    const res = await serverApi.put(`/etats-des-lieux/${id}`, data)
    return res.data
  },
  delete: async (id) => {
    const res = await serverApi.delete(`/etats-des-lieux/${id}`)
    return res.data
  },
  generatePdfUrl: (id) => `${API_URL}/api/etats-des-lieux/${id}/generate-pdf`,
}

// ============================================================
// INCIDENTS / TRAVAUX
// ============================================================
export const incidents = {
  getAll: () => supabase.from('incidents').select('*, appartements(titre), contacts(nom)').order('date_signalement', { ascending: false }),
  getById: (id) => supabase.from('incidents').select('*, appartements(titre), contacts(*)').eq('id', id).single(),
  create: (data) => supabase.from('incidents').insert(data).select().single(),
  update: (id, data) => supabase.from('incidents').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('incidents').delete().eq('id', id),
}
