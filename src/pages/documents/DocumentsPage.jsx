import React, { useState, useEffect, useCallback } from 'react'
import { documents as docsApi, locataires as locApi, storage } from '../../services/api'
import { smartProcessFile } from '../../utils/smartUpload'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FileText, Upload, Trash2, Download, Search, Loader2, Plus, X, File, Image, CalendarDays, User, Clock, Eye } from 'lucide-react'

const DOC_TYPES = ['Tous', 'bail', 'etat_lieux', 'identite', 'quittance', 'assurance', 'autre']
const TYPE_LABELS = { bail: 'Bail', etat_lieux: 'État des lieux', identite: 'Pièce d\'identité', quittance: 'Quittance', assurance: 'Assurance', autre: 'Autre' }
const TYPE_COLORS = {
  bail: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  etat_lieux: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  identite: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  quittance: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  assurance: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  autre: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

function UploadModal({ onClose, onSuccess }) {
  const { user } = useAuth()
  const toast = useToast()
  
  const [items, setItems] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [locataires, setLocataires] = useState([])

  useEffect(() => {
    locApi.getAll().then(res => setLocataires(res.data || []))
  }, [])

  const handleFiles = (filesNodeList) => {
    if (!filesNodeList || filesNodeList.length === 0) return
    const files = Array.from(filesNodeList)
    
    const newItems = files.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      originalFile: f,
      file: f,
      nom: f.name.replace(/\.[^/.]+$/, ''),
      type: 'autre',
      locataire_id: '',
      status: 'analyzing'
    }))
    
    setItems(prev => [...prev, ...newItems])

    newItems.forEach(async (item) => {
      try {
        const { file: finalFile, suggestedType, suggestedName } = await smartProcessFile(item.originalFile, locataires)
        setItems(prev => prev.map(p => 
          p.id === item.id 
            ? { ...p, file: finalFile, nom: suggestedName, type: suggestedType, status: 'ready' } 
            : p
        ))
      } catch (e) {
        console.error(e)
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'ready' } : p))
      }
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const updateItem = (id, changes) => {
    setItems(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
  }

  const removeItem = (id) => {
    setItems(prev => prev.filter(p => p.id !== id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const readyItems = items.filter(i => i.status === 'ready' && i.nom)
    if (readyItems.length === 0) return
    setUploading(true)
    
    let allSuccess = true
    for (const item of readyItems) {
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'uploading' } : p))
      try {
        const { path, url } = await storage.uploadMedia(item.file, 'documents', user.id)
        const { error } = await docsApi.create({
          user_id: user.id,
          nom: item.nom,
          type: item.type,
          url,
          path,            // used by TenantDetail
          storage_path: path, // used by DocumentsPage
          locataire_id: item.locataire_id || null,
          taille_bytes: item.file.size,
          mime_type: item.file.type,
        })
        if (error) throw error
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'done' } : p))
      } catch (error) {
        console.error(error)
        allSuccess = false
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error' } : p))
      }
    }
    
    if (allSuccess) {
      toast('Documents ajoutés avec succès !')
      onSuccess()
    } else {
      toast('Certains documents n\'ont pas pu être uploadés', 'error')
      setUploading(false)
    }
  }

  const inputCls = "w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition"

  const hasPendingItems = items.some(i => i.status === 'ready')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 max-w-2xl w-full my-auto shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">Ajouter des documents</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition bg-slate-800/50 hover:bg-slate-800 p-1.5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${dragging ? 'border-violet-500 bg-violet-500/5' : 'border-slate-700 hover:border-violet-500/50 hover:bg-slate-800/30'}`}
          >
            <input id="file-input" type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
            <Upload className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Glissez vos fichiers ici ou <span className="text-violet-400 font-medium">cliquez pour sélectionner</span></p>
            <p className="text-xs text-slate-600 mt-1">PDF, JPG, PNG pris en charge</p>
          </div>

          {items.length > 0 && (
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
              {items.map(item => (
                <div key={item.id} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                        {item.status === 'analyzing' ? (
                          <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                        ) : item.type.startsWith('image/') || item.file.type.startsWith('image/') ? (
                          <Image className="w-5 h-5 text-blue-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-violet-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.originalFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.status === 'analyzing' ? 'Analyse en cours...' : `${(item.file.size / 1024).toFixed(0)} Ko`}
                          {item.status === 'uploading' && ' • Envoi en cours...'}
                          {item.status === 'done' && <span className="text-emerald-400 ml-1">• Envoyé</span>}
                          {item.status === 'error' && <span className="text-red-400 ml-1">• Erreur</span>}
                        </p>
                      </div>
                    </div>
                    {item.status !== 'uploading' && item.status !== 'done' && (
                      <button type="button" onClick={() => removeItem(item.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {(item.status === 'ready' || item.status === 'error') && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-13">
                      <div>
                        <input 
                          value={item.nom} 
                          onChange={e => updateItem(item.id, { nom: e.target.value })} 
                          placeholder="Nom du document" 
                          className={inputCls} 
                          required 
                        />
                      </div>
                      <div>
                        <select 
                          value={item.type} 
                          onChange={e => updateItem(item.id, { type: e.target.value })} 
                          className={inputCls}
                        >
                          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <select 
                          value={item.locataire_id || ''} 
                          onChange={e => updateItem(item.id, { locataire_id: e.target.value || null })} 
                          className={inputCls}
                        >
                          <option value="">Aucun locataire</option>
                          {locataires.map(l => (
                            <option key={l.id} value={l.id}>{l.prenom} {l.nom}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800/80 text-white hover:bg-slate-700 transition text-sm font-medium">Fermer</button>
            <button 
              type="submit" 
              disabled={uploading || !hasPendingItems} 
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl text-sm disabled:opacity-50 transition shadow-lg shadow-violet-500/20"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Envoi en cours...' : 'Envoyer les documents'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
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

export default function DocumentsPage() {
  const [docs, setDocs] = useState([])
  const [locatairesMap, setLocatairesMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('Tous')
  const [showModal, setShowModal] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    const [{ data: docsData }, { data: locData }] = await Promise.all([
      docsApi.getAll(),
      locApi.getAll()
    ])
    setDocs(docsData || [])
    // Build id → name map
    const map = {}
    for (const l of (locData || [])) map[l.id] = `${l.prenom} ${l.nom}`
    setLocatairesMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const filtered = docs.filter(d => {
    const matchSearch = !search || d.nom?.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'Tous' || d.type === filterType
    return matchSearch && matchType
  })

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    await docsApi.deleteWithFile(toDelete)
    setDeleting(false)
    setToDelete(null)
    toast('Document supprimé')
    fetchDocs()
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
  }

  const isImage = (mime) => mime?.startsWith('image/')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-slate-400 text-sm mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''} stocké{docs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl transition shadow-lg shadow-violet-500/20 text-sm"
        >
          <Plus className="w-4 h-4" /> Ajouter un document
        </button>
      </div>

      {/* Filtres & Recherche uniformisés */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:bg-slate-900 transition"
          />
        </div>
        <div className="sm:w-64 shrink-0 relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 text-white rounded-xl pl-4 pr-10 py-2.5 text-sm appearance-none focus:outline-none focus:border-violet-500 focus:bg-slate-900 transition cursor-pointer"
          >
            {DOC_TYPES.map(t => <option key={t} value={t}>{t === 'Tous' ? 'Tous les types' : TYPE_LABELS[t] || t}</option>)}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{docs.length === 0 ? 'Aucun document' : 'Aucun résultat'}</h3>
          <p className="text-slate-400 text-sm max-w-xs">{docs.length === 0 ? 'Ajoutez vos baux, états des lieux, et pièces justificatives.' : 'Modifiez votre recherche.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => {
            const hasDateFacture = doc.date_facture
            const dateFactureLabel = hasDateFacture
              ? new Date(doc.date_facture + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
              : null
            const uploadedAt = doc.created_at
              ? new Date(doc.created_at).toLocaleDateString('fr-FR')
              : null

            return (
              <div
                key={doc.id}
                className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-4 hover:ring-slate-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 transition-all duration-200 group cursor-pointer flex flex-col gap-3"
                onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}
              >
                {/* Top: icon + name */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                    {isImage(doc.mime_type) ? <Image className="w-5 h-5 text-blue-400" /> : <FileText className="w-5 h-5 text-violet-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-violet-300 transition">{doc.nom}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatSize(doc.taille_bytes) || '—'}</p>
                  </div>
                </div>

                {/* Meta details */}
                <div className="space-y-1.5 border-t border-slate-800 pt-3">
                  {dateFactureLabel && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      <span className="capitalize">{dateFactureLabel}</span>
                    </div>
                  )}
                  {doc.locataire_id && locatairesMap[doc.locataire_id] && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{locatairesMap[doc.locataire_id]}</span>
                    </div>
                  )}
                  {uploadedAt && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Ajouté le {uploadedAt}</span>
                    </div>
                  )}
                </div>

                {/* Bottom: type badge + actions */}
                <div className="flex items-center justify-between mt-auto">
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${TYPE_COLORS[doc.type] || TYPE_COLORS.autre}`}>
                    {TYPE_LABELS[doc.type] || doc.type}
                  </span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        const btn = e.currentTarget;
                        btn.style.opacity = '0.5';
                        try {
                           const res = await fetch(doc.url);
                           if (!res.ok) throw new Error("Erreur réseau");
                           const blob = await res.blob();
                           const url = window.URL.createObjectURL(blob);
                           const a = document.createElement('a');
                           a.style.display = 'none';
                           a.href = url;
                           a.download = doc.nom.includes('.') ? doc.nom : `${doc.nom}.${(doc.path || doc.storage_path || '').split('.').pop() || 'pdf'}`;
                           document.body.appendChild(a);
                           a.click();
                           window.URL.revokeObjectURL(url);
                        } catch (err) {
                           window.open(doc.url, '_blank'); // fallback
                        } finally {
                           btn.style.opacity = '1';
                        }
                      }}
                      className="flex items-center justify-center p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                      title="Télécharger"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => window.open(doc.url, '_blank')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> Voir
                    </button>
                    <button 
                      onClick={() => setToDelete(doc)}
                      className="flex items-center justify-center p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500/60 hover:text-red-400 rounded-lg transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

        </div>
      )}

      {showModal && (
        <UploadModal 
          locataires={locatairesMap} 
          onClose={() => setShowModal(false)} 
          onSuccess={() => { setShowModal(false); fetchDocs() }} 
        />
      )}

      <DeleteModal 
        document={toDelete} 
        onConfirm={handleDelete} 
        onCancel={() => setToDelete(null)} 
        loading={deleting} 
      />
    </div>
  )
}
