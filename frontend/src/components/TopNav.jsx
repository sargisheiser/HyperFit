import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function TopNav() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!user) return null

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    if (path === '/meals') return location.pathname === '/meals'
    if (path === '/workouts') return location.pathname === '/workouts'
    if (path === '/chat') return location.pathname === '/chat'
    return false
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard', label: 'DASH' },
    { path: '/meals', label: 'MEALS' },
    { path: '/workouts', label: 'TRAIN' },
    { path: '/chat', label: 'AI' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-green-500">
      <div className="max-w-full mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {navItems.map((item) => {
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    relative px-4 py-2 font-['VT323'] text-xl uppercase tracking-wider
                    transition-all duration-200
                    ${active 
                      ? 'text-green-500 border-2 border-green-500' 
                      : 'text-gray-400 border-2 border-transparent hover:text-green-400 hover:border-green-400'
                    }
                  `}
                  style={{
                    fontFamily: "'VT323', monospace",
                    boxShadow: active ? '0 0 10px rgba(0, 255, 0, 0.5)' : 'none'
                  }}
                >
                  {item.label}
                  {active && (
                    <span 
                      className="absolute -top-1 -right-1 w-2 h-2 bg-green-500"
                      style={{ boxShadow: '0 0 10px rgba(0, 255, 0, 1)' }}
                    />
                  )}
                </Link>
              )
            })}
          </div>
          
          <button
            onClick={handleLogout}
            className="px-4 py-2 font-['VT323'] text-xl uppercase tracking-wider border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-black transition-all"
            style={{
              fontFamily: "'VT323', monospace",
              boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)'
            }}
          >
            EXIT
          </button>
        </div>
      </div>
    </nav>
  )
}


