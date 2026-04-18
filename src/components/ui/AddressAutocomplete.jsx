import React, { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

export default function AddressAutocomplete({ value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  const skipNextFetch = useRef(false)

  // S'assurer que le champ texte reste synchronisé si react-hook-form change la value (ex: reset)
  useEffect(() => {
    if (value !== query) {
      setQuery(value || '')
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }

    // Ne pas chercher si moins de 4 caractères
    if (!query || query.length < 4) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`)
        const data = await res.json()
        setResults(data.features || [])
        setIsOpen(true)
      } catch (err) {
        console.error('Erreur API Adresse:', err)
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleSelect = (feature) => {
    const { name, city, postcode } = feature.properties
    const [lng, lat] = feature.geometry.coordinates
    skipNextFetch.current = true
    setQuery(name)
    setIsOpen(false)
    onSelect({
      adresse: name,
      ville: city,
      code_postal: postcode,
      lat,
      lng
    })
  }

  const inputCls = "w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
        }}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true)
        }}
        placeholder="10 rue de la Paix"
        className={inputCls}
        autoComplete="new-password"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
        </div>
      )}
      
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-700/50">
          {results.map((feature) => (
            <li
              key={feature.properties.id}
              onClick={() => handleSelect(feature)}
              className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer flex items-start gap-3 transition"
            >
              <MapPin className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">{feature.properties.name}</p>
                <p className="text-xs text-slate-400">{feature.properties.postcode} {feature.properties.city}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
