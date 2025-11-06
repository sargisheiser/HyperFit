import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserPlus, Zap, User, Mail, Lock, UserCircle } from 'lucide-react'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    full_name: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await register(formData)
      
      if (result.success) {
        const loginResult = await login(formData.email, formData.password)
        if (loginResult.success) {
          navigate('/dashboard')
        } else {
          setError('Registration successful but login failed. Please try logging in.')
        }
      } else {
        setError(result.error || 'Registration failed. Please try again.')
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Failed to connect to server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-cyber-darker relative overflow-hidden flex items-center justify-center py-12 px-4">
      {/* Animated grid background */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none"></div>
      
      {/* Scan line overlay */}
      <div className="fixed inset-0 scan-line pointer-events-none opacity-30"></div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-64 h-64 border-t-4 border-l-4 border-cyber-secondary opacity-30"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 border-b-4 border-r-4 border-cyber-accent opacity-30"></div>

      <div className="relative max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Zap className="w-16 h-16 text-cyber-secondary animate-pulse-neon" />
              <div className="absolute inset-0 w-16 h-16 bg-cyber-secondary blur-2xl opacity-50"></div>
            </div>
          </div>
          <h1 className="text-5xl font-display font-black text-neon uppercase tracking-wider mb-4 glitch" data-text="NEW USER">
            NEW USER
          </h1>
          <p className="text-cyber-gray-light font-mono text-sm uppercase tracking-widest">
            REGISTRATION PROTOCOL
          </p>
        </div>

        {/* Registration Card */}
        <div className="card-cyber border-4 border-cyber-secondary relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-cyber-secondary opacity-50 animate-pulse"></div>
          
          <h2 className="text-2xl font-display font-bold text-cyber-secondary uppercase mb-6 tracking-wider text-center">
            CREATE PROFILE
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
                  className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200 placeholder:text-cyber-gray-light"
                  placeholder="USER@DOMAIN.COM"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  USERNAME
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200 placeholder:text-cyber-gray-light"
                  placeholder="USER_ID"
                  value={formData.username}
                  onChange={handleChange}
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="full_name" className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                  <UserCircle className="w-4 h-4 inline mr-2" />
                  FULL NAME
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200 placeholder:text-cyber-gray-light"
                  placeholder="FULL_NAME"
                  value={formData.full_name}
                  onChange={handleChange}
                  autoComplete="name"
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
                  className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200 placeholder:text-cyber-gray-light"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-cyber w-full flex items-center justify-center space-x-2 border-cyber-secondary text-cyber-secondary hover:bg-cyber-secondary hover:text-cyber-darker"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-cyber-secondary border-t-transparent animate-spin"></div>
                  <span>PROCESSING...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>INITIALIZE PROFILE</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-cyber-gray-light text-center">
            <p className="text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
              EXISTING USER?
            </p>
            <Link
              to="/login"
              className="text-cyber-primary hover:text-cyber-accent font-mono font-bold uppercase tracking-wider transition-colors"
            >
              ACCESS SYSTEM →
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