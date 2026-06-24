import React from 'react'
import { FileText, Download, Trash2, ExternalLink } from 'lucide-react'
import { storage } from '../../../services/api'

export default function DocumentsTab({ apt }) {
  const documents = apt.documents || []

  const handleDownload = async (doc) => {
    try {
      const url = await storage.getSignedUrl(doc.path || doc.storage_path, 'documents')
      window.open(url, '_blank')
    } catch (err) {
      console.error("Erreur téléchargement", err)
      alert("Impossible de télécharger le document")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Documents de l'appartement</h2>
        {/* Note: The ability to upload documents directly here could be added later */}
      </div>

      {documents.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Aucun document</h3>
          <p className="text-slate-400">Les baux, états des lieux et diagnostics apparaîtront ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {documents.map(doc => (
            <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 hover:border-violet-500/30 transition">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{doc.nom || 'Document sans nom'}</p>
                <p className="text-xs text-slate-400 capitalize">{doc.type || 'Fichier'}</p>
              </div>
              <button 
                onClick={() => handleDownload(doc)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition shrink-0"
                title="Télécharger / Voir"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
