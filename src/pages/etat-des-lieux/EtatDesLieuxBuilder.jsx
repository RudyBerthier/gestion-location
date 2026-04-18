import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { etatsLieux } from '../../services/api';
import { defaultRooms, defaultElements } from '../../config/etat_lieux_defaults';
import { CheckCircle2, Plus, PenLine, FileText,
  Trash2, X, Save, Check
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

// ── Signature pad native (canvas HTML5) ──────────────────────────────────────
function NativeSignaturePad({ padRef }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)

  useEffect(() => {
    // Expose isEmpty / getTrimmedCanvas / clear on padRef
    padRef.current = {
      isEmpty: () => {
        const canvas = canvasRef.current
        if (!canvas) return true
        const ctx = canvas.getContext('2d')
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        return !data.some(v => v !== 0)
      },
      toDataURL: () => canvasRef.current?.toDataURL('image/png') ?? '',
      clear: () => {
        const canvas = canvasRef.current
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      },
    }
  }, [])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  const start = useCallback((e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    drawing.current = true
  }, [])

  const move = useCallback((e) => {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1e3a8a'
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [])

  const stop = useCallback(() => { drawing.current = false }, [])

  return (
    <canvas
      ref={canvasRef}
      width={600} height={160}
      className="w-full h-40 cursor-crosshair touch-none"
      onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
      onTouchStart={start} onTouchMove={move} onTouchEnd={stop}
    />
  )
}

export default function EtatDesLieuxBuilder() {
  const { id: locationId } = useParams(); // Le bail lié
  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Données de l'état des lieux
  const [edlId, setEdlId] = useState(null);
  const [type, setType] = useState('entree'); // 'entree' ou 'sortie'
  const [contenu, setContenu] = useState([]);
  
  // Navigation interne
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [showSignatures, setShowSignatures] = useState(false);
  
  // Modales
  const [addRoomModal, setAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  
  const [addElementModal, setAddElementModal] = useState(false);

  // Signatures (refs exposant isEmpty / toDataURL / clear)
  const sigTenant = useRef(null)
  const sigOwner = useRef(null)

  // 1. Charger ou Créer
  useEffect(() => {
    loadOrCreateDraft();
  }, [locationId]);

  const loadOrCreateDraft = async () => {
    try {
      setLoading(true);
      // Chercher s'il y a un brouillon pour ce bail
      const existingList = await etatsLieux.getByLocation(locationId);
      const draft = existingList.find(e => e.statut === 'brouillon');
      
      if (draft) {
        setEdlId(draft.id);
        setType(draft.type);
        setContenu(draft.contenu || []);
        if (!draft.contenu || draft.contenu.length === 0) prefillDefault();
      } else {
        // Demande le type via un prompt simple
        const choix = window.confirm("Quel type d'état des lieux ?\n\nCliquez OK pour Entrée, Annuler pour Sortie.");
        const edlType = choix ? 'entree' : 'sortie';
        setType(edlType);
        const newDraft = await etatsLieux.create({ location_id: locationId, type: edlType, user_id: user.id });
        setEdlId(newDraft.id);
        prefillDefault();
      }
    } catch (err) {
      showToast("Erreur d'initialisation", "error");
    } finally {
      setLoading(false);
    }
  };

  const prefillDefault = () => {
    const base = defaultRooms.map(r => ({
      id: Math.random().toString(36).substr(2, 9),
      piece: r,
      elements: []
    }));
    setContenu(base);
  };

  // 2. Sauvegarde auto/manuelle
  const saveDraft = async (newContenu = contenu, silent = true) => {
    if (!edlId) return;
    setSaving(true);
    try {
      await etatsLieux.update(edlId, { contenu: newContenu, statut: 'brouillon' });
      if (!silent) showToast("Brouillon sauvegardé", "success");
    } catch (err) {
      if (!silent) showToast("Erreur de sauvegarde", "error");
    }
    setSaving(false);
  };

  // 3. Gestion des modifications
  const updateElement = (roomIdx, elementIdx, field, value) => {
    const newContenu = [...contenu];
    newContenu[roomIdx].elements[elementIdx][field] = value;
    setContenu(newContenu);
    // Debounce save in real app, here we explicit save on blur or state change
  };

  const setEtat = (roomIdx, elementIdx, etatValue) => {
    updateElement(roomIdx, elementIdx, 'etat', etatValue);
    saveDraft([...contenu]); // trigger save immediately on state click
  };

  const handleAddRoom = () => {
    if (!newRoomName.trim()) return;
    const newC = [...contenu, { piece: newRoomName, elements: [], id: Math.random() }];
    setContenu(newC);
    setNewRoomName("");
    setAddRoomModal(false);
    saveDraft(newC);
    setActiveRoomIndex(newC.length - 1);
  };

  const handleAddDefaultElement = (elementName) => {
    const newC = [...contenu];
    newC[activeRoomIndex].elements.push({ 
      nom: elementName, 
      etat: null, 
      notes: '' 
    });
    setContenu(newC);
    setAddElementModal(false);
    saveDraft(newC);
  };

  const handleRemoveElement = (roomIdx, elIdx) => {
    const newC = [...contenu];
    newC[roomIdx].elements.splice(elIdx, 1);
    setContenu(newC);
    saveDraft(newC);
  };

  // 4. Finalisation
  const finalize = async () => {
    const tenantEmpty = sigTenant.current?.isEmpty()
    const ownerEmpty = sigOwner.current?.isEmpty()

    if (tenantEmpty || ownerEmpty) {
      showToast("Les deux signatures sont obligatoires", "error");
      return;
    }

    try {
      setSaving(true);
      const signatures = {
        locataire: sigTenant.current.toDataURL(),
        proprietaire: sigOwner.current.toDataURL(),
      };

      const response = await etatsLieux.update(edlId, {
        contenu,
        signatures,
        statut: 'valide'
      });

      if (response?.error) throw new Error(response.error)

      showToast("État des lieux validé !", "success");
      navigate(`/leases/${locationId}`);
    } catch (err) {
      console.error("Erreur finalisation:", err);
      showToast(`Erreur : ${err?.message || err?.response?.data?.error || 'Inconnue'}`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-white flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" /></div>;

  const currentRoom = contenu[activeRoomIndex] || { piece: 'Aucune', elements: [] };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR : Liste des pièces (affichée en haut sur mobile courtant, sidebar sur desktop) */}
      <div className="w-full md:w-64 bg-[var(--bg-secondary)] border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <CheckCircle2 className="w-5 h-5 text-violet-500" />
              EDL <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${ type === 'entree' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{type === 'entree' ? 'ENTRÉE' : 'SORTIE'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Brouillon en cours</p>
          </div>
          <button onClick={() => navigate(`/leases/${locationId}`)} className="p-2 text-slate-400 hover:text-white rounded-lg bg-[var(--bg-tertiary)]"><X className="w-4 h-4" /></button>
        </div>

        {/* Scroll horizontal mobile, vertical desktop */}
        <div className="flex-1 overflow-x-auto md:overflow-y-auto flex md:flex-col p-2 md:p-4 gap-2 no-scrollbar">
          {contenu.map((r, idx) => {
            const isCompleted = r.elements.length > 0 && r.elements.every(e => e.etat);
            return (
              <button
                key={r.id || idx}
                onClick={() => { setActiveRoomIndex(idx); setShowSignatures(false); }}
                className={`flex-shrink-0 md:w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between ${
                  activeRoomIndex === idx && !showSignatures
                    ? 'bg-violet-600 text-white shadow-lg'
                    : 'bg-[var(--bg-tertiary)] text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="font-medium truncate pr-2 text-sm">{r.piece}</span>
                {isCompleted && r.elements.length > 0 && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              </button>
            );
          })}
          
          <button 
            onClick={() => setAddRoomModal(true)}
            className="flex-shrink-0 md:w-full flex items-center gap-2 px-4 py-3 border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 rounded-xl transition text-sm"
          >
            <Plus className="w-4 h-4" /> Ajouter une pièce
          </button>
        </div>

        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={() => setShowSignatures(true)}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
              showSignatures ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <PenLine className="w-5 h-5" /> Terminer & Signer
          </button>
        </div>
      </div>

      {/* ZONE PRINCIPALE */}
      <div className="flex-1 flex flex-col h-[calc(100vh-140px)] md:h-screen overflow-hidden bg-[var(--bg-primary)]">
        
        {showSignatures ? (
          // --- ÉCRAN SIGNATURES ---
          <div className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-2">Signatures</h1>
                <p className="text-slate-400">Veuillez signer lisiblement pour sceller l'état des lieux.</p>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-2xl ring-1 ring-[var(--border)] p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[var(--text-primary)] font-medium">Signature Proprio / Mandataire</h3>
                  <button onClick={() => sigOwner.current?.clear()} className="text-xs text-slate-400 hover:text-white">Effacer</button>
                </div>
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 overflow-hidden">
                  <NativeSignaturePad padRef={sigOwner} />
                </div>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-2xl ring-1 ring-[var(--border)] p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[var(--text-primary)] font-medium">Signature Locataire</h3>
                  <button onClick={() => sigTenant.current?.clear()} className="text-xs text-slate-400 hover:text-white">Effacer</button>
                </div>
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 overflow-hidden">
                  <NativeSignaturePad padRef={sigTenant} />
                </div>
              </div>

              <button
                onClick={finalize}
                disabled={saving}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {saving ? "Validation..." : "Valider définitivement l'État des Lieux"}
              </button>
            </div>
          </div>
        ) : (
          // --- ÉCRAN ÉVALUATION ---
          <div className="flex-1 p-3 md:p-6 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] bg-[var(--bg-secondary)] px-4 py-2 rounded-xl inline-block border border-[var(--border)] shadow-md">
                {currentRoom.piece}
              </h1>
              {saving && <span className="text-xs flex items-center gap-1 text-slate-500"><Save className="w-3 h-3 animate-pulse" /></span>}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-20">
              {currentRoom.elements.length === 0 ? (
                <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border)] rounded-2xl p-8 text-center">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">Aucun élément dans cette pièce.</p>
                </div>
              ) : (
                currentRoom.elements.map((el, elIdx) => (
                  <div key={elIdx} className="bg-[var(--bg-secondary)] rounded-2xl ring-1 ring-[var(--border)] p-4 md:p-5 shadow-lg relative group">
                    <button onClick={() => handleRemoveElement(activeRoomIndex, elIdx)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 hidden group-hover:block transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 pr-8">{el.nom}</h3>
                    
                    {/* Boutons d'état (Mobile First, grosse zone tactile) */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                      {[ 
                        { val: 'tres_bon', label: 'Très Bon', color: 'emerald' },
                        { val: 'bon', label: 'Bon', color: 'lime' },
                        { val: 'usage', label: 'Usage', color: 'yellow' },
                        { val: 'mauvais', label: 'Mauvais', color: 'orange' },
                        { val: 'remplacer', label: 'À Remplacer', color: 'red' }
                      ].map(st => (
                        <button
                          key={st.val}
                          onClick={() => setEtat(activeRoomIndex, elIdx, st.val)}
                          className={`py-3 px-2 rounded-xl text-sm font-medium transition active:scale-95 ${
                            el.etat === st.val 
                              ? `bg-${st.color}-500 text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] ring-2 ring-${st.color}-400 ring-offset-2 ring-offset-slate-900` 
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-slate-700'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>

                    <textarea
                      placeholder="Commentaires ou observations..."
                      value={el.notes}
                      onChange={(e) => updateElement(activeRoomIndex, elIdx, 'notes', e.target.value)}
                      onBlur={() => saveDraft([...contenu])}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] rounded-xl p-3 text-sm focus:outline-none focus:border-violet-500 transition resize-none min-h-[80px]"
                    />
                  </div>
                ))
              )}

              <button
                onClick={() => setAddElementModal(true)}
                className="w-full py-4 border-2 border-dashed border-[var(--border)] text-slate-400 hover:text-violet-400 hover:border-violet-500/50 hover:bg-violet-500/5 rounded-2xl transition flex justify-center items-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" /> Ajouter un élément (Meuble, Mur...)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALES --- */}
      
      {/* Modale Ajout Pièce */}
      {addRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Nouvelle pièce</h3>
            <input 
              autoFocus
              type="text" 
              placeholder="Ex: Couloir, Buanderie..." 
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] px-4 py-3 rounded-xl mb-4 focus:outline-none focus:border-violet-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setAddRoomModal(false)} className="flex-1 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition">Annuler</button>
              <button onClick={handleAddRoom} className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition disabled:opacity-50">Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Ajout Élément (Grosse modale pleine de tuiles) */}
      {addElementModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl w-full max-w-4xl max-h-full flex flex-col shadow-2xl">
            <div className="p-4 md:p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-secondary)] rounded-t-3xl sticky top-0">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Qu'est-ce qu'on évalue ?</h3>
              <button onClick={() => setAddElementModal(false)} className="text-slate-400 hover:text-white p-2 bg-[var(--bg-tertiary)] rounded-full"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
              {/* Groupement par catégories rapides */}
              {[
                { title: 'Bâti & Structure', cat: 'structure' },
                { title: 'Menuiseries', cat: 'menuiserie' },
                { title: 'Électricité', cat: 'electricite' },
                { title: 'Plomberie', cat: 'plomberie' },
                { title: 'Électroménager', cat: 'electro' },
                { title: 'Ameublement', cat: 'meuble' },
                { title: 'Divers', cat: 'divers' }
              ].map(group => {
                const elements = Object.values(defaultElements).filter(e => e.categorie === group.cat);
                if (elements.length === 0) return null;
                return (
                  <div key={group.cat}>
                    <h4 className="text-slate-400 font-medium mb-3 uppercase tracking-wider text-xs">{group.title}</h4>
                    <div className="flex flex-wrap gap-2">
                      {elements.map(el => (
                        <button
                          key={el.nom}
                          onClick={() => handleAddDefaultElement(el.nom)}
                          className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-violet-500 hover:bg-violet-500/10 text-[var(--text-secondary)] rounded-xl transition text-sm active:scale-95"
                        >
                          + {el.nom}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="p-4 md:p-6 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
              <p className="text-xs text-slate-500 mb-2">Un élément manque ? Ajoutez-le manuellement :</p>
              <div className="flex gap-2">
                <input 
                  id="customEl"
                  type="text" 
                  placeholder="Nom de l'élément libre..." 
                  className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:border-violet-500 text-sm"
                />
                <button 
                  onClick={() => {
                    const val = document.getElementById('customEl').value.trim();
                    if(val) handleAddDefaultElement(val);
                  }} 
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition shadow-lg"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
