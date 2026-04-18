import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { appartements as aptApi, medias as mediasApi, storage } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ArrowLeft, Loader2, Save, Building2, Upload, X, GripVertical, Image as ImageIcon, Search, Link2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { ALL_EQUIPMENTS, getEquipmentIcon, getEquipmentLabel } from '../../config/equipments'
import { serverApi } from '../../services/api'
import DpeSection from '../../components/apartments/DpeSection'

// ── Schema ───────────────────────────────────────────────────
const numOpt = (msg) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: msg ?? 'Valeur invalide' }).optional()
  )

const strOpt = z.string({ invalid_type_error: 'Valeur invalide' }).optional()
const strReq = (msg) => z.string({ required_error: msg, invalid_type_error: msg }).min(1, msg)

const schema = z.object({
  titre:          strReq('Titre requis'),
  type:           strReq('Veuillez sélectionner un type'),
  statut:         strReq('Veuillez sélectionner un statut'),
  adresse:        strReq('Adresse requise'),
  ville:          strOpt,
  code_postal:    strOpt,
  lat:            z.number().optional(),
  lng:            z.number().optional(),
  surface:        numOpt('Surface invalide'),
  nb_pieces:      numOpt('Nombre de pièces invalide'),
  nb_chambres:    numOpt('Nombre de chambres invalide'),
  nb_salles_bain: numOpt('Nombre de salles de bain invalide'),
  etage:          numOpt("Numéro d'étage invalide"),
  equipements:    z.array(z.string()).optional(),
  loyer_base:     numOpt('Loyer invalide'),
  charges:        numOpt('Charges invalides'),
  depot_garantie: numOpt('Dépôt de garantie invalide'),
  description:    strOpt,
})


import AddressAutocomplete from '../../components/ui/AddressAutocomplete'

// ── Components ────────────────────────────────────────────────

function FormSection({ title, children }) {
  return (
    <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 space-y-4">
      <h2 className="text-base font-semibold text-white pb-3 border-b border-slate-800">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, error, children, required, name }) {
  return (
    <div data-field={name}>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label} {required && <span className="text-violet-400">*</span>}
      </label>
      <div className={error ? 'ring-1 ring-red-400/70 rounded-xl' : ''}>
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
        <span>⚠</span> {error}
      </p>}
    </div>
  )
}

const inputCls = "w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
const selectCls = inputCls

