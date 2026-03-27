import { useEffect, useMemo, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Frown, Loader2, Smile, MessageCircle, Sparkles } from 'lucide-react'
import useNutritionStore from '../../store/useNutritionStore'
import useUserStore from '../../store/userStore'
import { submitCheckIn, updateWeight as syncWeight } from '../../services/nutritionService'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import logger from '../../utils/logger'

// Helper function to remove markdown formatting and hashtags
const cleanAIMessage = (text) => {
  if (!text || typeof text !== 'string') return text
  return text
    .replace(/\*\*/g, '') // Remove ** bold markers
    .replace(/__/g, '') // Remove __ bold markers
    .replace(/\*/g, '') // Remove single * italic markers
    .replace(/_/g, '') // Remove single _ italic markers
    .replace(/#{1,6}\s+/g, '') // Remove markdown headers (# ## ### etc.)
    .replace(/#\w+/g, '') // Remove hashtags (#hashtag)
    .trim()
}

const steps = [
  'adherence',
  'weight',
  'bodyFat',
  'goal',
  'summary',
]

const goals = [
  { id: 'build', label: 'Muskelaufbau', description: 'Kalorienüberschuss + progressive Overload' },
  { id: 'maintain', label: 'Erhalten', description: 'Gewicht stabilisieren mit smarten Makros' },
  { id: 'recomp', label: 'Recomposition', description: 'Simultane Fettabnahme & Muskelaufbau' },
  { id: 'lose', label: 'Fettabbau', description: 'Defizit, hohe Proteinaufnahme, NEAT push' },
]

const variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
}

export default function CheckInFlow() {
  const { user } = useAuth()
  const { profile } = useUserStore((state) => ({ profile: state.profile }))
  const {
    checkInStep,
    nextStep,
    prevStep,
    setAdherence,
    setWeight,
    setBodyFat,
    setGoal,
    checkInData,
    setRecommendation,
    calorieGoal,
    setCalorieGoal,
    weight: nutritionWeight,
  } = useNutritionStore(
    ({
      checkInStep,
      nextStep,
      prevStep,
      setAdherence,
      setWeight,
      setBodyFat,
      setGoal,
      checkInData,
      setRecommendation,
      calorieGoal,
      setCalorieGoal,
      weight,
    }) => ({
      checkInStep,
      nextStep,
      prevStep,
      setAdherence,
      setWeight,
      setBodyFat,
      setGoal,
      checkInData,
      setRecommendation,
      calorieGoal,
      setCalorieGoal,
      weight,
    }),
  )
  // Initialize weight from nutrition store, checkInData, or profile (in that order)
  const initialWeight = nutritionWeight ?? checkInData.weight ?? profile?.weight_kg ?? 0
  const [localWeight, setLocalWeight] = useState(initialWeight)
  const [localBodyFat, setLocalBodyFat] = useState(checkInData.bodyFat ?? 15)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [agentMessages, setAgentMessages] = useState([])
  const [agentLoading, setAgentLoading] = useState(false)
  const [showAgentChat, setShowAgentChat] = useState(false)

  // Update local weight when nutrition weight or profile weight changes
  useEffect(() => {
    const newWeight = nutritionWeight ?? profile?.weight_kg ?? checkInData.weight ?? 0
    if (newWeight > 0 && Math.abs(newWeight - localWeight) > 0.1) {
      setLocalWeight(newWeight)
    }
  }, [nutritionWeight, profile?.weight_kg, checkInData.weight, localWeight])

  const currentKey = steps[checkInStep]

  // Ask AI Agent for feedback after each step
  const askAgentForFeedback = useCallback(async (stepData) => {
    if (!user?.id) return
    
    setAgentLoading(true)
    try {
      const context = {
        user_name: profile?.full_name || profile?.username || user?.username || 'Athlete',
        first_name: (profile?.full_name || profile?.username || user?.username || 'Athlete').split(' ')[0],
        weight: profile?.weight_kg,
        height: profile?.height_cm,
        activity_level: profile?.activity_level,
        fitness_goals: profile?.fitness_goals,
        current_step: currentKey,
        step_data: stepData,
        check_in_data: {
          adherence: checkInData.adherence,
          weight: localWeight,
          body_fat: localBodyFat,
          goal: checkInData.goal,
          calorie_goal: calorieGoal,
        }
      }

      let prompt = ''
      switch (currentKey) {
        case 'adherence':
          prompt = `Ich führe gerade einen Weekly Check-In durch. Ich habe angegeben, dass ich mich ${checkInData.adherence ? 'gut' : 'nicht so gut'} an mein Ernährungstarget gehalten habe. Was denkst du dazu? Gib mir ein kurzes, motivierendes Feedback.`
          break
        case 'weight':
          prompt = `Ich führe gerade einen Weekly Check-In durch. Mein aktuelles Gewicht ist ${localWeight.toFixed(1)}kg. ${profile?.weight_kg ? `Mein letztes Gewicht war ${profile.weight_kg}kg.` : ''} Was denkst du zu dieser Entwicklung? Gib mir ein kurzes, konstruktives Feedback.`
          break
        case 'bodyFat':
          prompt = `Ich führe gerade einen Weekly Check-In durch. Ich schätze meinen Körperfettanteil auf ${localBodyFat}%. Was denkst du dazu? Gib mir ein kurzes Feedback.`
          break
        case 'goal':
          prompt = `Ich führe gerade einen Weekly Check-In durch. Mein Ziel ist "${checkInData.goal}" (${goals.find(g => g.id === checkInData.goal)?.label}). Mein aktuelles Kalorienziel ist ${calorieGoal ?? 0} kcal. Was denkst du zu diesem Ziel? Gib mir ein kurzes, motivierendes Feedback und eine erste Einschätzung.`
          break
        default:
          return
      }

      const response = await api.post('/api/assistant/chat', {
        message: prompt,
        context,
      })

      const agentMessage = {
        role: 'assistant',
        content: cleanAIMessage(response.data.response || 'Ich analysiere deine Daten...'),
        step: currentKey,
      }

      setAgentMessages((prev) => [...prev, agentMessage])
      setShowAgentChat(true)
    } catch (error) {
      logger.error('Failed to get agent feedback', error)
    } finally {
      setAgentLoading(false)
    }
  }, [user, profile, currentKey, checkInData, localWeight, localBodyFat, calorieGoal])

  const handleNext = async () => {
    if (currentKey === 'weight') {
      if (user?.id) {
        // Update nutrition store
        await setWeight(localWeight, (value) => syncWeight({ userId: user.id, weight: value }))
        
        // Also update user profile weight
        try {
          await api.put('/api/users/me', {
            weight_kg: Math.round(localWeight),
          })
          // Refresh user profile
          useUserStore.getState().fetchProfile()
          logger.debug('[CheckInFlow] Weight synced to profile:', localWeight)
        } catch (profileError) {
          logger.warn('[CheckInFlow] Failed to sync weight to profile:', profileError)
          // Don't fail the whole operation if profile update fails
        }
      } else {
        await setWeight(localWeight)
      }
    }
    if (currentKey === 'bodyFat') {
      setBodyFat(localBodyFat)
    }
    if (currentKey === 'goal') {
      setIsSubmitting(true)
      setAgentLoading(true)
      try {
        // First, ask AI Agent for final recommendation
        const context = {
          user_name: profile?.full_name || profile?.username || user?.username || 'Athlete',
          first_name: (profile?.full_name || profile?.username || user?.username || 'Athlete').split(' ')[0],
          weight: localWeight,
          height: profile?.height_cm,
          activity_level: profile?.activity_level,
          fitness_goals: profile?.fitness_goals,
          check_in_data: {
            adherence: checkInData.adherence,
            weight: localWeight,
            body_fat: localBodyFat,
            goal: checkInData.goal,
            calorie_goal: calorieGoal ?? 0,
          }
        }

        const agentPrompt = `Ich führe gerade einen Weekly Check-In durch und bin fast fertig. Hier sind meine Daten:
- Compliance: ${checkInData.adherence ? 'Gut eingehalten' : 'Nicht so gut eingehalten'}
- Gewicht: ${localWeight.toFixed(1)}kg
- Körperfett: ${localBodyFat}%
- Ziel: ${goals.find(g => g.id === checkInData.goal)?.label}
- Aktuelles Kalorienziel: ${calorieGoal ?? 0} kcal

Bitte analysiere diese Daten und gib mir:
1. Eine personalisierte Empfehlung für mein neues Kalorienziel
2. Eine Begründung warum diese Kalorienanzahl für mein Ziel sinnvoll ist
3. Ein motivierendes Feedback zu meinem Fortschritt

Antworte in einem freundlichen, coach-artigen Ton.`

        const agentResponse = await api.post('/api/assistant/chat', {
          message: agentPrompt,
          context,
        })

        const agentRecommendation = agentResponse.data.response || ''

        // Extract suggested calories from agent response (look for numbers)
        const calorieMatch = agentRecommendation.match(/(\d{3,5})\s*kcal/i)
        const suggestedCalories = calorieMatch ? parseInt(calorieMatch[1]) : null

        // Submit check-in
        const result = await submitCheckIn({
          userId: user?.id,
          goal: checkInData.goal,
          bodyFat: localBodyFat,
          caloriesPrevious: calorieGoal ?? 0,
          caloriesNew: suggestedCalories ?? calorieGoal ?? 0,
          compliance:
            checkInData.adherence === null ? null : checkInData.adherence ? 95 : 70,
        })

        // Use AI Agent recommendation if available, otherwise use optimization
        const finalRecommendation = agentRecommendation || result.recommendation
        const finalCalories = suggestedCalories ?? result.suggestedCalories ?? result.optimization?.suggested

        setRecommendation(
          finalRecommendation,
          finalCalories,
          result.checkin?.date,
        )
        
        if (finalCalories) {
          setCalorieGoal(Math.round(finalCalories))
        }

        // Add agent recommendation to messages (only if not already added)
        setAgentMessages((prev) => {
          // Check if summary message already exists
          const hasSummary = prev.some(msg => msg.step === 'summary')
          if (hasSummary) {
            // Update existing summary message instead of adding duplicate
            return prev.map(msg => 
              msg.step === 'summary' 
                ? { ...msg, content: cleanAIMessage(finalRecommendation) }
                : msg
            )
          }
          // Add new summary message
          return [...prev, {
            role: 'assistant',
            content: cleanAIMessage(finalRecommendation),
            step: 'summary',
          }]
        })
        setShowAgentChat(true)
      } catch (error) {
        logger.error('Failed to submit nutrition check-in', error)
        setRecommendation('Check-In konnte nicht verarbeitet werden. Versuche es später erneut.')
      } finally {
        setIsSubmitting(false)
        setAgentLoading(false)
      }
    } else {
      // Ask agent for feedback after each step (except goal, which is handled above)
      await askAgentForFeedback({
        step: currentKey,
        value: currentKey === 'weight' ? localWeight : currentKey === 'bodyFat' ? localBodyFat : checkInData.adherence,
      })
    }
    nextStep()
  }

  const isNextDisabled = useMemo(() => {
    switch (currentKey) {
      case 'adherence':
        return checkInData.adherence === null
      case 'weight':
        return localWeight <= 30
      case 'bodyFat':
        return localBodyFat <= 3
      case 'goal':
        return !checkInData.goal || isSubmitting
      default:
        return false
    }
  }, [checkInData.adherence, checkInData.goal, currentKey, localBodyFat, localWeight, isSubmitting])

  const renderStep = () => {
    switch (currentKey) {
      case 'adherence':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Wie gut hast du dich letzte Woche ernährt?</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setAdherence(true)}
                className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition ${
                  checkInData.adherence === true
                    ? 'border-[#00FF7F]/60 bg-[#11211a]'
                    : 'border-white/10 bg-[#121315] hover:border-white/20'
                }`}
              >
                <Smile className="h-6 w-6 text-[#00FF7F]" />
                <div>
                  <p className="font-medium text-white">Alles on point</p>
                  <p className="text-sm text-white/60">Ich habe mein Ernährungstarget eingehalten.</p>
                </div>
              </button>
              <button
                onClick={() => setAdherence(false)}
                className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition ${
                  checkInData.adherence === false
                    ? 'border-[#FF7F7F]/60 bg-[#261717]'
                    : 'border-white/10 bg-[#121315] hover:border-white/20'
                }`}
              >
                <Frown className="h-6 w-6 text-[#FF7F7F]" />
                <div>
                  <p className="font-medium text-white">Da ist Luft nach oben</p>
                  <p className="text-sm text-white/60">Ich war nicht konsequent genug.</p>
                </div>
              </button>
            </div>
          </div>
        )
      case 'weight':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Aktuelles Gewicht eintragen</h3>
            <p className="text-sm text-white/60">Verfolge deine Entwicklung wöchentlich, um Anpassungen besser zu steuern.</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocalWeight((prev) => Math.max(35, Math.round((prev - 0.5) * 10) / 10))}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#121315] text-white transition hover:border-[#00FF7F]/40"
              >
                –
              </button>
              <motion.div
                key={localWeight}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="text-4xl font-semibold text-white"
              >
                {localWeight.toFixed(1)} kg
              </motion.div>
              <button
                onClick={() => setLocalWeight((prev) => Math.min(200, Math.round((prev + 0.5) * 10) / 10))}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#121315] text-white transition hover:border-[#00FF7F]/40"
              >
                +
              </button>
            </div>
          </div>
        )
      case 'bodyFat':
        return (
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Körperfett einschätzen</h3>
              <p className="text-sm text-white/60">Bewege den Slider, um deinen aktuellen Body-Fat-Anteil anzugeben.</p>
              <div className="space-y-3">
                <input
                  type="range"
                  min={5}
                  max={35}
                  step={1}
                  value={localBodyFat}
                  onChange={(event) => setLocalBodyFat(Number(event.target.value))}
                  className="w-full accent-[#00FF7F]"
                />
                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>Lean</span>
                  <span>{localBodyFat}%</span>
                  <span>Bulky</span>
                </div>
              </div>
            </div>
            <motion.div
              key={localBodyFat}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative flex h-48 w-40 flex-col items-center justify-end rounded-3xl border border-white/10 bg-gradient-to-t from-[#0A0B0C] via-[#121315] to-[#1a1d29]"
            >
              <div
                className="w-28 rounded-full"
                style={{
                  height: `${Math.min(Math.max((localBodyFat / 35) * 100, 20), 100)}%`,
                  background:
                    'linear-gradient(180deg, rgba(0,255,127,0.3) 0%, rgba(0,255,127,0.8) 100%)',
                  transition: 'height 0.4s ease',
                }}
              />
              <p className="absolute bottom-2 text-sm font-semibold text-white">{localBodyFat}%</p>
            </motion.div>
          </div>
        )
      case 'goal':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Was ist dein nächstes Ziel?</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {goals.map((goal) => {
                const active = checkInData.goal === goal.id
                return (
                  <button
                    key={goal.id}
                    onClick={() => setGoal(goal.id)}
                    className={`rounded-2xl border px-5 py-4 text-left transition ${
                      active ? 'border-[#00FF7F]/60 bg-[#11211a]' : 'border-white/10 bg-[#121315] hover:border-white/20'
                    }`}
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      {active && <Check className="h-4 w-4 text-[#00FF7F]" />}
                      {goal.label}
                    </p>
                    <p className="mt-2 text-sm text-white/60">{goal.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )
      case 'summary':
      default:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Dein neuer Kalorienplan</h3>
            {isSubmitting ? (
              <div className="rounded-2xl border border-white/10 bg-[#121315] p-6 text-sm text-white/60">
                <Loader2 className="mb-3 h-6 w-6 animate-spin text-[#00FF7F]" />
                HyperFit analysiert deine Angaben…
              </div>
            ) : (
              <div className="space-y-4">
                {/* AI Agent Recommendation */}
                {agentMessages.filter(msg => msg.step === 'summary').length > 0 && (
                  <div className="rounded-2xl border border-[#00FF7F]/30 bg-gradient-to-br from-[#0a140e]/90 to-[#07110c]/90 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#00FF7F]" />
                      <p className="text-sm font-semibold text-white">Persönliche Empfehlung von deinem HyperFit Helfer</p>
                    </div>
                    <div className="rounded-xl bg-[#07110c]/80 p-4 text-sm text-[#b6fbd4] border border-white/10">
                      <div className="whitespace-pre-wrap">
                        {agentMessages.find(msg => msg.step === 'summary')?.content || checkInData.recommendation || 'Noch keine Empfehlung vorhanden.'}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="rounded-2xl border border-white/10 bg-[#121315] p-6 text-sm text-white/70">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Kalorienziel</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-[#0f1014] p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/40">Aktuelles Ziel</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{Math.round(calorieGoal ?? 0)} kcal</p>
                    </div>
                    <div className="rounded-xl border border-[#00FF7F]/40 bg-[#11211a] p-4 text-[#00FF7F]">
                      <p className="text-xs uppercase tracking-[0.25em] text-[#00FF7F]/70">Vorgeschlagen</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {checkInData.suggestedCalories ? Math.round(checkInData.suggestedCalories) : '—'} kcal
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-white/40">
                    {checkInData.lastCheckInDate
                      ? `Letztes Check-In: ${new Date(checkInData.lastCheckInDate).toLocaleDateString('de-DE')}`
                      : 'Führe regelmäßig Check-Ins durch, um HyperFit präziser zu machen.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-[#101112] p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xs uppercase tracking-[0.4em] text-white/40">Weekly Check-In</div>
          {agentMessages.length > 0 && (
            <button
              onClick={() => setShowAgentChat(!showAgentChat)}
              className="flex items-center gap-2 rounded-full border border-[#00FF7F]/30 bg-[#00FF7F]/10 px-3 py-1.5 text-xs text-[#00FF7F] transition hover:bg-[#00FF7F]/20"
            >
              <MessageCircle className="h-3 w-3" />
              AI Feedback ({agentMessages.length})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          Schritt {checkInStep + 1} / {steps.length}
        </div>
      </div>

      {/* AI Agent Chat Panel */}
      {showAgentChat && agentMessages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-2xl border border-[#00FF7F]/20 bg-gradient-to-br from-[#0a140e]/90 to-[#07110c]/90 p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#00FF7F]" />
            <p className="text-sm font-semibold text-white">Dein HyperFit Helfer</p>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {agentMessages
              .filter(msg => {
                // Don't show summary messages in chat panel if we're on summary step (already shown above)
                if (currentKey === 'summary' && msg.step === 'summary') {
                  return false
                }
                return msg.step === currentKey || msg.step === 'summary'
              })
              .map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-[#07110c]/80 p-3 text-sm text-[#b6fbd4] border border-white/10"
                >
                  <div className="whitespace-pre-wrap">{message.role === 'assistant' ? cleanAIMessage(message.content) : message.content}</div>
                </motion.div>
              ))}
            {agentLoading && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Loader2 className="h-4 w-4 animate-spin text-[#00FF7F]" />
                <span>Analysiere deine Daten...</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentKey}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="space-y-6"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
        <button
          onClick={prevStep}
          disabled={checkInStep === 0}
          className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white/70 transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Zurück
        </button>
        <button
          onClick={handleNext}
          disabled={checkInStep === steps.length - 1 || isNextDisabled}
          className="rounded-full border border-transparent bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {checkInStep === steps.length - 1 ? 'Fertig' : 'Weiter'}
        </button>
      </div>
    </div>
  )
}

