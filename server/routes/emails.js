import express from 'express'
import { fetchEmails, fetchEmailById, searchEmails, fetchAllAccountsEmails, searchAllAccountsEmails, fetchSentEmails, fetchAllAccountsSentEmails } from '../services/imap.js'
import { supabaseAdmin } from '../config/supabase-admin.js'
import { sendViaAccount } from '../services/mailerSmtp.js'
import { Resend } from 'resend'
import axios from 'axios'

const router = express.Router()

// Initialisation de Resend (la clé doit être dans le .env)
const resend = new Resend(process.env.RESEND_API_KEY)

// Envoi d'un email
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, replyToAddress, attachments, accountId } = req.body;
    
    let parsedAttachments = [];
    if (attachments && Array.isArray(attachments)) {
       for (const att of attachments) {
         if (att.url) {
           parsedAttachments.push({
             filename: att.filename,
             path: att.url // Resend et Nodemailer peuvent lire depuis une URL directement !
           });
         } else if (att.storagePath) {
           try {
             // Backend downloads natively from Supabase Storage bypassing public URL expiration
             let downloadData = null;
             let { data: fileDoc, error: docErr } = await supabaseAdmin.storage.from('documents').download(att.storagePath);
             
             if (!docErr && fileDoc) {
                downloadData = fileDoc;
             } else {
                let { data: fileMed, error: medErr } = await supabaseAdmin.storage.from('medias').download(att.storagePath);
                if (!medErr && fileMed) {
                   downloadData = fileMed;
                } else {
                   throw new Error("Fichier introuvable dans documents ni medias.");
                }
             }
             
             const arrayBuffer = await downloadData.arrayBuffer();
             parsedAttachments.push({
               filename: att.filename,
               content: Buffer.from(arrayBuffer).toString('base64'),
               encoding: 'base64'
             });
           } catch(e) {
             console.error(`Error fetching native storage attachment ${att.storagePath}:`, e.message);
           }
         } else if (att.content) {
           parsedAttachments.push({
             filename: att.filename,
             content: att.content.replace(/^data:.*?;base64,/, ''),
             encoding: 'base64'
           });
         }
       }
    }

    if (accountId) {
      // ── Envoi via compte SMTP configuré (Orange, etc.) ──
      const sendOptions = {
        to,
        subject,
        html,
        attachments: parsedAttachments.length > 0 ? parsedAttachments : undefined,
      }
      // TODO: Handle replyToAddress with nodemailer if specifically needed, usually 'from' is enough here.
      await sendViaAccount(accountId, sendOptions);
    } else {
      // ── Fallback Resend ──
      if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({ success: false, error: 'Clé API Resend non configurée sur le serveur.' });
      }
      const { error } = await resend.emails.send({
        from: process.env.FROM_EMAIL || 'Gestion-Locative <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: html,
        reply_to: replyToAddress || undefined,
        attachments: parsedAttachments.length > 0 ? parsedAttachments : undefined,
      });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
    }

    // Sauvegarde en base de données de l'historique
    const userId = req.body.userId;
    if (userId) {
      const attPayload = parsedAttachments.map(att => ({
        filename: att.filename,
        content: att.content || att.path, // Si pas de base64, on stocke au moins le lien
        contentType: 'application/octet-stream',
        size: att.content ? Math.round((att.content.length * 3) / 4) : 0
      }));

      const { error: histErr } = await supabaseAdmin.from('historique_emails').insert({
        user_id: userId,
        to_email: to,
        subject: subject || '(Sans objet)',
        body_preview: html ? html.replace(/<[^>]*>?/gm, '').substring(0, 200) : '',
        type: 'general',
        attachments: attPayload.length > 0 ? attPayload : undefined
      });

      if (histErr) {
        console.warn('Impossible de sauvegarder les PJs (colonne manquante?). Fallback:', histErr.message);
        await supabaseAdmin.from('historique_emails').insert({
          user_id: userId,
          to_email: to,
          subject: subject || '(Sans objet)',
          body_preview: html ? html.replace(/<[^>]*>?/gm, '').substring(0, 200) : '',
          type: 'general'
        });
      }
    }

    res.json({ success: true, message: 'Email envoyé' });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Récupérer l'historique des emails envoyés depuis le site
