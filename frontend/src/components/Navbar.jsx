import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Home, Utensils, Dumbbell, LogOut, MessageCircle, Zap } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) return null

  const isActive = (path) => location.pathname === path

  return (
    <nav className="relative border-b-4 border-cyber-primary bg-cyber-dark">
      {/* Scan line effect */}
      <div className="scan-line absolute top-0 left-0 w-full h-full pointer-events-none"></div>
      
      {/* Glitch background */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full bg-grid"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Zap className="w-8 h-8 text-cyber-primary animate-pulse-neon" />
                <div className="absolute inset-0 w-8 h-8 bg-cyber-primary blur-xl opacity-50"></div>
              </div>
              <span className="text-2xl font-display font-black text-neon uppercase tracking-wider">
                HYPER<span className="text-cyber-secondary">FIT</span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            <NavLink to="/dashboard" isActive={isActive('/dashboard')} icon={Home}>
              DASH
            </NavLink>
            <NavLink to="/meals" isActive={isActive('/meals')} icon={Utensils}>
              MEALS
            </NavLink>
            <NavLink to="/workouts" isActive={isActive('/workouts')} icon={Dumbbell}>
              TRAIN
            </NavLink>
            <NavLink to="/chat" isActive={isActive('/chat')} icon={MessageCircle}>
              AI
            </NavLink>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block px-4 py-2 border-2 border-cyber-gray-light bg-cyber-dark">
              <span className="text-xs font-mono text-cyber-primary uppercase tracking-wider">
                {user.username.toUpperCase()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn-cyber flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>EXIT</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-primary via-cyber-secondary to-cyber-accent"></div>
    </nav>
  )
}

function NavLink({ to, isActive, icon: Icon, children }) {
  return (
    <Link
      to={to}
      className={`
        relative px-4 py-3 font-mono font-bold text-xs uppercase tracking-wider
        transition-all duration-200
        ${isActive 
          ? 'text-cyber-primary bg-cyber-dark border-2 border-cyber-primary shadow-neon-green' 
          : 'text-cyber-gray-light border-2 border-transparent hover:border-cyber-gray-light hover:text-cyber-primary'
        }
      `}
    >
      <div className="flex items-center space-x-2">
        <Icon className={`w-4 h-4 ${isActive ? 'text-cyber-primary' : ''}`} />
        <span>{children}</span>
      </div>
      {isActive && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-cyber-primary"></div>
      )}
    </Link>
  )
}
