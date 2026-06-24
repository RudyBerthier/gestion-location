import React from 'react'
import { Euro, TrendingUp, TrendingDown } from 'lucide-react'

export default function FinancesTab({ apt }) {
  // Récupérer tous les paiements liés à tous les baux de cet appartement
  const paiements = []
  if (apt.locations) {
    apt.locations.forEach(l => {
      if (l.paiements) {
        l.paiements.forEach(p => paiements.push({ ...p, locataire: l.locataires }))
      }
    })
  }
  
  // Trier par date décroissante
  paiements.sort((a, b) => new Date(b.date_paiement || b.periode_debut) - new Date(a.date_paiement || a.periode_debut))

  // Calcul du Cash-flow généré (somme des paiements reçus)
  const totalEncaisse = paiements
    .filter(p => p.statut === 'paye')
    .reduce((sum, p) => sum + (p.montant || 0), 0)

  // Somme des impayés
  const totalImpaye = paiements
    .filter(p => p.statut === 'en_retard' || p.statut === 'en_attente')
    .reduce((sum, p) => sum + (p.montant || 0), 0)

  // Total des dépenses (incidents terminés avec un coût)
  const totalDepenses = (apt.incidents || [])
    .reduce((sum, inc) => sum + (inc.cout || 0), 0)

  const cashFlowNet = totalEncaisse - totalDepenses

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-400">Total Encaissé</h3>
          </div>
          <p className="text-2xl font-bold text-white">{totalEncaisse.toLocaleString('fr-FR')} €</p>
        </div>

        <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-400">Total Dépenses</h3>
          </div>
          <p className="text-2xl font-bold text-white">{totalDepenses.toLocaleString('fr-FR')} €</p>
        </div>

        <div className="bg-gradient-to-br from-violet-600/20 to-indigo-600/20 rounded-2xl ring-1 ring-violet-500/30 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Euro className="w-4 h-4 text-violet-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-300">Cash-Flow Brut</h3>
          </div>
          <p className="text-2xl font-bold text-white">{cashFlowNet.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Historique des paiements</h2>
          {totalImpaye > 0 && (
            <span className="text-xs font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">
              {totalImpaye.toLocaleString('fr-FR')} € en retard
            </span>
          )}
        </div>
        
        {paiements.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucun paiement enregistré pour cet appartement.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {paiements.slice(0, 10).map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition">
                <div>
                  <p className="text-white text-sm font-medium">Loyer {new Date(p.periode_debut).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
                  <p className="text-slate-400 text-xs">{p.locataire?.prenom} {p.locataire?.nom}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{p.montant?.toLocaleString('fr-FR')} €</p>
                  <p className={`text-xs ${p.statut === 'paye' ? 'text-emerald-400' : p.statut === 'en_retard' ? 'text-red-400' : 'text-amber-400'}`}>
                    {p.statut === 'paye' ? 'Payé' : p.statut === 'en_retard' ? 'En retard' : 'En attente'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
