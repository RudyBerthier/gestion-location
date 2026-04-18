-- ============================================================
-- GESTION LOCATIVE V2 - SCHEMA POSTGRESQL (SUPABASE)
-- ============================================================

-- Extension pour les UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE : profiles (données complètes des utilisateurs)
-- Liée à auth.users de Supabase
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    telephone VARCHAR(20),
    entreprise VARCHAR(200),
    devise VARCHAR(3) DEFAULT 'EUR',
    langue VARCHAR(5) DEFAULT 'fr',
    taux_tva DECIMAL(5,2) DEFAULT 20.00,
    frais_gestion DECIMAL(5,2) DEFAULT 0.00,
    commission_agence DECIMAL(5,2) DEFAULT 0.00,
    notifications_email BOOLEAN DEFAULT TRUE,
    notifications_retards BOOLEAN DEFAULT TRUE,
    sauvegarde_auto BOOLEAN DEFAULT TRUE,
    two_factor_enabled BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : two_factor_codes (codes 2FA envoyés par email)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.two_factor_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    attempts INT DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_2fa_email ON public.two_factor_codes (email);
CREATE INDEX IF NOT EXISTS idx_2fa_expires ON public.two_factor_codes (expires_at);

-- ============================================================
-- TABLE : appartements (biens immobiliers)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appartements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    titre VARCHAR(200) NOT NULL,
    type VARCHAR(50),           -- ex: T1, T2, Maison, Studio
    adresse TEXT NOT NULL,
    ville VARCHAR(100),
    code_postal VARCHAR(10),
    lat NUMERIC,
    lng NUMERIC,
    surface DECIMAL(10,2),      -- en m²
    nb_pieces INT,
    nb_chambres INT,
    nb_salles_bain INT,
    etage INT,
    loyer_base DECIMAL(10,2),
    charges DECIMAL(10,2) DEFAULT 0,
    depot_garantie DECIMAL(10,2),
    description TEXT,
    equipements JSONB DEFAULT '[]'::jsonb,
    statut VARCHAR(30) DEFAULT 'disponible',  -- disponible, loue, en_travaux
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : medias (photos des appartements)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    appartement_id UUID REFERENCES public.appartements(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    storage_path TEXT,           -- chemin dans Supabase Storage
    type VARCHAR(20) DEFAULT 'image',
    est_principale BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : locataires
-- ============================================================
CREATE TABLE IF NOT EXISTS public.locataires (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    telephone VARCHAR(20),
    date_naissance DATE,
    profession VARCHAR(100),
    revenus_mensuels DECIMAL(10,2),
    garant_nom VARCHAR(200),
    garant_telephone VARCHAR(20),
    garant_email VARCHAR(255),
    statut VARCHAR(20) DEFAULT 'actif',   -- actif, inactif
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : locations (baux - lien appartement <-> locataire)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    appartement_id UUID REFERENCES public.appartements(id) ON DELETE CASCADE NOT NULL,
    locataire_id UUID REFERENCES public.locataires(id) ON DELETE CASCADE NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE,                                  -- NULL = bail en cours
    loyer_mensuel DECIMAL(10,2) NOT NULL,
    charges_mensuelles DECIMAL(10,2) DEFAULT 0,
    depot_garantie DECIMAL(10,2),
    depot_garantie_restitue BOOLEAN DEFAULT FALSE,
    date_restitution_depot DATE,
    periodicite VARCHAR(20) DEFAULT 'mensuel',       -- mensuel, trimestriel
    jour_echeance INT DEFAULT 1,                     -- jour du mois
    indexation_annuelle BOOLEAN DEFAULT FALSE,
    type_bail VARCHAR(30) DEFAULT 'nu',              -- nu, meuble, mobilite
    statut VARCHAR(20) DEFAULT 'actif',              -- actif, termine, resilie
    notes TEXT,
    cles JSONB DEFAULT '[]'::jsonb,                  -- suivi du trousseau
    compteurs JSONB DEFAULT '[]'::jsonb,             -- relevés des fluides
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : paiements (loyers reçus)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.paiements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    montant_charges DECIMAL(10,2) DEFAULT 0,
    date_paiement DATE NOT NULL,
    date_echeance DATE,
    methode VARCHAR(30) DEFAULT 'virement',  -- virement, cheque, especes, prelevement
    statut VARCHAR(20) DEFAULT 'paye',       -- paye, en_attente, retard, partiel
    reference_bancaire VARCHAR(255),
    source VARCHAR(30) DEFAULT 'manuel',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : documents (pièces justificatives)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    appartement_id UUID REFERENCES public.appartements(id) ON DELETE SET NULL,
    locataire_id UUID REFERENCES public.locataires(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(50),        -- bail, etat_lieux, identite, quittance, assurance, autre
    url TEXT NOT NULL,
    storage_path TEXT,       -- chemin Supabase Storage
    taille_bytes BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : quittances (générées automatiquement)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quittances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    paiement_id UUID REFERENCES public.paiements(id) ON DELETE SET NULL,
    numero VARCHAR(50),          -- Numéro unique de quittance
    mois_annee VARCHAR(7),       -- ex: 2025-01
    montant_loyer DECIMAL(10,2),
    montant_charges DECIMAL(10,2),
    montant_total DECIMAL(10,2),
    date_emission DATE DEFAULT CURRENT_DATE,
    pdf_url TEXT,
    storage_path TEXT,
    envoye_par_email BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appartements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locataires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quittances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
-- two_factor_codes est géré par le serveur admin seulement (pas d'accès direct front)
CREATE POLICY "Service role only" ON public.two_factor_codes USING (FALSE);
CREATE POLICY "Users can manage own appartements" ON public.appartements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own medias" ON public.medias FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own locataires" ON public.locataires FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own locations" ON public.locations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own paiements" ON public.paiements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own documents" ON public.documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own quittances" ON public.quittances FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TABLE : etats_des_lieux
-- ============================================================
CREATE TABLE IF NOT EXISTS public.etats_des_lieux (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'entree', -- entree ou sortie
    date_creation TIMESTAMPTZ DEFAULT NOW(),
    date_realisation TIMESTAMPTZ,
    statut VARCHAR(20) DEFAULT 'brouillon', -- brouillon ou valide
    contenu JSONB DEFAULT '[]'::jsonb, -- Le tableau des pièces, éléments et états
    signatures JSONB DEFAULT '{}'::jsonb, -- { locataire: "b64", proprietaire: "b64", date: "..." }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.etats_des_lieux ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own etats des lieux" ON public.etats_des_lieux FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TABLE : email_accounts (Comptes de messagerie connectés)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    provider VARCHAR(50) DEFAULT 'other', -- orange, gmail, other
    imap_host VARCHAR(255) NOT NULL,
    imap_port INT DEFAULT 993,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own email accounts" ON public.email_accounts FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS : mise à jour automatique de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appartements_updated_at BEFORE UPDATE ON public.appartements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locataires_updated_at BEFORE UPDATE ON public.locataires FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_accounts_updated_at BEFORE UPDATE ON public.email_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_etats_des_lieux_updated_at BEFORE UPDATE ON public.etats_des_lieux FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER : création automatique du profil à l'inscription
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, prenom, nom)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'prenom',
    NEW.raw_user_meta_data->>'nom'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CARNET D'ADRESSES (CONTACTS PRESTATAIRES)
-- ============================================================
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom VARCHAR(255),
  nom VARCHAR(255),
  entreprise VARCHAR(255),
  role VARCHAR(100),
  telephone VARCHAR(50),
  email VARCHAR(255),
  adresse TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" 
  ON contacts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" 
  ON contacts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" 
  ON contacts FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" 
  ON contacts FOR DELETE 
  USING (auth.uid() = user_id);

