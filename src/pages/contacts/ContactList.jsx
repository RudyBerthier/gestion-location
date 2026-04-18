import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { contacts, emailAccounts } from '../../services/api';
import ContactForm from './ContactForm';
import ComposeEmailModal from '../../components/emails/ComposeEmailModal';
import { Plus, Search, Mail, Phone, MapPin, Building2, Briefcase, Trash2, Edit, Send, Loader2 } from 'lucide-react';

function DeleteModal({ contact, onConfirm, onCancel, loading }) {
  if (!contact) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white text-center mb-2">Supprimer ce contact ?</h3>
        <p className="text-slate-400 text-sm text-center mb-6">
          <span className="text-white font-medium">"{contact.prenom} {contact.nom}"</span> sera supprimé définitivement.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">Annuler</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-sm font-medium disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactList() {
  const { user } = useAuth();
  const showToast = useToast();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('Tous');
  
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', html: '', replyToAddress: '' });
  const [accounts, setAccounts] = useState([]);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchContacts();
    fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
    if (!user) return;
    try {
      const data = await emailAccounts.list();
      setAccounts(data || []);
    } catch (err) {
      console.error("Erreur accounts:", err);
    }
  };

  const fetchContacts = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await contacts.getAll();
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast("Erreur lors du chargement des contacts", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      setDeleting(true);
      const { error } = await contacts.delete(toDelete.id);
      if (error) throw error;
      showToast("Contact supprimé avec succès", "success");
      setToDelete(null);
      fetchContacts();
    } catch (err) {
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setDeleting(false);
    }
  };

  const openEmailModal = (contact) => {
    if (!contact.email) {
      showToast("Ce contact n'a pas d'adresse email renseignée.", "error");
      return;
    }
    setEmailData({
      to: contact.email,
      subject: '',
      html: '',
      replyToAddress: user.email
    });
    setShowEmailModal(true);
  };

  const filteredItems = items.filter(c => {
    const matchesSearch = (c.nom + ' ' + c.prenom + ' ' + c.entreprise).toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'Tous' || c.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const roles = ['Tous', ...new Set(items.map(i => i.role).filter(Boolean))];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Carnet d'adresses</h1>
          <p className="text-slate-400">Gérez vos artisans, agences et syndics</p>
        </div>
        <button
          onClick={() => { setEditingContact(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl font-medium transition"
        >
          <Plus className="w-5 h-5" />
          Nouveau contact
        </button>
      </div>

      {/* Filtres & Recherche uniformisés */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher un nom, entreprise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:bg-slate-900 transition"
          />
        </div>
        <div className="sm:w-64 shrink-0 relative">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 text-white rounded-xl pl-4 pr-10 py-2.5 text-sm appearance-none focus:outline-none focus:border-violet-500 focus:bg-slate-900 transition cursor-pointer"
          >
            {roles.map(r => <option key={r} value={r}>{r === 'Tous' ? 'Toutes les catégories' : r}</option>)}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 rounded-2xl ring-1 ring-slate-800">
          <Briefcase className="w-12 h-12 mx-auto text-slate-500 mb-3" />
          <p className="text-slate-400">Aucun contact trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map(contact => (
            <div key={contact.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:bg-slate-800/60 transition group relative overflow-hidden">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => { setEditingContact(contact); setShowForm(true); }} className="p-1.5 bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"><Edit className="w-4 h-4" /></button>
                <button onClick={() => setToDelete(contact)} className="p-1.5 bg-red-900/30 text-red-400 hover:text-red-300 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
              </div>

              <div className="flex items-start gap-4 mb-4 pr-16">
                <div className="w-12 h-12 rounded-xl bg-violet-600/20 flex flex-shrink-0 items-center justify-center text-violet-400 font-bold text-xl uppercase border border-violet-500/20">
                   {contact.prenom ? contact.prenom[0] : (contact.entreprise ? contact.entreprise[0] : '?')}
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-lg text-white truncate">
                    {contact.prenom} {contact.nom}
                  </h3>
                  <p className="text-sm font-medium text-violet-400 truncate flex items-center gap-1.5">
                    {contact.entreprise ? <><Building2 className="w-3.5 h-3.5" /> {contact.entreprise}</> : contact.role}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-sm text-slate-300">
                {contact.telephone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span>{contact.telephone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.adresse && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{contact.adresse}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-700 flex gap-2">
                <button
                  onClick={() => openEmailModal(contact)}
                  className="flex-1 bg-slate-700 hover:bg-violet-600 text-white flex items-center justify-center gap-2 py-2 rounded-xl font-medium transition"
                >
                  <Send className="w-4 h-4" /> Envoyer un e-mail
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ContactForm 
          contact={editingContact}
          onClose={() => setShowForm(false)} 
          onSave={() => { setShowForm(false); fetchContacts(); }} 
        />
      )}

      <DeleteModal 
        contact={toDelete} 
        onConfirm={handleDelete} 
        onCancel={() => setToDelete(null)} 
        loading={deleting} 
      />

      {/* MODALE ENVOI EMAIL (Réutilisée depuis la messagerie) */}
      <ComposeEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        initialData={emailData}
        accounts={accounts}
      />
    </div>
  );
}
