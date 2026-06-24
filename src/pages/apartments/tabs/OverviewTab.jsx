import React from 'react'
import { Building2, Maximize2, BedDouble, Bath } from 'lucide-react'
import { getEquipmentIcon, getEquipmentLabel } from '../../../config/equipments'
import DpeSection from '../../../components/apartments/DpeSection'

export default function OverviewTab({ apt }) {
  return (
    <div className="grid grid-cols-1 gap-5">
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
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{apt.description}</p>
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
    </div>
  )
}
