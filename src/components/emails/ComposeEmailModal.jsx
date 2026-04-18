import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, File as FileIcon, Trash2, Image as ImageIcon, ChevronDown, FolderOpen, Loader2, Search } from 'lucide-react';
import { mailbox, documents, storage } from '../../services/api';
import { supabase } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/[^>]+>/gi, '')
    .replace(/<[^>]+>/gi, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function ComposeEmailModal({ isOpen, onClose, initialData, accounts = [], activeAccountId = 'all' }) {
  const { user } = useAuth();
  const showToast = useToast();
  const fileInputRef = useRef(null);

  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    html: '',
    replyToAddress: ''
  });
  
  const [attachments, setAttachments] = useState([]); // { name: string, file: File, preview: string (base64) }
  const [sending, setSending] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // Documents platform state
  const [platformDocs, setPlatformDocs] = useState([]);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docSearch, setDocSearch] = useState('');

  const fetchPlatformDocs = async () => {
    if (platformDocs.length > 0) return;
    setLoadingDocs(true);
    try {
      const { data } = await documents.getAll();
      setPlatformDocs(data || []);
    } catch(e) {
      showToast("Erreur lors du chargement de vos documents.", "error");
    }
    setLoadingDocs(false);
  };

  const handlePickDoc = async (doc) => {
    try {
      const urlToPass = doc.url;
      if (!urlToPass) throw new Error("Document introuvable (pas d'URL connue)");

      const storagePath = doc.path || doc.storage_path || "";
      const extension = storagePath.split('.').pop() || 'pdf';
      let finalName = doc.nom || 'document';
      if (!finalName.toLowerCase().includes('.')) {
         finalName = `${finalName}.${extension}`;
      }

      // On crée un faux objet File pour l'UI, mais on utilisera l'URL pour l'envoi backend
      const fakeFile = new File([new Blob()], finalName, { type: doc.type || 'application/octet-stream' });

      setAttachments(prev => [...prev, {
        name: finalName,
        file: fakeFile,
        size: doc.taille_bytes || 0, // Optionnel, juste pour l'UI
        url: urlToPass, // Conservé pour legacy fallback si besoin
        storagePath: doc.path || doc.storage_path, // Le backend utilisera nativement ce chemin
        base64: null
      }]);
      setShowDocPicker(false);
      showToast("Document ajouté avec succès.", "success");
    } catch (e) {
      showToast("Erreur lors de l'ajout: " + e.message, "error");
    }
  };

  useEffect(() => {
    if (isOpen) {
      let defaultAccId = localStorage.getItem('last_used_email_account_id') || '';
      if (!defaultAccId && accounts && accounts.length > 0) {
        if (activeAccountId && activeAccountId !== 'all') {
          defaultAccId = activeAccountId;
        } else {
          defaultAccId = accounts[0].id;
        }
      }
      setSelectedAccountId(defaultAccId);

      const resolvedReplyTo = accounts.find(a => a.id === defaultAccId)?.email || '';

      setEmailData({
        to: initialData?.to || '',
        subject: initialData?.subject || '',
        html: initialData?.html ? stripHtml(initialData.html) : '',
        replyToAddress: resolvedReplyTo
      });
      setAttachments([]);
    }
  }, [isOpen, initialData, accounts, activeAccountId]);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check size limit (e.g. 10MB total)
    const currentSize = attachments.reduce((acc, att) => acc + att.file.size, 0);
    const newFilesSize = files.reduce((acc, f) => acc + f.size, 0);
    if (currentSize + newFilesSize > 15 * 1024 * 1024) {
      showToast("La taille totale des pièces jointes ne doit pas dépasser 15 Mo.", "error");
      return;
    }

    const newAttachments = await Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            name: file.name,
            file: file,
            size: file.size,
            base64: reader.result
          });
        };
        reader.readAsDataURL(file);
      });
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailData.to || !emailData.subject || (!emailData.html && attachments.length === 0)) {
      showToast("Veuillez remplir les champs obligatoires.", "error");
      return;
    }

    try {
      setSending(true);

      const payload = {
         ...emailData,
         accountId: selectedAccountId || undefined,
         userId: user?.id, // Utilisé pour l'historique en BDD
         html: emailData.html.replace(/\n/g, '<br>'), // Simple carriage return to BR
         attachments: attachments.map(att => ({
            filename: att.name,
            content: att.base64,
            url: att.url, // Pass the signed url directly to let Resend/Nodemailer fetch it
            storagePath: att.storagePath // Added: native Supabase path
         }))
      };

      const result = await mailbox.sendEmail(payload);
      if (result.success) {
        showToast("E-mail envoyé avec succès !", "success");
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || "Erreur lors de l'envoi", "error");
    } finally {
      setSending(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-3xl shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-3xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Nouveau Message
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 relative">
          
          {/* Header Fields */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 space-y-4">
            
            {/* Expéditeur */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-400 w-24">De</span>
              {accounts.length > 0 ? (
                <div className="flex-1 relative">
                  <select
                    value={selectedAccountId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedAccountId(val);
                      localStorage.setItem('last_used_email_account_id', val);
                      const resolvedReplyTo = accounts.find(a => a.id === val)?.email || '';
                      setEmailData(prev => ({ ...prev, replyToAddress: resolvedReplyTo }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500 transition appearance-none text-sm font-medium"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.email}</option>
                    ))}
                    <option value="">Resend (Serveur par défaut)</option>
                  </select>
                </div>
              ) : (
                <span className="text-sm text-slate-300">Resend (Serveur par défaut)</span>
              )}
            </div>
            
            <div className="flex items-center gap-4 border-t border-slate-700/50 pt-3">
              <span className="text-sm font-medium text-slate-400 w-24">À</span>
              <input
                type="email"
                required
                value={emailData.to}
                onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                placeholder="destinataire@exemple.com"
                className="flex-1 bg-transparent border-none text-white focus:ring-0 placeholder-slate-600 outline-none"
              />
            </div>
            
            <div className="flex items-center gap-4 border-t border-slate-700/50 pt-3">
              <span className="text-sm font-medium text-slate-400 w-24">Objet</span>
              <input
                type="text"
                required
                value={emailData.subject}
                onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                placeholder="Objet du message"
                className="flex-1 bg-transparent border-none text-white font-medium focus:ring-0 placeholder-slate-600 outline-none"
              />
            </div>
          </div>

          {/* Textarea */}
          <div className="h-64 sm:h-80 relative group">
            <textarea
              required
              value={emailData.html}
              onChange={(e) => setEmailData({...emailData, html: e.target.value})}
              placeholder="Saisissez votre message ici..."
              className="w-full h-full bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 resize-none outline-none leading-relaxed"
            ></textarea>
          </div>

          {/* Attachments List */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Pièces jointes ({attachments.length})</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {attachments.map((att, idx) => (
                  <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center gap-3 overflow-hidden group/att relative">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      {att.file.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-indigo-400" /> : <FileIcon className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <div className="truncate flex-1">
                      <p className="text-sm text-white font-medium truncate">{att.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(att.size)}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); removeAttachment(idx); }}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg opacity-0 shrink-0 group-hover/att:opacity-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/50 flex justify-between items-center rounded-b-3xl">
          <div className="flex items-center gap-2">
            <input 
               type="file" 
               multiple 
               className="hidden" 
               ref={fileInputRef} 
               onChange={handleFileChange} 
            />
            <button 
               type="button"
               onClick={() => fileInputRef.current?.click()}
               className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition font-medium"
               title="Depuis mon ordinateur"
            >
              <Paperclip className="w-4 h-4" />
              <span className="hidden sm:inline">Joindre</span>
            </button>
            <div className="relative">
              <div className="flex items-center gap-2 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700 rounded-xl px-3 py-2 transition-all focus-within:ring-1 focus-within:ring-violet-500/50 focus-within:border-violet-500 z-40 relative">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Chercher un document..."
                  value={docSearch}
                  onFocus={() => { setShowDocPicker(true); fetchPlatformDocs(); }}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-36 sm:w-48 transition-all"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showDocPicker && (platformDocs.length > 0 || loadingDocs) && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowDocPicker(false)} />
                  <div className="absolute bottom-[calc(100%+0.5rem)] left-0 w-64 sm:w-80 max-h-64 overflow-y-auto bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-40 flex flex-col gap-1 ring-1 ring-black/20">
                    {loadingDocs ? (
                       <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-violet-500 animate-spin" /></div>
                    ) : platformDocs.filter(d => (d.nom || '').toLowerCase().includes(docSearch.toLowerCase())).length === 0 ? (
                       <div className="py-6 text-center text-slate-400 text-sm">Aucun résultat</div>
                    ) : (
                       platformDocs.filter(d => (d.nom || '').toLowerCase().includes(docSearch.toLowerCase())).map((doc) => (
                        <button
                          type="button"
                          key={doc.id}
                          onClick={() => { handlePickDoc(doc); setShowDocPicker(false); setDocSearch(''); }}
                          className="flex items-center gap-3 p-2 bg-transparent hover:bg-violet-500/20 text-slate-300 hover:text-white font-medium text-left rounded-xl transition group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-700/50 group-hover:bg-violet-500/40 flex items-center justify-center flex-shrink-0 transition-colors">
                            {doc.mimetype?.startsWith('image') ? <ImageIcon className="w-4 h-4 text-slate-400 group-hover:text-violet-200" /> : <FileIcon className="w-4 h-4 text-slate-400 group-hover:text-violet-200" />}
                          </div>
                          <div className="flex-1 truncate">
                            <p className="truncate text-sm">{doc.nom}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={sending}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 transition"
          >
            {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>

      </div>
    </div>
  );
}