router.get('/historique', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ success: false, error: "Identifiant utilisateur requis" });

    const limit = parseInt(req.query.limit) || 50;
    
    // On veut uniquement ce qu'il y a dans l'historique du site, pas tout le dossier Envoyés de la boîte IMAP
    const { data, error } = await supabaseAdmin
      .from('historique_emails')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Formater pour le front
    const formattedData = data.map(dbEmail => ({
      id: dbEmail.id,
      accountId: 'historique',
      subject: dbEmail.subject,
      from: 'Moi',
      to: dbEmail.to_email,
      date: dbEmail.created_at,
      text: dbEmail.body_preview,
      isRead: true, 
      flags: [],
      _type: dbEmail.type,
      attachments: dbEmail.attachments || []
    }));

    res.json({ success: true, count: formattedData.length, data: formattedData });
  } catch (error) {
    console.error('Erreur historique emails:', error);
    res.status(500).json({ success: false, error: 'Impossible de récupérer l\'historique' });
  }
});

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const accountId = req.query.accountId;
    const userId = req.query.userId;
    
    if (!accountId) return res.status(400).json({ success: false, error: "L'identifiant du compte est requis." });

    let emails;
    if (accountId === 'all') {
      if (!userId) return res.status(400).json({ success: false, error: "L'identifiant utilisateur est requis pour la recherche globale." });
      emails = await fetchAllAccountsEmails(userId, limit);
    } else {
      emails = await fetchEmails(limit, accountId)
    }
    
    res.json({ success: true, count: emails.length, data: emails })
  } catch (error) {
    console.error('Erreur module IMAP (List):', error)
    if (error.message.includes('introuvable')) {
      res.status(500).json({ success: false, error: 'Compte introuvable en base.' })
    } else {
      res.status(500).json({ success: false, error: 'Connexion IMAP échouée.' })
    }
  }
})

// IMPORTANT: /search doit être AVANT /:uid pour éviter que Express confonde "search" avec un uid
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || ''
    const accountId = req.query.accountId;
    const userId = req.query.userId;

    if (!accountId) return res.status(400).json({ success: false, error: "L'identifiant du compte est requis." });
    if (query.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'La recherche doit contenir au moins 2 caractères.' })
    }
    
    let emails;
    if (accountId === 'all') {
      if (!userId) return res.status(400).json({ success: false, error: "L'identifiant utilisateur est requis pour la recherche globale." });
      emails = await searchAllAccountsEmails(userId, query);
    } else {
      emails = await searchEmails(query, accountId);
    }
    
    res.json({ success: true, count: emails.length, data: emails })
  } catch (error) {
    console.error('Erreur module IMAP (Search):', error)
    res.status(500).json({ success: false, error: 'Erreur lors de la recherche.' })
  }
})

router.get('/:uid', async (req, res) => {
  try {
    const uid = parseInt(req.params.uid)
    const accountId = req.query.accountId;
    const mailboxPath = req.query.mailboxPath || 'INBOX';
    
    if (!accountId) return res.status(400).json({ success: false, error: "L'identifiant du compte est requis." });

    if (accountId === 'historique') {
      const { data, error } = await supabaseAdmin.from('historique_emails').select('*').eq('id', uid).single();
      if (!error && data) {
         return res.json({ success: true, data: { ...data, html: data.body_preview, text: data.body_preview, attachments: data.attachments || [] } });
      }
      return res.status(404).json({ success: false, error: 'Historique introuvable' })
    }

    const email = await fetchEmailById(uid, accountId, mailboxPath)
    if (email) {
      res.json({ success: true, data: email })
    } else {
      res.status(404).json({ success: false, error: 'Email non trouvé' })
    }
  } catch (error) {
    console.error('Erreur module IMAP (Get UID):', error)
    res.status(500).json({ success: false, error: 'Erreur au chargement du contenu.' })
  }
})

export default router
