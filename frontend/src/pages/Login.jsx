import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.error || 'Authentifizierung fehlgeschlagen')
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#040705] p-4">
      <div className="w-full max-w-md rounded-[36px] border border-[#00FF7F]/20 bg-gradient-to-br from-[#121b14]/90 via-[#0a140e]/88 to-[#060907]/90 p-8 text-[#b6fbd4] shadow-[0_0_55px_rgba(0,255,127,0.14)]">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">HyperFit</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Willkommen zurück</h1>
          <p className="mt-1 text-sm">Melde dich an, um auf deine KI-gestützte Trainingssuite zuzugreifen.</p>
        </div>
        <form onSubmit={handleSubmit} className=
          "space-y-4 rounded-[36px] border border-[#00FF7F]/20 bg-gradient-to-br from-[#121b14]/85 via-[#0a140e]/85 to-[#060907]/90 p-6 shadow-[0_0_55px_rgba(0,255,127,0.12)] backdrop-blur-xl"
        >
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]" htmlFor="email">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-2xl border border-[#00FF7F]/20 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F] focus:outline-none"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]" htmlFor="password">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-2xl border border-[#00FF7F]/20 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F] focus:outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-xs text-[#ff8aa8]">{error}</p>}

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-xs text-[#00FF7F] hover:text-white transition"
            >
              Passwort vergessen?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-4 py-3 text-sm font-semibold text-[#07100b] transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Wird authentifiziert…' : 'Anmelden'}
          </button>
        </form>

        <p className="text-center text-sm text-[#9fffcf]">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-[#00FF7F] hover:text-white">
            Hier registrieren
          </Link>
        </p>
      </div>
    </div>
  )
}











