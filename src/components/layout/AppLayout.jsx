import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { auth } from '../../services/api'
import {
  LayoutDashboard, Building2, Users, FileText, CreditCard,
  Settings, LogOut, Menu, X, Inbox, Contact2, CalendarDays,
  Sun, Moon, ChevronRight, Search, Command
} from 'lucide-react'
import CommandBar from '../ui/CommandBar'

const navItems = [
  { path: '/dashboard',  label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/apartments', label: 'Appartements',     icon: Building2 },
  { path: '/tenants',    label: 'Locataires',       icon: Users },
  { path: '/calendar',   label: 'Calendrier',       icon: CalendarDays },
  { path: '/messages',   label: 'Messagerie',       icon: Inbox },
  { path: '/finance',    label: 'Finance',          icon: CreditCard },
  { path: '/documents',  label: 'Documents',        icon: FileText },
  { path: '/contacts',   label: 'Prestataires',     icon: Contact2 },
]

function NavItem({ item, active, onClick, mobile }) {
  const Icon = item.icon
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`
        relative flex items-center justify-start py-3 pl-4 pr-3 mx-3 rounded-xl text-sm font-medium
        transition-colors duration-150 group cursor-pointer
        ${active
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }
      `}
    >
      <div className="w-[26px] h-full flex items-center justify-center shrink-0 z-10 transition-transform group-hover:scale-105">
        <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${active ? '' : 'text-slate-500 group-hover:text-slate-300'}`} />
      </div>
      <div className={`${mobile ? 'static ml-3' : 'absolute left-[3.75rem] opacity-0 -translate-x-3 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0'} whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] pointer-events-none flex items-center h-full`}>
        <span>{item.label}</span>
      </div>
    </Link>
  )
}

function Sidebar({ onClose, mobile }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const handleLogout = async () => {
    await auth.signOut()
    navigate('/login')
  }

  const initials = [profile?.prenom?.[0], profile?.nom?.[0]].filter(Boolean).join('').toUpperCase() || '?'

  // Shared class for text revealed on hover (desktop) or always visible (mobile)
  const labelCls = mobile
    ? 'static ml-3 flex items-center h-full whitespace-nowrap'
    : 'absolute left-[3.75rem] whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] opacity-0 -translate-x-3 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 pointer-events-none flex items-center h-full'

  return (
    <div className="flex flex-col h-full w-full">
      {/* Logo */}
      <div className="mb-6 mt-5 pl-[25px] pr-5 flex items-center justify-start relative">
        <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/40 shrink-0 z-10 text-white">
          <Building2 className="w-[18px] h-[18px]" />
        </div>
        <div className={
          mobile
            ? 'ml-3 flex items-center whitespace-nowrap'
            : 'absolute left-[4.5rem] whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] opacity-0 -translate-x-3 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 pointer-events-none flex items-center'
        }>
          <h1 className="text-[14px] font-bold text-white tracking-tight leading-none">
            Gestion Locative
          </h1>
        </div>
        {onClose && (
          <button onClick={onClose} className="absolute right-4 text-slate-500 hover:text-slate-300 transition md:hidden z-10">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav section */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-0.5 custom-scrollbar py-2">
        <div className="relative mb-2 h-4 pl-[26px] pr-6 flex items-center">
            <p className={`${mobile ? '' : 'absolute opacity-0 -translate-x-3 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0'} whitespace-nowrap text-[10px] font-semibold text-slate-600 uppercase tracking-widest transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)]`}>
                Navigation
            </p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(item => (
            <NavItem
              key={item.path}
              item={item}
              active={location.pathname.startsWith(item.path)}
              onClick={onClose}
              mobile={mobile}
            />
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="pb-3 pt-3 space-y-1">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-start py-3 pl-4 pr-3 mx-3 rounded-xl hover:bg-slate-800 transition-colors group relative"
          style={{ width: 'calc(100% - 24px)' }}
        >
          <div className="w-[26px] h-full flex items-center justify-center shrink-0 z-10 transition-transform group-hover:scale-105">
            {theme === 'dark'
              ? <Sun className="w-5 h-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
              : <Moon className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            }
          </div>
          <div className={labelCls}>
            <span className="text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
              {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            </span>
          </div>
        </button>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-start py-3 pl-4 pr-3 mx-3 rounded-xl hover:bg-rose-500/10 transition-colors group relative"
          style={{ width: 'calc(100% - 24px)' }}
        >
          <div className="w-[26px] h-full flex items-center justify-center shrink-0 z-10 transition-transform group-hover:scale-105">
            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-rose-400 transition-colors" />
          </div>
          <div className={labelCls}>
            <span className="text-sm font-medium text-slate-400 group-hover:text-rose-400 transition-colors">
              Déconnexion
            </span>
          </div>
        </button>
      </div>

      <div className="pb-2 border-t border-slate-800/60 pt-3">
        <button
          onClick={() => window.dispatchEvent(new Event('open-command-bar'))}
          className="w-full flex items-center justify-start py-3 pl-4 pr-3 mx-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors group relative overflow-hidden"
          style={{ width: 'calc(100% - 24px)' }}
        >
          <div className="w-[26px] h-full flex items-center justify-center shrink-0 z-10 transition-transform group-hover:scale-105">
            <Search className="w-5 h-5 text-slate-500 group-hover:text-slate-400 transition-colors" />
          </div>
          <div className={`${mobile ? 'static ml-3 flex items-center h-full justify-between flex-1' : 'absolute left-[3.75rem] right-3 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] opacity-0 -translate-x-3 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 pointer-events-none flex items-center h-full justify-between'}`}>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
              Recherche...
            </span>
            <div className="flex items-center gap-1">
              <Command className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>
        </button>
      </div>

      {/* User card */}
      <div className="pb-4 pt-1">
        <Link 
          to="/settings"
          onClick={onClose}
          className="w-full flex items-center justify-start py-3 pl-[12px] pr-3 mx-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-700 transition cursor-pointer group relative"
          style={{ width: 'calc(100% - 24px)' }}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0 z-10 transition-transform group-hover:scale-105 shadow-sm shadow-violet-500/30">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              initials
            )}
          </div>
          <div className={`${mobile ? 'static ml-3 flex flex-col justify-center h-full' : 'absolute left-[3.75rem] whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] opacity-0 -translate-x-3 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 pointer-events-none flex flex-col justify-center h-full'}`}>
            <p className="text-[13px] font-semibold text-white leading-tight group-hover:text-violet-400 transition-colors">
              {profile?.prenom || 'Paramètres'} {profile?.nom}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 group-hover:text-slate-400 transition-colors leading-tight">
              Mon profil
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <CommandBar />

      {/* Sidebar Desktop CSS hover expanded fixed container */}
      <aside className="hidden lg:flex flex-col w-[84px] hover:w-[260px] group/sidebar flex-shrink-0 bg-slate-900 border-r border-slate-800/60 transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] z-40 overflow-hidden">
        <Sidebar collapsed={false} />
      </aside>

      {/* Sidebar Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800/60 flex flex-col">
            <Sidebar onClose={() => setMobileOpen(false)} mobile />
          </aside>
        </div>
      )}


      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 bg-slate-900">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white transition">
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-violet-500/30 text-white">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">Gestion Locative</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
