import React, { useState } from 'react'
import { Wrench, CheckCircle2, AlertTriangle, Plus, Loader2 } from 'lucide-react'
import { incidents as incidentsApi } from '../../../services/api'

export default function MaintenanceTab({ apt, onIncidentAdded }) {
  const [showForm, setShowForm] = useState(false)
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [cout, setCout] = useState('')
  const [loading, setLoading] = useState(false)

  const incidents = apt.incidents || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await incidentsApi.create({
        appartement_id: apt.id,
        titre,
        description,
        cout: cout ? parseFloat(cout) : 0,
        statut: 'en_attente'
      })
      if (!error) {
        setShowForm(false)
        setTitre('')
        setDescription('')
        setCout('')
        if (onIncidentAdded) onIncidentAdded(data) // Callback to update parent state
      }
    } catch (err) {
      console.error(err)
      alert("Erreur lors de l'ajout de l'incident")
    } finally {
      setLoading(false)
    }
  }

  const getStatusStyle = (statut) => {
    switch (statut) {
      case 'termine': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'en_cours': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default: return 'bg-slate-800 text-slate-400 border-slate-700'
    }
  }

  const getStatusLabel = (statut) => {
    switch (statut) {
      case 'termine': return 'Terminé'
      case 'en_cours': return 'En cours'
      default: return 'En attente'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Historique des travaux et incidents</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition"
        >
          {showForm ? 'Annuler' : <><Plus className="w-4 h-4" /> Signaler</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-violet-500/30 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-white mb-2">Nouvel incident / intervention</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Titre de l'incident</label>
              <input 
                type="text" required value={titre} onChange={e => setTitre(e.target.value)}
                placeholder="Ex: Fuite d'eau salle de bain"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Description (Optionnel)</label>
              <textarea 
                value={description} onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:border-violet-500 focus:outline-none h-20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Coût estimé ou payé (€)</label>
              <input 
                type="number" step="0.01" value={cout} onChange={e => setCout(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer
            </button>
          </div>
        </form>
      )}

      {incidents.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Aucun incident</h3>
          <p className="text-slate-400">Tout va bien ! Aucun problème technique n'a été signalé.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.sort((a, b) => new Date(b.date_signalement) - new Date(a.date_signalement)).map(inc => (
            <div key={inc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${inc.statut === 'termine' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                {inc.statut === 'termine' ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <AlertTriangle className="w-6 h-6 text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-white truncate">{inc.titre}</h4>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${getStatusStyle(inc.statut)}`}>
                    {getStatusLabel(inc.statut)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">Signalé le {new Date(inc.date_signalement).toLocaleDateString('fr-FR')}</p>
                {inc.description && <p className="text-sm text-slate-300 line-clamp-2">{inc.description}</p>}
              </div>
              <div className="sm:text-right pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                <p className="text-sm font-medium text-white">{inc.cout ? `${inc.cout.toLocaleString('fr-FR')} €` : '—'}</p>
                <p className="text-xs text-slate-500">Coût</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
