import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Camera, Dumbbell, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import useNutritionStore from '../store/useNutritionStore'
import useUserStore from '../store/userStore'
import { calculateDailyCalories } from '../utils/calorieCalculator'
import { useSteps } from '../hooks/useSteps'

export default function Navbar() {
  const { user } = useAuth()
  const location = useLocation()
  const isDashboard = location.pathname === '/dashboard'
  const isAIAssistant = location.pathname === '/ai-assistant'
  const isWorkoutTracker = location.pathname === '/workout-tracker'
  const isNutrition = location.pathname === '/nutrition'
  
  // Hide navbar on AI Assistant page
  if (isAIAssistant) {
    return null
  }
  const { profile, fetchProfile } = useUserStore((state) => ({ 
    profile: state.profile,
    fetchProfile: state.fetchProfile,
  }))
  
  // Load profile if not already loaded
  useEffect(() => {
    if (user && !profile) {
      fetchProfile()
    }
  }, [user, profile, fetchProfile])
  const { calorieGoal, calorieIntake, macros, compliance, goal, recommendation } = useNutritionStore((state) => ({
    calorieGoal: state.calorieGoal ?? 0,
    calorieIntake: state.calorieIntake ?? 0,
    macros: state.macros ?? {},
    compliance: state.compliance ?? state.checkInData?.adherence ?? null,
    goal: state.checkInData?.goal ?? null,
    recommendation: state.checkInData?.recommendation ?? null,
  }))
  
  // Calculate calories from macros
  const caloriesFromMacros = useMemo(() => {
    if (!macros) return 0
    const protein = macros.protein?.current ?? macros.protein ?? 0
    const carbs = macros.carbs?.current ?? macros.carbs ?? 0
    const fat = macros.fat?.current ?? macros.fat ?? 0
    return Math.round(protein * 4 + carbs * 4 + fat * 9)
  }, [macros])
  
  // Use calories from macros if available and higher
  const displayCalorieIntake = caloriesFromMacros > 0 && caloriesFromMacros >= (calorieIntake ?? 0) 
    ? caloriesFromMacros 
    : (calorieIntake ?? 0)
  const { activityStats } = useSteps()
  const steps = activityStats?.steps || 0
  const stepsGoal = 10000 // Default goal
  const caloriesBurned = activityStats?.caloriesBurned || 0
  const [typedTip, setTypedTip] = useState('')
  const [cursorVisible, setCursorVisible] = useState(true)

  const hasGoal = typeof calorieGoal === 'number' && calorieGoal > 0
  const intakeValue = Math.round(displayCalorieIntake)
  const goalValue = hasGoal ? Math.round(calorieGoal) : null
  const remainingValue = hasGoal ? Math.max(goalValue - intakeValue, 0) : null

  const greeting = useMemo(() => {
    const now = new Date()
    const hour = now.getHours()
    if (hour < 12) return 'Morning'
    if (hour < 18) return 'Afternoon'
    return 'Evening'
  }, [])

  const displayName = useMemo(() => {
    const fallback = user?.full_name || user?.username || 'Athlete'
    return fallback.split(' ')[0]
  }, [user?.full_name, user?.username])

  const mentorTip = useMemo(() => {
    if (recommendation) {
      return recommendation
    }

    const remainingCalories = Math.max((calorieGoal ?? 0) - displayCalorieIntake, 0)
    const hasGoal = typeof calorieGoal === 'number' && calorieGoal > 0
    const intakePercent = hasGoal && calorieGoal > 0 ? displayCalorieIntake / calorieGoal : 0

    const macroEntries = ['protein', 'carbs', 'fat'].map((key) => {
      const macro = macros?.[key] ?? {}
      const target = Number(macro.target ?? 0)
      const current = Number(macro.current ?? 0)
      return {
        key,
        target,
        current,
        gap: Math.max(target - current, 0),
      }
    })

    const prioritizedMacro = macroEntries
      .filter((entry) => entry.target > 0)
      .sort((a, b) => b.gap - a.gap)[0]

    const macroLabelMap = {
      protein: 'Protein',
      carbs: 'Kohlenhydrate',
      fat: 'Fette',
    }

    if (typeof compliance === 'number' && compliance < 70) {
      return `Deine Compliance liegt aktuell bei ${Math.round(compliance)}%. Plane heute eine strukturierte Mahlzeit mit Fokus auf eiweissreiche Optionen, damit du im Flow bleibst.`
    }

    if (prioritizedMacro && prioritizedMacro.gap > 8) {
      return `Dir fehlen noch etwa ${Math.round(prioritizedMacro.gap)} g ${macroLabelMap[prioritizedMacro.key]}. Fuege deiner naechsten Mahlzeit eine gezielte Quelle hinzu, um im Zielkorridor zu bleiben.`
    }

    if (hasGoal && intakePercent < 0.55) {
      return `Du hast erst ${Math.round(displayCalorieIntake)} von ${Math.round(calorieGoal)} kcal genutzt. Plane einen naehrstoffreichen Snack, damit die Energielevel am Nachmittag stabil bleiben.`
    }

    if (hasGoal && remainingCalories > 0 && remainingCalories < calorieGoal * 0.15) {
      return `Nur noch ${Math.round(remainingCalories)} kcal uebrig. Feile heute am Finish mit einer leichten Mahlzeit und goenn dir ausreichend Fluessigkeit.`
    }

    if (goal === 'lose') {
      return 'Cut-Modus aktiv: Bleib bei ballaststoffreichen Beilagen und kalorienfreien Drinks, um Hungerfenster klein zu halten.'
    }
    if (goal === 'gain') {
      return 'Muskelaufbau verlangt Konstanz. Fuege eine Portion komplexer Kohlenhydrate zu deiner naechsten Mahlzeit hinzu, um den Calorie Surplus zu sichern.'
    }
    if (goal === 'recomp') {
      return 'Rekomposition lebt von Timing: Eine proteinreiche Mahlzeit innerhalb von 45 Minuten nach dem Training haelt deine Anabolik scharf.'
    }

    return 'Starte mit einem Glas Wasser und einer fokussierten Meal-Prep. Kleine Routinen halten deine HyperFit-Kurve stabil.'
  }, [calorieGoal, calorieIntake, compliance, goal, macros, recommendation])

  useEffect(() => {
    setTypedTip('')
    let index = 0
    const step = Math.max(25, Math.min(55, mentorTip.length ? 700 / mentorTip.length : 40))
    const interval = setInterval(() => {
      index += 1
      if (index <= mentorTip.length) {
        setTypedTip(mentorTip.slice(0, index))
      } else {
        clearInterval(interval)
      }
    }, step)
    return () => clearInterval(interval)
  }, [mentorTip])

  useEffect(() => {
    const blinkInterval = setInterval(() => setCursorVisible((prev) => !prev), 600)
    return () => clearInterval(blinkInterval)
  }, [])

  // Calculate AI-recommended values for display (TDEE, BMR) but use backend values for targets
  // Use the same calorieGoal and macros from store (already declared above) - same as NutritionGoals and NutritionDashboard
  const aiCalculatedValues = useMemo(() => {
    // Use backend values as primary source for targets (from store, already declared above)
    const targetCalories = calorieGoal && calorieGoal > 0 ? calorieGoal : null
    const targetProtein = macros?.protein?.target && macros.protein.target > 0 ? macros.protein.target : null
    
    // Calculate AI values only for TDEE and BMR display (not for targets)
    let tdee = null
    let bmr = null
    if (profile) {
      const calculated = calculateDailyCalories(profile, goal || 'build')
      tdee = calculated.tdee
      bmr = calculated.bmr
    }
    
    return {
      targetCalories,
      targetProtein,
      tdee,
      bmr,
      explanation: profile 
        ? `Basierend auf deinem Profil und Ziel: ${goal || 'build'}`
        : 'Vervollständige dein Profil für AI-Berechnungen.',
    }
  }, [profile, goal, calorieGoal, macros])

  if (!isDashboard && !isWorkoutTracker && !isNutrition) {
    return (
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">HyperFit Systems</p>
        <h1 className="text-2xl font-semibold text-white">Willkommen zurück, {displayName}</h1>
        <p className="text-sm text-white/60">Guten {greeting}. Dein Dashboard synchronisiert im Hintergrund.</p>
      </header>
    )
  }

  // Hide header completely on Workout Tracker and Nutrition pages
  if (isWorkoutTracker || isNutrition) {
    return null
  }

  return (
    <header className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* HyperFit Mentor Block */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative flex h-full min-h-[400px] flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-[#131a16] via-[#0c100d] to-[#07080a] p-6 text-[#c8ffd8] shadow-[0_0_45px_rgba(0,255,127,0.12)]"
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#00FF7F1a] px-3 py-1 text-[10px] uppercase tracking-[0.4em] text-[#9fffcf]">
            HyperFit Mentor
          </span>
        </div>
        <div className="flex flex-1 flex-col">
          <p className="text-xs uppercase tracking-[0.35em] text-[#00ffb7]">Daily uplink</p>
          <h1 className="mt-3 text-3xl font-semibold text-white font-['Space_Grotesk',_sans-serif]">
            Hey {displayName},
          </h1>
          <p className="mt-4 flex-1 text-sm leading-relaxed text-[#b6fbd4]">
            {typedTip}
            <span className="font-mono text-[#00ffb7]/70">{cursorVisible ? '|' : ' '}</span>
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Link to="/workout-tracker" className="block">
              <div className="flex h-full flex-col items-center justify-center rounded-[18px] bg-[#09140e]/85 p-4 shadow-[0_12px_24px_rgba(0,255,127,0.08)] transition hover:bg-[#09140e] hover:shadow-[0_12px_24px_rgba(0,255,127,0.16)]">
                <Dumbbell className="h-6 w-6 text-[#00FF7F] mb-2" />
                <p className="text-sm font-semibold text-white">Training</p>
              </div>
            </Link>
            <Link to="/nutrition?panel=analyzer" className="block">
              <div className="flex h-full flex-col items-center justify-center rounded-[18px] bg-[#09140e]/85 p-4 shadow-[0_12px_24px_rgba(0,255,127,0.08)] transition hover:bg-[#09140e] hover:shadow-[0_12px_24px_rgba(0,255,127,0.16)]">
                <Camera className="h-6 w-6 text-[#00FF7F] mb-2" />
                <p className="text-sm font-semibold text-white">Scan Meal</p>
              </div>
            </Link>
            <Link to="/nutrition" className="block">
              <div className="flex h-full flex-col items-center justify-center rounded-[18px] bg-[#09140e]/85 p-4 shadow-[0_12px_24px_rgba(0,255,127,0.08)] transition hover:bg-[#09140e] hover:shadow-[0_12px_24px_rgba(0,255,127,0.16)]">
                <Plus className="h-6 w-6 text-[#00FF7F] mb-2" />
                <p className="text-sm font-semibold text-white">Add Meal</p>
              </div>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* AI Kalkuliert Block */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative flex h-full min-h-[400px] flex-col overflow-hidden rounded-3xl bg-[#061009]/92 p-6 text-[#b6fbd4] shadow-[0_0_40px_rgba(0,255,127,0.12)]"
      >
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.35em] text-[#00ffb7]">AI Kalkuliert</p>
          <span className="rounded-full bg-[#00FF7F1a] px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-[#9fffcf]">
            {goal ? goal.toUpperCase() : 'BUILD'}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-4">
          {aiCalculatedValues.targetCalories ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col justify-between rounded-[20px] bg-[#07110c]/80 p-4 shadow-[0_12px_24px_rgba(0,255,127,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-[#8cffc7]">Kalorien</p>
                  <span className="mt-3 text-lg font-semibold text-white">{aiCalculatedValues.targetCalories} kcal</span>
                  <p className="mt-2 text-[11px] text-[#9bfcd0]/80">Tagesziel</p>
                </div>
                <div className="flex flex-col justify-between rounded-[20px] bg-[#07110c]/80 p-4 shadow-[0_12px_24px_rgba(0,255,127,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-[#8cffc7]">Protein</p>
                  <span className="mt-3 text-lg font-semibold text-[#00FF7F]">{aiCalculatedValues.targetProtein} g</span>
                  <p className="mt-2 text-[11px] text-[#9bfcd0]/80">Tagesziel</p>
                </div>
                <div className="flex flex-col justify-between rounded-[20px] bg-[#07110c]/80 p-4 shadow-[0_12px_24px_rgba(0,255,127,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-[#8cffc7]">TDEE</p>
                  <span className="mt-3 text-lg font-semibold text-white">{aiCalculatedValues.tdee || '—'} kcal</span>
                  <p className="mt-2 text-[11px] text-[#9bfcd0]/80">Gesamtumsatz</p>
                </div>
              </div>
              <div className="rounded-[20px] bg-[#07110c]/80 p-4 shadow-[0_12px_24px_rgba(0,255,127,0.08)]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-[#8cffc7]">Steps</p>
                  <span className="text-sm font-semibold text-white">
                    {steps || 0} / {stepsGoal.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#07110c]">
                  <div
                    className="h-full bg-gradient-to-r from-[#00FF7F] to-[#00C46A] transition-all duration-300"
                    style={{ width: `${Math.min(((steps || 0) / stepsGoal) * 100, 100)}%` }}
                  />
                </div>
              </div>
              {/* Kalorien Burned with Cardio Line */}
              <div className="relative rounded-[20px] bg-[#07110c]/80 p-4 shadow-[0_12px_24px_rgba(0,255,127,0.08)] overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-[#8cffc7]">Verbrannt</p>
                  <motion.span 
                    className="text-lg font-semibold text-[#00FF7F]"
                    animate={{ scale: caloriesBurned > 0 ? [1, 1.05, 1] : 1 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {Math.round(caloriesBurned)} kcal
                  </motion.span>
                </div>
                
                {/* Pulsating Cardio Line (EKG Style) */}
                <div className="relative h-16 w-full overflow-hidden rounded-lg bg-[#0a140e]/60">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
                    <motion.path
                      d="M 0,30 Q 20,20 40,25 T 80,20 T 120,28 T 160,22 T 200,25"
                      fill="none"
                      stroke="#00FF7F"
                      strokeWidth="2"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0, d: "M 0,30 Q 20,20 40,25 T 80,20 T 120,28 T 160,22 T 200,25" }}
                      animate={{ 
                        pathLength: 1, 
                        opacity: [0.6, 1, 0.6],
                        d: [
                          "M 0,30 Q 20,20 40,25 T 80,20 T 120,28 T 160,22 T 200,25",
                          "M 0,28 Q 20,18 40,23 T 80,18 T 120,26 T 160,20 T 200,23",
                          "M 0,30 Q 20,20 40,25 T 80,20 T 120,28 T 160,22 T 200,25"
                        ]
                      }}
                      transition={{
                        pathLength: { duration: 1.5, ease: "easeInOut" },
                        opacity: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
                        d: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                      }}
                    />
                    {/* Pulsating Heartbeat Spikes */}
                    {[40, 80, 120, 160].map((x, i) => (
                      <motion.line
                        key={`spike-${i}`}
                        x1={x}
                        y1={25}
                        x2={x}
                        y2={10}
                        stroke="#00FF7F"
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{
                          opacity: [0, 1, 0],
                          pathLength: [0, 1, 0],
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.4,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                    {/* Moving scan line */}
                    <motion.line
                      x1={0}
                      y1={0}
                      x2={0}
                      y2={40}
                      stroke="#00FF7F"
                      strokeWidth="1"
                      strokeOpacity="0.3"
                      animate={{
                        x1: [0, 200],
                        x2: [0, 200],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  </svg>
                  {/* Grid lines for EKG effect */}
                  <div className="absolute inset-0 opacity-10">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={`grid-${i}`}
                        className="absolute w-full border-t border-[#00FF7F]"
                        style={{ top: `${i * 25}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-[20px] bg-[#07110c]/80 p-4 text-center">
              <p className="text-sm text-white/60">{aiCalculatedValues.explanation}</p>
            </div>
          )}
        </div>
      </motion.div>
    </header>
  )
}
