import { Link } from 'react-router-dom'

const legalLinks = [
  { to: '/impressum', label: 'Impressum' },
  { to: '/datenschutz', label: 'Datenschutz' },
  { to: '/agb', label: 'AGB' },
  { to: '/widerruf', label: 'Widerruf' },
]

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-white/5 pb-28 pt-6 lg:pb-6">
      <div className="flex flex-col items-center gap-3 text-sm text-white/25">
        <div className="flex flex-wrap justify-center gap-4">
          {legalLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="transition hover:text-white/50"
            >
              {label}
            </Link>
          ))}
        </div>
        <p>© {new Date().getFullYear()} HYPERFIT</p>
      </div>
    </footer>
  )
}
