import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Building2, Users, LayoutDashboard, Contact2, FileText, CreditCard, Plus, ArrowRight, X } from 'lucide-react'
import { appartements as aptApi, locataires as locApi, contacts as contactApi } from '../../services/api'

export default function CommandBar() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({ apts: [], locs: [], contacts: [] })
  const navigate = useNavigate()
  const inputRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((open) => !open)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      const fetchData = async () => {
        setLoading(true)
        const [aptRes, locRes, contactRes] = await Promise.all([
          aptApi.getAll(),
          locApi.getAll(),
          contactApi.getAll()
        ])
        setResults({
          apts: aptRes.data || [],
          locs: locRes.data || [],
          contacts: contactRes.data || []
        })
        setLoading(false)
      }
      fetchData()
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Ajout global event custom
  useEffect(() => {
    const handleOpenCommandBar = () => setIsOpen(true)
    window.addEventListener('open-command-bar', handleOpenCommandBar)
    return () => window.removeEventListener('open-command-bar', handleOpenCommandBar)
  }, [])

  if (!isOpen) return null

  const closeAndNavigate = (path) => {
    setIsOpen(false)
    navigate(path)
  }

  const normalizedQuery = query.toLowerCase()

  const filteredApts = results.apts.filter(a => a.titre?.toLowerCase().includes(normalizedQuery) || a.ville?.toLowerCase().includes(normalizedQuery))
  const filteredLocs = results.locs.filter(l => (`${l.prenom} ${l.nom}`).toLowerCase().includes(normalizedQuery) || l.email?.toLowerCase().includes(normalizedQuery))
  const filteredContacts = results.contacts.filter(c => c.nom?.toLowerCase().includes(normalizedQuery) || c.specialite?.toLowerCase().includes(normalizedQuery))

  const hasResults = filteredApts.length > 0 || filteredLocs.length > 0 || filteredContacts.length > 0
  const isTyping = query.length > 0

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative bg-slate-900 ring-1 ring-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">

        <div className="flex items-center h-14 px-4 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Que cherchez-vous ?"
            className="w-full bg-transparent border-0 text-white placeholder-slate-500 px-4 h-full focus:outline-none text-base"
          />
          <div className="flex items-center gap-2">
            {query && (
              <button onClick={() => setQuery('')} className="p-1 text-slate-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="text-[10px] font-bold text-slate-500 border border-slate-700/50 bg-slate-800/50 rounded px-1.5 py-0.5">ESC</div>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700">
          {!isTyping ? (
            <div className="p-2 space-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Actions rapides</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button onClick={() => closeAndNavigate('/apartments/new')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition text-left group">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition"><Plus className="w-4 h-4" /></div>
                    <div>
                      <p className="text-sm font-medium text-white">Ajouter un bien</p>
                      <p className="text-xs text-slate-500 mt-0.5">Créer un nouvel appartement</p>
                    </div>
                  </button>
                  <button onClick={() => closeAndNavigate('/tenants/new')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition text-left group">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition"><Users className="w-4 h-4" /></div>
                    <div>
                      <p className="text-sm font-medium text-white">Ajouter un locataire</p>
                      <p className="text-xs text-slate-500 mt-0.5">Enregistrer un nouveau locataire</p>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Navigation</p>
                <div className="flex flex-col gap-1">
                  {[
                    { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
                    { path: '/apartments', label: 'Liste des Appartements', icon: Building2 },
                    { path: '/tenants', label: 'Liste des Locataires', icon: Users },
                    { path: '/finance', label: 'Finance & Paiements', icon: CreditCard },
                    { path: '/documents', label: 'Documents', icon: FileText },
                  ].map(item => (
                    <button key={item.path} onClick={() => closeAndNavigate(item.path)} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800 transition group text-left">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 text-slate-400 group-hover:text-white transition" />
                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition">{item.label}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-slate-500 text-sm animate-pulse">Recherche en cours...</div>
          ) : !hasResults ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Aucun résultat pour <span className="text-white">"{query}"</span>
            </div>
          ) : (
            <div className="space-y-4 p-2">
              {filteredApts.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Appartements</p>
                  {filteredApts.map(apt => (
                    <button key={apt.id} onClick={() => closeAndNavigate(`/apartments/${apt.id}`)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800 transition group text-left mb-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{apt.titre}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{apt.adresse}, {apt.ville}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))}
                </div>
              )}

              {filteredLocs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Locataires</p>
                  {filteredLocs.map(loc => (
                    <button key={loc.id} onClick={() => closeAndNavigate(`/tenants/${loc.id}`)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800 transition group text-left mb-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{loc.prenom} {loc.nom}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{loc.email}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))}
                </div>
              )}

              {filteredContacts.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Prestataires</p>
                  {filteredContacts.map(contact => (
                    <button key={contact.id} onClick={() => closeAndNavigate(`/contacts`)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800 transition group text-left mb-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                          <Contact2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{contact.nom}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{contact.specialite || 'Prestataire'}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
