import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function AGB() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <Link to="/review" className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white/60">
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="text-2xl font-light text-white">Allgemeine Geschäftsbedingungen</h1>

      <section className="space-y-4 text-sm leading-relaxed text-white/60">
        <div>
          <h2 className="mb-2 text-base font-medium text-white">§ 1 Geltungsbereich</h2>
          <p>
            Diese Allgemeinen Geschäftsbedingungen gelten für alle Nutzer der HYPERFIT-Plattform.
            Mit der Registrierung erkennen Sie diese AGB an.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">§ 2 Vertragsgegenstand</h2>
          <p>
            HYPERFIT bietet eine KI-gestützte Fitness- und Ernährungsplattform. Der Vertrag kommt
            durch die Registrierung und Bestätigung der E-Mail-Adresse zustande.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">§ 3 Leistungsbeschreibung</h2>
          <p>Die Plattform umfasst:</p>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>KI-basierte Mahlzeitanalyse (Foto & Barcode)</li>
            <li>Ernährungs-Tracking (Kalorien, Makros)</li>
            <li>Workout-Tracking mit Pose-Erkennung</li>
            <li>KI-Fitness-Coach</li>
            <li>Fortschrittsanalyse und Statistiken</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">§ 4 Premium-Abonnement</h2>
          <p>
            Das Premium-Abonnement wird als Monats- oder Jahresabo angeboten. Die Abrechnung
            erfolgt über Stripe. Der Vertrag verlängert sich automatisch, sofern er nicht
            rechtzeitig gekündigt wird.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">§ 5 Kündigung</h2>
          <p>
            Das kostenlose Konto kann jederzeit gelöscht werden. Premium-Abonnements können
            zum Ende der aktuellen Laufzeit gekündigt werden.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">§ 6 Haftung</h2>
          <p>
            Die KI-basierten Ernährungs- und Fitnessempfehlungen ersetzen keine professionelle
            medizinische oder ernährungswissenschaftliche Beratung. Die Nutzung erfolgt auf
            eigene Verantwortung.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-medium text-white">§ 7 Schlussbestimmungen</h2>
          <p>Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist Berlin.</p>
        </div>
      </section>
    </div>
  )
}
