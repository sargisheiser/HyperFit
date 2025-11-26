import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { DEFAULT_SNAPSHOT, mapDailyNutritionToSnapshot } from '../services/nutritionService'
import useUserStore from './userStore'
import { calculateDailyCalories } from '../utils/calorieCalculator'

const defaultMacros = {
  protein: { target: 0, current: 0 },
  carbs: { target: 0, current: 0 },
  fat: { target: 0, current: 0 },
}

const toStateFromSnapshot = (snapshot, state, { preserveHistory = true } = {}) => {
  const mapped = mapDailyNutritionToSnapshot(snapshot)

  const history = mapped.history?.length
    ? mapped.history
    : preserveHistory
      ? state.history ?? []
      : []

  return {
    calorieGoal: mapped.calorieGoal,
    calorieIntake: mapped.calorieIntake,
    macros: mapped.macros,
    weight: mapped.weight ?? null,
    bodyFat: mapped.bodyFat ?? state.bodyFat ?? null,
    compliance: mapped.compliance ?? state.compliance ?? null,
    history,
    checkInData: {
      ...state.checkInData,
      weight: mapped.weight ?? state.checkInData.weight ?? null,
      bodyFat: mapped.bodyFat ?? state.checkInData.bodyFat ?? null,
    },
  }
}

