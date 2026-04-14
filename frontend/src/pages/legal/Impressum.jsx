import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Impressum() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <Link to="/review" className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white/60">
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="text-2xl font-light text-white">Impressum</h1>

      <section className="space-y-4 text-sm leading-relaxed text-white/60">
        <div>
          <h2 className="mb-2 text-base font-medium text-white">Angaben gemäß § 5 TMG</h2>
          <p>HYPERFIT GmbH (i.G.)</p>
          <p>Musterstraße 1</p>
          <p>10115 Berlin, Deutschland</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">Kontakt</h2>
          <p>E-Mail: kontakt@hyperfit.app</p>
          <p>Telefon: +49 (0) 30 12345678</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">Vertretungsberechtigter</h2>
          <p>Geschäftsführer: [Name des Geschäftsführers]</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">Registereintrag</h2>
          <p>Handelsregister: Amtsgericht Berlin-Charlottenburg</p>
          <p>Registernummer: HRB [Nummer]</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">Umsatzsteuer-ID</h2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE [Nummer]</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">Streitschlichtung</h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit.
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>
      </section>
    </div>
  )
}
