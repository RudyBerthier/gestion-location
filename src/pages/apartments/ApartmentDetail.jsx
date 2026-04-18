import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { appartements as aptApi, locations as locApi } from '../../services/api'
import { Building2, ArrowLeft, Edit, MapPin, Maximize2, Euro, Users, Loader2, BedDouble, Bath, AlertTriangle } from 'lucide-react'
import { getEquipmentIcon, getEquipmentLabel } from '../../config/equipments'
import DpeSection, { getAlertStatus } from '../../components/apartments/DpeSection'

const STATUT_STYLES = {
  disponible: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  loue:       'bg-violet-500/10 text-violet-400 border-violet-500/20',
  en_travaux: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}
const STATUT_LABELS = { disponible: 'Disponible', loue: 'Loué', en_travaux: 'En travaux' }

export default function ApartmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [apt, setApt] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    aptApi.getById(id).then(({ data, error }) => {
      if (!error) setApt(data)
      setLoading(false)
    })
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>
  )
  if (!apt) return (
    <div className="p-6 text-center text-slate-400">Bien introuvable.</div>
  )

  const activeLease = apt.locations?.find(l => l.statut === 'actif')

  // Compute expiry alerts across DPE + diagnostics
  const expiryAlerts = []
  if (apt.dpe?.date_validite) {
    const s = getAlertStatus(apt.dpe.date_validite)
    if (s && s.level !== 'ok') expiryAlerts.push({ label: 'DPE', ...s })
  }
  ;(apt.diagnostics || []).forEach(d => {
    if (!d.date_validite) return
    const s = getAlertStatus(d.date_validite)
    if (s && s.level !== 'ok') expiryAlerts.push({ label: d.label, ...s })
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/apartments')} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{apt.titre}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUT_STYLES[apt.statut] || ''}`}>
              {STATUT_LABELS[apt.statut]}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {apt.adresse}{apt.ville ? `, ${apt.ville}` : ''}
          </p>
        </div>
        <button
          onClick={() => navigate(`/apartments/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-xl text-sm font-medium transition"
        >
          <Edit className="w-4 h-4" /> Modifier
        </button>
      </div>

      {/* Expiry alerts banner */}
      {expiryAlerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {expiryAlerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
              a.level === 'expired'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span><strong>{a.label}</strong> — {a.label}</span>
            </div>
          ))}
        </div>
      )}

      {apt.medias && apt.medias.length > 0 && (
        <div className="rounded-2xl overflow-hidden h-[280px] sm:h-[380px] mb-6">
          {apt.medias.length === 1 ? (
            // Single image: full width
            <img
              src={apt.medias[0].url}
              alt="Principale"
              className="w-full h-full object-cover"
            />
          ) : (
            // Multiple images: main + thumbnails
            <div className="grid grid-cols-4 gap-1 h-full">
              <div className="col-span-4 sm:col-span-3 h-full overflow-hidden relative group cursor-pointer">
                <img
                  src={apt.medias.find(m => m.est_principale)?.url || apt.medias[0].url}
                  alt="Principale"
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
              </div>
              <div className="hidden sm:grid col-span-1 grid-rows-2 gap-1 h-full">
                {apt.medias.filter(m => !m.est_principale).slice(0, 2).map((m, i) => (
                  <div key={i} className="h-full relative group cursor-pointer overflow-hidden">
                    <img src={m.url} alt="Secondaire" className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
                    {i === 1 && apt.medias.length > 3 && (
                      <div className="absolute inset-0 bg-black/50 hover:bg-black/60 transition flex items-center justify-center">
                        <span className="text-white font-bold text-lg">+{apt.medias.length - 3}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Infos principales */}
        <div className="lg:col-span-2 space-y-5">
          {/* Caractéristiques */}
          <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Caractéristiques</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Surface', value: apt.surface ? `${apt.surface} m²` : '—', icon: Maximize2 },
                { label: 'Pièces', value: apt.nb_pieces || '—', icon: Building2 },
                { label: 'Chambres', value: apt.nb_chambres || '—', icon: BedDouble },
                { label: 'Salle de bain', value: apt.nb_salles_bain || '—', icon: Bath },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center p-3 bg-slate-800/50 rounded-xl">
                  <Icon className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Équipements */}
            {apt.equipements && apt.equipements.length > 0 && (
              <div className="mt-6 border-t border-slate-800 pt-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Équipements inclus</h3>
                <div className="flex flex-wrap gap-2">
                  {apt.equipements.map(id => {
                    const Icon = getEquipmentIcon(id)
                    const label = getEquipmentLabel(id)
                    return (
                      <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg text-sm">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {apt.description && (
            <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Description</h2>
              <p className="text-slate-300 text-sm leading-relaxed">{apt.description}</p>
            </div>
          )}

          {/* DPE & Diagnostics */}
          {(apt.dpe?.classe || (apt.diagnostics && apt.diagnostics.length > 0)) && (
            <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">DPE & Diagnostics</h2>
              <DpeSection
                dpe={apt.dpe || {}}
                diagnostics={apt.diagnostics || []}
                readOnly
              />
            </div>
          )}

          {/* Bail actif */}
          {activeLease && (
            <div className="bg-slate-900 border border-violet-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Bail actif</h2>
                <button 
                  onClick={() => navigate(`/leases/${activeLease.id}`)}
                  className="text-xs font-semibold px-3 py-1.5 bg-violet-600/20 text-violet-400 hover:bg-violet-600 hover:text-white rounded-lg transition"
                >
                  État des lieux & Clés
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    {activeLease.locataires?.prenom} {activeLease.locataires?.nom}
                  </p>
                  <p className="text-slate-400 text-xs">Depuis le {new Date(activeLease.date_debut).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-white font-bold">{(activeLease.loyer_mensuel + (activeLease.charges_mensuelles || 0)).toLocaleString('fr-FR')} €</p>
                  <p className="text-slate-500 text-xs">loyer CC</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Synthèse financière */}
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Finances</h2>
            {[
              { label: 'Loyer hors charges', value: apt.loyer_base, color: 'text-white' },
              { label: 'Charges', value: apt.charges, color: 'text-slate-300' },
              { label: 'Total charges comprises', value: (apt.loyer_base || 0) + (apt.charges || 0), color: 'text-violet-400 font-bold' },
              { label: 'Dépôt de garantie', value: apt.depot_garantie, color: 'text-amber-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
                <span className="text-sm text-slate-400">{label}</span>
                <span className={`text-sm ${color}`}>{value != null ? `${value.toLocaleString('fr-FR')} €` : '—'}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate(`/apartments/${id}/edit`)}
            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-violet-500/20"
          >
            Modifier ce bien
          </button>
        </div>
      </div>
    </div>
  )
}

function Tag({ children }) {
  return (
    <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-full">{children}</span>
  )
}
