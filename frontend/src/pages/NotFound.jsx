import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#0e0e10] p-8 text-white">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-8xl font-bold text-[#00FF7F]">404</h1>
        <p className="mb-2 text-xl font-semibold">Seite nicht gefunden</p>
        <p className="mb-8 text-gray-500">
          Die angeforderte Seite existiert nicht oder wurde verschoben.
        </p>
        <Link
          to="/review"
          className="inline-block rounded-lg bg-[#00FF7F] px-6 py-3 font-semibold text-[#0e0e10] transition-opacity hover:opacity-80"
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  )
}
