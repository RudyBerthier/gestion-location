import React, { useState, useMemo, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, Check, MoreVertical, X } from 'lucide-react'

/**
 * Composant DataGrid ultra-moderne pour remplacer les listes.
 * @param {Array} columns - ex: { id: 'nom', label: 'Nom', sortable: true, render: (row) => JSX }
 * @param {Array} data - Tableau de données
 * @param {String} keyField - Clé unique (ex: 'id')
 * @param {Function} getContextMenuItems - (row) => [{ icon: LucideIcon, label: 'Editer', onClick: () => void, danger: false }]
 * @param {Array} bulkActions - Actions en masse : [{ icon: LucideIcon, label: 'Export', onClick: (selectedIds) => void, danger: false }]
 * @param {Function} renderRowExpanded - (row) => JSX, si présent, rend le tableau extensible
 * @param {String} emptyMessage - Message affiché si aucune donnée
 */
export default function DataGrid({
  columns = [],
  data = [],
  keyField = 'id',
  getContextMenuItems,
  bulkActions = [],
  renderRowExpanded,
  emptyMessage = "Aucune donnée trouvée.",
  onRowClick
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [contextMenu, setContextMenu] = useState(null) // { x, y, rowId, items }
  
  const menuRef = useRef(null)

  // Fermer le menu au clic ailleurs
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('click', handleClick)
    // Fermer le menu si on scroll (pour éviter qu'il vole)
    const handleScroll = () => setContextMenu(null)
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      document.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleSort = (colId) => {
    setSortConfig((prev) => {
      if (prev.key === colId) {
        if (prev.direction === 'asc') return { key: colId, direction: 'desc' }
        return { key: null, direction: 'asc' } // Tri désactivé au 3e clic
      }
      return { key: colId, direction: 'asc' }
    })
  }

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data
    
    const sortableCol = columns.find(c => c.id === sortConfig.key)
    if (!sortableCol) return data

    return [...data].sort((a, b) => {
      let valA = a[sortConfig.key]
      let valB = b[sortConfig.key]

      // Si une fonction custom d'extraction de valeur de tri est fournie
      if (sortableCol.sortValue) {
        valA = sortableCol.sortValue(a)
        valB = sortableCol.sortValue(b)
      }
      
      // Gestion des null/undef
      if (valA == null) valA = ''
      if (valB == null) valB = ''

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA)
      }
      
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig, columns])

  const toggleSelectRow = (id, e) => {
    e.stopPropagation()
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length && data.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map(d => d[keyField])))
    }
  }

  const handleContextMenu = (e, row) => {
    if (!getContextMenuItems) return
    e.preventDefault()
    e.stopPropagation() // Empêche l'event click global du navigateur de se déclencher et de refermer le modale aussitôt
    const items = getContextMenuItems(row)
    if (!items || items.length === 0) return

    // Calcul de la position pour éviter que le menu soit coupé à l'écran
    const menuWidth = 220
    const menuHeight = items.length * 40 + 10 // Approximation
    let x = e.clientX
    let y = e.clientY

    if (x + menuWidth > window.innerWidth) {
      x = Math.max(0, x - menuWidth) // Ouvre vers la gauche
    }
    if (y + menuHeight > window.innerHeight) {
      y = Math.max(0, y - menuHeight) // Ouvre vers le haut
    }

    setContextMenu({
      x,
      y,
      rowId: row[keyField],
      items
    })
  }

  const toggleExpand = (id) => {
    if (!renderRowExpanded) return
    const next = new Set(expandedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpandedIds(next)
  }

  return (
    <div className="relative">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                {/* Checkbox Column */}
                <th className="w-12 pl-4 py-3 text-slate-400 font-medium whitespace-nowrap">
                  <div 
                    onClick={toggleSelectAll}
                    className={`w-5 h-5 rounded flex items-center justify-center border cursor-pointer transition ${
                      selectedIds.size === data.length && data.length > 0 
                        ? 'bg-violet-500 border-violet-500' 
                        : (selectedIds.size > 0 ? 'bg-violet-500/20 border-violet-500' : 'bg-slate-800 border-slate-700 hover:border-violet-500')
                    }`}
                  >
                    {selectedIds.size > 0 && <Check className={`w-3.5 h-3.5 ${selectedIds.size === data.length ? 'text-white' : 'text-violet-400'}`} />}
                  </div>
                </th>
                
                {/* Data Columns */}
                {columns.map((col) => (
                  <th 
                    key={col.id} 
                    className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-white transition group' : ''}`}
                    onClick={() => col.sortable && handleSort(col.id)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.sortable && (
                        <span className="flex flex-col">
                          <ChevronUp className={`w-2.5 h-2.5 -mb-1 ${sortConfig.key === col.id && sortConfig.direction === 'asc' ? 'text-violet-400' : 'text-slate-600 group-hover:text-slate-500'}`} />
                          <ChevronDown className={`w-2.5 h-2.5 ${sortConfig.key === col.id && sortConfig.direction === 'desc' ? 'text-violet-400' : 'text-slate-600 group-hover:text-slate-500'}`} />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                
                {/* Action Column for Context Menu Hint */}
                {getContextMenuItems && (
                  <th className="w-10 px-4 py-3"></th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (getContextMenuItems ? 2 : 1)} className="py-16 text-center text-slate-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => {
                  const id = row[keyField]
                  const isSelected = selectedIds.has(id)
                  const isExpanded = expandedIds.has(id)
                  const isRowTarget = contextMenu && contextMenu.rowId === id

                  return (
                    <React.Fragment key={id}>
                      <tr 
                        onContextMenu={(e) => handleContextMenu(e, row)}
                        className={`transition-colors group ${
                          isSelected || isRowTarget ? 'bg-violet-500/10' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="pl-4 py-3 align-middle">
                          <div 
                            onClick={(e) => toggleSelectRow(id, e)}
                            className={`w-5 h-5 rounded flex items-center justify-center border cursor-pointer transition ${
                              isSelected 
                                ? 'bg-violet-500 border-violet-500' 
                                : 'bg-slate-800 border-slate-700 hover:border-violet-500'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </td>

                        {/* Rendering Cells */}
                        {columns.map(col => (
                          <td 
                            key={col.id} 
                            onClick={() => {
                              toggleExpand(id)
                              if (onRowClick) onRowClick(row)
                            }}
                            className={`px-4 py-3 align-middle text-slate-300 ${renderRowExpanded || onRowClick ? 'cursor-pointer' : ''}`}
                          >
                            {col.render ? col.render(row) : row[col.id]}
                          </td>
                        ))}

                        {/* 3-dots Hint for Context Menu */}
                        {getContextMenuItems && (
                          <td className="px-4 py-3 align-middle text-right" onClick={(e) => handleContextMenu(e, row)}>
                            <button className="p-1 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition opacity-0 group-hover:opacity-100">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>

                      {/* Expandable Details */}
                      {renderRowExpanded && isExpanded && (
                        <tr className="bg-slate-900 shadow-inner">
                          <td colSpan={columns.length + (getContextMenuItems ? 2 : 1)} className="p-0 border-t border-slate-800/50">
                            {renderRowExpanded(row)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Context Menu */}
      {contextMenu && (
        <div 
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 min-w-[200px] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1 pb-1 animate-in fade-in zoom-in-95 duration-150"
        >
          {contextMenu.items.map((item, i) => {
            const Icon = item.icon
            return (
              <button
                key={i}
                onClick={() => {
                  setContextMenu(null)
                  item.onClick()
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  item.danger 
                    ? 'text-red-400 hover:bg-red-500/10' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {item.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Floating Bottom Bar for Bulk Actions */}
      {selectedIds.size > 0 && bulkActions.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-8 duration-300">
          <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700 shadow-2xl rounded-2xl p-2 flex items-center gap-4 text-sm font-medium">
            <div className="px-3 py-1.5 bg-violet-500/20 text-violet-300 rounded-lg whitespace-nowrap">
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </div>
            
            <div className="h-6 w-px bg-slate-700" />
            
            <div className="flex items-center gap-1">
              {bulkActions.map((action, i) => {
                if (action.hideIf && action.hideIf(Array.from(selectedIds))) return null;
                
                const Icon = action.icon
                return (
                  <button
                    key={i}
                    onClick={() => {
                      action.onClick(Array.from(selectedIds))
                      if (action.clearSelection) setSelectedIds(new Set())
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition ${
                      action.danger
                        ? 'text-red-400 hover:bg-red-500/20'
                        : 'text-white hover:bg-slate-700'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span className="hidden sm:inline">{action.label}</span>
                  </button>
                )
              })}
            </div>
            
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="p-1 px-2 text-slate-500 hover:text-slate-300 transition"
              title="Annuler la sélection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
