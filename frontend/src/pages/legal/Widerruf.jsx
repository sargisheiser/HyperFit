import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Widerruf() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <Link to="/review" className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white/60">
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="text-2xl font-light text-white">Widerrufsbelehrung</h1>

      <section className="space-y-4 text-sm leading-relaxed text-white/60">
        <div>
          <h2 className="mb-2 text-base font-medium text-white">Widerrufsrecht</h2>
          <p>
            Sie haben das Recht, binnen 14 Tagen ohne Angabe von Gründen diesen Vertrag zu
            widerrufen. Die Widerrufsfrist beträgt 14 Tage ab dem Tag des Vertragsabschlusses.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">Ausübung des Widerrufsrechts</h2>
          <p>
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer eindeutigen Erklärung
            (z.B. per E-Mail an kontakt@hyperfit.app) über Ihren Entschluss, diesen Vertrag zu
            widerrufen, informieren.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">Folgen des Widerrufs</h2>
          <p>
            Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von
            Ihnen erhalten haben, unverzüglich und spätestens binnen 14 Tagen ab dem Tag
            zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf bei uns eingegangen ist.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">Vorzeitiges Erlöschen</h2>
          <p>
            Das Widerrufsrecht erlischt vorzeitig, wenn wir mit der Ausführung des Vertrags
            begonnen haben, nachdem Sie ausdrücklich zugestimmt haben und gleichzeitig Ihre
            Kenntnis davon bestätigt haben, dass Sie Ihr Widerrufsrecht bei vollständiger
            Vertragserfüllung verlieren.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">Kontakt</h2>
          <p>
            HYPERFIT GmbH (i.G.)<br />
            Musterstraße 1, 10115 Berlin<br />
            E-Mail: kontakt@hyperfit.app
          </p>
        </div>
      </section>
    </div>
  )
}
