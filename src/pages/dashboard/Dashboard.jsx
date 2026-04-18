import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { appartements as aptApi, locataires as tenantApi, paiements as payApi } from '../../services/api'
import { Building2, Users, CreditCard, AlertTriangle, TrendingUp, ArrowUpRight, ArrowRight, CalendarDays, CheckCircle2, Clock, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useCountUp } from 'react-countup'

// ─── Tooltip personnalisé ─────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 shadow-xl shadow-black/30">
      <p className="text-xs text-slate-400 mb-1 font-medium">{label}</p>
      <p className="text-white font-bold text-base">{payload[0].value.toLocaleString('fr-FR')} <span className="text-slate-400 font-normal text-sm">€</span></p>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────
function MetricCard({ title, value, suffix = '', sub, icon: Icon, accent, trend, onClick }) {
  const countUpRef = React.useRef(null)
  
  useCountUp({
    ref: countUpRef,
    start: 0,
    end: value,
    duration: 1.8,
    separator: ' ',
  })

  const accents = {
    violet:  { ring: 'ring-violet-500/20',  icon: 'bg-violet-500/15 text-violet-400',  val: 'text-violet-400',  glow: 'shadow-violet-500/10' },
    indigo:  { ring: 'ring-indigo-500/20',  icon: 'bg-indigo-500/15 text-indigo-400',  val: 'text-indigo-400',  glow: 'shadow-indigo-500/10' },
    emerald: { ring: 'ring-emerald-500/20', icon: 'bg-emerald-500/15 text-emerald-400', val: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
    rose:    { ring: 'ring-rose-500/20',    icon: 'bg-rose-500/15 text-rose-400',       val: 'text-rose-400',    glow: 'shadow-rose-500/10' },
  }
  const a = accents[accent] ?? accents.violet

  return (
    <div
      onClick={onClick}
      className={`
        group relative bg-slate-900 rounded-2xl p-5 cursor-pointer ring-1 ${a.ring}
        shadow-lg ${a.glow} hover:-translate-y-0.5 hover:shadow-xl
        transition-all duration-200 overflow-hidden
      `}
    >
      {/* Subtle glow orb */}
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 blur-2xl bg-current" style={{ color: accent === 'violet' ? '#7c3aed' : accent === 'emerald' ? '#10b981' : accent === 'rose' ? '#f43f5e' : '#6366f1' }} />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.icon}`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend !== undefined && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20 px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> {trend}
            </span>
          )}
        </div>
        <p className={`text-2xl font-bold tracking-tight mb-1 flex items-baseline gap-1 ${a.val}`}>
          <span ref={countUpRef}>0</span>
          {suffix && <span className="text-xl opacity-80">{suffix}</span>}
        </p>
        <p className="text-sm font-semibold text-slate-300">{title}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Payment Row ──────────────────────────────────────────────
function PaymentRow({ payment, onClick }) {
  const name = `${payment.locations?.locataires?.prenom ?? ''} ${payment.locations?.locataires?.nom ?? ''}`.trim()
  const apt  = payment.locations?.appartements?.titre ?? '—'
  const amount = ((payment.montant || 0) + (payment.montant_charges || 0)).toLocaleString('fr-FR')
  const date = new Date(payment.date_paiement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  const statusConfig = {
    paye:       { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Payé' },
    en_attente: { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Attente' },
    retard:     { icon: AlertTriangle,color: 'text-rose-400',    bg: 'bg-rose-500/10',    label: 'Retard' },
    partiel:    { icon: Clock,        color: 'text-blue-400',    bg: 'bg-blue-500/10',    label: 'Partiel' },
  }
  const s = statusConfig[payment.statut] ?? statusConfig.en_attente
  const SIcon = s.icon

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-4 py-3.5 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition-colors duration-150 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${s.bg}`}>
        <SIcon className={`w-3.5 h-3.5 ${s.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate leading-tight">{name || '—'}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{apt}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-white tabular-nums">{amount} €</p>
        <p className="text-xs text-slate-500 mt-0.5">{date}</p>
      </div>
    </div>
  )
}

// ─── Quick Actions ────────────────────────────────────────────
function QuickActions({ navigate }) {
  const actions = [
    { label: 'Ajouter un bien',   path: '/apartments/new', icon: Building2,    color: 'violet' },
    { label: 'Nouveau locataire', path: '/tenants/new',    icon: Users,         color: 'indigo' },
    { label: 'Voir calendrier',   path: '/calendar',       icon: CalendarDays,  color: 'emerald' },
    { label: 'Finances',          path: '/finance',        icon: CreditCard,    color: 'rose' },
  ]
  const colors = {
    violet:  'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 ring-violet-500/20',
    indigo:  'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 ring-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 ring-emerald-500/20',
    rose:    'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 ring-rose-500/20',
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map(a => {
        const Icon = a.icon
        return (
          <button
            key={a.path}
            onClick={() => navigate(a.path)}
            className={`flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl text-sm font-semibold ring-1 transition-all duration-150 text-center ${colors[a.color]}`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="leading-tight w-full">{a.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────
export default function Dashboard() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

  const [stats, setStats]             = useState({ apts: 0, tenants: 0, revenue: 0, retards: 0 })
  const [chartData, setChartData]     = useState([])
  const [recentPayments, setRecent]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [chartAnimated, setChartAnimated] = useState(false)

  // Désactive l'animation après qu'elle se soit jouée, pour éviter le rejeu au redimensionnement
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setChartAnimated(true), 1600)
      return () => clearTimeout(t)
    }
  }, [loading])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    const [{ data: apts }, { data: tenants }, { data: payments }] = await Promise.all([
      aptApi.getAll(), tenantApi.getAll(), payApi.getAll(),
    ])

    const now = new Date()

    const revenue = (payments || [])
      .filter(p => {
        const d = new Date(p.date_paiement)
        return p.statut === 'paye' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((s, p) => s + (p.montant || 0) + (p.montant_charges || 0), 0)

    const retards = (payments || []).filter(p => p.statut === 'retard').length

    const months = []
    for (let i = 5; i >= 0; i--) {
      const d    = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const pays = (payments || []).filter(p => {
        const pd = new Date(p.date_paiement)
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear() && p.statut === 'paye'
      })
      months.push({
        name:  d.toLocaleDateString('fr-FR', { month: 'short' }),
        total: pays.reduce((s, p) => s + (p.montant || 0) + (p.montant_charges || 0), 0),
      })
    }

    setStats({ apts: (apts || []).length, tenants: (tenants || []).length, revenue, retards })
    setChartData(months)
    setRecent((payments || []).slice(0, 6))
    setLoading(false)
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  // Greeting
  const hour     = new Date().getHours()
  const greeting = hour < 6 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const dateStr  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const maxRevenue = Math.max(...chartData.map(d => d.total), 1)

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-7">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest">{greeting}</p>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            {profile?.prenom || 'Propriétaire'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">{dateStr}</p>
        </div>
        <button
          onClick={() => navigate('/calendar')}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-voltage-600 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl ring-1 ring-slate-700 text-sm font-semibold transition-all duration-150"
        >
          <CalendarDays className="w-4 h-4" />
          Calendrier
        </button>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-900 rounded-2xl animate-pulse ring-1 ring-slate-800" />)
        ) : (
          <>
            <MetricCard
              title="Revenus ce mois"
              value={stats.revenue}
              suffix="€"
              sub={stats.revenue === 0 ? 'Aucun ce mois' : 'loyers encaissés'}
              icon={TrendingUp} accent="violet"
              trend={stats.revenue > 0 ? '+loyers' : undefined}
              onClick={() => navigate('/finance')}
            />
            <MetricCard
              title="Biens"
              value={stats.apts}
              sub={`${stats.apts} bien${stats.apts !== 1 ? 's' : ''} géré${stats.apts !== 1 ? 's' : ''}`}
              icon={Building2} accent="indigo"
              onClick={() => navigate('/apartments')}
            />
            <MetricCard
              title="Locataires"
              value={stats.tenants}
              sub="locataires actifs"
              icon={Users} accent="emerald"
              onClick={() => navigate('/tenants')}
            />
            <MetricCard
              title="Impayés"
              value={stats.retards}
              sub={stats.retards === 0 ? 'Tout est à jour' : 'en retard de paiement'}
              icon={AlertTriangle} accent="rose"
              onClick={() => navigate('/finance')}
            />
          </>
        )}
      </div>

      {/* ── Chart + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Chart */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Revenus locatifs</h2>
              <p className="text-xs text-slate-500 mt-0.5">6 derniers mois</p>
            </div>
            <button onClick={() => navigate('/finance')} className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition">
              Voir tout <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11, fontFamily: 'Plus Jakarta Sans', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#7c3aed"
                  strokeWidth={2.5}
                  fill="url(#grad)"
                  dot={{ fill: '#7c3aed', r: 3.5, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={!chartAnimated}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Recent payments */}
          <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white tracking-tight">Derniers paiements</h2>
              <button onClick={() => navigate('/finance')} className="text-slate-500 hover:text-slate-300 transition">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded-xl animate-pulse" />)}
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="py-6 text-center">
                <CreditCard className="w-7 h-7 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-xs">Aucun paiement enregistré</p>
              </div>
            ) : (
              <div className="-mt-1">
                {recentPayments.slice(0, 4).map(p => (
                  <PaymentRow 
                    key={p.id} 
                    payment={p}
                    onClick={() => navigate('/finance')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-5">
            <h2 className="text-sm font-bold text-white tracking-tight mb-3">Actions rapides</h2>
            <QuickActions navigate={navigate} />
          </div>
        </div>
      </div>
    </div>
  )
}
