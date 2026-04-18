import nodemailer from 'nodemailer'
import { supabaseAdmin } from '../config/supabase-admin.js'
import { decryptText } from '../utils/crypto.js'

/**
 * Détermine la config SMTP selon le provider ou l'hôte IMAP du compte.
 * Orange/Wanadoo → smtp.orange.fr:465
 */
const getSmtpConfig = (account) => {
  const host = account.imap_host?.toLowerCase() || ''
  const email = account.email?.toLowerCase() || ''

  // Orange / Wanadoo
  if (host.includes('orange') || host.includes('wanadoo') || email.includes('@orange.fr') || email.includes('@wanadoo.fr')) {
    return { host: 'smtp.orange.fr', port: 465, secure: true }
  }
  // Gmail
  if (host.includes('gmail') || email.includes('@gmail.com')) {
    return { host: 'smtp.gmail.com', port: 465, secure: true }
  }
  // Outlook / Hotmail / Live
  if (host.includes('outlook') || host.includes('hotmail') || host.includes('live')) {
    return { host: 'smtp.office365.com', port: 587, secure: false }
  }
  // Fallback : même domaine que IMAP mais en smtp.
  const domain = host.replace(/^imap\./, 'smtp.')
  return { host: domain, port: 465, secure: true }
}

/**
 * Crée un transporter nodemailer à partir d'un compte email_accounts existant.
 *
 * @param {string} accountId  - ID du compte dans email_accounts
 */
export const getSmtpTransporter = async (accountId) => {
  const { data: account, error } = await supabaseAdmin
    .from('email_accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (error || !account) throw new Error('Compte email introuvable')

  const password = decryptText(account.password_encrypted)
  const smtpConfig = getSmtpConfig(account)

  return {
    transporter: nodemailer.createTransport({
      ...smtpConfig,
      auth: { user: account.email, pass: password },
    }),
    from: `${account.display_name || account.email} <${account.email}>`,
    email: account.email,
  }
}

/**
 * Envoie un email via un compte email_accounts stocké.
 *
 * @param {string} accountId   - ID du compte expéditeur
 * @param {Object} options     - { to, subject, html, text, attachments? }
 */
export const sendViaAccount = async (accountId, { to, subject, html, text, attachments }) => {
  const { transporter, from } = await getSmtpTransporter(accountId)

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
    attachments,
  })

  return info
}
