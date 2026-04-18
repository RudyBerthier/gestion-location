import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { contacts } from '../../services/api';
import { X, Save, User, Building2, Briefcase, Phone, Mail, MapPin, FileText } from 'lucide-react';

export default function ContactForm({ contact, onClose, onSave }) {
  const { user } = useAuth();
  const showToast = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    prenom: contact?.prenom || '',
    nom: contact?.nom || '',
    entreprise: contact?.entreprise || '',
    role: contact?.role || 'Artisan',
    telephone: contact?.telephone || '',
    email: contact?.email || '',
    adresse: contact?.adresse || '',
    notes: contact?.notes || '',
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const dataToSave = { ...formData, user_id: user.id };
      let error;

      if (contact && contact.id) {
        dataToSave.updated_at = new Date().toISOString();
        const res = await contacts.update(contact.id, dataToSave);
        error = res.error;
      } else {
        const res = await contacts.create(dataToSave);
        error = res.error;
      }

      if (error) throw error;
      showToast(contact ? "Contact mis à jour avec succès" : "Contact créé avec succès", "success");
      onSave();
    } catch (err) {
      showToast("Erreur lors de la sauvegarde du contact", "error");
    } finally {
      setLoading(false);
    }
  };

  const roles = ['Plombier', 'Électricien', 'Serrurier', 'Peintre / Menuisier', 'Syndic', 'Agence Immobilière', 'Artisan', 'Autre'];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-xl font-bold text-white pr-8">
            {contact ? 'Modifier le contact' : 'Nouveau contact'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-2 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="contact-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2"><User className="w-4 h-4 text-violet-400"/> Prénom</label>
                <input
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500"
                  placeholder="Jean"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ">Nom</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500"
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2"><Building2 className="w-4 h-4 text-violet-400"/> Entreprise</label>
                <input
                  type="text"
                  name="entreprise"
                  value={formData.entreprise}
                  onChange={handleChange}
                  className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500"
                  placeholder="Plomberie Express"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2"><Briefcase className="w-4 h-4 text-violet-400"/> Métier / Rôle</label>
                <div className="relative">
                  <select
                     name="role"
                     value={formData.role}
                     onChange={handleChange}
                     className="w-full bg-slate-800 border-none rounded-xl pl-4 pr-10 py-3 text-white appearance-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                  >
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2"><Phone className="w-4 h-4 text-violet-400"/> Téléphone</label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  onBlur={(e) => {
                     let val = e.target.value.trim();
                     if (val && /^[1-9]/.test(val)) val = '0' + val;
                     setFormData(prev => ({ ...prev, telephone: val }));
                  }}
                  className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500"
                  placeholder="06 12 34 56 78"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2"><Mail className="w-4 h-4 text-violet-400"/> E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500"
                  placeholder="contact@entreprise.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2"><MapPin className="w-4 h-4 text-violet-400"/> Adresse</label>
              <input
                 type="text"
                 name="adresse"
                 value={formData.adresse}
                 onChange={handleChange}
                 className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500"
                 placeholder="12 rue de la République..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2"><FileText className="w-4 h-4 text-violet-400"/> Notes internes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Tarifs préférentiels, dispos..."
                className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 resize-none"
              ></textarea>
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="contact-form"
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
