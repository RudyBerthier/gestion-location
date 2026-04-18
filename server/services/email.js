import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.FROM_EMAIL || 'Gestion Locative <noreply@gestion-locative.fr>'

/**
 * Envoie un code 2FA par email
 */
export const send2FACode = async ({ to, prenom, code }) => {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `🔐 Votre code de connexion : ${code}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; background: #0f172a; padding: 40px 32px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 14px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 24px;">🔐</span>
          </div>
          <h1 style="color: #f8fafc; font-size: 22px; margin: 0;">Code de connexion</h1>
        </div>
        <p style="color: #94a3b8; font-size: 15px;">Bonjour ${prenom || ''}, voici votre code pour vous connecter :</p>
        <div style="background: #1e293b; border: 2px solid #7c3aed; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #a78bfa;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; text-align: center;">Ce code expire dans <strong style="color: #94a3b8;">10 minutes</strong>.</p>
        <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
      </div>
    `,
  })
}


export const sendWelcomeEmail = async ({ to, prenom }) => {
  return resend.emails.send({
    from: FROM,
    to,
    subject: '🎉 Bienvenue sur Gestion Locative !',
    html: `
      <h1>Bonjour ${prenom || ''} !</h1>
      <p>Votre compte Gestion Locative a été créé avec succès.</p>
      <p>Connectez-vous pour commencer à gérer votre patrimoine immobilier.</p>
    `,
  })
}

/**
 * Envoie une quittance de loyer au locataire
 */
export const sendQuittanceEmail = async ({ to, locataire, quittance, pdfUrl }) => {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Quittance de loyer - ${quittance.mois_annee}`,
    html: `
      <p>Bonjour ${locataire.prenom} ${locataire.nom},</p>
      <p>Votre quittance de loyer pour la période <strong>${quittance.mois_annee}</strong> est disponible.</p>
      <p>Montant total : <strong>${quittance.montant_total} €</strong></p>
      ${pdfUrl ? `<p><a href="${pdfUrl}">📄 Télécharger la quittance</a></p>` : ''}
      <p>Cordialement,</p>
    `,
  })
}

/**
 * Envoie une alerte de retard de loyer au propriétaire
 */
export const sendRetardAlertEmail = async ({ to, proprietaire, locataire, montant, mois }) => {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `⚠️ Retard de paiement - ${locataire.prenom} ${locataire.nom}`,
    html: `
      <p>Bonjour ${proprietaire.prenom || ''},</p>
      <p>Un retard de paiement a été détecté :</p>
      <ul>
        <li>Locataire : <strong>${locataire.prenom} ${locataire.nom}</strong></li>
        <li>Mois concerné : <strong>${mois}</strong></li>
        <li>Montant dû : <strong>${montant} €</strong></li>
      </ul>
      <p>Connectez-vous à votre espace pour gérer ce paiement.</p>
    `,
  })
}

export default resend
