import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { register, login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    full_name: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const result = await register(formData)
    if (result.success) {
      const loginResult = await login(formData.email, formData.password)
      if (loginResult.success) {
        navigate('/dashboard')
      } else {
        setError('Registrierung erfolgreich, aber automatische Anmeldung fehlgeschlagen. Bitte melde dich manuell an.')
      }
    } else {
      setError(result.error || 'Konto konnte nicht erstellt werden')
    }

    setLoading(false)
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#040705] px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center text-[#b6fbd4]">
          <p className="text-xs uppercase tracking-[0.4em] text-[#8cffc7]">Sargis Heiser</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Erstelle deinen HyperFit Zugang</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[36px] border border-[#00FF7F]/20 bg-gradient-to-br from-[#121b14]/90 via-[#0a140e]/88 to-[#060907]/90 p-6 text-[#b6fbd4] shadow-[0_0_55px_rgba(0,255,127,0.14)] backdrop-blur-xl"
        >
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]" htmlFor="email">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-[#00FF7F]/20 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F] focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]" htmlFor="username">
              Benutzername
            </label>
            <input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-[#00FF7F]/20 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F] focus:outline-none"
              placeholder="hyperfit-maverick"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]" htmlFor="full_name">
              Vollständiger Name
            </label>
            <input
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-[#00FF7F]/20 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F] focus:outline-none"
              placeholder="Sargis Heiser"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]" htmlFor="password">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-[#00FF7F]/20 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F] focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-[#ff8aa8]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-4 py-3 text-sm font-semibold text-[#07100b] transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Profil wird erstellt…' : 'Konto erstellen'}
          </button>
        </form>

        <p className="text-center text-sm text-[#9fffcf]">
          Bereits bei HyperFit registriert?{' '}
          <Link to="/login" className="text-[#00FF7F] hover:text-white">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}











