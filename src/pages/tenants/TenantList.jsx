import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { locataires as tenantApi } from '../../services/api'
import { Users, Plus, Search, Mail, Phone, Edit, Trash2, Eye, Loader2, Download, LayoutGrid, List, ChevronDown } from 'lucide-react'
import DataGrid from '../../components/ui/DataGrid'
import { exportToCSV } from '../../utils/csvExport'

const STATUT = {
  actif: { label: 'Actif', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  inactif: { label: 'Inactif', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
}

function TenantCard({ tenant, onDelete }) {
  const navigate = useNavigate()
  const s = STATUT[tenant.statut] || STATUT.actif
  const initials = `${tenant.prenom?.[0] || ''}${tenant.nom?.[0] || ''}`.toUpperCase()
  const activeLease = tenant.locations?.find(l => l.statut === 'actif')

  return (
    <div
      className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 hover:ring-slate-700 cursor-pointer"
      onClick={() => navigate(`/tenants/${tenant.id}`)}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white">{tenant.prenom} {tenant.nom}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs border ${s.cls}`}>{s.label}</span>
          </div>
          {tenant.profession && <p className="text-xs text-slate-500 mt-0.5">{tenant.profession}</p>}
        </div>
      </div>

      <div className="space-y-1.5 mb-4">
        {tenant.email && (
          <p className="flex items-center gap-2 text-xs text-slate-400 truncate">
            <Mail className="w-3.5 h-3.5 flex-shrink-0 text-slate-600" /> {tenant.email}
          </p>
        )}
        {tenant.telephone && (
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <Phone className="w-3.5 h-3.5 flex-shrink-0 text-slate-600" /> {tenant.telephone}
          </p>
        )}
      </div>

      {activeLease && (
        <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-3 mb-4">
          <p className="text-xs text-violet-400 font-medium truncate">{activeLease.appartements?.titre}</p>
          <p className="text-xs text-slate-500 mt-0.5">{(activeLease.loyer_mensuel || 0).toLocaleString('fr-FR')} € /mois</p>
        </div>
      )}

      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button onClick={() => navigate(`/tenants/${tenant.id}/edit`)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition">
          <Edit className="w-3.5 h-3.5" /> Modifier
        </button>
        <button onClick={() => onDelete(tenant)} className="flex items-center justify-center p-1.5 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function DeleteModal({ tenant, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white text-center mb-2">Supprimer ce locataire ?</h3>
        <p className="text-slate-400 text-sm text-center mb-6">
          <span className="text-white font-medium">{tenant.prenom} {tenant.nom}</span> sera supprimé définitivement.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">Annuler</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-sm font-medium disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TenantList() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('all')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
  const navigate = useNavigate()

  const fetchTenants = useCallback(async () => {
    setLoading(true)
    const { data, error } = await tenantApi.getAll()
    if (!error) setTenants(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTenants() }, [fetchTenants])

  const filtered = tenants.filter(t => {
    const fullName = `${t.prenom} ${t.nom}`.toLowerCase()
    const matchSearch = !search || fullName.includes(search.toLowerCase()) || t.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut === 'all' || t.statut === filterStatut
    return matchSearch && matchStatut
  })

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    await tenantApi.delete(toDelete.id)
    setDeleting(false)
    setToDelete(null)
    fetchTenants()
  }

  // == Configuration du DataGrid ==
  const tableColumns = [
    {
      id: 'nom',
      label: 'Locataire',
      sortable: true,
      sortValue: (t) => `${t.nom} ${t.prenom}`,
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-inner">
            {`${t.prenom?.[0] || ''}${t.nom?.[0] || ''}`.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-200">{t.prenom} {t.nom}</p>
            {t.profession && <p className="text-xs text-slate-500 mt-0.5">{t.profession}</p>}
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      label: 'Contact',
      render: (t) => (
        <div className="space-y-1">
          {t.email ? (
            <p className="text-xs text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-500"/> {t.email}</p>
          ) : <span className="text-xs text-slate-600">-</span>}
          {t.telephone && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-500"/> {t.telephone}</p>
          )}
        </div>
      )
    },
    {
      id: 'bail',
      label: 'Bail / Loyer',
      render: (t) => {
        const activeLease = t.locations?.find(l => l.statut === 'actif')
        if (!activeLease) return <span className="text-slate-500 text-xs italic">Aucun bail actif</span>
        return (
          <div>
            <p className="text-sm font-medium text-violet-300">{activeLease.appartements?.titre}</p>
            <p className="text-xs text-slate-500 mt-0.5">{(activeLease.loyer_mensuel || 0).toLocaleString('fr-FR')} € /m</p>
          </div>
        )
      }
    },
    {
      id: 'statut',
      label: 'Statut',
      sortable: true,
      render: (t) => {
        const s = STATUT[t.statut] || STATUT.actif
        return <span className={`px-2 py-0.5 rounded-full text-xs border ${s.cls}`}>{s.label}</span>
      }
    }
  ]

  const contextMenuItems = (t) => [
    { icon: Eye, label: 'Voir le profil', onClick: () => navigate(`/tenants/${t.id}`) },
    { icon: Edit, label: 'Modifier', onClick: () => navigate(`/tenants/${t.id}/edit`) },
    { icon: Trash2, label: 'Supprimer', danger: true, onClick: () => setToDelete(t) },
  ]

  const bulkActions = [
    {
      icon: Download,
      label: 'Exporter CSV',
      onClick: (ids) => {
        const selected = tenants.filter(t => ids.includes(t.id))
        exportToCSV(selected.map(t => ({
          Nom: t.nom,
          Prénom: t.prenom,
          Email: t.email || '',
          Téléphone: t.telephone || '',
          Profession: t.profession || '',
          Statut: t.statut
        })), 'Locataires')
      }
    },
    {
      icon: Trash2,
      label: 'Supprimer',
      danger: true,
      clearSelection: true,
      onClick: async (ids) => {
        if (window.confirm(`⚠️ Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT ${ids.length} locataire(s) ?`)) {
          setLoading(true)
          for (const id of ids) await tenantApi.delete(id)
          fetchTenants()
        }
      }
    }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes locataires</h1>
          <p className="text-slate-400 text-sm mt-0.5">{tenants.length} locataire{tenants.length !== 1 ? 's' : ''} enregistré{tenants.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/tenants/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl transition shadow-lg shadow-violet-500/20 text-sm"
        >
          <Plus className="w-4 h-4" /> Ajouter un locataire
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="w-full bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:bg-slate-900 transition shadow-inner"
          />
        </div>
        <div className="sm:w-64 shrink-0 relative">
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 text-white rounded-xl pl-4 pr-10 py-2.5 text-sm appearance-none focus:outline-none focus:border-violet-500 focus:bg-slate-900 transition cursor-pointer shadow-inner"
          >
            <option value="all">Tous les locataires</option>
            <option value="actif">Locataires actifs</option>
            <option value="inactif">Anciens locataires (Inactifs)</option>
          </select>
        </div>
        
        {/* Toggle Vue */}
        <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-xl p-1 shrink-0">
          <button 
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition ${viewMode === 'table' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
            title="Vue Tableau Intelligente"
          >
            <List className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
            title="Vue Grille (Cartes)"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{tenants.length === 0 ? 'Aucun locataire' : 'Aucun résultat'}</h3>
          <p className="text-slate-400 text-sm max-w-xs mb-6">{tenants.length === 0 ? 'Ajoutez votre premier locataire.' : 'Modifiez votre recherche.'}</p>
          {tenants.length === 0 && (
            <button onClick={() => navigate('/tenants/new')} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl text-sm">
              <Plus className="w-4 h-4" /> Ajouter un locataire
            </button>
          )}
        </div>
      ) : (
        viewMode === 'table' ? (
          <DataGrid 
            data={filtered}
            columns={tableColumns}
            getContextMenuItems={contextMenuItems}
            bulkActions={bulkActions}
            onRowClick={(row) => navigate(`/tenants/${row.id}`)}
            emptyMessage="Aucun locataire ne correspond aux filtres."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(t => <TenantCard key={t.id} tenant={t} onDelete={setToDelete} />)}
          </div>
        )
      )}

      {toDelete && <DeleteModal tenant={toDelete} onConfirm={handleDelete} onCancel={() => setToDelete(null)} loading={deleting} />}
    </div>
  )
}

