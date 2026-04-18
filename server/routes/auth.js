import express from 'express'
import { supabaseAdmin } from '../config/supabase-admin.js'
import { send2FACode } from '../services/email.js'

const router = express.Router()

// Génère un code à 6 chiffres
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString()

/**
 * POST /api/auth/send-2fa
 * Étape 1 : L'utilisateur a déjà été authentifié par Supabase côté client.
 * On génère un code 6 chiffres et on l'envoie par email.
 * Body: { userId, email, prenom }
 */
router.post('/send-2fa', async (req, res) => {
  const { userId, email, prenom } = req.body

  if (!userId || !email) {
    return res.status(400).json({ success: false, message: 'userId et email requis' })
  }

  try {
    // Supprimer les anciens codes non utilisés pour cet utilisateur
    await supabaseAdmin
      .from('two_factor_codes')
      .delete()
      .eq('user_id', userId)
      .eq('verified', false)

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Sauvegarder le code en DB
    const { error: dbError } = await supabaseAdmin
      .from('two_factor_codes')
      .insert({ user_id: userId, email, code, expires_at: expiresAt.toISOString() })

    if (dbError) {
      console.error('Erreur insertion code 2FA:', dbError)
      return res.status(500).json({ success: false, message: 'Erreur serveur' })
    }

    // Envoyer l'email avec le code
    await send2FACode({ to: email, prenom, code })

    return res.json({
      success: true,
      message: 'Code envoyé par email',
      expiresIn: 600, // secondes
    })
  } catch (err) {
    console.error('Erreur send-2fa:', err)
    return res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/**
 * POST /api/auth/verify-2fa
 * Étape 2 : Vérifie le code entré par l'utilisateur.
 * Body: { userId, email, code }
 */
router.post('/verify-2fa', async (req, res) => {
  const { userId, email, code } = req.body

  if (!userId || !email || !code) {
    return res.status(400).json({ success: false, message: 'Paramètres manquants' })
  }

  try {
    // Récupérer le code valide le plus récent
    const { data: records, error } = await supabaseAdmin
      .from('two_factor_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('email', email)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !records || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Code expiré ou invalide. Veuillez recommencer.' })
    }

    const record = records[0]

    // Trop de tentatives ?
    if (record.attempts >= 3) {
      await supabaseAdmin.from('two_factor_codes').delete().eq('id', record.id)
      return res.status(400).json({ success: false, message: 'Trop de tentatives. Veuillez recommencer.', tooManyAttempts: true })
    }

    // Mauvais code ?
    if (record.code !== code) {
      await supabaseAdmin
        .from('two_factor_codes')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id)

      const remaining = 2 - record.attempts
      return res.status(400).json({
        success: false,
        message: `Code incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`,
      })
    }

    // Code correct : marquer comme vérifié
    await supabaseAdmin
      .from('two_factor_codes')
      .update({ verified: true })
      .eq('id', record.id)

    return res.json({ success: true, message: 'Code vérifié avec succès' })
  } catch (err) {
    console.error('Erreur verify-2fa:', err)
    return res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
