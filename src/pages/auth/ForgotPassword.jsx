import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../../services/api'
import { Building2, Mail, ArrowLeft, Loader2 } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await auth.resetPassword(email)
    setLoading(false)
    if (authError) setError(authError.message)
    else setSent(true)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 mb-4 shadow-xl shadow-violet-500/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Email envoyé !</h2>
              <p className="text-slate-400 text-sm mb-6">Vérifiez votre boîte mail pour réinitialiser votre mot de passe.</p>
              <Link to="/login" className="text-violet-400 hover:text-violet-300 transition text-sm flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Mot de passe oublié</h2>
              <p className="text-slate-400 text-sm mb-6">Entrez votre email pour recevoir un lien de réinitialisation.</p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com" required className="w-full bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-500/25 disabled:opacity-60">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>

              <Link to="/login" className="mt-6 text-sm text-slate-400 hover:text-slate-300 transition flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