// ── Leboncoin Import Modal ────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function LeboncoinModal({ onClose, onImport }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  const handleFetch = async () => {
    if (!url.includes('leboncoin.fr')) {
      setError('Veuillez coller une URL Leboncoin valide.')
      return
    }
    setLoading(true)
    setError('')
    setPreview(null)
    try {
      const { data } = await serverApi.get(`/scrape/leboncoin?url=${encodeURIComponent(url)}`)
      setPreview(data)
    } catch (e) {
      setError(e.response?.data?.error || 'Impossible de charger l\'annonce.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setImporting(true)
    try {
      // Download images via proxy → convert to File objects
      const imageFiles = []
      const imageUrls = preview.images || []
      for (let i = 0; i < Math.min(imageUrls.length, 8); i++) {
        try {
          const proxyUrl = `${API_URL}/api/scrape/image-proxy?url=${encodeURIComponent(imageUrls[i])}`
          const resp = await fetch(proxyUrl)
          if (!resp.ok) continue
          const blob = await resp.blob()
          const ext = blob.type.includes('webp') ? 'webp' : blob.type.includes('png') ? 'png' : 'jpg'
          imageFiles.push(new File([blob], `leboncoin-${i + 1}.${ext}`, { type: blob.type || 'image/jpeg' }))
        } catch { /* ignore individual failures */ }
      }
      onImport({ ...preview, _sourceUrl: url }, imageFiles)
      onClose()
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 rounded-2xl ring-1 ring-slate-700 w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Link2 className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-white">Importer depuis Leboncoin</h2>
            <p className="text-xs text-slate-400 mt-0.5">Collez l'URL de l'annonce pour pré-remplir le formulaire</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              value={url}
              onChange={e => { setUrl(e.target.value); setError(''); setPreview(null) }}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
              placeholder="https://www.leboncoin.fr/locations/..."
              className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
            />
            <button
              onClick={handleFetch}
              disabled={loading || !url}
              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Extraire
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {preview && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Données extraites — vérifiez avant d'importer
              </div>

              {/* Thumbnails */}
              {preview.images?.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {preview.images.slice(0, 8).map((imgUrl, i) => (
                    <img
                      key={i}
                      src={`${API_URL}/api/scrape/image-proxy?url=${encodeURIComponent(imgUrl)}`}
                      alt={`Photo ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg shrink-0 bg-slate-700"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {[
                  { label: 'Titre', value: preview.titre },
                  // If address is incomplete, show city as zone hint
                  preview.adresse_incomplete
                    ? { label: 'Zone', value: preview.ville, warn: true }
                    : { label: 'Adresse', value: preview.adresse },
                  { label: 'Ville', value: preview.ville },
                  { label: 'CP', value: preview.code_postal },
                  { label: 'Loyer', value: preview.loyer_base ? `${preview.loyer_base} €` : '' },
                  { label: 'Surface', value: preview.surface ? `${preview.surface} m²` : '' },
                  { label: 'Pièces', value: preview.nb_pieces },
                  { label: 'Photos', value: preview.images?.length ? `${preview.images.length} photo(s)` : '' },
                ].filter(r => r?.value).map(({ label, value, warn }) => (
                  <div key={label} className="flex items-start gap-2 text-sm">
                    <span className="text-slate-500 w-16 shrink-0 pt-0.5">{label}</span>
                    <span className={`truncate ${warn ? 'text-amber-400' : 'text-white'}`}>{value}</span>
                  </div>
                ))}

                {/* Address incomplete banner */}
                {preview.adresse_incomplete && (
                  <div className="flex items-start gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Leboncoin masque l'adresse exacte. Ville et code postal seront importés — <strong>complétez l'adresse</strong> dans le formulaire.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium transition">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!preview || importing}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-medium transition flex items-center justify-center gap-2"
          >
            {importing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Téléchargement photos...</>
            ) : (
              'Importer'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function ApartmentForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const isEdit = Boolean(id)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { statut: 'disponible', equipements: [] },
  })

  // State local pour la recherche d'équipements
  const [eqSearch, setEqSearch] = useState('')
  const selectedEq = watch('equipements') || []
  const [showLeboncoin, setShowLeboncoin] = useState(false)

  const handleLeboncoinImport = (data, imageFiles = []) => {
    if (data.titre) setValue('titre', data.titre, { shouldValidate: true })
    // Only pre-fill address if Leboncoin provided an exact one
    if (data.adresse && !data.adresse_incomplete) {
      setValue('adresse', data.adresse, { shouldValidate: true })
    }
    if (data.ville) setValue('ville', data.ville)
    if (data.code_postal) setValue('code_postal', data.code_postal)
    if (data.loyer_base) setValue('loyer_base', data.loyer_base)
    if (data.surface) setValue('surface', data.surface)
    if (data.nb_pieces) setValue('nb_pieces', data.nb_pieces)
    if (data.description) setValue('description', data.description)
    // Type auto-detect
    if (data.nb_pieces === 1) setValue('type', 'T1')
    else if (data.nb_pieces === 2) setValue('type', 'T2')
    else if (data.nb_pieces === 3) setValue('type', 'T3')
    else if (data.nb_pieces >= 4) setValue('type', 'T4')
    // Import photos
    if (imageFiles.length > 0) addFiles(imageFiles)
    // Auto-fill Leboncoin URL
    if (data._sourceUrl) {
      const opt = PLATFORM_OPTIONS.find(p => p.key === 'leboncoin')
      setLiensAnnonces(prev => {
        const exists = prev.find(l => l.platform === 'leboncoin')
        if (exists) return prev.map(l => l.platform === 'leboncoin' ? { ...l, url: data._sourceUrl } : l)
        return [...prev, { platform: 'leboncoin', label: opt?.label || 'Leboncoin', url: data._sourceUrl }]
      })
    }
  }
  
  const handleToggleEq = (id) => {
    const current = watch('equipements') || []
    if (current.includes(id)) {
      setValue('equipements', current.filter(x => x !== id), { shouldDirty: true })
    } else {
      setValue('equipements', [...current, id], { shouldDirty: true })
    }
  }

  const filteredEqs = ALL_EQUIPMENTS.filter(e => e.label.toLowerCase().includes(eqSearch.toLowerCase()) && !selectedEq.includes(e.id))

  // ── Unified ordered photo list ────────────────────────────────
  // Each entry: { type: 'existing'|'new', id, url, file?, preview?, storage_path? }
  // First entry = principale automatically (no star needed)
  const [photoOrder, setPhotoOrder] = useState([])   // unified ordered list
  const [deletedMediaIds, setDeletedMediaIds] = useState([])
  const dragIndexRef = useRef(null)

  // Liens d'annonces — array of { platform, label, url }
  const PLATFORM_OPTIONS = [
    { key: 'leboncoin',  label: 'Leboncoin',  color: '#F56535' },
    { key: 'seloger',   label: 'SeLoger',    color: '#0F6FFF' },
    { key: 'pap',       label: 'PAP',        color: '#2EB800' },
    { key: 'bienici',   label: "Bien'ici",   color: '#00B3C6' },
    { key: 'logicimmo', label: 'Logic-Immo', color: '#E84B23' },
    { key: 'autre',     label: 'Autre',      color: '#888' },
  ]
  const [liensAnnonces, setLiensAnnonces] = useState([])  // [{ platform, label, url }]
  const [showAddLien, setShowAddLien]     = useState(false)
  const [newLienPlatform, setNewLienPlatform] = useState('leboncoin')
  const [newLienUrl, setNewLienUrl]       = useState('')

  const addLien = () => {
    const trimmed = newLienUrl.trim()
    if (!trimmed) return
    const opt = PLATFORM_OPTIONS.find(p => p.key === newLienPlatform)
    setLiensAnnonces(prev => [...prev, { platform: newLienPlatform, label: opt?.label || newLienPlatform, url: trimmed }])
    setNewLienUrl('')
    setShowAddLien(false)
  }
  const removeLien = (idx) => setLiensAnnonces(prev => prev.filter((_, i) => i !== idx))

  // DPE & Diagnostics
  const [dpe, setDpe] = useState({})
  const [diagnostics, setDiagnostics] = useState([])

  // Chargement en mode édition
  useEffect(() => {
    if (!isEdit) return
    aptApi.getById(id).then(({ data, error }) => {
      if (!error && data) {
        reset(data)
        const sorted = [...(data.medias || [])].sort((a, b) =>
          (b.est_principale ? 1 : 0) - (a.est_principale ? 1 : 0)
        )
        setPhotoOrder(sorted.map(m => ({ type: 'existing', id: m.id, url: m.url, storage_path: m.storage_path })))
        // Load existing liens
        if (Array.isArray(data.liens_annonces)) {
          setLiensAnnonces(data.liens_annonces)
        } else if (data.liens_annonces && typeof data.liens_annonces === 'object') {
          // legacy object format → convert
          const legacy = Object.entries(data.liens_annonces)
            .filter(([, v]) => v)
            .map(([k, v]) => { const opt = PLATFORM_OPTIONS.find(p => p.key === k); return { platform: k, label: opt?.label || k, url: v } })
          setLiensAnnonces(legacy)
        }
        // Load DPE
        if (data.dpe && typeof data.dpe === 'object') setDpe(data.dpe)
        if (Array.isArray(data.diagnostics)) setDiagnostics(data.diagnostics)
      }
    })
  }, [id, isEdit, reset])

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      user_id: user.id,
      liens_annonces: liensAnnonces.length > 0 ? liensAnnonces : null,
      dpe: Object.keys(dpe).length > 0 ? dpe : null,
      diagnostics: diagnostics.length > 0 ? diagnostics : null,
    }
    let aptId = id

    // 1. Sauvegarder appart
    if (isEdit) {
      const { error } = await aptApi.update(id, payload)
      if (error) return toast('Erreur lors de la sauvegarde', 'error')
    } else {
      const { data, error } = await aptApi.create(payload)
      if (error) return toast('Erreur lors de la création', 'error')
      aptId = data.id
    }

    // 2. Supprimer les médias retirés
    for (const mid of deletedMediaIds) {
      const entry = photoOrder.find(p => p.id === mid) || {}
      if (entry.storage_path) await storage.deleteFile(entry.storage_path)
      await mediasApi.delete(mid)
    }

    // 3. Uploader les nouveaux (in order)
    const uploadedMap = {}   // tempId → real media record
    for (const entry of photoOrder.filter(p => p.type === 'new')) {
      const { path, url } = await storage.uploadMedia(entry.file, 'medias')
      const { data: m } = await mediasApi.create({
        appartement_id: aptId,
        user_id: user.id,
        url,
        storage_path: path
      })
      if (m) uploadedMap[entry.id] = m
    }

    // 4. Set principale = first photo in final order
    const firstVisible = photoOrder.find(p => !deletedMediaIds.includes(p.id))
    if (firstVisible) {
      if (firstVisible.type === 'existing') {
        await mediasApi.setPrincipale(aptId, firstVisible.id)
      } else if (uploadedMap[firstVisible.id]) {
        await mediasApi.setPrincipale(aptId, uploadedMap[firstVisible.id].id)
      }
    }

    toast(isEdit ? 'Bien modifié avec succès' : 'Bien ajouté avec succès')
    navigate('/apartments')
  }

  // Called by RHF when form is submitted but has validation errors
  const onFormError = (errors) => {
    // Show toast
    const count = Object.keys(errors).length
    toast(`${count} champ${count > 1 ? 's' : ''} requis manquant${count > 1 ? 's' : ''} — vérifiez le formulaire`, 'error')
    // Scroll to the first field in error
    const firstKey = Object.keys(errors)[0]
    const el = document.querySelector(`[data-field="${firstKey}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Focus the input inside if possible
      const input = el.querySelector('input, textarea, select')
      if (input) setTimeout(() => input.focus(), 400)
    }
  }

  // File drop zone
  const handleDrop = (e) => {
    e.preventDefault()
    addFiles(Array.from(e.dataTransfer.files))
  }
  const handleFileSelect = (e) => {
    addFiles(Array.from(e.target.files))
  }
  const addFiles = async (files) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: true }
    const newEntries = []
    for (const file of imageFiles) {
      try {
        const compressed = await imageCompression(file, options)
        newEntries.push({
          type: 'new',
          id: Math.random().toString(36).substr(2, 9),
          file: compressed,
          preview: URL.createObjectURL(compressed)
        })
      } catch (err) { console.error('Compression error', err) }
    }
    setPhotoOrder(prev => [...prev, ...newEntries])
  }

  // ── Drag-and-drop reorder ────────────────────────────────────
  const [draggingIdx, setDraggingIdx] = useState(null)

  const onDragStart = (e, index) => {
    setDraggingIdx(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index)) // required for Firefox
  }
  const onDragEnter = (e, index) => {
    e.preventDefault()
    if (draggingIdx === null || draggingIdx === index) return
    setPhotoOrder(prev => {
      const next = [...prev]
      const [moved] = next.splice(draggingIdx, 1)
      next.splice(index, 0, moved)
      return next
    })
    setDraggingIdx(index)
  }
  const onDragOver = (e) => e.preventDefault()
  const onDragEnd = () => setDraggingIdx(null)

  const removePhoto = (entry) => {
    if (entry.type === 'existing') setDeletedMediaIds(p => [...p, entry.id])
    setPhotoOrder(prev => prev.filter(p => p.id !== entry.id))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/apartments')} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? 'Modifier le bien' : 'Nouveau bien'}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {isEdit ? 'Mettez à jour les informations' : 'Renseignez les informations de votre bien'}
          </p>
        </div>
        {!isEdit && (
          <button
            type="button"
            onClick={() => setShowLeboncoin(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 text-sm font-medium transition ml-auto"
          >
            <Link2 className="w-4 h-4" />
            Importer depuis Leboncoin
          </button>
        )}
      </div>

      {showLeboncoin && (
        <LeboncoinModal onClose={() => setShowLeboncoin(false)} onImport={handleLeboncoinImport} />
      )}

      <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-5">
        {/* Section 1 : Informations générales */}
        <FormSection title="Informations générales">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Titre" error={errors.titre?.message} required name="titre">
                <input {...register('titre')} placeholder="ex: Appartement T3 lumineux Paris 11°" className={inputCls} />
              </Field>
            </div>
            <Field label="Type" error={errors.type?.message} required name="type">
              <select {...register('type')} className={selectCls}>
                <option value="">Sélectionner...</option>
                {['Studio', 'T1', 'T2', 'T3', 'T4', 'T5+', 'Maison', 'Villa', 'Commerce', 'Autre'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Statut" error={errors.statut?.message} required name="statut">
              <select {...register('statut')} className={selectCls}>
                <option value="disponible">Disponible</option>
                <option value="loue">Loué</option>
                <option value="en_travaux">En travaux</option>
              </select>
            </Field>
          </div>

          <Field label="Adresse" error={errors.adresse?.message} required name="adresse">
            <AddressAutocomplete
              value={watch('adresse')}
              onChange={(val) => setValue('adresse', val, { shouldValidate: true })}
              onSelect={({ adresse, ville, code_postal, lat, lng }) => {
                setValue('adresse', adresse, { shouldValidate: true })
                if (ville) setValue('ville', ville, { shouldValidate: true })
                if (code_postal) setValue('code_postal', code_postal, { shouldValidate: true })
                if (lat) setValue('lat', lat)
                if (lng) setValue('lng', lng)
              }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ville" error={errors.ville?.message} name="ville">
              <input {...register('ville')} placeholder="Paris" className={inputCls} />
            </Field>
            <Field label="Code postal" error={errors.code_postal?.message} name="code_postal">
              <input {...register('code_postal')} placeholder="75011" className={inputCls} />
            </Field>
          </div>
        </FormSection>

        {/* Section 2 : Caractéristiques */}
        <FormSection title="Caractéristiques">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Surface (m²)" error={errors.surface?.message} name="surface">
              <input {...register('surface')} type="number" step="0.5" placeholder="65" className={inputCls} />
            </Field>
            <Field label="Nb. pièces" error={errors.nb_pieces?.message} name="nb_pieces">
              <input {...register('nb_pieces')} type="number" placeholder="3" className={inputCls} />
            </Field>
            <Field label="Nb. chambres" error={errors.nb_chambres?.message} name="nb_chambres">
              <input {...register('nb_chambres')} type="number" placeholder="2" className={inputCls} />
            </Field>
            <Field label="Salle(s) de bain" error={errors.nb_salles_bain?.message} name="nb_salles_bain">
              <input {...register('nb_salles_bain')} type="number" placeholder="1" className={inputCls} />
            </Field>
            <Field label="Étage" error={errors.etage?.message} name="etage">
              <input {...register('etage')} type="number" placeholder="3" className={inputCls} />
            </Field>
          </div>

          {/* Équipements Avancés */}
          <div>
            <p className="text-sm font-medium text-slate-300 mb-3">Équipements & Prestations</p>
            
            {/* Tags déjà sélectionnés */}
            {selectedEq.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-800/30 rounded-xl border border-slate-700/50">
                {selectedEq.map(id => {
                  const Icon = getEquipmentIcon(id)
                  const label = getEquipmentLabel(id)
                  return (
                    <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-lg text-sm">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                      <button type="button" onClick={() => handleToggleEq(id)} className="ml-1 text-violet-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Sélecteur avec recherche */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Rechercher un équipement (ex: Fibre, Piscine...)" 
                value={eqSearch} 
                onChange={(e) => setEqSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
              />
            </div>

            {/* Resultats filtrés */}
            {eqSearch && filteredEqs.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto mb-4 p-2 border border-slate-700 rounded-xl">
                {filteredEqs.map(e => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => { handleToggleEq(e.id); setEqSearch(''); }}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-700 text-left transition group"
                  >
                    <e.icon className="w-4 h-4 text-slate-400 group-hover:text-violet-400" />
                    <span className="text-sm text-slate-300 group-hover:text-white truncate">{e.label}</span>
                  </button>
                ))}
              </div>
            )}
            
            {eqSearch && filteredEqs.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Aucun équipement trouvé pour "{eqSearch}".</p>
            )}

            {/* Suggestions rapides (si pas de recherche en cours) */}
            {!eqSearch && (
              <div>
                <p className="text-xs text-slate-500 mb-2 uppercase font-semibold">Suggestions rapides</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_EQUIPMENTS.filter(e => ['fibre', 'clim', 'jardin', 'parking', 'balcon', 'cuisine_equipee', 'meuble'].includes(e.id) && !selectedEq.includes(e.id)).map(e => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => handleToggleEq(e.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:border-slate-600 text-slate-300 transition text-sm"
                    >
                      <e.icon className="w-3.5 h-3.5" /> {e.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FormSection>

        {/* Section 3 : Finances */}
        <FormSection title="Informations financières">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Loyer mensuel (€)" error={errors.loyer_base?.message} name="loyer_base">
              <input {...register('loyer_base')} type="number" step="0.01" placeholder="950" className={inputCls} />
            </Field>
            <Field label="Charges (€)" error={errors.charges?.message} name="charges">
              <input {...register('charges')} type="number" step="0.01" placeholder="80" className={inputCls} />
            </Field>
            <Field label="Dépôt de garantie (€)" error={errors.depot_garantie?.message} name="depot_garantie">
              <input {...register('depot_garantie')} type="number" step="0.01" placeholder="1900" className={inputCls} />
            </Field>
          </div>
        </FormSection>

        {/* Section 4 : Description */}
        <FormSection title="Description">
          <Field label="Description libre" error={errors.description?.message} name="description">
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Décrivez votre bien : lumineux, vue dégagée, proche transports..."
              className={`${inputCls} resize-none`}
            />
          </Field>
        </FormSection>

        {/* Section 5 : Liens d'annonces */}
        <FormSection title="Liens d'annonces">
          {/* Saved links */}
          {liensAnnonces.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {liensAnnonces.map((lien, idx) => {
                const opt = PLATFORM_OPTIONS.find(p => p.key === lien.platform)
                return (
                  <div key={idx} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0"
                      style={{ color: opt?.color || '#888', background: (opt?.color || '#888') + '18' }}
                    >
                      {lien.label}
                    </span>
                    <span className="flex-1 text-sm text-slate-300 truncate">{lien.url}</span>
                    <a
                      href={lien.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-violet-400 transition shrink-0"
                      title="Ouvrir"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeLien(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Inline add form */}
          {showAddLien ? (
            <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700 rounded-xl p-3">
              <select
                value={newLienPlatform}
                onChange={e => setNewLienPlatform(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-2 py-2 focus:outline-none focus:border-violet-500 shrink-0"
              >
                {PLATFORM_OPTIONS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <input
                autoFocus
                type="url"
                value={newLienUrl}
                onChange={e => setNewLienUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLien()}
                placeholder="https://..."
                className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition"
              />
              <button type="button" onClick={addLien}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-xl transition shrink-0 font-medium">
                Ajouter
              </button>
              <button type="button" onClick={() => { setShowAddLien(false); setNewLienUrl('') }}
                className="p-2 text-slate-500 hover:text-white transition shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddLien(true)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 transition px-1"
            >
              <span className="w-6 h-6 rounded-full border-2 border-dashed border-slate-600 hover:border-violet-400 flex items-center justify-center transition">
                <span className="text-lg leading-none">+</span>
              </span>
              Ajouter un lien d'annonce
            </button>
          )}
        </FormSection>

        {/* Section 6 : DPE & Diagnostics */}
        <FormSection title="DPE & Diagnostics">
          <DpeSection
            dpe={dpe}
            setDpe={setDpe}
            diagnostics={diagnostics}
            setDiagnostics={setDiagnostics}
          />
        </FormSection>

        {/* Section 7 : Photos */}

        <FormSection title="Galerie Photos">

          {/* Upload zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById('photo-upload').click()}
            className="border-2 border-dashed border-slate-700 hover:border-violet-500 hover:bg-violet-500/5 rounded-xl p-6 text-center cursor-pointer transition-colors mb-5 group"
          >
            <input id="photo-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
            <Upload className="w-7 h-7 text-slate-400 group-hover:text-violet-400 mx-auto mb-2 transition-colors" />
            <p className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">
              Glissez vos photos ici ou <span className="text-violet-500 font-medium">cliquez pour parcourir</span>
            </p>
          </div>

          {/* Photo grid */}
          {photoOrder.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <GripVertical className="w-3.5 h-3.5" />
                Glissez pour réordonner — la <span className="text-violet-500 font-semibold">1ère photo</span> est la principale
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {photoOrder.map((entry, index) => {
                  const src = entry.type === 'existing' ? entry.url : entry.preview
                  const isPrincipal = index === 0
                  const isDragging = draggingIdx === index
                  return (
                    <div
                      key={entry.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, index)}
                      onDragEnter={(e) => onDragEnter(e, index)}
                      onDragOver={onDragOver}
                      onDragEnd={onDragEnd}
                      className={`relative rounded-xl overflow-hidden aspect-square ring-2 transition-all duration-150 cursor-grab active:cursor-grabbing select-none
                        ${isPrincipal ? 'ring-violet-500 shadow-lg shadow-violet-500/20' : 'ring-transparent hover:ring-slate-400/50'}
                        ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}`}
                    >
                      <img
                        src={src}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover pointer-events-none"
                        draggable={false}
                      />

                      {/* Semi-dark vignette for control visibility on any photo */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />

                      {/* Top-right: delete — white bg visible in light + dark mode */}
                      <button
                        type="button"
                        onClick={() => removePhoto(entry)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-red-500 text-slate-600 hover:text-white shadow-md flex items-center justify-center transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Top-left: badge */}
                      {isPrincipal ? (
                        <div className="absolute top-2 left-2 bg-violet-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shadow tracking-wide">
                          Principale
                        </div>
                      ) : (
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white/90 text-slate-600 text-[10px] font-bold shadow-md flex items-center justify-center">
                          {index + 1}
                        </div>
                      )}

                      {/* Bottom center: drag handle */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-lg bg-white/80 text-slate-600 flex items-center justify-center shadow-sm">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </FormSection>


        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/apartments')} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl transition shadow-lg shadow-violet-500/20 text-sm disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSubmitting ? 'Sauvegarde...' : isEdit ? 'Sauvegarder' : 'Créer le bien'}
          </button>
        </div>
      </form>
    </div>
  )
}
