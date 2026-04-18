import React, { useState } from 'react'
import { X, Plus, AlertTriangle, Clock } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────
export const DPE_CLASSES = [
  { key: 'A', bg: '#1a8f3c', text: '#fff', label: '≤ 70 kWh' },
  { key: 'B', bg: '#3aa655', text: '#fff', label: '71–110' },
  { key: 'C', bg: '#87c93e', text: '#000', label: '111–180' },
  { key: 'D', bg: '#f5d32a', text: '#000', label: '181–250' },
  { key: 'E', bg: '#f0a42e', text: '#000', label: '251–330' },
  { key: 'F', bg: '#e05c21', text: '#fff', label: '331–420' },
  { key: 'G', bg: '#b22222', text: '#fff', label: '> 420' },
]

export const DIAG_TYPES = [
  { key: 'amiante',     label: 'Amiante' },
  { key: 'plomb',       label: 'Plomb (CREP)' },
  { key: 'electricite', label: 'Électricité' },
  { key: 'gaz',         label: 'Gaz' },
  { key: 'erp',         label: 'ERP' },
  { key: 'termites',    label: 'Termites' },
  { key: 'carrez',      label: 'Loi Carrez' },
  { key: 'autre',       label: 'Autre' },
]

const RESULTAT_OPTIONS = [
  { key: 'negatif',      label: 'Négatif',     color: '#22c55e' },
  { key: 'positif',      label: 'Positif',     color: '#ef4444' },
  { key: 'conforme',     label: 'Conforme',    color: '#22c55e' },
  { key: 'non_conforme', label: 'Non conforme',color: '#ef4444' },
  { key: 'en_cours',     label: 'En cours',    color: '#f59e0b' },
]

// ── Helpers ──────────────────────────────────────────────────
export function getDpeColor(classe) {
  return DPE_CLASSES.find(c => c.key === classe) || { bg: '#555', text: '#fff' }
}

export function getAlertStatus(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { level: 'expired', label: `Expiré depuis ${Math.abs(diffDays)} j`, days: diffDays }
  if (diffDays <= 90) return { level: 'warning', label: `Expire dans ${diffDays} j`, days: diffDays }
  return { level: 'ok', label: `Valide jusqu'au ${date.toLocaleDateString('fr-FR')}`, days: diffDays }
}

// ── Sub-components ───────────────────────────────────────────
function AlertBadge({ status }) {
  if (!status || status.level === 'ok') return null
  const isExpired = status.level === 'expired'
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
      isExpired
        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
    }`}>
      {isExpired ? <AlertTriangle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
      {status.label}
    </span>
  )
}

function ClassSelector({ value, onChange, label, readOnly }) {
  return (
    <div>
      {label && <p className="text-xs font-medium text-slate-400 mb-2">{label}</p>}
      <div className="flex gap-1.5 flex-wrap">
        {DPE_CLASSES.map(c => (
          <div key={c.key} className="relative group">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onChange(value === c.key ? '' : c.key)}
              className={`w-9 h-9 rounded-lg text-sm font-black transition-all border-2 ${
                value === c.key
                  ? 'scale-110 border-white/60 shadow-lg'
                  : 'border-transparent opacity-60 hover:opacity-100'
              } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
              style={{ background: c.bg, color: c.text }}
            >
              {c.key}
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 scale-95 group-hover:scale-100 shadow-2xl whitespace-nowrap z-50 flex flex-col items-center">
              {c.label}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const iCls = "w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"

