import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, Zap, Lock, Mail } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)
    
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.error)
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-cyber-darker relative overflow-hidden flex items-center justify-center">
      {/* Animated grid background */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none z-0"></div>
      
      {/* Scan line overlay */}
      <div className="fixed inset-0 scan-line pointer-events-none opacity-30 z-0"></div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-64 h-64 border-t-4 border-l-4 border-cyber-primary opacity-30"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 border-b-4 border-r-4 border-cyber-secondary opacity-30"></div>

      <div className="relative max-w-md w-full px-4 sm:px-6 lg:px-8 z-10">
        {/* Logo/Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Zap className="w-16 h-16 text-cyber-primary animate-pulse-neon" />
              <div className="absolute inset-0 w-16 h-16 bg-cyber-primary blur-2xl opacity-50"></div>
            </div>
          </div>
          <h1 className="text-5xl font-display font-black text-neon uppercase tracking-wider mb-4 glitch" data-text="HYPERFIT">
            HYPERFIT
          </h1>
          <p className="text-cyber-gray-light font-mono text-sm uppercase tracking-widest">
            SYSTEM ACCESS REQUIRED
          </p>
        </div>

        {/* Login Card */}
        <div className="card-cyber border-4 border-cyber-primary relative z-10">
          {/* Scan line effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-cyber-primary opacity-50 animate-pulse pointer-events-none"></div>
          
          <h2 className="text-2xl font-display font-bold text-cyber-primary uppercase mb-6 tracking-wider text-center">
            AUTHENTICATION
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="border-2 border-cyber-secondary bg-cyber-dark p-4">
                <p className="text-cyber-secondary font-mono text-sm uppercase tracking-wider">
                  ERROR: {error}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  EMAIL ADDRESS
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200 placeholder:text-cyber-gray-light relative z-20"
                  placeholder="USER@DOMAIN.COM"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={{ pointerEvents: 'auto' }}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  PASSWORD
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200 placeholder:text-cyber-gray-light relative z-20"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ pointerEvents: 'auto' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-cyber w-full flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-cyber-primary border-t-transparent animate-spin"></div>
                  <span>PROCESSING...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>ACCESS SYSTEM</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-cyber-gray-light text-center">
            <p className="text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
              NEW USER?
            </p>
            <Link
              to="/register"
              className="text-cyber-primary hover:text-cyber-secondary font-mono font-bold uppercase tracking-wider transition-colors"
            >
              CREATE ACCOUNT →
            </Link>
          </div>
        </div>

        {/* Terminal footer */}
        <div className="mt-8 text-center">
          <p className="text-xs font-mono text-cyber-gray-light">
            {'>'} SYSTEM STATUS: ONLINE
          </p>
        </div>
      </div>
    </div>
  )
}