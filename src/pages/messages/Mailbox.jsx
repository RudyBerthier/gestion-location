import React, { useState, useEffect, useRef, useCallback } from 'react'
import { mailbox, emailAccounts, locataires as locatairesApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Inbox, Mail, Search, RefreshCw, AlertCircle, Calendar, User, ArrowLeft, Loader2, Paperclip, Download, Plus, Trash2, KeyRound, Eye, EyeOff, X, Mailbox as MailboxIcon, PenSquare, Reply, Forward, Building2, ChevronDown, ChevronRight, Tag } from 'lucide-react'
import ComposeEmailModal from '../../components/emails/ComposeEmailModal'

function DeleteModal({ title, subtitle, onConfirm, onCancel, loading }) {
  if (!title) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
      <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white text-center mb-2">{title}</h3>
        <p className="text-slate-400 text-sm text-center mb-6">{subtitle}</p>
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

// ─── Date helpers ───────────────────────────────────────────────────────────
const isToday = (date) => {
  const t = new Date()
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear()
}
const formatDate = (dateString) => {
  const date = new Date(dateString)
  if (isToday(date)) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// ─── Attachment downloader ───────────────────────────────────────────────────
const AttachmentDownloader = ({ att, className, children }) => {
  if (!att || !att.content) return null
  let fallbackExt = ''
  if (att.contentType) {
    if (att.contentType.includes('pdf')) fallbackExt = '.pdf'
    else if (att.contentType.includes('png')) fallbackExt = '.png'
    else if (att.contentType.includes('jpeg') || att.contentType.includes('jpg')) fallbackExt = '.jpg'
  }
  let safeFilename = (att.filename || `document${fallbackExt}`).replace(/[^a-zA-Z0-9.\-_ ()]/g, '_')
  if (!safeFilename.includes('.')) safeFilename += fallbackExt
  
  const cleanBase64 = att.content.replace(/^data:.*?;base64,/, '').replace(/\s/g, '')
  const encodedUrl = `data:${att.contentType || 'application/octet-stream'};base64,${cleanBase64}`
  
  return (
    <a href={encodedUrl} download={safeFilename} onClick={(e) => e.stopPropagation()} className={className}>
      {children}
    </a>
  )
}

// ─── Rental-related keyword scoring ────────────────────────────────────────
// Returns true if the email seems related to rental management
const RENTAL_KEYWORDS = [
  'loyer', 'appartement', 'location', 'locataire', 'bail', 'contrat',
  'quittance', 'charges', 'caution', 'dépôt de garantie', 'état des lieux',
  'propriétaire', 'immobilier', 'logement', 'habitation', 'résidence',
  'remboursement', 'préavis', 'résiliation', 'renouvellement', 'avenant',
  'loyer impayé', 'regularisation', 'paiement', 'virement', 'facture',
]

function hasRentalContext(email) {
  const haystack = [
    email.subject || '',
    email.text?.substring(0, 500) || '',
    email.from || '',
  ].join(' ').toLowerCase()

  const matchCount = RENTAL_KEYWORDS.filter(kw => haystack.includes(kw)).length
  return matchCount >= 1 // At least 1 keyword match required
}

// ─── Email → Appartement matching ───────────────────────────────────────────
function buildTenantEmailMap(tenants) {
  // Returns Map<normalizedEmail, { appartementId, appartementTitre, locataireNom }>
  const map = new Map()
  for (const t of tenants) {
    // Only include tenants with an active lease
    const activeLocation = t.locations?.find(l => l.statut === 'actif')
    if (!activeLocation?.appartements) continue
    const info = {
      appartementId: activeLocation.appartements.id,
      appartementTitre: activeLocation.appartements.titre,
      locataireNom: `${t.prenom} ${t.nom}`,
    }
    // Primary email
    if (t.email) map.set(t.email.trim().toLowerCase(), info)
    // Secondary emails
    for (const e of (t.emails_secondaires || [])) {
      if (e) map.set(e.trim().toLowerCase(), info)
    }
  }
  return map
}

function matchEmailToApartment(email, tenantEmailMap) {
  // Only check the SENDER (from), never the recipient (to).
  // "to" is always our own mailbox address — matching it would cause false positives.
  const raw = email.from || ''
  const addrMatch = raw.match(/<([^>]+)>/)
  const addr = (addrMatch ? addrMatch[1] : raw).trim().toLowerCase()

  const tenantInfo = tenantEmailMap.get(addr)
  if (!tenantInfo) return null

  // Double-check: email must also have rental-related context
  if (!hasRentalContext(email)) return null

  return tenantInfo
}

function groupEmailsByApartment(emails, tenantEmailMap) {
  const groups = new Map() // appartementId → { titre, emails[], unread }
  const unclassified = []

  for (const email of emails) {
    const match = matchEmailToApartment(email, tenantEmailMap)
    if (match) {
      if (!groups.has(match.appartementId)) {
        groups.set(match.appartementId, { titre: match.appartementTitre, emails: [], unread: 0 })
      }
      const g = groups.get(match.appartementId)
      g.emails.push({ ...email, _locataireNom: match.locataireNom })
      if (!email.isRead) g.unread++
    } else {
      unclassified.push(email)
    }
  }

  // Sort each group chronologically desc
  for (const g of groups.values()) {
    g.emails.sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  return { groups: Array.from(groups.entries()), unclassified }
}

// ─── Apartment Group Row in the "par bien" view ─────────────────────────────
function ApartmentGroup({ appartementId, titre, emails, unread, selectedEmail, onSelectEmail }) {
  const [open, setOpen] = useState(true)
  const ChevronIcon = open ? ChevronDown : ChevronRight

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800/60 transition text-left group"
      >
        <ChevronIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <Building2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-slate-200 flex-1 truncate">{titre}</span>
        {unread > 0 && (
          <span className="text-[10px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full">
            {unread}
          </span>
        )}
        <span className="text-xs text-slate-600">{emails.length}</span>
      </button>

      {open && (
        <div className="ml-3 border-l border-slate-800 pl-2 space-y-0.5 mt-0.5">
          {emails.map(email => (
            <EmailRow
              key={`${email.accountId || 'acc'}-${email.id}`}
              email={email}
              selected={selectedEmail?.id === email.id}
              onClick={() => onSelectEmail(email)}
              showLocataire
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Unclassified collapsible group ─────────────────────────────────────────
function UnclassifiedGroup({ emails, selectedEmail, onSelectEmail, activeAccount }) {
  const [open, setOpen] = useState(false) // collapsed by default
  const ChevronIcon = open ? ChevronDown : ChevronRight
  const unread = emails.filter(e => !e.isRead).length

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800/60 transition text-left group"
      >
        <ChevronIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <Tag className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-slate-500 flex-1">Non classé</span>
        {unread > 0 && (
          <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">
            {unread}
          </span>
        )}
        <span className="text-xs text-slate-600">{emails.length}</span>
      </button>

      {open && (
        <div className="ml-3 border-l border-slate-800 pl-2 space-y-0.5 mt-0.5">
          {emails.map(email => (
            <EmailRow
              key={`${email.accountId || 'acc'}-${email.id}`}
              email={email}
              selected={selectedEmail?.id === email.id}
              onClick={() => onSelectEmail(email)}
              activeAccount={activeAccount}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmailRow({ email, selected, onClick, activeAccount, showLocataire = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl transition ${selected ? 'bg-violet-500/10 border-violet-500/20' : 'hover:bg-slate-800/50 border-transparent'} border`}
    >
      {!showLocataire && (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-2 text-[10px] font-semibold text-slate-400 bg-slate-800/80 rounded-lg">
          <MailboxIcon className="w-3 h-3 text-slate-500" />
          {email.accountEmail || activeAccount?.email}
        </span>
      )}
      {showLocataire && email._locataireNom && (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-2 text-[10px] font-semibold text-violet-400/70 bg-violet-500/10 rounded-lg">
          <User className="w-3 h-3" />
          {email._locataireNom}
        </span>
      )}
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm truncate pr-2 text-slate-300 font-medium">
          {email.from?.split('<')[0] || email.from}
        </p>
        <span className="text-xs text-slate-500 flex-shrink-0">{formatDate(email.date)}</span>
      </div>
      <p className="text-sm truncate mb-1 text-slate-400">
        {email.subject || '(Sans objet)'}
      </p>
      <p className="text-xs text-slate-500 truncate line-clamp-1">
        {email.text?.substring(0, 80) || ''}
      </p>
    </button>
  )
}

// ─── Main Mailbox component ──────────────────────────────────────────────────
export default function Mailbox() {
  const { user } = useAuth()
  const showToast = useToast()

  const [accounts, setAccounts] = useState([])
  const [activeAccountId, setActiveAccountId] = useState('all') // 'all' or specific UUID
  const [activeBox, setActiveBox] = useState('inbox') // 'inbox' or 'sent'
  const [emails, setEmails] = useState([])
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [loadingBody, setLoadingBody] = useState(false)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [previewAtt, setPreviewAtt] = useState(null)
  const [emailLimit, setEmailLimit] = useState(50)
  const [hasMore, setHasMore] = useState(true)
  const searchTimeoutRef = useRef(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [newAcc, setNewAcc] = useState({ provider: 'orange', email: '', password: '', imap_host: '', imap_port: 993 })
  const [showPassword, setShowPassword] = useState(false)
  const [addingAccount, setAddingAccount] = useState(false)
  const [accToDelete, setAccToDelete] = useState(null)
  const [deletingAcc, setDeletingAcc] = useState(false)

  const [showComposeModal, setShowComposeModal] = useState(false)
  const [composeData, setComposeData] = useState(null)

  // "Par bien" mode
  const [viewMode, setViewMode] = useState('inbox') // 'inbox' | 'byProperty'
  const [tenantEmailMap, setTenantEmailMap] = useState(new Map())
  const [loadingTenants, setLoadingTenants] = useState(false)

  useEffect(() => {
    fetchAccounts()
    fetchTenants()
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [])

  const fetchTenants = async () => {
    setLoadingTenants(true)
    try {
      const { data } = await locatairesApi.getAll()
      if (data) setTenantEmailMap(buildTenantEmailMap(data))
    } catch (e) { /* silent */ }
    setLoadingTenants(false)
  }

  const fetchAccounts = async () => {
    try {
      const data = await emailAccounts.list()
      setAccounts(data)
    } catch (err) {
      showToast("Impossible de charger vos comptes de messagerie", "error")
    }
  }

  const fetchEmailsData = useCallback(async (limit = emailLimit, append = false) => {
    if (accounts.length === 0 && activeBox !== 'sent') return
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoadingEmails(true)
        setEmails([]) // Vide la boîte pour afficher le loader instantanément
      }
      setError(null)
      let data = []
      if (activeBox === 'sent') {
        const res = await mailbox.fetchHistorique(user.id, limit, activeAccountId)
        if (res.success) data = res.data
      } else {
        const res = await mailbox.fetchEmails(activeAccountId, user.id, limit)
        if (res.success) data = res.data
      }
      setEmails(data || [])
      setHasMore(data.length >= limit)
      if (!append) setSelectedEmail(null)
    } catch (err) {
      console.error(err)
      setError("Impossible de charger les emails. Vérifiez vos identifiants IMAP.")
    } finally {
      setLoadingEmails(false)
      setLoadingMore(false)
    }
  }, [activeAccountId, activeBox, accounts.length, user.id, emailLimit])

  useEffect(() => {
    fetchEmailsData()
  }, [fetchEmailsData])

  const handleLoadMore = async () => {
    const newLimit = emailLimit + 25
    setEmailLimit(newLimit)
    await fetchEmailsData(newLimit, true)
  }

  const handleProviderChange = (e) => {
    const prov = e.target.value
    setNewAcc(prev => ({
      ...prev,
      provider: prov,
      imap_host: prov === 'orange' ? 'imap.orange.fr' : prov === 'gmail' ? 'imap.gmail.com' : prev.imap_host,
      imap_port: 993
    }))
  }

  const handleAddAccount = async (e) => {
    e.preventDefault()
    setAddingAccount(true)
    try {
      const payload = {
        user_id: user.id,
        email: newAcc.email,
        password: newAcc.password,
        provider: newAcc.provider,
        imap_host: newAcc.provider === 'orange' ? 'imap.orange.fr' : newAcc.provider === 'gmail' ? 'imap.gmail.com' : newAcc.imap_host,
        imap_port: newAcc.imap_port || 993
      }
      const added = await emailAccounts.create(payload)
      setAccounts([added, ...accounts])
      setActiveAccountId(added.id)
      setShowAddModal(false)
      setNewAcc({ provider: 'orange', email: '', password: '', imap_host: '', imap_port: 993 })
      showToast("Compte ajouté avec succès !", "success")
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'ajout", "error")
    } finally {
      setAddingAccount(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!accToDelete) return
    setDeletingAcc(true)
    try {
      await emailAccounts.delete(accToDelete.id)
      showToast("Compte supprimé", "success")
      setAccounts(accounts.filter(a => a.id !== accToDelete.id))
      if (activeAccountId === accToDelete.id) setActiveAccountId('all')
    } catch (err) {
      showToast("Erreur de suppression", "error")
    } finally {
      setDeletingAcc(false)
      setAccToDelete(null)
    }
  }

  const getSenderEmailFromAccountId = (accId) => {
    if (!accId) return ''
    const acc = accounts.find(a => a.id === accId)
    return acc ? acc.email : ''
  }

  const handleCompose = () => {
    setComposeData({ to: '', subject: '', html: '', replyToAddress: '' })
    setShowComposeModal(true)
  }

  const handleReply = () => {
    if (!selectedEmail) return
    const body = selectedEmail.html || selectedEmail.text || ''
    const cleanBody = `<br><br><div class="gmail_quote" style="border-left: 2px solid #6b7280; padding-left: 1ex; margin-left: 1ex; color: #9ca3af;"><div dir="ltr" class="gmail_attr">Le ${new Date(selectedEmail.date).toLocaleString('fr-FR')} <b>${selectedEmail.from?.name || ''}</b> &lt;${selectedEmail.from?.address || ''}&gt; a écrit :<br></div><blockquote class="gmail_quote" style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;">${body}</blockquote></div>`
    setComposeData({
      to: selectedEmail.from?.address || '',
      subject: `Re: ${selectedEmail.subject?.replace(/^(Re:\s*)+/i, '') || ''}`,
      html: cleanBody,
      replyToAddress: getSenderEmailFromAccountId(selectedEmail.accountId)
    })
    setShowComposeModal(true)
  }

  const handleForward = () => {
    if (!selectedEmail) return
    const body = selectedEmail.html || selectedEmail.text || ''
    const cleanBody = `<br><br><div class="gmail_quote">---------- Message transféré ----------<br>De : <b>${selectedEmail.from?.name || ''}</b> &lt;${selectedEmail.from?.address || ''}&gt;<br>Date : ${new Date(selectedEmail.date).toLocaleString('fr-FR')}<br>Objet : ${selectedEmail.subject || ''}<br><br>${body}</div>`
    setComposeData({
      to: '',
      subject: `Fwd: ${selectedEmail.subject?.replace(/^(Fwd:\s*)+/i, '') || ''}`,
      html: cleanBody,
      replyToAddress: getSenderEmailFromAccountId(selectedEmail.accountId)
    })
    setShowComposeModal(true)
  }

  const handleSearch = (value) => {
    setSearch(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (value.trim().length < 2) { setIsSearchMode(false); return }
    searchTimeoutRef.current = setTimeout(async () => {
      if (!activeAccountId) return
      setSearching(true)
      setIsSearchMode(true)
      try {
        const result = await mailbox.searchEmails(activeAccountId, user.id, value.trim())
        if (result.success) setEmails(result.data)
      } catch (err) { console.error("Erreur recherche:", err) }
      setSearching(false)
    }, 600)
  }

  const handleSelectEmail = async (email) => {
    setSelectedEmail(email)
    if (!email.html && !email.text) {
      setLoadingBody(true)
      try {
        const targetAccountId = email.accountId || activeAccountId
        const result = await mailbox.getEmail(targetAccountId, email.id, email.mailboxPath || 'INBOX')
        if (result.success) {
          const fullEmail = { ...email, html: result.data.html, text: result.data.text, attachments: result.data.attachments || [] }
          setSelectedEmail(fullEmail)
          setEmails(prev => prev.map(e => e.id === email.id ? fullEmail : e))
        }
      } catch (err) { console.error("Impossible de charger le corps de l'email.") }
      setLoadingBody(false)
    }
  }

  const activeAccount = accounts.find(a => a.id === activeAccountId)
  
  // Strict Real-Estate Filter (applied to Inbox, but bypassed for Search or Sent folders)
  const displayEmails = isSearchMode || activeBox === 'sent' 
    ? emails 
    : emails.filter(e => {
        if (matchEmailToApartment(e, tenantEmailMap)) return true;
        const sub = (e.subject || '').toLowerCase()
        const keywords = ['loyer', 'appartement', 'quittance', 'bail', 'location', 'locataire', 'facture', 'syndic', 'copro', 'charges', 'fuite', 'eau', 'dégât', 'sinistre', 'etat des lieux', 'garantie', 'dépôt', 'caution', 'assurance']
        return keywords.some(kw => sub.includes(kw))
      })

  const { groups, unclassified } = groupEmailsByApartment(displayEmails, tenantEmailMap)
  const unreadByProperty = groups.reduce((acc, [, g]) => acc + g.unread, 0)

  return (
    <div className="h-[calc(100dvh-3.5rem)] lg:h-[100dvh] w-full flex flex-col md:flex-row font-sans overflow-hidden bg-slate-950">

      {/* ── SIDEBAR (Col 1) ── */}
      <div className={`w-full md:w-64 bg-slate-900 border-r border-slate-800 flex-col flex-shrink-0 z-20 ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4">
          <button onClick={handleCompose} className="w-full flex items-center gap-3 bg-violet-600 hover:bg-violet-500 text-white px-4 py-3 rounded-2xl text-sm font-bold transition shadow-lg shadow-violet-500/20">
            <PenSquare className="w-5 h-5" />
            Nouveau message
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-6">
          
          {/* Dossiers principaux */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">Dossiers</h3>
            <div className="space-y-1">
              <button
                onClick={() => { setActiveBox('inbox'); setViewMode('inbox'); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition ${activeBox === 'inbox' && viewMode === 'inbox' ? 'bg-violet-500/10 text-violet-400' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Inbox className="w-4 h-4" /> Boîte de réception
                </div>
              </button>
              
              <button
                onClick={() => { setActiveBox('sent'); setViewMode('inbox'); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition ${activeBox === 'sent' ? 'bg-violet-500/10 text-violet-400' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Forward className="w-4 h-4" /> Envoyés
                </div>
              </button>

              <button
                onClick={() => { setActiveBox('inbox'); setViewMode('byProperty'); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition ${activeBox === 'inbox' && viewMode === 'byProperty' ? 'bg-violet-500/10 text-violet-400' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4" /> Triés par bien
                </div>
                {unreadByProperty > 0 && <span className="bg-violet-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{unreadByProperty}</span>}
              </button>
            </div>
          </div>

          {/* Comptes connectés */}
          <div>
            <div className="flex items-center justify-between mb-2 px-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Comptes</h3>
              <button onClick={() => setShowAddModal(true)} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {accounts.length === 0 ? (
              <p className="text-xs text-slate-500 px-3 font-mono">Aucun compte</p>
            ) : (
              <div className="space-y-1">
                <button
                  onClick={() => setActiveAccountId('all')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${activeAccountId === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                >
                  <Mail className="w-4 h-4" /> Toutes les boîtes
                </button>
                {accounts.map(acc => (
                  <div key={acc.id} className="group flex items-center">
                    <button
                      onClick={() => setActiveAccountId(acc.id)}
                      className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition truncate ${activeAccountId === acc.id ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                      title={acc.email}
                    >
                      <div className={`w-2 h-2 rounded-full ${acc.provider === 'gmail' ? 'bg-red-500' : acc.provider === 'orange' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                      <span className="truncate">{acc.email}</span>
                    </button>
                    {activeAccountId === acc.id && (
                      <button onClick={(e) => { e.stopPropagation(); setAccToDelete(acc); }} className="p-2 text-slate-500 hover:text-red-400 hidden group-hover:block transition" title="Supprimer ce compte">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── EMAIL LIST (Col 2) ── */}
      <div className={`w-full md:w-[320px] lg:w-[380px] bg-slate-900 border-r border-slate-800 flex-col flex-shrink-0 z-10 ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        {/* Search Header */}
        <div className="p-3 border-b border-slate-800 flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition"
              />
            </div>
            <button onClick={() => fetchEmailsData()} disabled={loadingEmails} className="p-2 bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loadingEmails ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {isSearchMode && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-violet-400 font-medium">
                {searching ? 'Recherche en cours...' : `${displayEmails.length} résultat(s)`}
              </p>
              <button onClick={() => fetchEmailsData()} className="text-xs text-slate-400 hover:text-white underline">Effacer</button>
            </div>
          )}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative bg-slate-900">
          {error ? (
            <div className="flex flex-col items-center justify-center p-6 text-center h-full">
              <AlertCircle className="w-10 h-10 text-red-500/50 mb-3" />
              <h2 className="text-sm font-bold text-red-400 mb-1">Erreur IMAP</h2>
              <p className="text-slate-500 text-xs">{error}</p>
            </div>
          ) : loadingEmails && emails.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : displayEmails.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              {isSearchMode ? "Aucun email trouvé" : "Aucun e-mail locatif récent"}
            </div>
          ) : (viewMode === 'inbox' || activeBox === 'sent') ? (
            <div className="divide-y divide-slate-800/50">
              {displayEmails.map(email => (
                <EmailRow
                  key={`${email.accountId || 'acc'}-${email.id}`}
                  email={email}
                  selected={selectedEmail?.id === email.id}
                  onClick={() => handleSelectEmail(email)}
                  activeAccount={activeAccount}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {groups.map(([appartementId, group]) => (
                <ApartmentGroup
                  key={appartementId}
                  appartementId={appartementId}
                  titre={group.titre}
                  emails={group.emails}
                  unread={group.unread}
                  selectedEmail={selectedEmail}
                  onSelectEmail={handleSelectEmail}
                />
              ))}
              {unclassified.length > 0 && (
                <UnclassifiedGroup emails={unclassified} selectedEmail={selectedEmail} onSelectEmail={handleSelectEmail} activeAccount={activeAccount} />
              )}
            </div>
          )}
          
          {/* Load More */}
          {!isSearchMode && hasMore && emails.length > 0 && (
            <div className="p-3">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-2 rounded-xl text-xs font-medium bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Charger plus d'emails"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── EMAIL BODY (Col 3) ── */}
      <div className={`flex-1 bg-slate-950 flex-col min-w-0 ${!selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        {!selectedEmail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
            <Mail className="w-16 h-16 text-slate-800 mb-4" />
            <p className="text-sm font-medium">Sélectionnez un message pour le lire</p>
          </div>
        ) : loadingBody ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-4" />
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-slate-800/80 sticky top-0 bg-slate-950/80 backdrop-blur z-10 shrink-0">
              <div className="flex items-center gap-2 mb-4 md:hidden">
                <button onClick={() => setSelectedEmail(null)} className="flex items-center gap-1 text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg text-sm border border-slate-700">
                  <ArrowLeft className="w-4 h-4" /> Retour
                </button>
              </div>

              {(() => {
                const matched = matchEmailToApartment(selectedEmail, tenantEmailMap)
                if (!matched) return null
                return (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-violet-300 bg-violet-900/30 border border-violet-500/20 rounded-md">
                      <Building2 className="w-3.5 h-3.5" /> {matched.appartementTitre}
                    </span>
                  </div>
                )
              })()}

              <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{selectedEmail.subject || '(Sans objet)'}</h2>

              <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold shrink-0">
                    {(selectedEmail.from?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{selectedEmail.from}</p>
                    <p className="text-xs text-slate-500 mt-0.5">À: {selectedEmail.to}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedEmail.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  
                  {activeBox !== 'sent' && (
                    <div className="flex gap-1.5">
                      <button onClick={handleReply} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition" title="Répondre">
                        <Reply className="w-4 h-4" />
                      </button>
                      <button onClick={handleForward} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition" title="Transférer">
                        <Forward className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
              {selectedEmail.html ? (
                <div className="p-6 md:p-10 mail-html-container max-w-4xl mx-auto dark:text-slate-200" dangerouslySetInnerHTML={{ __html: selectedEmail.html }} />
              ) : (
                <pre className="p-6 md:p-10 whitespace-pre-wrap font-sans text-sm text-slate-800 dark:text-slate-300 max-w-4xl mx-auto">{selectedEmail.text}</pre>
              )}
            </div>

            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4" /> Pièces jointes ({selectedEmail.attachments.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedEmail.attachments.map((att, i) => {
                    let type = att.contentType || '';
                    if (!type || type === 'application/octet-stream') {
                      const lower = (att.filename || '').toLowerCase();
                      if (lower.endsWith('.pdf')) type = 'application/pdf';
                      else if (lower.endsWith('.png')) type = 'image/png';
                      else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) type = 'image/jpeg';
                    }
                    const isViewable = ['application/pdf', 'image/'].some(t => type.startsWith(t))
                    const sizeKb = att.size > 0 ? `${Math.round(att.size / 1024)} Ko` : ''
                    return (
                      <div key={i} className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm w-full sm:w-auto">
                        <button
                          onClick={() => {
                            if (!isViewable || !att.content) return
                            try {
                              const cleanBase64 = att.content.replace(/^data:.*?;base64,/, '').replace(/\s/g, '')
                              const bytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0))
                              const url = URL.createObjectURL(new Blob([bytes], { type: type }))
                              setPreviewAtt({ url, contentType: type, filename: att.filename, content: cleanBase64 })
                            } catch(e) {
                              console.error("Preview error:", e)
                            }
                          }}
                          disabled={!isViewable}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 disabled:hover:text-slate-700 transition max-w-[200px]"
                        >
                          <div className="truncate text-left text-xs font-medium">{att.filename} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">({sizeKb})</span></div>
                        </button>
                        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700" />
                        <AttachmentDownloader att={att} className="p-2 text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/20 transition rounded-r-lg">
                          <Download className="w-4 h-4" />
                        </AttachmentDownloader>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>


      {/* ── ADD ACCOUNT MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full transition"><X className="w-5 h-5" /></button>
            <h3 className="text-2xl font-bold text-white mb-2">Connecter un compte</h3>
            <p className="text-slate-400 text-sm mb-6">Ajoutez une adresse pour lire vos correspondances depuis la plateforme. La connexion IMAP est requise.</p>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Fournisseur :</label>
                <div className="grid grid-cols-3 gap-3">
                  {['orange', 'gmail', 'other'].map(p => (
                    <button key={p} type="button" onClick={() => handleProviderChange({ target: { value: p } })}
                      className={`py-3 px-2 rounded-xl text-sm font-bold capitalize transition border-2 ${newAcc.provider === p ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      {p === 'other' ? 'Autre' : p}
                    </button>
                  ))}
                </div>
              </div>

              {newAcc.provider === 'gmail' && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-200 mt-2">
                  <p className="font-bold mb-1 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Sécurité Google</p>
                  <p>Google n'autorise plus l'utilisation du mot de passe de votre compte directement. Vous devez créer un <strong>Mot de Passe d'Application</strong>.</p>
                  <a href="https://support.google.com/accounts/answer/185833?hl=fr" target="_blank" rel="noreferrer" className="text-yellow-400 font-bold underline mt-2 inline-block">Voir le tutoriel officiel Google</a>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Adresse Email</label>
                <input type="email" required placeholder="contact@monsite.fr" className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500 transition" value={newAcc.email} onChange={e => setNewAcc({ ...newAcc, email: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Mot de passe {newAcc.provider === 'gmail' ? "d'Application" : ''}</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required placeholder="••••••••••••••" className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-violet-500 transition" value={newAcc.password} onChange={e => setNewAcc({ ...newAcc, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {newAcc.provider === 'other' && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Serveur IMAP</label>
                    <input type="text" required placeholder="imap.serveur.com" className="w-full bg-transparent text-white outline-none border-b border-slate-700 pb-1 focus:border-violet-500" value={newAcc.imap_host} onChange={e => setNewAcc({ ...newAcc, imap_host: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Port</label>
                    <input type="number" required placeholder="993" className="w-full bg-transparent text-white outline-none border-b border-slate-700 pb-1 focus:border-violet-500" value={newAcc.imap_port} onChange={e => setNewAcc({ ...newAcc, imap_port: e.target.value })} />
                  </div>
                </div>
              )}

              <button type="submit" disabled={addingAccount} className="w-full py-4 mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition shadow-xl shadow-emerald-600/20 disabled:opacity-50">
                {addingAccount ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                {addingAccount ? "Test de connexion..." : "Sauvegarder le compte"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ATTACHMENT PREVIEW MODAL ── */}
      {previewAtt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4" onClick={() => { URL.revokeObjectURL(previewAtt.url); setPreviewAtt(null) }}>
          <div className="w-full max-w-5xl h-full max-h-[90vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden bg-slate-900 border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-slate-800 px-5 py-4 border-b border-slate-700 m-0">
              <div className="flex items-center gap-3 text-white text-base font-bold truncate">
                <Paperclip className="w-5 h-5 text-violet-400 flex-shrink-0" />
                <span className="truncate">{previewAtt.filename}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <AttachmentDownloader att={previewAtt} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-violet-600 text-white rounded-xl text-sm font-medium transition shadow-lg">
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Télécharger</span>
                </AttachmentDownloader>
                <button onClick={() => { URL.revokeObjectURL(previewAtt.url); setPreviewAtt(null) }} className="p-2 text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-xl transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 overflow-hidden relative flex items-center justify-center">
              {previewAtt.contentType.startsWith('image/') ? (
                <img src={previewAtt.url} alt={previewAtt.filename} className="w-full h-full object-contain" />
              ) : (
                <iframe src={previewAtt.url} title={previewAtt.filename} className="w-full h-full border-0" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── COMPOSE MODAL ── */}
      <ComposeEmailModal
        isOpen={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        initialData={composeData}
        accounts={accounts}
        activeAccountId={activeAccountId}
      />

      <DeleteModal 
        title={accToDelete ? "Supprimer la boîte mail ?" : ""}
        subtitle={accToDelete ? `L'adresse "${accToDelete.email}" et tous les emails synchronisés seront retirés de l'application.` : ""}
        loading={deletingAcc}
        onCancel={() => setAccToDelete(null)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  )
}
