import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { locataires as tenantApi, appartements as aptApi, locations as leaseApi, documents as docsApi, storage } from '../../services/api'
import { ArrowLeft, User, Phone, Mail, Building, Plus, Euro, X, Loader2, FileText, Settings, Key, Upload, Trash2, Download, Eye, FolderOpen, Shield, CreditCard, FileCheck, Briefcase, Receipt } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'

// ─── Document type config ────────────────────────────────────────────────────
const DOC_TYPES = [
  { id: 'identite',        label: "Pièce d'identité",       icon: Shield,      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  { id: 'releve_compte',   label: 'Relevé de compte',       icon: CreditCard,  color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { id: 'avis_imposition', label: "Avis d'imposition",      icon: FileCheck,   color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'justif_revenu',   label: 'Justificatif de revenus',icon: Briefcase,   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'bail',            label: 'Bail / Contrat',         icon: FileText,    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { id: 'assurance',       label: 'Assurance',              icon: Shield,      color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { id: 'quittance',       label: 'Quittance',              icon: Receipt,     color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  { id: 'autre',           label: 'Autre document',         icon: FileText,    color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
]

function getDocType(id) {
  return DOC_TYPES.find(d => d.id === id) || DOC_TYPES[DOC_TYPES.length - 1]
}

function DeleteModal({ document, onConfirm, onCancel, loading }) {
  if (!document) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white text-center mb-2">Supprimer ce document ?</h3>
        <p className="text-slate-400 text-sm text-center mb-6">
          <span className="text-white font-medium">"{document.nom}"</span> sera supprimé définitivement.
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
  )
}

// ─── AddLeaseModal ───────────────────────────────────────────────────────────
function AddLeaseModal({ tenant, onClose, onSuccess, apartments }) {
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({
    appartement_id: '',
    date_debut: new Date().toISOString().slice(0, 10),
    loyer_mensuel: '',
    charges_mensuelles: '',
    depot_garantie: '',
    periodicite: 'mensuel',
    jour_echeance: 1,
    statut: 'actif'
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.appartement_id || !form.date_debut || !form.loyer_mensuel) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        locataire_id: tenant.id,
        user_id: user.id,
        loyer_mensuel: Number(form.loyer_mensuel),
        charges_mensuelles: Number(form.charges_mensuelles) || 0,
        depot_garantie: Number(form.depot_garantie) || 0,
        jour_echeance: Number(form.jour_echeance),
        cles: [],
        compteurs: []
      }
      const { error } = await leaseApi.create(payload)
      if (error) throw error
      await aptApi.update(form.appartement_id, { statut: 'loue' })
      toast('Bail créé avec succès !', 'success')
      onSuccess()
    } catch (err) {
      toast('Erreur lors de la création du bail.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-400" /> Nouveau Bail
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-6">
          <p className="text-sm text-violet-300 flex items-center gap-2">
            <User className="w-4 h-4" /> Locataire : <strong>{tenant.prenom} {tenant.nom}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Appartement *</label>
            <select
              value={form.appartement_id}
              onChange={e => {
                const aptId = e.target.value
                const apt = apartments.find(a => a.id === aptId)
                setForm(f => ({
                  ...f,
                  appartement_id: aptId,
                  loyer_mensuel: apt?.loyer_base ?? f.loyer_mensuel,
                  charges_mensuelles: apt?.charges ?? f.charges_mensuelles,
                  depot_garantie: apt?.depot_garantie ?? f.depot_garantie
                }))
              }}
              className={inputCls} required
            >
              <option value="">Sélectionner un bien...</option>
              {apartments.filter(a => a.statut === 'disponible').map(a => (
                <option key={a.id} value={a.id}>{a.titre} - {a.ville}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Date de début *</label>
              <input type="date" value={form.date_debut} onChange={e => setForm(f => ({...f, date_debut: e.target.value}))} className={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Jour d'échéance *</label>
              <input type="number" min="1" max="28" value={form.jour_echeance} onChange={e => setForm(f => ({...f, jour_echeance: e.target.value}))} className={inputCls} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Loyer (€) *</label>
              <input type="number" value={form.loyer_mensuel} onChange={e => setForm(f => ({...f, loyer_mensuel: e.target.value}))} className={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Charges (€)</label>
              <input type="number" value={form.charges_mensuelles} onChange={e => setForm(f => ({...f, charges_mensuelles: e.target.value}))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Caution (€)</label>
              <input type="number" value={form.depot_garantie} onChange={e => setForm(f => ({...f, depot_garantie: e.target.value}))} className={inputCls} />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl text-sm disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Création...' : 'Créer le bail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Upload modal (same UX as DocumentsPage) ─────────────────────────────────
function TenantDocModal({ tenantId, onClose, onSuccess }) {
  const { user } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFiles = (fileList) => {
    if (!fileList?.length) return
    const newItems = Array.from(fileList).map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      originalFile: f,
      file: f,
      nom: f.name.replace(/\.[^/.]+$/, ''),
      type: 'autre',
      status: 'analyzing',
    }))
    setItems(prev => [...prev, ...newItems])
    newItems.forEach(async (item) => {
      try {
        const { smartProcessFile } = await import('../../utils/smartUpload')
        const { file: finalFile, suggestedType, suggestedName } = await smartProcessFile(item.originalFile, [])
        setItems(prev => prev.map(p =>
          p.id === item.id ? { ...p, file: finalFile, nom: suggestedName, type: suggestedType, status: 'ready' } : p
        ))
      } catch {
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'ready' } : p))
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const readyItems = items.filter(i => i.status === 'ready' && i.nom)
    if (!readyItems.length) return
    setUploading(true)
    let allok = true
    for (const item of readyItems) {
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'uploading' } : p))
      try {
        const { path, url } = await storage.uploadMedia(item.file, 'documents', user.id)
        const { error } = await docsApi.create({
          user_id: user.id,
          locataire_id: tenantId,
          nom: item.nom,
          type: item.type,
          url,
          path,
          storage_path: path,
          taille_bytes: item.file.size,
          mime_type: item.file.type,
        })
        if (error) throw error
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'done' } : p))
      } catch (err) {
        console.error(err)
        allok = false
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error' } : p))
      }
    }
    if (allok) {
      toast('Documents ajoutés !', 'success')
      onSuccess()
    } else {
      toast("Certains documents n'ont pas pu être envoyés", 'error')
      setUploading(false)
    }
  }

  const inputCls = "w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition"
  const hasPending = items.some(i => i.status === 'ready')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 max-w-xl w-full my-auto shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-400" /> Ajouter des justificatifs
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition bg-slate-800/50 hover:bg-slate-800 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
            onClick={() => document.getElementById('tenant-doc-input').click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${dragging ? 'border-violet-500 bg-violet-500/5' : 'border-slate-700 hover:border-violet-500/50 hover:bg-slate-800/30'}`}
          >
            <input id="tenant-doc-input" type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
            <Upload className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Glissez vos fichiers ici ou <span className="text-violet-400 font-medium">cliquez pour sélectionner</span></p>
            <p className="text-xs text-slate-600 mt-1">PDF, JPG, PNG, Word — type détecté automatiquement</p>
          </div>

          {/* File list */}
          {items.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {items.map(item => {
                const docType = DOC_TYPES.find(t => t.id === item.type) || DOC_TYPES[DOC_TYPES.length - 1]
                const Icon = docType.icon
                return (
                  <div key={item.id} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                        {item.status === 'analyzing'
                          ? <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                          : item.status === 'done'
                          ? <FileCheck className="w-4 h-4 text-emerald-400" />
                          : <FileText className="w-4 h-4 text-violet-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.originalFile.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.status === 'analyzing' && 'Analyse en cours...'}
                          {item.status === 'uploading' && <span className="text-violet-400">Envoi...</span>}
                          {item.status === 'done' && <span className="text-emerald-400">✓ Envoyé</span>}
                          {item.status === 'error' && <span className="text-red-400">✗ Erreur</span>}
                          {item.status === 'ready' && `${(item.file.size / 1024).toFixed(0)} Ko`}
                        </p>
                      </div>
                      {item.status !== 'uploading' && item.status !== 'done' && (
                        <button type="button" onClick={() => setItems(p => p.filter(x => x.id !== item.id))} className="p-1 text-slate-500 hover:text-red-400 rounded transition shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {(item.status === 'ready' || item.status === 'error') && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <input
                          value={item.nom}
                          onChange={e => setItems(prev => prev.map(p => p.id === item.id ? { ...p, nom: e.target.value } : p))}
                          placeholder="Nom du document"
                          className={inputCls}
                        />
                        <select
                          value={item.type}
                          onChange={e => setItems(prev => prev.map(p => p.id === item.id ? { ...p, type: e.target.value } : p))}
                          className={inputCls}
                        >
                          {DOC_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">Annuler</button>
            <button type="submit" disabled={uploading || !hasPending} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl text-sm disabled:opacity-50 transition">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Envoi en cours...' : 'Envoyer les documents'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Document section ────────────────────────────────────────────────────────
function DocumentsSection({ tenantId }) {
  const toast = useToast()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [docToDelete, setDocToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchDocs = useCallback(async () => {
    const { data } = await docsApi.getAll({ locataire_id: tenantId })
    setDocs(data || [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleDelete = async () => {
    if (!docToDelete) return
    setDeleting(true)
    try {
      await docsApi.deleteWithFile(docToDelete)
      setDocs(d => d.filter(x => x.id !== docToDelete.id))
      toast('Document supprimé', 'success')
    } catch {
      toast('Erreur suppression', 'error')
    } finally {
      setDeleting(false)
      setDocToDelete(null)
    }
  }

  // Documents whose type doesn't match any DOC_TYPE fall into 'autre'
  const normalizedDocs = docs.map(d => ({
    ...d,
    type: DOC_TYPES.find(t => t.id === d.type) ? d.type : 'autre'
  }))

  return (
    <>
      <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-400" /> Dossier justificatifs
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg transition"
          >
            <Upload className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-violet-400 animate-spin" /></div>
          ) : normalizedDocs.length === 0 ? (
            <button
              onClick={() => setShowModal(true)}
              className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-violet-400 hover:border-violet-500/40 hover:bg-violet-500/5 transition group"
            >
              <Upload className="w-8 h-8 transition" />
              <div className="text-center">
                <p className="text-sm font-medium">Déposer des justificatifs</p>
                <p className="text-xs mt-1 text-slate-600">Pièce d'identité, relevé de compte, avis d'imposition…</p>
              </div>
            </button>
          ) : (
            <div className="space-y-2">
              {DOC_TYPES.filter(t => normalizedDocs.some(d => d.type === t.id)).map(docType => {
                const typeDocs = normalizedDocs.filter(d => d.type === docType.id)
                const Icon = docType.icon
                return (
                  <div key={docType.id}>
                    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${docType.color}`}>
                        <Icon className="w-3 h-3" /> {docType.label}
                      </span>
                      <span className="text-xs text-slate-600">{typeDocs.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {typeDocs.map(doc => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-3 p-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all group cursor-pointer"
                          onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}
                        >
                          <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <span className="text-sm text-slate-300 group-hover:text-white flex-1 truncate transition" title={doc.nom}>{doc.nom}</span>
                          <span className="text-xs text-slate-600">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition" onClick={e => e.stopPropagation()}>
                            <a href={doc.url} download={doc.nom} className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition"><Download className="w-3.5 h-3.5" /></a>
                            <button onClick={() => setDocToDelete(doc)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {/* Add more button at the bottom */}
              <button
                onClick={() => setShowModal(true)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-violet-400 hover:bg-violet-500/5 border border-dashed border-slate-800 hover:border-violet-500/30 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter un document
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <TenantDocModal
          tenantId={tenantId}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchDocs() }}
        />
      )}

      <DeleteModal 
        document={docToDelete} 
        onConfirm={handleDelete} 
        onCancel={() => setDocToDelete(null)} 
        loading={deleting} 
      />
    </>
  )
}




// ─── Main TenantDetail ───────────────────────────────────────────────────────
export default function TenantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [tenant, setTenant] = useState(null)
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLeaseModal, setShowLeaseModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: tenData, error: tenError }, { data: aptsData }] = await Promise.all([
        tenantApi.getById(id),
        aptApi.getAll()
      ])
      if (tenError) throw tenError
      setTenant(tenData)
      setApartments(aptsData || [])
    } catch (err) {
      toast("Locataire introuvable", "error")
      navigate('/tenants')
    }
    setLoading(false)
  }, [id, navigate, toast])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
  if (!tenant) return null

  const activeLeases = (tenant.locations || []).filter(l => l.statut === 'actif')
  const pastLeases = (tenant.locations || []).filter(l => l.statut !== 'actif')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/tenants')} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center">
            <User className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{tenant.prenom} {tenant.nom}</h1>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${tenant.statut === 'actif' ? (activeLeases.length > 0 ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-slate-500'}`}></span>
              {tenant.statut === 'actif' ? (activeLeases.length > 0 ? 'En location' : 'Dossier Actif (Sans bail)') : 'Inactif'}
            </p>
          </div>
        </div>
        <button onClick={() => navigate(`/tenants/${tenant.id}/edit`)} className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl transition flex items-center gap-2 text-sm font-medium">
          <Settings className="w-4 h-4" /> Modifier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Colonne Gauche : Infos */}
        <div className="space-y-5 md:col-span-1">
          <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Coordonnées</h2>
            {tenant.telephone && (
              <div className="flex items-center gap-3 text-slate-300">
                <div className="p-2 bg-slate-800 rounded-lg"><Phone className="w-4 h-4 text-violet-400" /></div>
                <span className="text-sm">{tenant.telephone}</span>
              </div>
            )}
            {tenant.email && (
              <div className="flex items-center gap-3 text-slate-300">
                <div className="p-2 bg-slate-800 rounded-lg"><Mail className="w-4 h-4 text-violet-400" /></div>
                <span className="text-sm truncate">{tenant.email}</span>
              </div>
            )}
            {(tenant.emails_secondaires || []).length > 0 && (
              <div className="space-y-2 pl-11">
                {tenant.emails_secondaires.map((e, i) => (
                  <p key={i} className="text-xs text-slate-500 truncate">{e}</p>
                ))}
              </div>
            )}
            {(tenant.profession || tenant.revenus_mensuels) && (
              <>
                <hr className="border-slate-800 my-2" />
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Dossier</h2>
                {tenant.profession && <div className="text-sm text-slate-300"><span className="text-slate-500">Profession:</span> {tenant.profession}</div>}
                {tenant.revenus_mensuels && <div className="text-sm text-slate-300"><span className="text-slate-500">Revenus:</span> {tenant.revenus_mensuels.toLocaleString('fr-FR')} €/mois</div>}
              </>
            )}
            {(tenant.garant_nom) && (
              <>
                <hr className="border-slate-800 my-2" />
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Garant</h2>
                <div className="text-sm text-slate-300">{tenant.garant_nom}</div>
                {tenant.garant_telephone && <div className="text-xs text-slate-500">{tenant.garant_telephone}</div>}
                {tenant.garant_email && <div className="text-xs text-slate-500 truncate">{tenant.garant_email}</div>}
              </>
            )}
          </div>
        </div>

        {/* Colonne Droite : Baux + Documents */}
        <div className="space-y-6 md:col-span-2">
          {/* Contrats */}
          <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-violet-400" /> Contrats de location
              </h2>
              <button
                onClick={() => setShowLeaseModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" /> Créer un bail
              </button>
            </div>

            <div className="p-5 space-y-4">
              {tenant.locations?.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Ce locataire n'est associé à aucun bien.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeLeases.map(lease => (
                    <div key={lease.id} className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-emerald-400 mb-1">Actuel</p>
                        <p className="text-white font-medium">{lease.appartements?.titre}</p>
                        <p className="text-xs text-slate-400 mt-1">Depuis le {new Date(lease.date_debut).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white flex items-center justify-end gap-1"><Euro className="w-3 h-3 text-slate-500"/> {(lease.loyer_mensuel + (lease.charges_mensuelles || 0)).toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mt-1">Caution : {lease.depot_garantie || 0} €</p>
                      </div>
                      <div className="ml-4 pl-4 border-l border-slate-800">
                        <button onClick={() => navigate(`/leases/${lease.id}`)} className="p-2 bg-slate-800 hover:bg-violet-600 text-slate-300 hover:text-white rounded-lg transition" title="Gérer le bail">
                          <Key className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {pastLeases.length > 0 && <hr className="border-slate-800" />}
                  {pastLeases.map(lease => (
                    <div key={lease.id} className="p-4 bg-slate-800/20 border border-slate-700 rounded-xl flex items-center justify-between opacity-70">
                      <div>
                        <p className="text-white text-sm font-medium">{lease.appartements?.titre}</p>
                        <p className="text-xs text-slate-400 mt-1">Terminé (Entrée : {new Date(lease.date_debut).toLocaleDateString('fr-FR')})</p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-400 rounded-md">Ancien loyer</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Documents justificatifs */}
          <DocumentsSection tenantId={id} />
        </div>
      </div>

      {showLeaseModal && (
        <AddLeaseModal
          tenant={tenant}
          apartments={apartments}
          onClose={() => setShowLeaseModal(false)}
          onSuccess={() => { setShowLeaseModal(false); fetchData() }}
        />
      )}
    </div>
  )
}
