import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, Bot, ChefHat, Home, LogOut, Sparkles, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/ai-assistant', label: 'KI-Assistent', icon: Bot },
  { to: '/workout-tracker', label: 'Training Tracker', icon: BarChart3 },
  { to: '/nutrition', label: 'Ernährung Hub', icon: ChefHat },
  { to: '/profile', label: 'Profil', icon: User },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const { logout } = useAuth()

  return (
    <aside className="hidden w-64 flex-col justify-between rounded-[36px] bg-gradient-to-br from-[#121b14]/85 via-[#0a140e]/85 to-[#060907]/90 p-6 text-[#b6fbd4] shadow-[0_0_48px_rgba(0,255,127,0.12)] backdrop-blur-xl lg:flex">
      <div>
        <div className="mb-12 flex items-center gap-3 text-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#07110c] shadow-[0_6px_18px_rgba(0,255,127,0.12)]"><Sparkles className="h-6 w-6 text-[#00FF7F]" /></span>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">HyperFit</p>
            <p className="text-lg font-semibold text-white">KI-Befehl</p>
          </div>
        </div>
        <nav className="space-y-2">
          {links.map(({ to, label, icon: Icon }) => {
            const active = pathname === to
            return (
              <NavLink
                key={to}
                to={to}
                className={`group flex items-center gap-3 rounded-[24px] px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#07110c]/85 text-white shadow-[0_0_24px_rgba(0,255,127,0.12)]'
                    : 'text-[#9fffcf]/70 hover:text-white hover:shadow-[0_10px_24px_rgba(0,255,127,0.08)]'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-[#00FF7F]' : 'text-[#8cffc7]/70 group-hover:text-white'}`} />
                {label}
              </NavLink>
            )
          })}
        </nav>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-3 rounded-[24px] px-4 py-3 text-sm font-medium text-[#9fffcf] transition hover:text-white hover:shadow-[0_10px_24px_rgba(0,255,127,0.12)]"
      >
        <LogOut className="h-4 w-4 text-[#00FF7F]" />
        Abmelden
      </button>
    </aside>
  )
}

