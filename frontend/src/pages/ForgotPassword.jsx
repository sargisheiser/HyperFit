import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Loader2, CheckCircle2 } from 'lucide-react'
import api from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resetToken, setResetToken] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const { data } = await api.post('/api/users/forgot-password', { email })
      setSuccess(true)
      // In development, show the token (remove in production)
      if (data.token) {
        setResetToken(data.token)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler beim Senden der Reset-E-Mail')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#040705] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[36px] border border-[#00FF7F]/20 bg-gradient-to-br from-[#121b14]/90 via-[#0a140e]/88 to-[#060907]/90 p-8 text-[#b6fbd4] shadow-[0_0_55px_rgba(0,255,127,0.14)]"
      >
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">HyperFit</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Passwort zurücksetzen</h1>
          <p className="mt-1 text-sm text-white/60">
            Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
          </p>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 rounded-2xl border border-[#00FF7F]/30 bg-[#00FF7F]/10 p-6"
          >
            <div className="flex items-center gap-3 text-[#00FF7F]">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">E-Mail gesendet!</p>
            </div>
            <p className="text-sm text-white/80">
              Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir dir einen Link zum Zurücksetzen des Passworts gesendet.
            </p>
            
            {resetToken && (
              <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="mb-2 text-xs font-semibold text-yellow-400">🔧 Development Mode</p>
                <p className="mb-2 text-xs text-yellow-300/80">
                  Reset-Token (nur für Entwicklung):
                </p>
                <p className="break-all rounded-lg bg-black/30 p-2 text-xs font-mono text-yellow-200">
                  {resetToken}
                </p>
                <Link
                  to={`/reset-password?token=${resetToken}`}
                  className="mt-3 inline-block rounded-lg bg-yellow-500/20 px-4 py-2 text-xs font-medium text-yellow-300 transition hover:bg-yellow-500/30"
                >
                  Direkt zum Reset-Formular →
                </Link>
              </div>
            )}

            <Link
              to="/login"
              className="mt-4 block text-center text-sm text-[#00FF7F] hover:text-white transition"
            >
              Zurück zum Login
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]" htmlFor="email">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-2xl border border-[#00FF7F]/20 bg-transparent pl-12 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F] focus:outline-none"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-4 py-3 text-sm font-semibold text-[#07100b] transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                'Reset-Link senden'
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-[#9fffcf]">
          <Link to="/login" className="text-[#00FF7F] hover:text-white transition">
            ← Zurück zum Login
          </Link>
        </p>
      </motion.div>
    </div>
  )
}




