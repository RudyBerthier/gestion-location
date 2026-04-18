import React, { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2, Calendar,
  CreditCard, FileText, ClipboardCheck, Clock, Building2,
  Users, Pencil, Trash2, CalendarDays, Info, Link2, Copy, Check
} from 'lucide-react'
import { locations as locApi, paiements as payApi, calendarEvents as eventsApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../services/supabase'

// ─── Constantes ──────────────────────────────────────────────
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const EVENT_TYPES = {
  loyer:   { label: 'Loyer',        color: 'bg-violet-500/20 text-violet-300 border-violet-500/30',   dot: 'bg-violet-400',  icon: CreditCard },
  bail_fin: { label: 'Fin de bail',  color: 'bg-red-500/20 text-red-300 border-red-500/30',            dot: 'bg-red-400',     icon: FileText },
  bail_alerte: { label: 'Bail bientôt', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',  dot: 'bg-amber-400',   icon: FileText },
  edl:     { label: 'État des lieux', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400', icon: ClipboardCheck },
  rdv:     { label: 'Rendez-vous',   color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',         dot: 'bg-blue-400',    icon: Clock },
  visite:  { label: 'Visite',        color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',          dot: 'bg-cyan-400',    icon: Building2 },
  travaux: { label: 'Travaux',       color: 'bg-orange-500/20 text-orange-300 border-orange-500/30',   dot: 'bg-orange-400',  icon: Building2 },
  autre:   { label: 'Autre',         color: 'bg-slate-500/20 text-slate-300 border-slate-500/30',      dot: 'bg-slate-400',   icon: Calendar },
}

const inputCls = 'w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition'

// ─── Helpers ─────────────────────────────────────────────────
function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  // 0=Lundi … 6=Dimanche (format fr)
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

// ─── Modal Rendez-vous ────────────────────────────────────────
function EventModal({ onClose, onSuccess, initialDate = null, event = null, apartments = [], tenants = [] }) {
  const { user } = useAuth()
  const toast = useToast()
  const isEdit = !!event

  const [form, setForm] = useState({
    titre: event?.titre ?? '',
    description: event?.description ?? '',
    date: event?.date ?? initialDate ?? toDateKey(new Date()),
    heure: event?.heure ?? '',
    type: event?.type ?? 'rdv',
    appartement_id: event?.appartement_id ?? '',
    locataire_id: event?.locataire_id ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titre || !form.date) return
    setSaving(true)
    try {
      const payload = { ...form, appartement_id: form.appartement_id || null, locataire_id: form.locataire_id || null }
      if (isEdit) {
        const { error } = await eventsApi.update(event.id, payload)
        if (error) throw error
        toast('Rendez-vous mis à jour !', 'success')
      } else {
        const { error } = await eventsApi.create({ ...payload, user_id: user.id })
        if (error) throw error
        toast('Rendez-vous créé !', 'success')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Titre *</label>
            <input
              type="text"
              value={form.titre}
              onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
              placeholder="Ex: Visite appartement, Appel locataire..."
              className={inputCls}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Heure</label>
              <input type="time" value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
              <option value="rdv">Rendez-vous</option>
              <option value="visite">Visite</option>
              <option value="travaux">Travaux / Intervention</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Appartement lié</label>
            <select value={form.appartement_id} onChange={e => setForm(f => ({ ...f, appartement_id: e.target.value }))} className={inputCls}>
              <option value="">— Aucun —</option>
              {apartments.map(a => <option key={a.id} value={a.id}>{a.titre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Locataire lié</label>
            <select value={form.locataire_id} onChange={e => setForm(f => ({ ...f, locataire_id: e.target.value }))} className={inputCls}>
              <option value="">— Aucun —</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Détails supplémentaires..."
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl text-sm disabled:opacity-60 transition">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Enregistrement...' : (isEdit ? 'Sauvegarder' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Badge type d'événement ───────────────────────────────────
function EventBadge({ type, label }) {
  const cfg = EVENT_TYPES[type] ?? EVENT_TYPES.autre
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      {label ?? cfg.label}
    </span>
  )
}

// ─── Modal de confirmation de suppression ─────────────────────
function DeleteModal({ event, onClose, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-base font-bold text-white text-center mb-1">Supprimer ce rendez-vous ?</h2>
        <p className="text-sm text-slate-300 text-center font-medium mb-1">{event.titre}</p>
        {event.subtitle && <p className="text-xs text-slate-500 text-center mb-4">{event.subtitle}</p>}
        <p className="text-xs text-red-400 text-center mb-5 bg-red-500/10 rounded-lg p-2">Cette action est irréversible.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm disabled:opacity-60 transition">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Carte d'événement (panneau latéral) ─────────────────────
// ── Brand SVG icons ──────────────────────────────────────────
function IconGoogle({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function IconApple({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-slate-200">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

function IconOutlook({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="4" width="14" height="16" rx="2" fill="#0078D4"/>
      <rect x="9" y="7" width="14" height="13" rx="2" fill="#28A8E0"/>
      <path d="M9 7h8l-5.5 5.5L9 7z" fill="#fff" opacity=".3"/>
      <ellipse cx="7.5" cy="12" rx="3.5" ry="4" fill="#fff"/>
      <ellipse cx="7.5" cy="12" rx="2" ry="2.5" fill="#0078D4"/>
    </svg>
  )
}

// ─── Calendar export helper ──────────────────────────────────
function buildIcsContent(event) {
  const dateStr = (event.date || '').replace(/-/g, '')
  const timeStr = event.heure ? event.heure.replace(':', '') + '00' : '120000'
  const dtstart = `${dateStr}T${timeStr}`
  const dtend   = `${dateStr}T${(parseInt(timeStr.slice(0,4)) + 100).toString().padStart(4,'0')}00`
  const uid = `evt-${event.id || Date.now()}@gestion-locative`
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
    `DTSTART:${dtstart}`, `DTEND:${dtend}`,
    `SUMMARY:${(event.titre || '').replace(/,/g, '\\,')}`,
    `DESCRIPTION:${(event.description || '').replace(/,/g, '\\,').replace(/\n/g, '\\n')}`,
    `UID:${uid}`, 'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n')
}

function buildGoogleUrl(event) {
  const date = (event.date || '').replace(/-/g, '')
  const time = event.heure ? event.heure.replace(':', '') + '00' : '120000'
  const dates = `${date}T${time}/${date}T${(parseInt(time.slice(0,4)) + 100).toString().padStart(4,'0')}00`
  const p = new URLSearchParams({ text: event.titre || '', dates, details: event.description || '' })
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&${p}`
}

function downloadIcs(event) {
  const blob = new Blob([buildIcsContent(event)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `${(event.titre || 'evenement').replace(/\s+/g, '-')}.ics`
  a.click(); URL.revokeObjectURL(url)
}

function EventCard({ event, onEdit, onDelete }) {
  const cfg = EVENT_TYPES[event.type] ?? EVENT_TYPES.autre
  const Icon = cfg.icon
  const isManual = !!event.isManual

  return (
    <div className={`relative rounded-xl border p-3.5 transition hover:shadow-lg ${cfg.color}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/10">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{event.titre}</p>
          {event.subtitle && <p className="text-xs opacity-70 mt-0.5 truncate">{event.subtitle}</p>}
          {event.heure && (
            <p className="text-xs opacity-60 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {event.heure}
            </p>
          )}
          {event.description && <p className="text-xs opacity-60 mt-1 line-clamp-2">{event.description}</p>}
        </div>
        {isManual && (
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onEdit(event)} title="Modifier"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition">
              <Pencil className="w-3.5 h-3.5 text-white/70" />
            </button>
            <button onClick={() => onDelete(event)} title="Supprimer"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 transition">
              <Trash2 className="w-3.5 h-3.5 text-red-400/80" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────
export default function CalendarPage() {
  const { user } = useAuth()
  const toast = useToast()
  const today = new Date()

  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [events, setEvents] = useState({})        // { 'YYYY-MM-DD': [event, ...] }
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [deletingEvent, setDeletingEvent] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [modalDate, setModalDate] = useState(null)
  const [apartments, setApartments] = useState([])
  const [tenants, setTenants] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [feedUrl, setFeedUrl] = useState('')
  const [copiedUrl, setCopiedUrl] = useState(false)

  // Load ical feed URL on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const jwt = data?.session?.access_token
      if (!jwt) return
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      fetch(`${apiUrl}/api/calendar/token`, { headers: { Authorization: `Bearer ${jwt}` } })
        .then(r => r.json())
        .then(({ token, userId }) => {
          if (token && userId) {
            const feed = `${apiUrl}/api/calendar/feed/${userId}?token=${token}`
            setFeedUrl(feed)
          }
        })
        .catch(() => {})
    })
  }, [])

  const copyFeedUrl = () => {
    if (!feedUrl) return
    navigator.clipboard.writeText(feedUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  // ── Chargement des données ──────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [
        { data: locs },
        { data: pays },
        { data: edls },
        { data: manuals },
        { data: apts },
        { data: tens },
      ] = await Promise.all([
        locApi.getAll(),
        payApi.getAll(),
        supabase.from('etats_des_lieux').select('*, locations(*, appartements(titre), locataires(nom, prenom))'),
        eventsApi.getAll(),
        supabase.from('appartements').select('id, titre').order('titre'),
        supabase.from('locataires').select('id, nom, prenom').order('nom'),
      ])

      setApartments(apts || [])
      setTenants(tens || [])

      const evMap = {}
      const addEvent = (dateStr, ev) => {
        if (!evMap[dateStr]) evMap[dateStr] = []
        evMap[dateStr].push(ev)
      }

      // 1. Loyers : pour chaque bail actif, créer un event le jour d'échéance de chaque mois (sur 6 mois passés + 6 mois futurs)
      ;(locs || []).filter(l => l.statut === 'actif').forEach(loc => {
        const jour = loc.jour_echeance || 1
        for (let mOffset = -3; mOffset <= 6; mOffset++) {
          const d = new Date(today.getFullYear(), today.getMonth() + mOffset, jour)
          const existingPay = (pays || []).find(p =>
            p.location_id === loc.id &&
            new Date(p.date_paiement).getMonth() === d.getMonth() &&
            new Date(p.date_paiement).getFullYear() === d.getFullYear()
          )
          const dateKey = toDateKey(d)
          const isPast = d < today
          const statut = existingPay?.statut
          addEvent(dateKey, {
            id: `loyer-${loc.id}-${dateKey}`,
            type: statut === 'paye' ? 'loyer' : (isPast && !existingPay) ? 'loyer' : 'loyer',
            titre: `Loyer — ${loc.locataires?.prenom} ${loc.locataires?.nom}`,
            subtitle: `${loc.appartements?.titre} · ${loc.loyer_mensuel?.toLocaleString('fr-FR')} €${statut === 'paye' ? ' (payé)' : statut === 'retard' ? ' (retard)' : ''}`,
            isManual: false,
          })
        }
      })

      // 2. Fins de bail
      ;(locs || []).filter(l => l.date_fin).forEach(loc => {
        const finDate = new Date(loc.date_fin)
        const dateKey = toDateKey(finDate)
        const daysUntil = Math.ceil((finDate - today) / (1000 * 60 * 60 * 24))
        const type = daysUntil < 0 ? 'bail_fin' : daysUntil <= 60 ? 'bail_alerte' : null
        if (type) {
          addEvent(dateKey, {
            id: `bail-${loc.id}`,
            type,
            titre: daysUntil < 0 ? 'Bail terminé' : `Bail expire bientôt (J-${daysUntil})`,
            subtitle: `${loc.locataires?.prenom} ${loc.locataires?.nom} · ${loc.appartements?.titre}`,
            isManual: false,
          })
        }
      })

      // 3. États des lieux planifiés
      ;(edls || []).filter(e => e.date_realisation).forEach(edl => {
        const dateKey = edl.date_realisation.slice(0, 10)
        addEvent(dateKey, {
          id: `edl-${edl.id}`,
          type: 'edl',
          titre: `État des lieux ${edl.type === 'entree' ? 'Entrée' : 'Sortie'}`,
          subtitle: `${edl.locations?.locataires?.prenom} ${edl.locations?.locataires?.nom} · ${edl.locations?.appartements?.titre}`,
          isManual: false,
        })
      })

      // 4. Rendez-vous manuels
      ;(manuals || []).forEach(ev => {
        addEvent(ev.date, {
          id: ev.id,
          type: ev.type || 'rdv',
          titre: ev.titre,
          subtitle: [ev.appartements?.titre, ev.locataires ? `${ev.locataires.prenom} ${ev.locataires.nom}` : null].filter(Boolean).join(' · '),
          heure: ev.heure,
          description: ev.description,
          isManual: true,
          _raw: ev,
        })
      })

      setEvents(evMap)

      // Prochains événements (7 jours)
      const upcoming = []
      for (let i = 0; i <= 30; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
        const key = toDateKey(d)
        if (evMap[key]) {
          evMap[key].forEach(ev => upcoming.push({ ...ev, _date: d }))
        }
      }
      setUpcomingEvents(upcoming.slice(0, 10))

    } catch (err) {
      console.error(err)
      toast('Erreur de chargement', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Navigation ──────────────────────────────────────────────
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11) }
    else setCurrentMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0) }
    else setCurrentMonth(m => m + 1)
    setSelectedDay(null)
  }
  const goToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDay(today.getDate())
  }

  // ── Calendrier ─────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // ── Événements du jour sélectionné ─────────────────────────
  const selectedKey = selectedDay !== null
    ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : null
  const selectedEvents = selectedKey ? (events[selectedKey] || []) : []

  const isToday = (d) => d && d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
  const isSelected = (d) => d && d === selectedDay && selectedKey

  const getDayEvents = (d) => {
    if (!d) return []
    const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return events[key] || []
  }

  // ── Suppression event manuel ────────────────────────────────
  const handleDelete = (event) => {
    setDeletingEvent(event)
  }

  const confirmDelete = async () => {
    if (!deletingEvent) return
    setDeleting(true)
    const { error } = await eventsApi.delete(deletingEvent.id)
    setDeleting(false)
    if (error) toast('Erreur lors de la suppression', 'error')
    else { toast('Rendez-vous supprimé', 'success'); setDeletingEvent(null); fetchData() }
  }

  // ── Ouverture du modal d'édition ────────────────────────────
  const handleEdit = (event) => {
    setEditingEvent(event._raw)
    setShowModal(true)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendrier</h1>
          <p className="text-slate-400 text-sm mt-0.5">Vue temporelle de vos échéances</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={goToday}
            className="px-3 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => { setModalDate(toDateKey(today)); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl transition shadow-lg shadow-violet-500/20 text-sm"
          >
            <Plus className="w-4 h-4" /> Ajouter un RDV
          </button>
          <button
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition text-sm border border-slate-700"
            title="Synchroniser avec Google Calendar, Apple, Samsung..."
          >
            <Link2 className="w-4 h-4" /> Synchroniser
          </button>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 mb-5">
        {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Calendrier ── */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Navigation mois */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-white">
                {MONTHS_FR[currentMonth]} {currentYear}
              </h2>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Jours de semaine */}
            <div className="grid grid-cols-7 border-b border-slate-800">
              {DAYS_FR.map(d => (
                <div key={d} className={`py-2 text-center text-xs font-semibold ${d === 'Sam' || d === 'Dim' ? 'text-slate-600' : 'text-slate-500'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grille des jours */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {cells.map((day, idx) => {
                  const dayEvents = getDayEvents(day)
                  const weekend = (idx % 7 === 5) || (idx % 7 === 6)
                  // grouper les types de dots (max 4 dots distincts)
                  const dotTypes = [...new Set(dayEvents.map(e => e.type))].slice(0, 4)

                  return (
                    <div
                      key={idx}
                      onClick={() => day && setSelectedDay(selectedDay === day ? null : day)}
                      className={[
                        'min-h-[72px] p-1.5 border-b border-r border-slate-800/50 transition-all cursor-pointer relative',
                        !day ? 'bg-slate-950/40 cursor-default' : '',
                        day && !isToday(day) && !isSelected(day) ? 'hover:bg-slate-800/40' : '',
                        isToday(day) && !isSelected(day) ? 'bg-violet-500/5' : '',
                        isSelected(day) ? 'bg-violet-500/15' : '',
                        weekend && day ? 'bg-slate-900/50' : '',
                      ].join(' ')}
                    >
                      {day && (
                        <>
                          <span className={[
                            'flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mx-auto mb-1 transition',
                            isToday(day) ? 'bg-violet-500 text-white font-bold shadow-lg shadow-violet-500/40' : '',
                            isSelected(day) && !isToday(day) ? 'bg-violet-500/30 text-violet-300' : '',
                            !isToday(day) && !isSelected(day) ? (weekend ? 'text-slate-600' : 'text-slate-300') : '',
                          ].join(' ')}>
                            {day}
                          </span>
                          {/* Dots d'événements */}
                          {dotTypes.length > 0 && (
                            <div className="flex gap-0.5 justify-center flex-wrap">
                              {dotTypes.map(type => (
                                <span key={type} className={`w-1.5 h-1.5 rounded-full ${EVENT_TYPES[type]?.dot ?? 'bg-slate-400'}`} />
                              ))}
                            </div>
                          )}
                          {/* Nombre d'events si beaucoup */}
                          {dayEvents.length > 3 && (
                            <p className="text-center text-xs text-slate-600 mt-0.5">+{dayEvents.length - 3}</p>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Panneau latéral ── */}
        <div className="space-y-4">
          {/* Jour sélectionné */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 min-h-[200px]">
            {selectedDay && selectedKey ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">
                    {selectedDay} {MONTHS_FR[currentMonth]}
                  </h3>
                  <button
                    onClick={() => { setModalDate(selectedKey); setShowModal(true) }}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> RDV
                  </button>
                </div>

                {selectedEvents.length === 0 ? (
                  <div className="py-6 text-center">
                    <CalendarDays className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Aucun événement ce jour</p>
                    <button
                      onClick={() => { setModalDate(selectedKey); setShowModal(true) }}
                      className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition"
                    >
                      + Ajouter un rendez-vous
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedEvents.map(ev => (
                      <EventCard
                        key={ev.id}
                        event={ev}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <Info className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Sélectionnez un jour<br />pour voir les événements</p>
              </div>
            )}
          </div>

          {/* Prochaines échéances */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              Prochaines échéances
            </h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-800 animate-pulse rounded-lg" />)}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-slate-500 text-xs">Aucune échéance dans les 30 prochains jours</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev, idx) => {
                  const cfg = EVENT_TYPES[ev.type] ?? EVENT_TYPES.autre
                  const isEvToday = ev._date.toDateString() === today.toDateString()
                  const daysUntil = Math.ceil((ev._date - today) / (1000 * 60 * 60 * 24))
                  return (
                    <div
                      key={`${ev.id}-${idx}`}
                      className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0 cursor-pointer hover:bg-slate-800/30 rounded-lg px-1.5 -mx-1.5 transition"
                      onClick={() => { setCurrentMonth(ev._date.getMonth()); setCurrentYear(ev._date.getFullYear()); setSelectedDay(ev._date.getDate()) }}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{ev.titre}</p>
                        {ev.subtitle && <p className="text-xs text-slate-500 truncate">{ev.subtitle}</p>}
                      </div>
                      <span className={`text-xs font-medium flex-shrink-0 ${isEvToday ? 'text-violet-400' : 'text-slate-500'}`}>
                        {isEvToday ? 'Aujourd\'hui' : `J+${daysUntil}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modales ── */}
      {showModal && !editingEvent && (
        <EventModal
          onClose={() => { setShowModal(false); setModalDate(null) }}
          onSuccess={() => { setShowModal(false); setModalDate(null); fetchData() }}
          initialDate={modalDate}
          apartments={apartments}
          tenants={tenants}
        />
      )}
      {showModal && editingEvent && (
        <EventModal
          event={editingEvent}
          onClose={() => { setShowModal(false); setEditingEvent(null) }}
          onSuccess={() => { setShowModal(false); setEditingEvent(null); fetchData() }}
          apartments={apartments}
          tenants={tenants}
        />
      )}
      {deletingEvent && (
        <DeleteModal
          event={deletingEvent}
          onClose={() => setDeletingEvent(null)}
          onConfirm={confirmDelete}
          deleting={deleting}
        />
      )}

      {/* Modal synchronisation calendrier */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSyncModal(false)} />
          <div className="relative bg-slate-900 ring-1 ring-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center gap-3 p-5 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Link2 className="w-4 h-4 text-violet-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-white">Synchronisation calendrier</h2>
                <p className="text-xs text-slate-400 mt-0.5">Abonnez-vous pour une mise à jour automatique sur tous vos appareils</p>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* URL field */}
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">URL d'abonnement</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={feedUrl || 'Chargement...'}
                    className="flex-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none font-mono"
                    onFocus={e => e.target.select()}
                  />
                  <button
                    onClick={copyFeedUrl}
                    disabled={!feedUrl}
                    className="px-3 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl transition flex items-center gap-1.5 text-sm font-medium shrink-0"
                  >
                    {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedUrl ? 'Copié' : 'Copier'}
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-1.5">Gardez cette URL privée — elle donne accès à tout votre calendrier.</p>
              </div>

              {/* Direct add buttons */}
              <div>
                {(() => {
                  const isLocalhost = feedUrl.includes('localhost') || feedUrl.includes('127.0.0.1')
                  const webcalUrl = feedUrl.replace(/^https?:/, 'webcal:')
                  return (
                    <>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Ajouter directement</p>
                      <div className="grid grid-cols-3 gap-2">
                        <a
                          href={`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(feedUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center gap-2 p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl transition text-center"
                        >
                          <IconGoogle size={22} />
                          <span className="text-xs text-slate-300 font-medium leading-tight">Google Calendar</span>
                        </a>
                        {isLocalhost ? (
                          <button onClick={copyFeedUrl}
                            className="flex flex-col items-center gap-2 p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl transition text-center">
                            <IconApple size={22} />
                            <span className="text-xs text-slate-300 font-medium leading-tight">
                              {copiedUrl ? 'URL copiée !' : 'Apple Calendar'}
                            </span>
                          </button>
                        ) : (
                          <a href={webcalUrl}
                            className="flex flex-col items-center gap-2 p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl transition text-center">
                            <IconApple size={22} />
                            <span className="text-xs text-slate-300 font-medium leading-tight">Apple Calendar</span>
                          </a>
                        )}
                        {isLocalhost ? (
                          <button onClick={copyFeedUrl}
                            className="flex flex-col items-center gap-2 p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl transition text-center">
                            <IconOutlook size={22} />
                            <span className="text-xs text-slate-300 font-medium leading-tight">
                              {copiedUrl ? 'URL copiée !' : 'Samsung / Outlook'}
                            </span>
                          </button>
                        ) : (
                          <a href={webcalUrl}
                            className="flex flex-col items-center gap-2 p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl transition text-center">
                            <IconOutlook size={22} />
                            <span className="text-xs text-slate-300 font-medium leading-tight">Samsung / Outlook</span>
                          </a>
                        )}
                      </div>
                      {isLocalhost && (
                        <p className="text-xs text-amber-500/70 mt-2 text-center">
                          Mode local — cliquez Apple/Samsung pour copier l'URL, puis collez-la dans votre app calendrier.
                          En production HTTPS, les boutons ouvriront directement votre calendrier.
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Instructions accordion */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Instructions</p>
                {[
                  { BrandIcon: IconGoogle, title: 'Google Calendar', steps: ["Ouvrez Google Calendar sur ordinateur", "Cliquez sur le '+' à côté de 'Autres agendas'", "Choisissez 'À partir de l'URL'", "Collez l'URL et cliquez sur 'Ajouter'"] },
                  { BrandIcon: IconApple, title: 'Apple Calendar (iPhone / Mac)', steps: ["Copiez l'URL ci-dessus", "Ouvrez Calendrier → Fichier → Abonnement à un calendrier", "Collez l'URL et confirmez"] },
                  { BrandIcon: IconOutlook, title: 'Samsung / Outlook', steps: ["Ouvrez Samsung Calendar ou Outlook", "Allez dans Paramètres → Ajouter un compte → iCal", "Collez l'URL et sauvegardez"] },
                ].map(({ BrandIcon, title, steps }) => (
                  <details key={title} className="group bg-slate-800/40 border border-slate-700 rounded-xl">
                    <summary className="flex items-center gap-2.5 px-4 py-3 cursor-pointer text-sm font-medium text-white select-none list-none">
                      <BrandIcon size={15} />
                      <span className="flex-1">{title}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-open:rotate-90 transition-transform" />
                    </summary>
                    <ol className="px-4 pb-4 space-y-1">
                      {steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                          <span className="text-violet-500 font-bold shrink-0">{i + 1}.</span> {step}
                        </li>
                      ))}
                    </ol>
                  </details>
                ))}
              </div>
              <p className="text-xs text-slate-600 text-center">Mise à jour automatique toutes les heures environ selon l'application</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
