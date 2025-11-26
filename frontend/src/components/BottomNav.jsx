import { NavLink } from 'react-router-dom'
import { ChefHat, Dumbbell, Home, User } from 'lucide-react'

const links = [
  { to: '/dashboard', label: 'Start', icon: Home },
  { to: '/workout-tracker', label: 'Training', icon: Dumbbell },
  { to: '/nutrition', label: 'Ernährung', icon: ChefHat },
  { to: '/profile', label: 'Profil', icon: User },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[90%] max-w-xl items-center justify-between rounded-2xl border border-white/10 bg-[#0d0f13]/90 p-3 text-xs text-white/60 shadow-[0_0_25px_rgba(0,255,127,0.2)] backdrop-blur lg:hidden">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1 transition ${
              isActive ? 'text-[#00FF7F]' : 'hover:text-white'
            }`
          }
        >
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