export const useNutritionStore = create(
  devtools((set, get) => ({
    isLoading: false,
    calorieGoal: 0,
    calorieIntake: 0,
    weight: null,
    bodyFat: null,
    compliance: null,
    checkInStep: 0,
    checkInData: {
      adherence: null,
      weight: null,
      bodyFat: null,
      goal: 'maintain',
      recommendation: null,
      suggestedCalories: null,
      lastCheckInDate: null,
    },
    macros: defaultMacros,
    history: [],
    lastError: null,
    setCalorieGoal: async (goal) => {
      set({ calorieGoal: goal })
      
      // Sync to user profile if goal is valid
      if (goal && goal > 0) {
        try {
          const { updateProfile } = useUserStore.getState()
          await updateProfile({ daily_calorie_target: Math.round(goal) })
          console.debug('[NutritionStore] Calorie goal synced to profile:', goal)
        } catch (error) {
          console.warn('[NutritionStore] Failed to sync calorie goal to profile:', error)
          // Don't fail if profile sync fails
        }
      }
    },
    setCalorieIntake: (intake) => set({ calorieIntake: intake }),
    setWeight: async (weight, updater) => {
      // Update local state immediately
      set((state) => ({
        weight,
        checkInData: { ...state.checkInData, weight },
      }))
      
      // Sync to backend
      if (updater) {
        try {
          const result = await updater(weight)
          console.debug('[NutritionStore] Weight sync result:', result)
          
          // If backend returns a snapshot, update the store with it
          if (result && typeof result === 'object') {
            if (result.calorieGoal !== undefined || result.calorieIntake !== undefined || result.macros) {
              // It's a snapshot object
              set((state) => ({
                weight: result.weight ?? weight,
                calorieGoal: result.calorieGoal ?? state.calorieGoal,
                calorieIntake: result.calorieIntake ?? state.calorieIntake,
                macros: result.macros ?? state.macros,
                checkInData: { ...state.checkInData, weight: result.weight ?? weight },
              }))
            } else if (result.weight !== undefined) {
              // It's a weight response object
              set((state) => ({
                weight: result.weight ?? weight,
                checkInData: { ...state.checkInData, weight: result.weight ?? weight },
              }))
            }
          }
        } catch (error) {
          console.error('Weight sync failed', error)
          // Revert on error
          set((state) => ({
            weight: state.weight, // Keep previous weight
          }))
        }
      }
    },
    setBodyFat: (bodyFat) =>
      set((state) => ({
        bodyFat,
        checkInData: { ...state.checkInData, bodyFat },
      })),
    setAdherence: (adherence) =>
      set((state) => ({ checkInData: { ...state.checkInData, adherence } })),
    setGoal: (goal) =>
      set((state) => ({ checkInData: { ...state.checkInData, goal } })),
    setRecommendation: (recommendation, suggestedCalories = null, lastCheckInDate = null) =>
      set((state) => ({
        checkInData: {
          ...state.checkInData,
          recommendation,
          suggestedCalories:
            typeof suggestedCalories === 'number' ? suggestedCalories : state.checkInData.suggestedCalories,
          lastCheckInDate: lastCheckInDate ?? state.checkInData.lastCheckInDate,
        },
      })),
    setDailySnapshot: (snapshot, options = {}) => {
      if (!snapshot) return
      const currentState = get()
      const updated = toStateFromSnapshot(snapshot, currentState, options)
      
      // Only calculate from activity level if:
      // 1. Profile is provided AND
      // 2. Calorie goal is missing/zero OR forceRecalculate is true AND
      // 3. Profile doesn't have daily_calorie_target (use that instead)
      if (options?.profile && options.forceRecalculate && !options.profile.daily_calorie_target) {
        try {
          // calculateDailyCalories is already imported at the top
          const goal = currentState.checkInData?.goal || 'build'
          const aiCalculated = calculateDailyCalories(options.profile, goal)
          if (aiCalculated.targetCalories && (!updated.calorieGoal || updated.calorieGoal === 0)) {
            updated.calorieGoal = aiCalculated.targetCalories
            // Also update macro targets based on activity level
            updated.macros = {
              protein: {
                target: aiCalculated.targetProtein || updated.macros?.protein?.target || 0,
                current: updated.macros?.protein?.current || 0,
              },
              carbs: {
                target: aiCalculated.targetCarbs || updated.macros?.carbs?.target || 0,
                current: updated.macros?.carbs?.current || 0,
              },
              fat: {
                target: aiCalculated.targetFat || updated.macros?.fat?.target || 0,
                current: updated.macros?.fat?.current || 0,
              },
            }
            console.debug('[NutritionStore] Updated targets from activity level:', {
              activityLevel: options.profile.activity_level,
              calorieGoal: updated.calorieGoal,
              proteinTarget: updated.macros.protein.target,
            })
          }
        } catch (e) {
          console.warn('[NutritionStore] Failed to calculate AI targets:', e)
        }
      }
      
      // Use profile daily_calorie_target if available and different
      if (options?.profile?.daily_calorie_target && 
          options.profile.daily_calorie_target > 0 &&
          options.profile.daily_calorie_target !== updated.calorieGoal) {
        updated.calorieGoal = options.profile.daily_calorie_target
        console.debug('[NutritionStore] Updated calorie goal from profile:', updated.calorieGoal)
      }
      
      set((state) => ({ ...updated, lastError: null }))
    },
    resetDailySnapshot: () => {
      set((state) => ({
        ...toStateFromSnapshot(DEFAULT_SNAPSHOT, state, { preserveHistory: false }),
        lastError: null,
      }))
    },
    applyMealAnalysis: ({ calories = 0, macronutrients = {} }) =>
      set((state) => {
        const safeMacros = {
          protein: macronutrients.protein_grams ?? macronutrients.protein ?? 0,
          carbs: macronutrients.carbs_grams ?? macronutrients.carbs ?? 0,
          fat: macronutrients.fat_grams ?? macronutrients.fat ?? 0,
        }

        const mergedMacros = {
          protein: {
            target: state.macros?.protein?.target ?? 0,
            current: (state.macros?.protein?.current ?? 0) + safeMacros.protein,
          },
          carbs: {
            target: state.macros?.carbs?.target ?? 0,
            current: (state.macros?.carbs?.current ?? 0) + safeMacros.carbs,
          },
          fat: {
            target: state.macros?.fat?.target ?? 0,
            current: (state.macros?.fat?.current ?? 0) + safeMacros.fat,
          },
        }

        return {
          calorieIntake: (state.calorieIntake ?? 0) + Math.round(calories),
          macros: mergedMacros,
        }
      }),
    nextStep: () => {
      const { checkInStep } = get()
      if (checkInStep < 4) set({ checkInStep: checkInStep + 1 })
    },
    prevStep: () => {
      const { checkInStep } = get()
      if (checkInStep > 0) set({ checkInStep: checkInStep - 1 })
    },
    resetStep: () => set({ checkInStep: 0 }),
    hydrate: async (loader) => {
      set({ isLoading: true, lastError: null })
      try {
        const data = await loader?.()
        if (!data) {
          set((state) => ({ ...toStateFromSnapshot(DEFAULT_SNAPSHOT, state, { preserveHistory: false }) }))
          return
        }
        const { setDailySnapshot } = get()
        setDailySnapshot(data)
      } catch (error) {
        console.error('Nutrition hydrate failed', error)
        set((state) => ({
          ...toStateFromSnapshot(DEFAULT_SNAPSHOT, state, { preserveHistory: false }),
          lastError: error,
        }))
      } finally {
        set({ isLoading: false })
      }
    },
  })),
)

export default useNutritionStore

