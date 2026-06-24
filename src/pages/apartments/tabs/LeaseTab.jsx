import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileText, CheckCircle2, XCircle } from 'lucide-react'

export default function LeaseTab({ apt }) {
  const navigate = useNavigate()
  
  // Trier les locations de la plus récente à la plus ancienne
  const leases = [...(apt.locations || [])].sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut))
  const activeLease = leases.find(l => l.statut === 'actif')
  const pastLeases = leases.filter(l => l.statut !== 'actif')

  return (
    <div className="space-y-6">
      {activeLease ? (
        <div className="bg-slate-900 border border-violet-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Bail actif
            </h2>
            <button 
              onClick={() => navigate(`/leases/${activeLease.id}`)}
              className="text-sm font-medium px-4 py-2 bg-violet-600/20 text-violet-400 hover:bg-violet-600 hover:text-white rounded-xl transition"
            >
              Voir le dossier complet
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-white font-medium text-lg">
                  {activeLease.locataires?.prenom} {activeLease.locataires?.nom}
                </p>
                <p className="text-slate-400 text-sm mt-1">{activeLease.locataires?.email || 'Pas d\'email'}</p>
                <p className="text-slate-400 text-sm">{activeLease.locataires?.telephone || 'Pas de téléphone'}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Début du bail</span>
                <span className="text-sm font-medium text-white">{new Date(activeLease.date_debut).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Fin prévue</span>
                <span className="text-sm font-medium text-white">{activeLease.date_fin ? new Date(activeLease.date_fin).toLocaleDateString('fr-FR') : '—'}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                <span className="text-sm text-slate-400">Loyer mensuel CC</span>
                <span className="text-base font-bold text-violet-400">{(activeLease.loyer_mensuel + (activeLease.charges_mensuelles || 0)).toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Aucun bail actif</h3>
          <p className="text-slate-400 mb-6">Cet appartement est actuellement vacant.</p>
          <button 
            onClick={() => navigate('/leases/new', { state: { appartementId: apt.id } })}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition"
          >
            Créer un nouveau bail
          </button>
        </div>
      )}

      {pastLeases.length > 0 && (
        <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Historique des baux</h2>
          <div className="space-y-3">
            {pastLeases.map(lease => (
              <div key={lease.id} className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition cursor-pointer" onClick={() => navigate(`/leases/${lease.id}`)}>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-white text-sm font-medium">{lease.locataires?.prenom} {lease.locataires?.nom}</p>
                    <p className="text-slate-400 text-xs">
                      Du {new Date(lease.date_debut).toLocaleDateString('fr-FR')} 
                      {lease.date_fin ? ` au ${new Date(lease.date_fin).toLocaleDateString('fr-FR')}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-300">{(lease.loyer_mensuel + (lease.charges_mensuelles || 0)).toLocaleString('fr-FR')} €</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
