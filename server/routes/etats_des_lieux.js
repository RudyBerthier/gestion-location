import express from 'express';
import { supabaseAdmin } from '../config/supabase-admin.js';
import { generateEtatDesLieuxPDF } from '../services/pdfEtatLieux.js';

const router = express.Router();

// GET : Récupérer tous les états des lieux d'un bail (location)
router.get('/bail/:locationId', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('etats_des_lieux')
      .select('*')
      .eq('location_id', req.params.locationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Erreur listing etats des lieux:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET : Récupérer un état des lieux précis
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('etats_des_lieux')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Erreur fetch etat des lieux:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST : Initialiser un nouvel état des lieux (vide ou pré-rempli)
router.post('/', async (req, res) => {
  try {
    const { location_id, type, user_id, contenu } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('etats_des_lieux')
      .insert([{
        location_id,
        user_id,
        type,
        contenu: contenu || [],
        signatures: {},
        statut: 'brouillon'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error("Erreur création etat des lieux:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT : Sauvegarder la progression ou finaliser
router.put('/:id', async (req, res) => {
  try {
    const { contenu, signatures, statut, date_realisation } = req.body;
    
    // Construction de l'objet d'update dynamiquement (ne met à jour que ce qui est envoyé)
    const updateData = {};
    if (contenu) updateData.contenu = contenu;
    if (signatures) updateData.signatures = signatures;
    if (statut) updateData.statut = statut;
    if (date_realisation) updateData.date_realisation = date_realisation;
    
    // Si on passe en 'valide', on force la date_realisation si elle n'est pas fournie
    if (statut === 'valide' && !updateData.date_realisation) {
      updateData.date_realisation = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('etats_des_lieux')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Erreur update etat des lieux:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE : Supprimer un brouillon
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('etats_des_lieux')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur supression etat des lieux:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST : Générer et récupérer le PDF final
router.post('/:id/generate-pdf', async (req, res) => {
  try {
    const { data: etatDesLieux, error } = await supabaseAdmin
      .from('etats_des_lieux')
      .select(`
        *,
        locations(
          *,
          appartements(*),
          locataires(*),
          profiles(nom, prenom, entreprise, email)
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!etatDesLieux) throw new Error("État des lieux introuvable");

    // Fixer la structure pour le PDF
    if (etatDesLieux.locations && etatDesLieux.locations.profiles) {
      etatDesLieux.locations.user = etatDesLieux.locations.profiles;
    }

    const pdfBuffer = await generateEtatDesLieuxPDF(etatDesLieux);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Etat_des_Lieux_${etatDesLieux.type}_${etatDesLieux.locations.appartements.titre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erreur génération PDF:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
