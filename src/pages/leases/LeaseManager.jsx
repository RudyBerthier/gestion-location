import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { locations as api, etatsLieux, documents as docsApi, storage } from '../../services/api'
import { Key, Gauge, Save, ArrowLeft, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2, FileCheck, FileDown, Edit3, Receipt, Upload, Eye, Download, CalendarDays } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'

function DeleteModal({ title, subtitle, onConfirm, onCancel, loading }) {
  if (!title) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white text-center mb-2">{title}</h3>
        <p className="text-slate-400 text-sm text-center mb-6">{subtitle}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">Annuler</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-sm font-medium disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LeaseManager() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  
  const [lease, setLease] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cles, setCles] = useState([])
  const [compteurs, setCompteurs] = useState([])
  const [edls, setEdls] = useState([])
  const [edlToDelete, setEdlToDelete] = useState(null)
  const [deletingEdl, setDeletingEdl] = useState(false)
  const [cleToDelete, setCleToDelete] = useState(null)
  const [compteurToDelete, setCompteurToDelete] = useState(null)
  const newCleRef = useRef(null)
  
  const [factures, setFactures] = useState([])
  const [factureToDelete, setFactureToDelete] = useState(null)
  const [deletingFacture, setDeletingFacture] = useState(false)
  const [uploadingFacture, setUploadingFacture] = useState(false)
  const [factureDate, setFactureDate] = useState(new Date().toISOString().slice(0, 7))
  const factureFileRef = useRef(null)

  useEffect(() => {
    fetchLease()
  }, [id])

  const fetchLease = async () => {
    try {
      const { data, error } = await api.getById(id)
      if (error) throw error
      setLease(data)
      setCles(data.cles || [])
      setCompteurs(data.compteurs || [])
      const edlsList = await etatsLieux.getByLocation(id).catch(() => [])
      setEdls(edlsList || [])
      const { data: facData } = await docsApi.getAll({ location_id: id })
      setFactures((facData || []).sort((a, b) => b.date_facture?.localeCompare(a.date_facture || '') || 0))
    } catch (err) {
      toast("Impossible de charger le bail", "error")
    } finally {
      setLoading(false)
    }
  }

  const [savingCles, setSavingCles] = useState(false)
  const [savingCompteurs, setSavingCompteurs] = useState(false)
  const [editingCleId, setEditingCleId] = useState(null)   // id of the cle being edited
  const [editingCompteurId, setEditingCompteurId] = useState(null) // id of the compteur being edited
  const [draftCle, setDraftCle] = useState(null)       // backup for cancel
  const [draftCompteur, setDraftCompteur] = useState(null)

  const saveCles = async () => {
    setSavingCles(true)
    try {
      const { error } = await api.update(id, { cles })
      if (error) throw error
      toast("Trousseau de clés sauvegardé !", "success")
      setEditingCleId(null)
    } catch (err) {
      toast("Erreur lors de la sauvegarde", "error")
    } finally {
      setSavingCles(false)
    }
  }

  const saveCompteurs = async () => {
    setSavingCompteurs(true)
    try {
      const { error } = await api.update(id, { compteurs })
      if (error) throw error
      toast("Relevés compteurs sauvegardés !", "success")
      setEditingCompteurId(null)
    } catch (err) {
      toast("Erreur lors de la sauvegarde", "error")
    } finally {
      setSavingCompteurs(false)
    }
  }

  const startEditCle = (cle) => { setDraftCle({ ...cle }); setEditingCleId(cle.id) }
  const cancelEditCle = () => {
    if (draftCle) setCles(prev => prev.map(c => c.id === draftCle.id ? draftCle : c))
    setEditingCleId(null)
    setDraftCle(null)
  }
  const startEditCompteur = (comp) => { setDraftCompteur({ ...comp }); setEditingCompteurId(comp.id) }
  const cancelEditCompteur = () => {
    if (draftCompteur) setCompteurs(prev => prev.map(c => c.id === draftCompteur.id ? draftCompteur : c))
    setEditingCompteurId(null)
    setDraftCompteur(null)
  }

  // --- Gestion Clés ---
  const addCle = () => {
    const newId = Date.now()
    const newCle = { id: newId, nom: '', remise: 1, restituee: null }
    setCles(prev => [...prev, newCle])
    setDraftCle(null) // new item, no draft to restore
    setEditingCleId(newId)
    setTimeout(() => newCleRef.current?.focus(), 50)
  }
  const removeCle = (idToRemove) => {
    setCles(prev => prev.filter(c => c.id !== idToRemove))
    if (editingCleId === idToRemove) setEditingCleId(null)
  }
  const updateCle = (idToUpdate, field, value) => {
    setCles(prev => prev.map(c => c.id === idToUpdate ? { ...c, [field]: value } : c))
  }

  // --- Gestion Compteurs ---
  const FLUID_UNITS = {
    'Électricité': 'kWh',
    'Gaz': 'm³',
    'Eau froide': 'm³',
    'Eau chaude': 'm³',
  }
  const addCompteur = () => {
    const newId = Date.now()
    const newComp = { id: newId, type: 'Électricité', unite: 'kWh', entree: 0, sortie: null }
    setCompteurs(prev => [...prev, newComp])
    setDraftCompteur(null)
    setEditingCompteurId(newId)
  }
  const removeCompteur = (idToRemove) => {
    setCompteurs(prev => prev.filter(c => c.id !== idToRemove))
    if (editingCompteurId === idToRemove) setEditingCompteurId(null)
  }
  const updateCompteur = (idToUpdate, field, value) => {
    setCompteurs(prev => prev.map(c => {
      if (c.id !== idToUpdate) return c
      const updated = { ...c, [field]: value }
      if (field === 'type') updated.unite = FLUID_UNITS[value] || 'm³'
      return updated
    }))
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
  if (!lease) return <div className="p-6 text-slate-400">Bail introuvable.</div>

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              État des Lieux <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Bail Actif</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Appartement : <span className="font-semibold text-slate-300">{lease.appartements?.titre}</span> • 
              Locataire : <span className="font-semibold text-slate-300">{lease.locataires?.prenom} {lease.locataires?.nom}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TROUSSEAU DE CLÉS */}
        {/* ============================================================== */}
        <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-violet-400" /> Trousseau de Clés
            </h2>
            <button onClick={addCle} className="text-xs bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {cles.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 border-2 border-dashed border-slate-800 rounded-xl">Aucune clé renseignée.</p>
            ) : cles.map(cle => {
              const isEditing = editingCleId === cle.id
              const manque = cle.restituee !== null && cle.restituee < cle.remise

              if (isEditing) {
                return (
                  <div key={cle.id} className={`p-4 rounded-xl border ${manque ? 'border-red-500/30 bg-red-500/5' : 'border-violet-500/30 bg-violet-500/5'} grid gap-3`}>
                    <div className="flex items-center gap-3">
                      <input type="text" placeholder="Nom de la clé (ex: Badge vigik)" value={cle.nom}
                        ref={editingCleId === cle.id ? newCleRef : null}
                        onChange={e => updateCle(cle.id, 'nom', e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                      />
                      <button onClick={() => setCleToDelete(cle.id)} className="text-slate-500 hover:text-red-400 transition" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">Entrée (Remises)</label>
                        <input type="number" min="0" value={cle.remise} onChange={e => updateCle(cle.id, 'remise', Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">Sortie (Restituées)</label>
                        <input type="number" min="0" placeholder="N/A" value={cle.restituee === null ? '' : cle.restituee}
                          onChange={e => updateCle(cle.id, 'restituee', e.target.value === '' ? null : Number(e.target.value))}
                          className={`w-full bg-slate-950 border text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500 ${manque ? 'border-red-500/50 text-red-400' : 'border-slate-700 text-white'}`} />
                      </div>
                    </div>
                    {manque && (
                      <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 p-2 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5" /> Il manque {cle.remise - cle.restituee} clé(s).
                      </div>
                    )}
                    <div className="flex gap-2 pt-1 border-t border-slate-800">
                      <button onClick={cancelEditCle} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition">Annuler</button>
                      <button onClick={saveCles} disabled={savingCles} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 !text-white text-xs font-medium transition disabled:opacity-50">
                        {savingCles ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Sauvegarder
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={cle.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${manque ? 'border-red-500/30 bg-red-500/5' : 'border-slate-800 bg-slate-800/30'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Key className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{cle.nom || <span className="italic text-slate-500">Sans nom</span>}</p>
                      <p className="text-xs text-slate-500">{cle.remise} remisé{cle.remise > 1 ? 'es' : ''}{cle.restituee !== null ? ` · ${cle.restituee} restitué${cle.restituee > 1 ? 'es' : ''}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {manque ? (
                      <span className="text-xs font-semibold text-red-400 bg-red-400/10 px-2 py-1 rounded-lg mr-1">{cle.remise - cle.restituee} manquante(s)</span>
                    ) : cle.restituee !== null ? (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg mr-1">✓ Complètes</span>
                    ) : null}
                    <button onClick={() => setCleToDelete(cle.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => startEditCle(cle)} className="p-1.5 text-slate-500 hover:text-violet-400 transition" title="Modifier">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RELEVÉ DE COMPTEURS */}
        {/* ============================================================== */}
        <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-indigo-400" /> Relevés Compteurs
            </h2>
            <button onClick={addCompteur} className="text-xs bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {compteurs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 border-2 border-dashed border-slate-800 rounded-xl">Aucun compteur configuré.</p>
            ) : compteurs.map(comp => {
              const isEditing = editingCompteurId === comp.id
              const conso = comp.sortie !== null ? Math.max(0, comp.sortie - comp.entree) : null
              const icons = { 'Électricité': '⚡', 'Gaz': '🔥', 'Eau froide': '💧', 'Eau chaude': '☔' }

              if (isEditing) {
                return (
                  <div key={comp.id} className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 grid gap-3">
                    <div className="flex items-center gap-3 pr-0">
                      <div className="grid grid-cols-2 gap-3 flex-1">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Fluide</label>
                          <select value={comp.type} onChange={e => updateCompteur(comp.id, 'type', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-2 py-2 outline-none focus:border-indigo-500">
                            <option>Électricité</option><option>Gaz</option><option>Eau froide</option><option>Eau chaude</option>
                          </select>
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="block text-xs text-slate-400 mb-1">Unité</label>
                          <span className="inline-flex items-center px-3 py-2 bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-sm rounded-lg">{comp.unite}</span>
                        </div>
                      </div>
                      <button onClick={() => setCompteurToDelete(comp.id)} className="text-slate-500 hover:text-red-400 transition mt-4" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Index Entrée</label>
                        <input type="number" value={comp.entree} onChange={e => updateCompteur(comp.id, 'entree', Number(e.target.value))}
                          className="w-full bg-transparent text-white font-mono text-base outline-none border-b-2 border-slate-800 focus:border-indigo-500 transition px-1" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Index Sortie</label>
                        <input type="number" placeholder="N/A" value={comp.sortie === null ? '' : comp.sortie}
                          onChange={e => updateCompteur(comp.id, 'sortie', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full bg-transparent text-white font-mono text-base outline-none border-b-2 border-slate-800 focus:border-indigo-500 transition px-1" />
                      </div>
                    </div>
                    {conso !== null && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-400">Consommation :</span>
                        <span className="text-white font-bold font-mono">{conso.toLocaleString('fr-FR')} {comp.unite}</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1 border-t border-slate-800">
                      <button onClick={cancelEditCompteur} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition">Annuler</button>
                      <button onClick={saveCompteurs} disabled={savingCompteurs} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 !text-white text-xs font-medium transition disabled:opacity-50">
                        {savingCompteurs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Sauvegarder
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={comp.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-800 bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-base">{icons[comp.type] || '📊'}</div>
                    <div>
                      <p className="text-sm font-medium text-white">{comp.type}</p>
                      <p className="text-xs text-slate-500 font-mono">{comp.entree.toLocaleString('fr-FR')} {comp.unite} entrée{comp.sortie !== null ? ` · ${comp.sortie.toLocaleString('fr-FR')} sortie` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {conso !== null && (
                      <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-lg font-mono mr-1">{conso.toLocaleString('fr-FR')} {comp.unite}</span>
                    )}
                    <button onClick={() => setCompteurToDelete(comp.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => startEditCompteur(comp)} className="p-1.5 text-slate-500 hover:text-indigo-400 transition" title="Modifier">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>


        {/* ============================================================== */}
        {/* FACTURES ÉNERGIE */}
        {/* ============================================================== */}
        <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-400" /> Factures énergie
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={factureDate}
                onChange={e => setFactureDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500"
              />
              <button
                onClick={() => factureFileRef.current?.click()}
                disabled={uploadingFacture}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg border border-amber-500/20 transition disabled:opacity-50"
              >
                {uploadingFacture ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Ajouter
              </button>
              <input
                ref={factureFileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadingFacture(true)
                  try {
                    const { url, path } = await storage.uploadMedia(file, 'documents', user.id)
                    await docsApi.create({
                      location_id: id,
                      user_id: user.id,
                      nom: file.name,
                      type: 'facture_energie',
                      date_facture: factureDate,
                      url,
                      path,
                    })
                    toast('Facture ajoutée !', 'success')
                    const { data } = await docsApi.getAll({ location_id: id })
                    setFactures((data || []).sort((a, b) => b.date_facture?.localeCompare(a.date_facture || '') || 0))
                  } catch (err) {
                    toast("Erreur upload", 'error')
                  } finally {
                    setUploadingFacture(false)
                    e.target.value = ''
                  }
                }}
              />
            </div>
          </div>

          {factures.length === 0 ? (
            <button
              onClick={() => factureFileRef.current?.click()}
              className="flex flex-col items-center gap-2 py-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:border-amber-500/30 hover:text-amber-400 transition"
            >
              <Upload className="w-7 h-7" />
              <span className="text-sm">Aucune facture — cliquer pour ajouter</span>
            </button>
          ) : (
            <div className="space-y-2">
              {factures.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all group cursor-pointer"
                  onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 group-hover:text-white font-medium truncate transition">{doc.nom}</p>
                    {doc.date_facture && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(doc.date_facture + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition" onClick={e => e.stopPropagation()}>
                    <a href={doc.url} download={doc.nom} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => setFactureToDelete(doc)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* ÉTATS DES LIEUX 100% NUMÉRIQUE */}
        {/* ============================================================== */}
        <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 flex flex-col lg:col-span-2 h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" /> États des Lieux Numériques
            </h2>
            <button onClick={() => navigate(`/leases/${id}/etat-des-lieux`)} className="text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2 transition font-medium">
              <Plus className="w-4 h-4" /> Nouvel État des Lieux
            </button>
          </div>

          <div className="space-y-4 flex-1">
            {edls.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 border-2 border-dashed border-slate-800 rounded-xl">Aucun état des lieux n'a été créé.</p>
            ) : edls.map(edl => {
               const date = edl.date_realisation ? new Date(edl.date_realisation).toLocaleDateString('fr-FR') : 'Non finalisé'
               const isDraft = edl.statut === 'brouillon'
               
               return (
                 <div key={edl.id} className="p-4 rounded-xl border border-slate-800 bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDraft ? 'bg-yellow-500/10 text-yellow-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                       {isDraft ? <Edit3 className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
                     </div>
                     <div>
                       <h3 className="text-white font-medium capitalize">État des lieux d'{edl.type}</h3>
                       <p className="text-xs text-slate-400 mt-0.5">
                         {isDraft ? 'Brouillon en cours' : `Validé le ${date}`}
                       </p>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-2">
                     {isDraft ? (
                       <button onClick={() => navigate(`/leases/${id}/etat-des-lieux`)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition">
                         Continuer
                       </button>
                     ) : (
                       <button 
                         onClick={async () => {
                           toast("Génération du PDF...", "info");
                           try {
                             // Option 1: Use direct fetch to trigger download
                             const res = await fetch(etatsLieux.generatePdfUrl(edl.id), { method: 'POST' });
                             if (!res.ok) throw new Error("Erreur");
                             const blob = await res.blob();
                             const url = URL.createObjectURL(blob);
                             const a = document.createElement('a');
                             a.href = url;
                             a.download = `EDL_${edl.type.toUpperCase()}.pdf`;
                             a.click();
                             toast("PDF téléchargé", "success");
                           } catch (e) {
                             toast("Erreur génération PDF", "error");
                           }
                         }}
                         className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm transition flex items-center gap-2"
                       >
                         <FileDown className="w-4 h-4" /> Télécharger PDF
                       </button>
                     )}
                     
                     <button 
                       onClick={() => setEdlToDelete(edl)} 
                       className="p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               )
            })}
          </div>
        </div>

      </div>

      <DeleteModal 
        title={
          cleToDelete ? "Supprimer cette clé ?" :
          compteurToDelete ? "Supprimer ce compteur ?" :
          edlToDelete ? "Supprimer l'état des lieux ?" : 
          factureToDelete ? "Supprimer la facture ?" : ""
        }
        subtitle={
          cleToDelete ? "Cette clé sera retirée du trousseau." :
          compteurToDelete ? "Ce relevé de compteur sera supprimé définitivement." :
          edlToDelete ? "Êtes-vous sûr de vouloir supprimer cet état des lieux ? Cette action est irréversible." : 
          factureToDelete ? `La facture "${factureToDelete.nom}" sera supprimée définitivement.` : ""
        }
        loading={deletingEdl || deletingFacture}
        onCancel={() => { setCleToDelete(null); setCompteurToDelete(null); setEdlToDelete(null); setFactureToDelete(null); }}
        onConfirm={async () => {
          if (cleToDelete) {
            const newCles = cles.filter(c => c.id !== cleToDelete)
            setCles(newCles)
            setCleToDelete(null)
            try {
              await api.update(id, { cles: newCles })
              toast("Clé supprimée", "success")
            } catch (err) {
              toast("Erreur lors de la suppression", "error")
            }
          } else if (compteurToDelete) {
            const newCompteurs = compteurs.filter(c => c.id !== compteurToDelete)
            setCompteurs(newCompteurs)
            setCompteurToDelete(null)
            try {
              await api.update(id, { compteurs: newCompteurs })
              toast("Compteur supprimé", "success")
            } catch (err) {
              toast("Erreur lors de la suppression", "error")
            }
          } else if (edlToDelete) {
            setDeletingEdl(true)
            try {
              await etatsLieux.delete(edlToDelete.id)
              setEdls(edls.filter(e => e.id !== edlToDelete.id))
              toast("État des lieux supprimé", "success")
            } catch (err) {
              toast("Erreur lors de la suppression", "error")
            } finally {
              setDeletingEdl(false)
              setEdlToDelete(null)
            }
          } else if (factureToDelete) {
            setDeletingFacture(true)
            try {
              await docsApi.deleteWithFile(factureToDelete)
              setFactures(f => f.filter(x => x.id !== factureToDelete.id))
              toast('Facture supprimée', 'success')
            } catch (err) {
              toast('Erreur', 'error')
            } finally {
              setDeletingFacture(false)
              setFactureToDelete(null)
            }
          }
        }}
      />


    </div>
  )
}
