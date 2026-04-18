import React, { useState, useEffect, useCallback } from 'react'
import { paiements as payApi, locations as locApi, quittancesApi, emailAccounts as emailAccountsApi } from '../../services/api'
import { CreditCard, Plus, TrendingUp, AlertCircle, CheckCircle, Clock, X, Loader2, Calendar, Filter, FileText, Mail, Pencil, Trash2, Upload, Paperclip, ChevronDown, Download } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { storage, documents as docsApi } from '../../services/api'
import DataGrid from '../../components/ui/DataGrid'
import { exportToCSV } from '../../utils/csvExport'

const STATUTS = [
  { value: 'all', label: 'Tous' },
  { value: 'paye', label: 'Payé', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'en_attente', label: 'En attente', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'retard', label: 'En retard', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { value: 'partiel', label: 'Partiel', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
]

function StatutBadge({ statut }) {
  const s = STATUTS.find(s => s.value === statut)
  if (!s?.cls) return null
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>
}

const inputCls = "w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"

function PaymentModal({ onClose, onSuccess, locations, payment = null }) {
  const { user } = useAuth()
  const toast = useToast()
  const isEdit = !!payment

  const [form, setForm] = useState({
    location_id: payment?.location_id ?? '',
    montant: payment?.montant ?? '',
    montant_charges: payment?.montant_charges ?? '',
    date_paiement: payment?.date_paiement ?? new Date().toISOString().slice(0, 10),
    methode: payment?.methode ?? 'virement',
    statut: payment?.statut ?? 'paye',
    notes: payment?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [receipt, setReceipt] = useState(null)   // File | null
  const [dragging, setDragging] = useState(false)
  const fileRef = React.useRef(null)

  const handleLocationChange = (locId) => {
    const loc = locations.find(l => l.id === locId)
    setForm(f => ({
      ...f,
      location_id: locId,
      montant: (loc?.loyer_mensuel !== undefined && !isEdit) ? loc.loyer_mensuel : f.montant,
      montant_charges: (loc?.charges_mensuelles !== undefined && !isEdit) ? loc.charges_mensuelles : f.montant_charges,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.location_id || !form.montant || !form.date_paiement) return
    setSaving(true)
    try {
      const payload = { ...form, montant: Number(form.montant), montant_charges: Number(form.montant_charges) || 0 }
      let savedPayment
      if (isEdit) {
        const { data, error } = await payApi.update(payment.id, payload)
        if (error) throw error
        savedPayment = data
        toast('Paiement mis à jour !', 'success')
      } else {
        const { data, error } = await payApi.create({ ...payload, user_id: user.id })
        if (error) throw error
        savedPayment = data
        toast('Paiement enregistré !', 'success')
      }
      // Upload justificatif si présent
      if (receipt && savedPayment) {
        try {
          const { path, url } = await storage.uploadMedia(receipt, 'documents', user.id)
          const { error: docError } = await docsApi.create({
            user_id: user.id,
            nom: receipt.name.replace(/\.[^/.]+$/, ''),
            type: 'quittance',
            path,
            storage_path: path,
            url,
            mime_type: receipt.type,
            taille_bytes: receipt.size,
            location_id: form.location_id,
            paiement_id: savedPayment?.id ?? null,
          })
          if (docError) {
            // Si paiement_id n'existe pas encore en DB, retry sans
            if (docError.code === '42703') {
              await docsApi.create({
                user_id: user.id,
                nom: receipt.name.replace(/\.[^/.]+$/, ''),
                type: 'quittance',
                path,
                storage_path: path,
                url,
                mime_type: receipt.type,
                taille_bytes: receipt.size,
                location_id: form.location_id,
              })
            } else {
              throw docError
            }
          }
        } catch (uploadErr) {
          console.warn('Justificatif upload failed:', uploadErr)
          toast("Paiement enregistré, mais le justificatif n'a pas pu être uploadé.", 'warning')
        }
      }
      onSuccess()
    } catch (err) {
      console.error(err)
      toast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Modifier le paiement' : 'Enregistrer un paiement'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Bail *</label>
            <select
              value={form.location_id}
              onChange={e => handleLocationChange(e.target.value)}
              className={inputCls}
              required
              disabled={isEdit}
            >
              <option value="">Sélectionner un bail...</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.locataires?.prenom} {l.locataires?.nom} — {l.appartements?.titre}
                </option>
              ))}
            </select>
            {isEdit && <p className="text-xs text-slate-500 mt-1">Le bail ne peut pas être modifié.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Loyer (€) *</label>
              <input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} className={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Charges (€)</label>
              <input type="number" value={form.montant_charges} onChange={e => setForm(f => ({ ...f, montant_charges: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Date *</label>
              <input type="date" value={form.date_paiement} onChange={e => setForm(f => ({ ...f, date_paiement: e.target.value }))} className={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Statut</label>
              <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} className={inputCls}>
                <option value="paye">Payé</option>
                <option value="en_attente">En attente</option>
                <option value="retard">En retard</option>
                <option value="partiel">Partiel</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Méthode</label>
            <select value={form.methode} onChange={e => setForm(f => ({ ...f, methode: e.target.value }))} className={inputCls}>
              <option value="virement">Virement</option>
              <option value="cheque">Chèque</option>
              <option value="especes">Espèces</option>
              <option value="prelevement">Prélèvement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Référence, commentaire..." className={`${inputCls} resize-none`} />
          </div>

          {/* Justificatif */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Justificatif <span className="text-slate-500 font-normal">(optionnel)</span></label>
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setReceipt(e.target.files[0] || null)} />
            {receipt ? (
              <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
                <Paperclip className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span className="text-sm text-white flex-1 truncate">{receipt.name}</span>
                <button type="button" onClick={() => setReceipt(null)} className="text-slate-500 hover:text-red-400 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setReceipt(f) }}
                className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition ${dragging ? 'border-violet-500 bg-violet-500/5' : 'border-slate-700 hover:border-violet-500/50 hover:bg-slate-800/30'
                  }`}
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500">Glisser ou <span className="text-violet-400">choisir un fichier</span></span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl text-sm disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Enregistrement...' : (isEdit ? 'Sauvegarder' : 'Enregistrer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ payment, onClose, onSuccess }) {
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  const name = `${payment.locations?.locataires?.prenom} ${payment.locations?.locataires?.nom}`
  const amount = ((payment.montant || 0) + (payment.montant_charges || 0)).toLocaleString('fr-FR')

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await payApi.delete(payment.id)
    setDeleting(false)
    if (error) { toast('Erreur lors de la suppression', 'error') }
    else { toast('Paiement supprimé', 'success'); onSuccess() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-6 max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-white text-center mb-1">Supprimer ce paiement ?</h2>
        <p className="text-sm text-slate-400 text-center mb-1">{name}</p>
        <p className="text-sm font-bold text-white text-center mb-4">{amount} € — {new Date(payment.date_paiement).toLocaleDateString('fr-FR')}</p>
        <p className="text-xs text-red-400 text-center mb-5 bg-red-500/10 rounded-lg p-2">Cette action est irréversible.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">Annuler</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FinancePage() {
  const toast = useToast()
  const [payments, setPayments] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [deletingPayment, setDeletingPayment] = useState(null)
  const [docsMap, setDocsMap] = useState({})  // paiement_id → doc url
  const [expandedNotes, setExpandedNotes] = useState(new Set())
  const [deletingDoc, setDeletingDoc] = useState(null)
  const [sendingQuittance, setSendingQuittance] = useState(null)
  const [emailAccountsList, setEmailAccountsList] = useState([])
  const [selectedSendAccount, setSelectedSendAccount] = useState('')

  // Charger les comptes email configurés
  useEffect(() => {
    emailAccountsApi.list().then(data => {
      setEmailAccountsList(data || [])
      if (data?.length) setSelectedSendAccount(data[0].id)
    }).catch(() => { })
  }, [])

  const toggleNote = (id) => setExpandedNotes(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const deleteDoc = async (doc) => {
    try {
      await docsApi.deleteWithFile(doc)
      setDocsMap(prev => {
        const next = { ...prev }
        // Remove by paiement_id
        for (const [k, v] of Object.entries(next)) {
          if (v.id === doc.id) delete next[k]
        }
        return next
      })
      toast('Justificatif supprimé', 'success')
    } catch (e) {
      console.error(e)
      toast('Erreur lors de la suppression', 'error')
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: pays }, { data: locs }, { data: docs }] = await Promise.all([
      payApi.getAll(),
      locApi.getAll(),
      docsApi.getAll(),
    ])
    setPayments(pays || [])
    setLocations((locs || []).filter(l => l.statut === 'actif'))
    // Build map paiement_id -> doc for quick lookup
    const map = {}
    for (const d of (docs || [])) {
      if (d.paiement_id) map[d.paiement_id] = d
    }
    setDocsMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = filterStatut === 'all' ? payments : payments.filter(p => p.statut === filterStatut)

  const stats = {
    totalRecu: payments.filter(p => p.statut === 'paye').reduce((s, p) => s + (p.montant || 0) + (p.montant_charges || 0), 0),
    retards: payments.filter(p => p.statut === 'retard').length,
    enAttente: payments.filter(p => p.statut === 'en_attente').length,
    cesMois: payments.filter(p => {
      const d = new Date(p.date_paiement)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((s, p) => s + (p.montant || 0), 0),
  }

  const tableColumns = [
    {
      id: 'statut',
      label: 'Statut',
      sortable: true,
      render: (p) => <StatutBadge statut={p.statut} />
    },
    {
      id: 'locataire',
      label: 'Locataire',
      sortable: true,
      sortValue: p => `${p.locations?.locataires?.nom} ${p.locations?.locataires?.prenom}`,
      render: (p) => <p className="font-medium text-white">{p.locations?.locataires?.prenom} {p.locations?.locataires?.nom}</p>
    },
    {
      id: 'bien',
      label: 'Bien Ciblé',
      sortable: true,
      sortValue: p => p.locations?.appartements?.titre,
      render: (p) => <p className="text-slate-300">{p.locations?.appartements?.titre}</p>
    },
    {
      id: 'montant',
      label: 'Montant',
      sortable: true,
      sortValue: p => (p.montant || 0) + (p.montant_charges || 0),
      render: (p) => <p className="font-bold text-white">{((p.montant || 0) + (p.montant_charges || 0)).toLocaleString('fr-FR')} €</p>
    },
    {
      id: 'date_paiement',
      label: 'Échéance',
      sortable: true,
      render: (p) => <p className="text-slate-400 font-medium">{new Date(p.date_paiement).toLocaleDateString('fr-FR')}</p>
    },
    {
      id: 'actions_quittance',
      label: '', // Pas de label pour la colonne action
      sortable: false,
      render: (p) => {
        if (p.statut !== 'paye') return null
        return (
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => quittancesApi.download(p.id)}
              title="Télécharger Quittance"
              className="px-2 py-1.5 flex items-center gap-1.5 text-xs text-white bg-slate-800 hover:bg-violet-600 rounded-lg transition shadow-sm border border-slate-700/50 hover:border-violet-500/50"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSendingQuittance(p)}
              title="Envoyer au locataire par mail"
              className="p-1.5 text-slate-300 bg-slate-800 hover:bg-violet-600 rounded-lg transition shadow-sm border border-slate-700/50 hover:border-violet-500/50"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      }
    }
  ]

  const contextMenuItems = (p) => {
    const actions = []
    actions.push({ icon: Pencil, label: 'Modifier', onClick: () => setEditingPayment(p) })
    actions.push({ icon: Trash2, label: 'Supprimer', danger: true, onClick: () => setDeletingPayment(p) })
    return actions
  }

  const bulkActions = [
    {
      icon: CheckCircle,
      label: 'Marquer Payé',
      clearSelection: true,
      hideIf: (ids) => {
        const selected = payments.filter(p => ids.includes(p.id))
        return selected.every(p => p.statut === 'paye') // Vrai si TOUS les sélectionnés sont déjà payés
      },
      onClick: async (ids) => {
        setLoading(true)
        for (const id of ids) await payApi.update(id, { statut: 'paye' })
        fetchData()
        toast(`${ids.length} paiements approuvés !`, 'success')
      }
    },
    {
      icon: Download,
      label: 'Exporter CSV',
      onClick: (ids) => {
        const selected = payments.filter(p => ids.includes(p.id))
        exportToCSV(selected.map(p => ({
          Statut: p.statut,
          Locataire: `${p.locations?.locataires?.nom} ${p.locations?.locataires?.prenom}`,
          Bien: p.locations?.appartements?.titre,
          Montant: (p.montant || 0) + (p.montant_charges || 0),
          Date: new Date(p.date_paiement).toLocaleDateString('fr-FR'),
          Détails: p.notes || ''
        })), 'Finances')
      }
    },
    {
      icon: Trash2,
      label: 'Supprimer',
      danger: true,
      clearSelection: true,
      onClick: async (ids) => {
        if (window.confirm(`⚠️ Supprimer définitivement ${ids.length} paiement(s) ?`)) {
          setLoading(true)
          for (const id of ids) await payApi.delete(id)
          fetchData()
        }
      }
    }
  ]

  const renderRowExpanded = (p) => {
    const hasNote = !!p.notes
    const hasDoc = !!docsMap[p.id]
    if (!hasNote && !hasDoc) return null

    return (
      <div className="px-5 py-4">
        <div className="flex flex-col gap-3">
          {hasNote && (
            <div className="flex gap-3 items-start bg-slate-900 rounded-xl px-4 py-3 ring-1 ring-slate-700/60 w-full max-w-3xl shadow-md">
              <div className="w-1 self-stretch rounded-full bg-amber-400/80 flex-shrink-0" />
              <div>
                <p className="text-xs text-amber-500 font-bold uppercase mb-1">Notes internes</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{p.notes}</p>
              </div>
            </div>
          )}
          {hasDoc && (
            <div className="flex items-center gap-3 bg-slate-900 rounded-xl px-4 py-3 ring-1 ring-slate-700/60 w-max shadow-md">
              <div className="w-1 self-stretch rounded-full bg-violet-400/80 flex-shrink-0" />
              <Paperclip className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <a href={docsMap[p.id].url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-violet-300 hover:text-violet-200 truncate transition mr-4 font-medium">
                {docsMap[p.id].nom || 'Justificatif'}
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); setDeletingDoc(docsMap[p.id]) }}
                title="Supprimer la pièce jointe"
                className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Finance</h1>
          <p className="text-slate-400 text-sm mt-0.5">Suivi des paiements de loyers</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl transition shadow-lg shadow-violet-500/20 text-sm"
        >
          <Plus className="w-4 h-4" /> Enregistrer un paiement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Reçu (total)', value: `${stats.totalRecu.toLocaleString('fr-FR')} €`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Ce mois', value: `${stats.cesMois.toLocaleString('fr-FR')} €`, icon: Calendar, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
          { label: 'En attente', value: stats.enAttente, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'En retard', value: stats.retards, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className={`rounded-2xl border p-4 ${s.bg}`}>
              <Icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* Filtre + Table */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-300">Filtres</span>
          </div>
          {STATUTS.map(s => (
            <button
              key={s.value}
              onClick={() => setFilterStatut(s.value)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${filterStatut === s.value ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>
        ) : (
          <DataGrid
            data={filtered}
            columns={tableColumns}
            getContextMenuItems={contextMenuItems}
            bulkActions={bulkActions}
            renderRowExpanded={renderRowExpanded}
            emptyMessage="Aucun paiement trouvé."
            keyField="id"
          />
        )}
      </div>

      {/* Modales */}
      {showModal && (
        <PaymentModal locations={locations} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchData() }} />
      )}
      {editingPayment && (
        <PaymentModal payment={editingPayment} locations={locations} onClose={() => setEditingPayment(null)} onSuccess={() => { setEditingPayment(null); fetchData() }} />
      )}
      {deletingPayment && (
        <DeleteConfirmModal payment={deletingPayment} onClose={() => setDeletingPayment(null)} onSuccess={() => { setDeletingPayment(null); fetchData() }} />
      )}

      {/* Modal suppression pièce jointe */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Paperclip className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white text-center mb-1">Supprimer le justificatif ?</h2>
            <p className="text-sm text-slate-400 text-center mb-4 truncate px-2">{deletingDoc.nom}</p>
            <p className="text-xs text-red-400 text-center mb-5 bg-red-500/10 rounded-lg p-2">Le fichier sera définitivement supprimé.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingDoc(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">Annuler</button>
              <button
                onClick={async () => { await deleteDoc(deletingDoc); setDeletingDoc(null) }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation envoi quittance */}
      {sendingQuittance && (() => {
        const p = sendingQuittance
        const locataire = `${p.locations?.locataires?.prenom ?? ''} ${p.locations?.locataires?.nom ?? ''}`.trim()
        const email = p.locations?.locataires?.email || 'Aucune adresse email'
        const appt = p.locations?.appartements?.titre ?? ''
        const montant = ((p.montant || 0) + (p.montant_charges || 0)).toLocaleString('fr-FR')
        const dateObj = new Date(p.date_paiement)
        const mois = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center gap-4 mb-5 border-b border-slate-800 pb-4">
                <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Envoyer la quittance</h2>
                  <p className="text-sm text-slate-400">Confirmation d'envoi par email</p>
                </div>
              </div>

              {/* Infos Destinataire */}
              <div className="bg-slate-800/40 rounded-xl p-4 space-y-3 mb-5 text-sm ring-1 ring-slate-800">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Destinataire</span>
                  <div className="text-right">
                    <p className="text-white font-medium">{locataire}</p>
                    <p className={`text-xs ${email === 'Aucune adresse email' ? 'text-red-400' : 'text-slate-400'}`}>{email}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Période</span>
                  <span className="text-white font-medium capitalize">{mois}</span>
                </div>
              </div>

              {/* Sélecteur de compte expéditeur */}
              {emailAccountsList.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Expéditeur</p>
                  <select
                    value={selectedSendAccount}
                    onChange={e => setSelectedSendAccount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
                  >
                    {emailAccountsList.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.email}</option>
                    ))}
                    <option value="">Via Resend (domaine par défaut)</option>
                  </select>
                </div>
              )}

              {/* Aperçu du contenu de l'email */}
              <div className="mb-6">
                <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Aperçu de l'email</p>
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-violet-500/50"></div>
                  <p className="text-sm text-slate-300 font-medium mb-2">Bonjour {p.locations?.locataires?.prenom || ''},</p>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[90%]">
                    Veuillez trouver ci-joint votre quittance de loyer pour le bien <b>{appt}</b> concernant le mois de <b>{mois}</b>, d'un montant total de <b className="text-white">{montant} €</b>.
                  </p>
                  <div className="mt-3 flex items-center gap-2 bg-slate-800 w-max px-3 py-1.5 rounded-lg border border-slate-700">
                    <FileText className="w-4 h-4 text-violet-400" />
                    <span className="text-xs text-slate-300 font-medium">Quittance_{mois.replace(' ', '_')}.pdf</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSendingQuittance(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">Annuler</button>
                <button
                  disabled={email === 'Aucune adresse email'}
                  onClick={async () => {
                    setSendingQuittance(null)
                    toast('Envoi de la quittance...')
                    try {
                      await quittancesApi.sendEmail(p.id, selectedSendAccount || null)
                      toast('Quittance envoyée !', 'success')
                    }
                    catch { toast('Erreur envoi email', 'error') }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center gap-2 transition"
                >
                  <Mail className="w-4 h-4" /> Envoyer
                </button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
