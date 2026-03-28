import { NavLink } from 'react-router-dom'
import { BarChart3, LogOut, MessageSquare, PlusCircle, User, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/log', label: 'Log', icon: PlusCircle },
  { to: '/track', label: 'Track', icon: Zap },
  { to: '/review', label: 'Review', icon: BarChart3 },
  { to: '/coach', label: 'Coach', icon: MessageSquare },
]

export default function IconRail() {
  const { logout } = useAuth()

  return (
    <nav className="hidden w-[60px] flex-shrink-0 flex-col items-center gap-2 py-6 lg:flex">
      {/* Logo */}
      <div className="mb-6 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00FF7F] to-[#00CC66] text-sm font-extrabold text-[#0a0a0f]">
        H
      </div>

      {/* Nav items */}
      <div className="flex flex-col items-center gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex flex-col items-center gap-1 rounded-lg p-2 transition-colors ${
                isActive
                  ? 'bg-[#00FF7F]/10 text-[#00FF7F]'
                  : 'text-white/35 hover:bg-white/5 hover:text-white/60'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            <span className="text-[10px] uppercase tracking-[1px]">{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Profile */}
      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
            isActive
              ? 'border-[#00FF7F]/60 text-[#00FF7F]'
              : 'border-[#00FF7F]/20 text-white/50 hover:border-[#00FF7F]/40'
          }`
        }
      >
        <User className="h-[14px] w-[14px]" />
      </NavLink>

      {/* Logout */}
      <button
        onClick={logout}
        className="mt-2 flex h-8 w-8 items-center justify-center rounded-full text-white/20 transition-colors hover:bg-white/5 hover:text-white/40"
        title="Abmelden"
      >
        <LogOut className="h-[14px] w-[14px]" />
      </button>
    </nav>
  )
}