// ── Main Component ────────────────────────────────────────────
export default function DpeSection({ dpe = {}, setDpe, diagnostics = [], setDiagnostics, readOnly = false }) {
  const [showAddDiag, setShowAddDiag] = useState(false)
  const [newDiag, setNewDiag] = useState({
    type: 'amiante', resultat: 'negatif',
    interlocuteur: '', date_realisation: '', date_validite: ''
  })

  const setDpeField = (field, val) => setDpe?.(prev => ({ ...prev, [field]: val }))

  const addDiag = () => {
    const opt = DIAG_TYPES.find(t => t.key === newDiag.type)
    setDiagnostics(prev => [...prev, { ...newDiag, label: opt?.label || newDiag.type }])
    setNewDiag({ type: 'amiante', resultat: 'negatif', interlocuteur: '', date_realisation: '', date_validite: '' })
    setShowAddDiag(false)
  }
  const removeDiag = idx => setDiagnostics(prev => prev.filter((_, i) => i !== idx))

  const dpeAlert = getAlertStatus(dpe?.date_validite)

  return (
    <div className="space-y-6">

      {/* ── DPE ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">DPE — Performance énergétique</p>
          {dpeAlert && <AlertBadge status={dpeAlert} />}
        </div>

        {/* Class selectors (edit only) */}
        {!readOnly && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ClassSelector
              value={dpe?.classe || ''}
              onChange={val => setDpeField('classe', val)}
              label="Classe énergie"
              readOnly={false}
            />
            <ClassSelector
              value={dpe?.classe_ges || ''}
              onChange={val => setDpeField('classe_ges', val)}
              label="Classe GES (CO₂)"
              readOnly={false}
            />
          </div>
        )}

        {/* Numeric + dates (edit only) */}
        {!readOnly && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-slate-400 mb-1.5">CEP (kWh/m²/an)</p>
                <input type="number" value={dpe?.valeur_cep || ''} onChange={e => setDpeField('valeur_cep', e.target.value)}
                  placeholder="180" className={iCls} />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1.5">GES (kgCO₂/m²/an)</p>
                <input type="number" value={dpe?.valeur_ges || ''} onChange={e => setDpeField('valeur_ges', e.target.value)}
                  placeholder="35" className={iCls} />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1.5">Date réalisation</p>
                <input type="date" value={dpe?.date_realisation || ''} onChange={e => setDpeField('date_realisation', e.target.value)}
                  className={iCls} />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1.5">Date de validité ⚠</p>
                <input type="date" value={dpe?.date_validite || ''} onChange={e => setDpeField('date_validite', e.target.value)}
                  className={iCls} />
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1.5">Diagnostiqueur</p>
              <input type="text" value={dpe?.interlocuteur || ''} onChange={e => setDpeField('interlocuteur', e.target.value)}
                placeholder="Cabinet Diag Plus…" className={iCls} />
            </div>
          </>
        )}

        {/* Read-only DPE summary row */}
        {readOnly && (dpe?.classe || dpe?.classe_ges) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {dpe.classe && (
              <div className="flex items-center gap-4 bg-slate-800/30 border border-slate-700/60 p-4 rounded-2xl shadow-sm transition hover:bg-slate-800/50">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg font-black shrink-0 relative overflow-hidden"
                  style={{ background: getDpeColor(dpe.classe).bg, color: getDpeColor(dpe.classe).text }}
                >
                  <span className="text-3xl">{dpe.classe}</span>
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/20" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white tracking-wide truncate">ÉNERGIE</p>
                  <p className="text-xs text-slate-400 mt-1">Consommation :</p>
                  <p className="text-sm font-medium text-slate-200 mt-0.5">
                    {dpe.valeur_cep ? <>{dpe.valeur_cep} <span className="text-xs text-slate-500 font-normal">kWh/m²/an</span></> : 'Non renseignée'}
                  </p>
                </div>
              </div>
            )}
            
            {dpe.classe_ges && (
              <div className="flex items-center gap-4 bg-slate-800/30 border border-slate-700/60 p-4 rounded-2xl shadow-sm transition hover:bg-slate-800/50">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg font-black shrink-0 relative overflow-hidden"
                  style={{ background: getDpeColor(dpe.classe_ges).bg, color: getDpeColor(dpe.classe_ges).text }}
                >
                  <span className="text-3xl">{dpe.classe_ges}</span>
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/20" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white tracking-wide truncate">GES (CO₂)</p>
                  <p className="text-xs text-slate-400 mt-1">Émission :</p>
                  <p className="text-sm font-medium text-slate-200 mt-0.5">
                    {dpe.valeur_ges ? <>{dpe.valeur_ges} <span className="text-xs text-slate-500 font-normal">kgCO₂/m²/an</span></> : 'Non renseignée'}
                  </p>
                </div>
              </div>
            )}

            {(dpe.interlocuteur || dpe.date_validite) && (
              <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <div className="text-xs text-slate-400">
                  {dpe.interlocuteur ? <span>Diagnostiqueur : <strong className="text-slate-300 ml-1">{dpe.interlocuteur}</strong></span> : <span>Diagnostic certifié</span>}
                </div>
                {dpe.date_validite && (
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Valable jusqu'au <strong className="text-slate-300 ml-0.5">{new Date(dpe.date_validite).toLocaleDateString('fr-FR')}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {(!readOnly || diagnostics.length > 0) && (
        <>
          <div className="border-t border-slate-800" />

          {/* ── Other diagnostics ────────────────────────── */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Autres diagnostics</p>

            {diagnostics.map((d, idx) => {
              const alert = getAlertStatus(d.date_validite)
              const res = RESULTAT_OPTIONS.find(r => r.key === d.resultat)
              return (
                <div key={idx} className="flex items-start gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">{d.label}</span>
                      {res && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color: res.color, background: res.color + '22' }}>
                          {res.label}
                        </span>
                      )}
                      <AlertBadge status={alert} />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {d.interlocuteur && <span className="text-xs text-slate-500">{d.interlocuteur}</span>}
                      {d.date_realisation && (
                        <span className="text-xs text-slate-600">
                          Réalisé le {new Date(d.date_realisation).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {d.date_validite && (
                        <span className="text-xs text-slate-600">
                          Valide jusqu'au {new Date(d.date_validite).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  {!readOnly && (
                    <button type="button" onClick={() => removeDiag(idx)}
                      className="mt-0.5 p-1.5 text-slate-500 hover:text-red-400 transition shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}

            {!readOnly && (
              showAddDiag ? (
                <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">Type</p>
                      <select value={newDiag.type} onChange={e => setNewDiag(p => ({ ...p, type: e.target.value }))} className={iCls}>
                        {DIAG_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">Résultat</p>
                      <select value={newDiag.resultat} onChange={e => setNewDiag(p => ({ ...p, resultat: e.target.value }))} className={iCls}>
                        {RESULTAT_OPTIONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Diagnostiqueur (optionnel)</p>
                    <input type="text" value={newDiag.interlocuteur} onChange={e => setNewDiag(p => ({ ...p, interlocuteur: e.target.value }))}
                      placeholder="Cabinet Diagnostic Pro…" className={iCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">Date réalisation</p>
                      <input type="date" value={newDiag.date_realisation} onChange={e => setNewDiag(p => ({ ...p, date_realisation: e.target.value }))} className={iCls} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">Date validité</p>
                      <input type="date" value={newDiag.date_validite} onChange={e => setNewDiag(p => ({ ...p, date_validite: e.target.value }))} className={iCls} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={addDiag} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-xl font-medium transition">Ajouter</button>
                    <button type="button" onClick={() => setShowAddDiag(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition">Annuler</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setShowAddDiag(true)}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 transition px-1">
                  <span className="w-6 h-6 rounded-full border-2 border-dashed border-slate-600 hover:border-violet-400 flex items-center justify-center transition">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                  Ajouter un diagnostic
                </button>
              )
            )}

            {readOnly && diagnostics.length === 0 && !dpe?.classe && (
              <p className="text-sm text-slate-600 italic">Aucun diagnostic renseigné</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
