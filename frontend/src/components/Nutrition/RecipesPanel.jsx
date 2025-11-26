import { RefreshCcw, UtensilsCrossed } from 'lucide-react'

function MacroItem({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-xs text-white/60">
      <span className="font-medium text-white/70">{label}</span>
      <span className="text-sm font-semibold text-white">{Math.round(value)} g</span>
    </div>
  )
}

function RecipeCard({ recipe }) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-[#111216] p-5 text-sm text-white/70 transition hover:border-[#00FF7F]/40 hover:bg-[#13161f]">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[#00FF7F]/70">Makros</p>
          <h3 className="text-base font-semibold text-white leading-snug">{recipe.title}</h3>
        </div>
        <span className="rounded-full border border-[#00FF7F]/40 bg-[#10261e] px-3 py-1 text-xs font-semibold text-[#00FF7F]">
          {Math.round(recipe.calories)} kcal
        </span>
      </header>

      <div className="grid gap-2">
        <MacroItem label="Protein" value={recipe.protein} />
        <MacroItem label="Carbs" value={recipe.carbs} />
        <MacroItem label="Fett" value={recipe.fat} />
      </div>

      {recipe.url ? (
        <a
          href={recipe.url}
          target="_blank"
          rel="noreferrer"
          className="mt-auto inline-flex items-center gap-2 text-xs font-semibold text-[#00FF7F] transition hover:text-white"
        >
          Zum Rezept
          <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <p className="mt-auto text-xs text-white/40">In Kürze mit HyperFit Meal Planner verfügbar.</p>
      )}
    </article>
  )
}

export default function RecipesPanel({ recipes, loading, onRefresh }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#101112] p-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[#00FF7F]/70">Rezepte</p>
          <h2 className="mt-2 text-xl font-semibold text-white">High-Protein Inspiration</h2>
          <p className="text-sm text-white/60">
            Automatisch auf deine Kalorienziele zugeschnitten – ideal für Meal-Prep, Snacks oder Recovery.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#00FF7F]/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin text-[#00FF7F]' : ''}`} />
          {loading ? 'Aktualisiere…' : 'Neue Vorschläge'}
        </button>
      </header>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-white/5 bg-[#111318] p-5 text-xs text-white/40"
            >
              Lade Rezept …
            </div>
          ))}
        </div>
      ) : recipes?.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={`${recipe.title}-${recipe.url ?? recipe.calories}`} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#111318] p-8 text-center text-sm text-white/60">
          <UtensilsCrossed className="h-10 w-10 text-[#00FF7F]" />
          <p>Keine Vorschläge verfügbar. Starte mit einem Check-In oder aktualisiere dein Kalorienziel.</p>
          <button
            onClick={onRefresh}
            className="rounded-full border border-transparent bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-5 py-2 text-xs font-semibold text-black transition hover:opacity-90"
          >
            Jetzt Vorschläge laden
          </button>
        </div>
      )}
    </section>
  )
}


