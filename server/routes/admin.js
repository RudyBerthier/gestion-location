import express from 'express'
import { supabaseAdmin } from '../config/supabase-admin.js'
import resend from '../services/email.js'

const FROM = process.env.FROM_EMAIL || 'Gestion Locative <noreply@rberthier.fr>'
const router = express.Router()

// Cache en mémoire pour éviter le spam/double envoi (React Strict Mode, appels multiples)
const notifiedUsers = new Map()

// Endpoint appelé par le Frontend après une inscription réussie
router.post('/notify-signup', async (req, res) => {
  try {
    const { email, prenom, nom, userId } = req.body

    if (!email || !userId) {
      return res.status(400).json({ error: 'Données manquantes' })
    }

    // Vérification anti-spam (15 minutes de cooldown par utilisateur)
    const now = Date.now()
    if (notifiedUsers.has(userId)) {
      const lastNotified = notifiedUsers.get(userId)
      if (now - lastNotified < 15 * 60 * 1000) {
        console.log(`[Admin] Envoi ignoré pour ${email} (spam protection)`)
        return res.json({ success: true, message: 'Notification déjà envoyée récemment.' })
      }
    }
    
    // On met en cache la date d'envoi avant même l'exécution pour contrer la concurrence
    notifiedUsers.set(userId, now)

    console.log('[Admin] notify-signup reçu :', req.body)

    const adminEmail = 'rudyberthier@gmail.com'
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`

    const approveLink = `${baseUrl}/api/admin/approve-user/${userId}`
    const refuseLink = `${baseUrl}/api/admin/refuse-user/${userId}`

    const { data, error: resendError } = await resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject: `🛡️ Nouvelle Inscription - Gestion Locative : ${prenom} ${nom}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; padding: 40px 32px; border-radius: 16px; color: #f8fafc;">
          <h2 style="color: #a78bfa; margin-top: 0;">🛡️ Demande d'accès à la plateforme</h2>
          <p style="color: #94a3b8;">Un nouvel utilisateur vient de créer un compte. Son compte est actuellement <strong style="color: #fbbf24;">en attente</strong> d'approbation.</p>
          
          <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
            <p style="margin: 0; color: #f8fafc;"><strong>Nom :</strong> ${prenom} ${nom}</p>
            <p style="margin: 8px 0 0 0; color: #94a3b8;"><strong>Email :</strong> ${email}</p>
          </div>

          <div style="margin-top: 30px; display: flex; gap: 12px;">
            <a href="${approveLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">✅ Accepter</a>
            <a href="${refuseLink}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-left: 12px;">❌ Refuser</a>
          </div>
          
          <p style="margin-top: 40px; font-size: 12px; color: #475569;">Ne partagez pas cet e-mail.</p>
        </div>
      `
    })

    if (resendError) {
      console.error('[Admin] Erreur Resend lors de l\'envoi:', resendError)
      return res.status(400).json({ success: false, error: resendError.message })
    }

    console.log('[Admin] Email envoyé, id:', data?.id)
    res.json({ success: true, message: 'Notification envoyée.' })
  } catch (error) {
    console.error('Erreur notify-signup:', error)
    res.status(500).json({ error: error.message })
  }
})

// Route pour approuver
router.get('/approve-user/:id', async (req, res) => {
  const userId = req.params.id
  
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', userId)

    if (error) throw error

    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #10b981;">✅ Compte Approuvé avec succès</h1>
        <p>L'utilisateur peut maintenant se connecter à l'application.</p>
        <script>setTimeout(() => window.close(), 3000)</script>
      </div>
    `)
  } catch (error) {
    res.status(500).send(`Erreur : ${error.message}`)
  }
})

// Route pour refuser et supprimer
router.get('/refuse-user/:id', async (req, res) => {
  const userId = req.params.id
  
  try {
    // Supprimer l'utilisateur de Supabase Auth (cela supprimera en cascade le record public.profiles)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) throw error

    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #ef4444;">❌ Compte Refusé et Supprimé</h1>
        <p>Toutes les données associées à cet utilisateur ont été effacées.</p>
        <script>setTimeout(() => window.close(), 3000)</script>
      </div>
    `)
  } catch (error) {
    res.status(500).send(`Erreur : ${error.message}`)
  }
})

export default router
