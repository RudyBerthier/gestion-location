import express from 'express'
import { generateQuittancePDF } from '../services/pdf.js'
import { supabaseAdmin } from '../config/supabase-admin.js'
import { sendViaAccount } from '../services/mailerSmtp.js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const router = express.Router()

// ── Téléchargement PDF ────────────────────────────────────────────────────────
router.get('/quittance/:id/download', async (req, res) => {
  try {
    const pdfBuffer = await generateQuittancePDF(req.params.id)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="Quittance_${req.params.id.substring(0, 8)}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.end(pdfBuffer)
  } catch (error) {
    console.error('Erreur téléchargement PDF:', error)
    res.status(500).json({ success: false, error: 'Impossible de générer le PDF' })
  }
})

// ── Envoi par email ───────────────────────────────────────────────────────────
// Body optionnel : { accountId }
//   → Si fourni : envoie via le compte SMTP stocké (Orange, Gmail…)
//   → Sinon     : fallback sur Resend
router.post('/quittance/:id/send', async (req, res) => {
  try {
    const paiementId = req.params.id
    const { accountId } = req.body

    const { data: paiement, error: pErr } = await supabaseAdmin
      .from('paiements')
      .select('user_id, locations(locataires(email, nom, prenom))')
      .eq('id', paiementId)
      .single()

    if (pErr || !paiement) throw new Error('Paiement introuvable')

    const locataire = paiement.locations?.locataires
    const toEmail = locataire?.email
    const userId = paiement.user_id

    if (!toEmail) throw new Error("Ce locataire n'a pas d'adresse email.")

    const pdfBuffer = await generateQuittancePDF(paiementId)

    const subject = `Votre quittance de loyer`
    const html = `
      <p>Bonjour ${locataire.prenom},</p>
      <p>Veuillez trouver ci-joint votre quittance de loyer.</p>
      <p>Cordialement,<br/>Votre Gestionnaire</p>
    `

    if (accountId) {
      // Envoi SMTP via compte Orange / Gmail / etc. stocké en base
      await sendViaAccount(accountId, {
        to: toEmail,
        subject,
        html,
        attachments: [{
          filename: `Quittance_${paiementId.substring(0, 8)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }]
      })
    } else {
      // Fallback Resend
      if (!process.env.RESEND_API_KEY) throw new Error('Clé API Resend non configurée.')
      const { error: resendErr } = await resend.emails.send({
        from: process.env.FROM_EMAIL || 'Gestion-Locative <onboarding@resend.dev>',
        to: [toEmail],
        subject,
        html,
        attachments: [{
          filename: `Quittance_${paiementId.substring(0, 8)}.pdf`,
          content: pdfBuffer.toString('base64')
        }]
      })
      if (resendErr) throw resendErr
    }

    // Historique
    if (userId && toEmail) {
      await supabaseAdmin.from('historique_emails').insert({
        user_id: userId,
        to_email: toEmail,
        subject: 'Quittance de loyer',
        body_preview: `Bonjour ${locataire.prenom}, veuillez trouver ci-joint votre quittance de loyer.`,
        type: 'quittance'
      })
    }

    res.json({ success: true, message: 'Quittance envoyée avec succès.' })
  } catch (error) {
    console.error('Erreur envoi Email Quittance:', error)
    res.status(500).json({ success: false, error: error.message || "Impossible d'envoyer la quittance" })
  }
})

export default router
