import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { appartements as aptApi } from '../../services/api'
import { ArrowLeft, Edit, MapPin, Loader2, LayoutDashboard, Users, Euro, Wrench, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Onglets
import OverviewTab from './tabs/OverviewTab'
import LeaseTab from './tabs/LeaseTab'
import FinancesTab from './tabs/FinancesTab'
import MaintenanceTab from './tabs/MaintenanceTab'
import DocumentsTab from './tabs/DocumentsTab'

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
  const [activeTab, setActiveTab] = useState('overview')
  const [photoIndex, setPhotoIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const fetchApt = useCallback(() => {
    aptApi.getById(id).then(({ data, error }) => {
      if (!error) setApt(data)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    fetchApt()
  }, [fetchApt])

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>
  )
  if (!apt) return (
    <div className="p-6 text-center text-slate-400">Bien introuvable.</div>
  )

  const handleIncidentAdded = (newIncident) => {
    setApt(prev => ({
      ...prev,
      incidents: [newIncident, ...(prev.incidents || [])]
    }))
  }

  const tabs = [
    { id: 'overview', label: 'Aperçu', icon: LayoutDashboard },
    { id: 'lease', label: 'Bail & Locataire', icon: Users },
    { id: 'finances', label: 'Cash-Flow', icon: Euro },
    { id: 'maintenance', label: 'Travaux', icon: Wrench },
    { id: 'documents', label: 'Documents', icon: FileText },
  ]

  const sortedMedias = apt.medias ? [...apt.medias].sort((a, b) => (b.est_principale ? 1 : 0) - (a.est_principale ? 1 : 0)) : []

  const handleNextPhoto = (e) => {
    e.stopPropagation()
    setDirection(1)
    setPhotoIndex((prev) => (prev + 1) % sortedMedias.length)
  }

  const handlePrevPhoto = (e) => {
    e.stopPropagation()
    setDirection(-1)
    setPhotoIndex((prev) => (prev - 1 + sortedMedias.length) % sortedMedias.length)
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Sticky (Optionnel) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button onClick={() => navigate('/apartments')} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{apt.titre}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUT_STYLES[apt.statut] || ''}`}>
              {STATUT_LABELS[apt.statut]}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {apt.adresse}{apt.ville ? `, ${apt.ville}` : ''}
          </p>
        </div>
        <button
          onClick={() => navigate(`/apartments/${id}/edit`)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-xl text-sm font-medium transition"
        >
          <Edit className="w-4 h-4" /> Modifier
        </button>
      </div>

      {/* Hero Media (Image unique avec flèches et glissement natif) */}
      {sortedMedias.length > 0 && (
        <div className="rounded-2xl overflow-hidden h-[300px] sm:h-[400px] relative bg-slate-900/30 group" onClick={() => setActiveTab('overview')}>
          {/* Piste de glissement (Slider Track) */}
          <div 
            className="flex h-full w-full transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${photoIndex * 100}%)` }}
          >
            {sortedMedias.map((media, idx) => (
              <div key={media.id || idx} className="w-full h-full shrink-0 flex items-center justify-center">
                <img
                  src={media.url}
                  alt={`Photo ${idx + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ))}
          </div>
          
          {sortedMedias.length > 1 && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              {/* Flèche gauche */}
              <button 
                onClick={handlePrevPhoto}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 pointer-events-auto"
              >
                <ChevronLeft className="w-5 h-5 drop-shadow-md" />
              </button>
              
              {/* Flèche droite */}
              <button 
                onClick={handleNextPhoto}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 pointer-events-auto"
              >
                <ChevronRight className="w-5 h-5 drop-shadow-md" />
              </button>

              {/* Compteur de photos */}
              <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-lg text-white text-xs font-medium pointer-events-auto shadow-lg">
                {photoIndex + 1} / {sortedMedias.length}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-800 gap-2 sm:gap-6 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'border-violet-500 text-violet-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="pt-2"
        >
          {activeTab === 'overview' && <OverviewTab apt={apt} />}
          {activeTab === 'lease' && <LeaseTab apt={apt} />}
          {activeTab === 'finances' && <FinancesTab apt={apt} />}
          {activeTab === 'maintenance' && <MaintenanceTab apt={apt} onIncidentAdded={handleIncidentAdded} />}
          {activeTab === 'documents' && <DocumentsTab apt={apt} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
