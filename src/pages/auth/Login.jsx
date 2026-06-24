import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../services/supabase'
import { Building2, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, RefreshCw, Fingerprint } from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ============================================================
// Schémas de validation
// ============================================================
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
  rememberMe: z.boolean().optional(),
})

// ============================================================
// STEP 1 : Formulaire email + mot de passe
// ============================================================
function StepPassword({ onSuccess }) {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  })

  const onSubmit = async ({ email, password, rememberMe }) => {
    setError('')
    try {
      // 1. Vérifier les credentials avec Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError('Email ou mot de passe incorrect')
        return
      }

      // 2. Récupérer les infos du profil (dont la préférence 2FA)
      const user = data.user
      const { data: profileData } = await supabase
        .from('profiles')
        .select('prenom, two_factor_enabled')
        .eq('id', user.id)
        .single()

      // Si la 2FA est expressément désactivée, on s'arrête ici et on va au dashboard
      if (profileData && profileData.two_factor_enabled === false) {
        navigate('/dashboard')
        return
      }

      // 3. Sinon (2FA activée ou non définie), on déconnecte provisoirement et on envoie le code
      await supabase.auth.signOut()

      await axios.post(`${API_URL}/api/auth/send-2fa`, {
        userId: user.id,
        email: user.email,
        prenom: profileData?.prenom || '',
      })

      // 4. Passer à l'étape 2 en passant les infos nécessaires
      onSuccess({ email, password, userId: user.id, prenom: profileData?.prenom, rememberMe })

    } catch (err) {
      console.error(err)
      setError('Erreur de connexion. Veuillez réessayer.')
    }
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  const handlePasskeyLogin = async () => {
    setError('')
    try {
      const { data, error: authError } = await supabase.auth.signInWithPasskey()
      if (authError) throw authError
      navigate('/dashboard')
    } catch (err) {
      console.error('Passkey login error:', err)
      setError("Échec de la connexion biométrique. L'appareil n'est pas enregistré ou n'est pas reconnu.")
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-white mb-6">Connexion</h2>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Bouton Google */}
      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium rounded-xl transition-all duration-200 mb-4"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continuer avec Google
      </button>

      {/* Bouton Passkey (Face ID / Touch ID) */}
      <button
        type="button"
        onClick={handlePasskeyLogin}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 border border-violet-500/50 text-white font-medium rounded-xl transition-all duration-200 mb-4 shadow-lg shadow-violet-600/20"
      >
        <Fingerprint className="w-5 h-5" />
        Continuer avec Face ID / Touch ID
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-slate-500">ou</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              {...register('email')}
              type="email"
              placeholder="vous@email.com"
              autoComplete="email"
              className="w-full bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              {...register('rememberMe')}
              type="checkbox"
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
            />
            <span className="text-sm text-slate-400">Rester connecté 30 jours</span>
          </label>
          <Link to="/forgot-password" className="text-xs text-violet-400 hover:text-violet-300 transition">
            Mot de passe oublié ?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isSubmitting ? 'Vérification...' : 'Continuer'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Pas de compte ?{' '}
        <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium transition">
          Créer un compte
        </Link>
      </p>
    </>
  )
}

// ============================================================
// STEP 2 : Saisie du code 2FA
// ============================================================
function Step2FA({ loginData, onBack }) {
  const navigate = useNavigate()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [tooManyAttempts, setTooManyAttempts] = useState(false)
  const inputsRef = useRef([])

  // Focus sur le 1er champ au montage
  useEffect(() => { inputsRef.current[0]?.focus() }, [])

  // Cooldown pour le renvoi
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleChange = (index, value) => {
    // Accepter seulement les chiffres
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1) // Un seul caractère
    setCode(newCode)
    // Auto-focus suivant
    if (value && index < 5) inputsRef.current[index + 1]?.focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newCode = Array(6).fill('')
    pasted.split('').forEach((char, i) => { newCode[i] = char })
    setCode(newCode)
    // Focus sur le dernier champ rempli
    const lastIndex = Math.min(pasted.length, 5)
    inputsRef.current[lastIndex]?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length < 6) return setError('Entrez le code à 6 chiffres complet')

    setError('')
    setLoading(true)

    try {
      // Vérifier le code via notre serveur
      const { data } = await axios.post(`${API_URL}/api/auth/verify-2fa`, {
        userId: loginData.userId,
        email: loginData.email,
        code: fullCode,
      })

      if (data.success) {
        // Code OK → se reconnecter réellement avec Supabase
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginData.email,
          password: loginData.password,
        })

        if (signInError) {
          setError('Erreur lors de la connexion finale. Veuillez réessayer.')
        } else {
          navigate('/dashboard')
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur de vérification'
      if (err.response?.data?.tooManyAttempts) setTooManyAttempts(true)
      setError(msg)
      // Réinitialiser les champs si trop de tentatives
      if (err.response?.data?.tooManyAttempts) setCode(['', '', '', '', '', ''])
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    setTooManyAttempts(false)
    setCode(['', '', '', '', '', ''])
    try {
      await axios.post(`${API_URL}/api/auth/send-2fa`, {
        userId: loginData.userId,
        email: loginData.email,
        prenom: loginData.prenom,
      })
      setResendCooldown(60)
      inputsRef.current[0]?.focus()
    } catch {
      setError('Erreur lors du renvoi du code.')
    } finally {
      setResending(false)
    }
  }

  const emailMasked = loginData.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')

  return (
    <>
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-3">
          <Mail className="w-7 h-7 text-violet-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-1">Vérification en 2 étapes</h2>
        <p className="text-slate-400 text-sm">
          Code envoyé à <span className="text-slate-300 font-medium">{emailMasked}</span>
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 6 champs pour le code */}
        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputsRef.current[index] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              disabled={tooManyAttempts}
              className={`w-11 h-13 text-center text-xl font-bold bg-slate-800/50 border rounded-xl text-white transition focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                digit ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700'
              } ${tooManyAttempts ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || code.join('').length < 6 || tooManyAttempts}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Vérification...' : 'Confirmer le code'}
        </button>
      </form>

      <div className="text-center mt-4">
        <button
          onClick={handleResend}
          disabled={resending || resendCooldown > 0}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 transition mx-auto disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
          {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : 'Renvoyer le code'}
        </button>
      </div>
    </>
  )
}

// ============================================================
// Composant principal Login
// ============================================================
export default function Login() {
  const [step, setStep] = useState(1) // 1 = password, 2 = 2FA
  const [loginData, setLoginData] = useState(null)

  const handlePasswordSuccess = (data) => {
    setLoginData(data)
    setStep(2)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Fond gradient animé */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 mb-4 shadow-xl shadow-violet-500/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Gestion Locative</h1>
          <p className="text-slate-400 text-sm mt-1">Gérez votre patrimoine immobilier</p>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-violet-500' : 'bg-slate-800'}`} />
          <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-violet-500' : 'bg-slate-800'}`} />
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          {step === 1 && (
            <StepPassword onSuccess={handlePasswordSuccess} />
          )}
          {step === 2 && (
            <Step2FA loginData={loginData} onBack={() => setStep(1)} />
          )}
        </div>
      </div>
    </div>
  )
}
