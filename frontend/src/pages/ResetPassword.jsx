import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import api from '../services/api'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Kein Reset-Token gefunden. Bitte verwende den Link aus der E-Mail.')
    }
  }, [token])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!token) {
      setError('Kein Reset-Token gefunden.')
      return
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }

    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }

    setLoading(true)

    try {
      await api.post('/api/users/reset-password', {
        token,
        new_password: password,
      })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler beim Zurücksetzen des Passworts')
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
          <h1 className="mt-2 text-3xl font-semibold text-white">Neues Passwort setzen</h1>
          <p className="mt-1 text-sm text-white/60">
            Gib dein neues Passwort ein. Es muss mindestens 8 Zeichen lang sein.
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
              <p className="font-medium">Passwort erfolgreich zurückgesetzt!</p>
            </div>
            <p className="text-sm text-white/80">
              Du wirst in Kürze zum Login weitergeleitet...
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]" htmlFor="password">
                Neues Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-2xl border border-[#00FF7F]/20 bg-transparent pl-12 pr-12 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F] focus:outline-none"
                  placeholder="Mindestens 8 Zeichen"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]" htmlFor="confirmPassword">
                Passwort bestätigen
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-2xl border border-[#00FF7F]/20 bg-transparent pl-12 pr-12 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F] focus:outline-none"
                  placeholder="Passwort wiederholen"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
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
              disabled={loading || !token}
              className="w-full rounded-2xl bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-4 py-3 text-sm font-semibold text-[#07100b] transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird zurückgesetzt...
                </>
              ) : (
                'Passwort zurücksetzen'
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




