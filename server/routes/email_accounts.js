import express from 'express';
import { supabaseAdmin } from '../config/supabase-admin.js';
import { encryptText } from '../utils/crypto.js';
import { ImapFlow } from 'imapflow';

const router = express.Router();

// GET : Liste les comptes email de l'utilisateur (sans le MDP)
router.get('/', async (req, res) => {
  try {
    const { data: accounts, error } = await supabaseAdmin
      .from('email_accounts')
      .select('id, email, provider, imap_host, imap_port, is_active, created_at')
      // NOTE: Normalement RLS ou on filtre si on a l'auth, mais depuis express on a pas l'auth user si on utilise supabaseAdmin sans token.
      // Idéalement on passe l'ID utilisateur, ou on décode le jeton.  On va supposer que l'ID profile est passé en Header localement si besoin, ou on fait confiance à l'auth côté client.
      // MAIS on a le user_id potentiellement. Pout le MVP d'un mono-user ça marchera tel quel ou bien le frontend doit envoyer un header `X-User-Id`.
      // Pour une vraie V2, il faudrait le JWT d'authentification valide.
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(accounts);
  } catch (error) {
    console.error("Erreur listing email_accounts:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST : Ajoute un compte après test IMAP
router.post('/', async (req, res) => {
  try {
    const { user_id, email, password, provider, imap_host, imap_port } = req.body;

    if (!user_id || !email || !password || !imap_host || !imap_port) {
      return res.status(400).json({ error: "Tous les champs obligatoires ne sont pas remplis." });
    }

    // 1. Tester la connexion IMAP avant de sauvegarder !
    const testClient = new ImapFlow({
      host: imap_host,
      port: parseInt(imap_port, 10),
      secure: true,
      auth: { user: email, pass: password },
      logger: false,
    });

    try {
      await testClient.connect();
      await testClient.logout();
    } catch (imapErr) {
      console.error("Échec de connexion IMAP Test :", imapErr.message);
      return res.status(401).json({ error: "Impossible de se connecter au serveur IMAP avec ces identifiants. Vérifiez votre mot de passe (ou mot de passe d'application)." });
    }

    // 2. Si ça marche, on chiffre le mot de passe
    const password_encrypted = encryptText(password);

    // 3. Sauvegarder dans Supabase
    const { data, error } = await supabaseAdmin
      .from('email_accounts')
      .insert([{
        user_id,
        email,
        password_encrypted,
        provider: provider || 'other',
        imap_host,
        imap_port: parseInt(imap_port, 10)
      }])
      .select('id, email, provider, imap_host, imap_port, is_active')
      .single();

    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error("Erreur création email_account:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE : Retirer un compte de l'application
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('email_accounts')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur supression email_account:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
