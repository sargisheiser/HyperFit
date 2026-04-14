import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Datenschutz() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <Link to="/review" className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white/60">
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="text-2xl font-light text-white">Datenschutzerklärung</h1>

      <section className="space-y-4 text-sm leading-relaxed text-white/60">
        <div>
          <h2 className="mb-2 text-base font-medium text-white">1. Verantwortlicher</h2>
          <p>
            Verantwortlich für die Verarbeitung personenbezogener Daten auf dieser Website ist:
          </p>
          <p className="mt-2">HYPERFIT GmbH (i.G.), Musterstraße 1, 10115 Berlin</p>
          <p>E-Mail: datenschutz@hyperfit.app</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">2. Erhebung personenbezogener Daten</h2>
          <p>
            Wir erheben personenbezogene Daten, wenn Sie sich registrieren, unsere App nutzen oder
            mit uns in Kontakt treten. Dies umfasst: Name, E-Mail-Adresse, Geburtsdatum,
            Körpermaße, Ernährungs- und Fitnessdaten.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">3. Gesundheitsdaten (Art. 9 DSGVO)</h2>
          <p>
            HYPERFIT verarbeitet Gesundheitsdaten (Gewicht, Körperfett, Ernährung, Trainingsaktivität).
            Diese Daten werden nur mit Ihrer ausdrücklichen Einwilligung verarbeitet und ausschließlich
            zur Bereitstellung der App-Funktionen verwendet.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">4. Ihre Rechte</h2>
          <p>Sie haben das Recht auf:</p>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
            <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
            <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">5. Datenexport</h2>
          <p>
            Sie können Ihre Daten jederzeit über die GDPR-Export-Funktion in Ihrem Profil als
            JSON oder CSV herunterladen.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">6. KI-Verarbeitung</h2>
          <p>
            HYPERFIT nutzt KI-Dienste (OpenAI, Google Gemini) zur Analyse von Mahlzeitfotos und
            für den Fitness-Coach. Ihre Bilder werden verschlüsselt übertragen und nicht dauerhaft
            bei Drittanbietern gespeichert.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">7. Kontakt</h2>
          <p>Bei Fragen zum Datenschutz: datenschutz@hyperfit.app</p>
        </div>
      </section>
    </div>
  )
}
