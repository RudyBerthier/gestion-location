import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { appartements as aptApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import {
  Building2, Plus, Search, SlidersHorizontal,
  MapPin, Maximize2, Euro, Edit, Eye, Trash2, Loader2, List, Map
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// ── Constantes ──────────────────────────────────────────────
const TYPES = ['Tous', 'Studio', 'T1', 'T2', 'T3', 'T4', 'T5+', 'Maison', 'Villa']
const STATUTS = [
  { value: 'all',        label: 'Tous',          color: '' },
  { value: 'disponible', label: 'Disponible',     color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'loue',       label: 'Loué',           color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  { value: 'en_travaux', label: 'En travaux',     color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
]

const GRADIENT_BY_TYPE = {
  Studio: 'from-violet-600 to-indigo-700',
  T1: 'from-indigo-600 to-blue-700',
  T2: 'from-blue-600 to-cyan-700',
  T3: 'from-teal-600 to-emerald-700',
  T4: 'from-emerald-600 to-green-700',
  Maison: 'from-amber-600 to-orange-700',
  Villa: 'from-orange-600 to-red-700',
}

const createCustomIcon = (statut) => {
  const colorMatch = {
    disponible: 'bg-emerald-500',
    loue: 'bg-violet-500',
    en_travaux: 'bg-amber-500'
  }
  const bg = colorMatch[statut] || 'bg-slate-500'
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div class="w-4 h-4 rounded-full border-2 border-white ${bg} shadow-lg shadow-black/50"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  })
}

function StatutBadge({ statut }) {
  const s = STATUTS.find(s => s.value === statut)
  if (!s || !s.color) return null
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>
      {s.label}
    </span>
  )
}

function ApartmentCard({ apt, onDelete }) {
  const navigate = useNavigate()
  const imageUrl = apt.medias?.find(m => m.est_principale)?.url || apt.medias?.[0]?.url
  const gradient = GRADIENT_BY_TYPE[apt.type] || 'from-slate-600 to-slate-700'

  return (
    <div
      className="group bg-slate-900 rounded-2xl ring-1 ring-slate-800 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 hover:ring-slate-700 cursor-pointer"
      onClick={() => navigate(`/apartments/${apt.id}`)}
    >
      {/* Image / Gradient header */}
      <div className={`h-44 relative overflow-hidden ${!imageUrl ? 'bg-gradient-to-br ' + gradient : ''}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={apt.titre}
            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Building2 className="w-10 h-10 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-3 right-3">
          <StatutBadge statut={apt.statut} />
        </div>
        <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/40 text-white text-xs font-medium backdrop-blur-sm">
          {apt.type || 'N/A'}
        </div>
      </div>

      {/* Infos */}
      <div className="p-4">
        <h3 className="font-semibold text-white truncate mb-1">{apt.titre}</h3>
        <p className="flex items-center gap-1 text-slate-400 text-xs truncate mb-3">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {apt.adresse}{apt.ville ? `, ${apt.ville}` : ''}
        </p>

        <div className="flex items-center gap-3 text-sm text-slate-300 mb-4">
          {apt.surface && (
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
              {apt.surface} m²
            </span>
          )}
          {apt.loyer_base && (
            <span className="flex items-center gap-1 ml-auto font-semibold text-white">
              <Euro className="w-3.5 h-3.5 text-violet-400" />
              {apt.loyer_base.toLocaleString('fr-FR')} /mois
            </span>
          )}
        </div>

        {/* Actions — stopPropagation to avoid triggering card click */}
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/apartments/${apt.id}/edit`)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition"
          >
            <Edit className="w-3.5 h-3.5" /> Modifier
          </button>
          <button
            onClick={() => onDelete(apt)}
            className="flex items-center justify-center p-1.5 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ apt, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white text-center mb-2">Supprimer le bien ?</h3>
        <p className="text-slate-400 text-sm text-center mb-6">
          <span className="text-white font-medium">{apt.titre}</span> sera supprimé définitivement.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-sm font-medium disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ApartmentList() {
  const [apts, setApts] = useState([])
  const [viewMode, setViewMode] = useState('list') // 'list' or 'map'
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('all')
  const [filterType, setFilterType] = useState('Tous')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  const fetchApts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await aptApi.getAll()
    if (!error) setApts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchApts() }, [fetchApts])

  const filtered = apts.filter(a => {
    const matchSearch = !search || a.titre?.toLowerCase().includes(search.toLowerCase()) || a.adresse?.toLowerCase().includes(search.toLowerCase()) || a.ville?.toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut === 'all' || a.statut === filterStatut
    const matchType = filterType === 'Tous' || a.type === filterType
    return matchSearch && matchStatut && matchType
  })

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    await aptApi.delete(toDelete.id)
    setDeleting(false)
    setToDelete(null)
    fetchApts()
  }

  const stats = {
    total: apts.length,
    loues: apts.filter(a => a.statut === 'loue').length,
    disponibles: apts.filter(a => a.statut === 'disponible').length,
    revenuTotal: apts.filter(a => a.statut === 'loue').reduce((s, a) => s + (a.loyer_base || 0), 0),
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes biens</h1>
          <p className="text-slate-400 text-sm mt-0.5">{apts.length} bien{apts.length !== 1 ? 's' : ''} enregistré{apts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/apartments/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl transition shadow-lg shadow-violet-500/20 text-sm"
        >
          <Plus className="w-4 h-4" /> Ajouter un bien
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',       value: stats.total,                                          color: 'text-white' },
          { label: 'Loués',       value: stats.loues,                                          color: 'text-violet-400' },
          { label: 'Disponibles', value: stats.disponibles,                                     color: 'text-emerald-400' },
          { label: 'Revenus/mois', value: `${stats.revenuTotal.toLocaleString('fr-FR')} €`,   color: 'text-amber-400' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, adresse, ville..."
            className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
          />
        </div>
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
        >
          {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
        >
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <List className="w-4 h-4" /> Liste
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'map' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Map className="w-4 h-4" /> Carte
          </button>
        </div>
      </div>

      {/* Liste ou Carte */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {apts.length === 0 ? 'Aucun bien enregistré' : 'Aucun résultat'}
          </h3>
          <p className="text-slate-400 text-sm max-w-xs mb-6">
            {apts.length === 0 ? 'Ajoutez votre premier bien immobilier pour commencer.' : 'Modifiez vos filtres pour voir des résultats.'}
          </p>
          {apts.length === 0 && (
            <button onClick={() => navigate('/apartments/new')} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl text-sm">
              <Plus className="w-4 h-4" /> Ajouter un bien
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(apt => (
            <ApartmentCard key={apt.id} apt={apt} onDelete={setToDelete} />
          ))}
        </div>
      ) : (
        <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-slate-800 relative z-0">
          <MapContainer 
            center={filtered.find(a => a.lat)?.lat ? [filtered.find(a => a.lat).lat, filtered.find(a => a.lat).lng] : [46.603354, 1.888334]} 
            zoom={filtered.find(a => a.lat)?.lat ? 12 : 6} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {filtered.filter(a => a.lat && a.lng).map(apt => (
              <Marker 
                key={apt.id} 
                position={[apt.lat, apt.lng]} 
                icon={createCustomIcon(apt.statut)}
              >
                <Popup>
                  <div className="p-3 w-[220px]">
                    <p className="font-bold text-white text-sm truncate mb-0.5">{apt.titre}</p>
                    <p className="text-xs text-slate-400 mb-3">{apt.adresse}, {apt.ville}</p>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white font-bold text-lg">{apt.loyer_base?.toLocaleString('fr-FR')} €</p>
                      <StatutBadge statut={apt.statut} />
                    </div>
                    <button 
                      onClick={() => navigate(`/apartments/${apt.id}`)} 
                      className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition"
                    >
                      Voir le bien
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {toDelete && (
        <DeleteModal apt={toDelete} onConfirm={handleDelete} onCancel={() => setToDelete(null)} loading={deleting} />
      )}
    </div>
  )
}
