import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { supabaseAdmin } from './../config/supabase-admin.js'
import { decryptText } from '../utils/crypto.js'

export const getMailClient = async (accountId) => {
  if (!accountId) throw new Error("Identifiant de compte email manquant");

  const { data: account, error } = await supabaseAdmin
    .from('email_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error || !account) throw new Error("Compte email introuvable dans la base de données");

  const password = decryptText(account.password_encrypted);

  return new ImapFlow({
    host: account.imap_host,
    port: account.imap_port || 993,
    secure: true,
    auth: {
      user: account.email,
      pass: password,
    },
    logger: false,
  })
}

export const fetchEmails = async (limit = 50, accountId) => {
  const client = await getMailClient(accountId)
  await client.connect()

  const emails = []
  
  try {
    let lock = await client.getMailboxLock('INBOX')
    try {
      // Get the total number of messages in INBOX
      const status = await client.status('INBOX', { messages: true })
      const totalMessages = status.messages

      if (totalMessages === 0) return []

      // Calculate the start sequence (we want the last N messages)
      const startSeq = Math.max(1, totalMessages - limit + 1)
      const seqStr = `${startSeq}:*`

      // Fetch messages (uniquement l'enveloppe, PAS le code source entier)
      for await (let msg of client.fetch(seqStr, { envelope: true, flags: true })) {
        const fromName = msg.envelope.from?.[0]?.name
        const fromAddress = msg.envelope.from?.[0]?.address
        const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress || 'Inconnu'
        const to = msg.envelope.to?.[0]?.address || ''

        emails.push({
          id: msg.uid,
          subject: msg.envelope.subject || '(Sans objet)',
          from: from,
          to: to,
          date: msg.envelope.date || new Date(),
          text: '', // Chargé uniquement au clic
          html: '', // Chargé uniquement au clic
          isRead: msg.flags ? msg.flags.has('\\Seen') : false
        })
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }

  // Return correctly ordered (newest first)
  return emails.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export const fetchSentEmails = async (limit = 50, accountId) => {
  const client = await getMailClient(accountId)
  await client.connect()

  const emails = []
  
  try {
    const list = await client.list();
    let sentMailbox = list.find(m => m.specialUse === '\\Sent');
    if (!sentMailbox) sentMailbox = list.find(m => m.name.toLowerCase().includes('envoy') || m.name.toLowerCase().includes('sent'));
    
    if (!sentMailbox) return []; // Si on ne trouve pas de dossier envoyés

    let lock = await client.getMailboxLock(sentMailbox.path)
    try {
      const status = await client.status(sentMailbox.path, { messages: true })
      const totalMessages = status.messages
      if (totalMessages === 0) return []

      const startSeq = Math.max(1, totalMessages - limit + 1)
      const seqStr = `${startSeq}:*`

      for await (let msg of client.fetch(seqStr, { envelope: true, flags: true })) {
        const fromName = msg.envelope.from?.[0]?.name
        const fromAddress = msg.envelope.from?.[0]?.address
        const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress || 'Inconnu'
        const to = msg.envelope.to?.[0]?.address || ''

        emails.push({
          id: msg.uid,
          subject: msg.envelope.subject || '(Sans objet)',
          from: from,
          to: to,
          date: msg.envelope.date || new Date(),
          text: '', 
          html: '', 
          isRead: true, // Un mail envoyé est déjà lu
          accountId: accountId,
          _type: 'general',
          mailboxPath: sentMailbox.path // Pour savoir dans quel dossier on l'a pris si on veut le récupérer plus tard
        })
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }

  return emails.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export const fetchEmailById = async (uid, accountId, mailboxPath = 'INBOX') => {
  const client = await getMailClient(accountId)
  await client.connect()

  try {
    let lock = await client.getMailboxLock(mailboxPath)
    try {
      let emailObj = null
      // uid: true specifier tells imapflow to use UID instead of sequence number
      for await (let msg of client.fetch([uid], { source: true }, { uid: true })) {
        const parsed = await simpleParser(msg.source)
        
        // Extraire les métadonnées des pièces jointes
        const attachments = (parsed.attachments || []).map((att, i) => ({
          index: i,
          filename: att.filename || `fichier_${i + 1}`,
          contentType: att.contentType || 'application/octet-stream',
          size: att.size || 0,
          // On encode en base64 pour pouvoir afficher/télécharger depuis le front
          content: att.content ? att.content.toString('base64') : null,
        }))

        emailObj = {
          text: parsed.text,
          html: parsed.html || parsed.textAsHtml,
          attachments,
        }
      }
      return emailObj
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }
}

export const searchEmails = async (query, accountId) => {
  const client = await getMailClient(accountId)
  await client.connect()

  const emails = []

  try {
    let lock = await client.getMailboxLock('INBOX')
    try {
      // Recherche IMAP native
      const uids = await client.search({
        or: [
          { subject: query },
          { from: query },
          { body: query }
        ]
      }, { uid: true })

      if (!uids || uids.length === 0) return []

      // Limite à 50 résultats les plus récents
      const recentUids = uids.slice(-50)

      for await (let msg of client.fetch(recentUids, { envelope: true, flags: true }, { uid: true })) {
        const fromName = msg.envelope.from?.[0]?.name
        const fromAddress = msg.envelope.from?.[0]?.address
        const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress || 'Inconnu'

        emails.push({
          id: msg.uid,
          subject: msg.envelope.subject || '(Sans objet)',
          from,
          to: msg.envelope.to?.[0]?.address || '',
          date: msg.envelope.date || new Date(),
          text: '',
          html: '',
          isRead: msg.flags ? msg.flags.has('\\Seen') : false
        })
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }

  return emails.sort((a, b) => new Date(b.date) - new Date(a.date))
}

// ── FONCTIONS GLOBALISEES (TOUS LES COMPTES) ──

export const fetchAllAccountsEmails = async (userId, limit = 50) => {
  const { data: accounts, error } = await supabaseAdmin
    .from('email_accounts')
    .select('id, email')
    .eq('user_id', userId)

  if (error || !accounts || accounts.length === 0) return []

  // Appels parallèles à fetchEmails
  const promises = accounts.map(async (acc) => {
    try {
      const msgs = await fetchEmails(limit, acc.id)
      return msgs.map(m => ({ ...m, accountId: acc.id, accountEmail: acc.email }))
    } catch (err) {
      console.error(`Erreur unifiée pour le compte ${acc.email}:`, err.message)
      return []
    }
  })

  const results = await Promise.all(promises)
  const merged = results.flat()

  // Tri par date décroissante et limite globale
  return merged.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit)
}

export const searchAllAccountsEmails = async (userId, query) => {
  const { data: accounts, error } = await supabaseAdmin
    .from('email_accounts')
    .select('id, email')
    .eq('user_id', userId)

  if (error || !accounts || accounts.length === 0) return []

  const promises = accounts.map(async (acc) => {
    try {
      const msgs = await searchEmails(query, acc.id)
      return msgs.map(m => ({ ...m, accountId: acc.id, accountEmail: acc.email }))
    } catch (err) {
      console.error(`Erreur recherche unifiée pour le compte ${acc.email}:`, err.message)
      return []
    }
  })

  const results = await Promise.all(promises)
  const merged = results.flat()

  return merged.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export const fetchAllAccountsSentEmails = async (userId, limit = 50) => {
  const { data: accounts, error } = await supabaseAdmin
    .from('email_accounts')
    .select('id, email')
    .eq('user_id', userId)

  if (error || !accounts || accounts.length === 0) return []

  const promises = accounts.map(async (acc) => {
    try {
      const msgs = await fetchSentEmails(limit, acc.id)
      return msgs.map(m => ({ ...m, accountId: acc.id, accountEmail: acc.email }))
    } catch (err) {
      console.error(`Erreur unifiée FETCH SENT pour le compte ${acc.email}:`, err.message)
      return []
    }
  })

  const results = await Promise.all(promises)
  const merged = results.flat()

  return merged.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit)
}
