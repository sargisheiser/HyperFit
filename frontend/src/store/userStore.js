import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import api from '../services/api'
import useNutritionStore from './useNutritionStore'
import logger from '../utils/logger'

export const useUserStore = create(
  devtools((set, get) => ({
    profile: null,
    isLoading: false,
    error: null,
    onboardingComplete: false,

    // Profile data
    name: '',
    age: null,
    height: null, // in cm
    weight: null, // in kg
    activityLevel: 'moderate', // sedentary, light, moderate, active, very_active
    dailyCalorieTarget: 2000,
    dailyProteinTarget: 150, // in grams

    // Settings
    units: {
      weight: 'kg', // kg or lbs
      height: 'cm', // cm or inch
    },
    theme: 'dark',
    notifications: true,
    language: 'de',

    // Actions
    setProfile: (profile) => {
      // Calculate age from birth_date if available
      let calculatedAge = null
      if (profile?.birth_date) {
        const birthDate = new Date(profile.birth_date)
        const today = new Date()
        calculatedAge = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--
        }
      }

      const targetCalories = profile?.daily_calorie_target || 2000
      
      set({
        profile,
        name: profile?.full_name || profile?.username || '',
        age: calculatedAge || profile?.age || null,
        height: profile?.height_cm || profile?.height || null,
        weight: profile?.weight_kg || profile?.weight || null,
        activityLevel: profile?.activity_level || 'moderate',
        dailyCalorieTarget: targetCalories,
        dailyProteinTarget: profile?.daily_protein_target || 150,
        onboardingComplete: profile?.onboarding_complete || false,
      })
      
      // Sync calorie goal to nutrition store (skipSync prevents infinite loop back to userStore)
      if (targetCalories && targetCalories > 0) {
        try {
          const { setCalorieGoal, calorieGoal } = useNutritionStore.getState()
          if (!calorieGoal || calorieGoal === 0 || calorieGoal !== targetCalories) {
            setCalorieGoal(targetCalories, { skipSync: true })
          }
        } catch (error) {
          logger.warn('[UserStore] Failed to sync calorie goal to nutrition store:', error)
        }
      }
    },

    updateProfile: async (updates) => {
      set({ isLoading: true, error: null })
      try {
        const response = await api.put('/api/users/me', updates)
        const updatedProfile = response.data
        get().setProfile(updatedProfile)
        return { success: true, data: updatedProfile }
      } catch (error) {
        const errorMsg = error.response?.data?.detail || 'Failed to update profile'
        set({ error: errorMsg })
        return { success: false, error: errorMsg }
      } finally {
        set({ isLoading: false })
      }
    },

    fetchProfile: async () => {
      set({ isLoading: true, error: null })
      try {
        const response = await api.get('/api/users/me')
        get().setProfile(response.data)
        return { success: true, data: response.data }
      } catch (error) {
        const errorMsg = error.response?.data?.detail || 'Failed to fetch profile'
        set({ error: errorMsg })
        return { success: false, error: errorMsg }
      } finally {
        set({ isLoading: false })
      }
    },

    updateSettings: (settings) => {
      set((state) => ({
        ...state,
        units: { ...state.units, ...settings.units },
        theme: settings.theme ?? state.theme,
        notifications: settings.notifications ?? state.notifications,
        language: settings.language ?? state.language,
      }))
    },

    reset: () => {
      set({
        profile: null,
        name: '',
        age: null,
        height: null,
        weight: null,
        activityLevel: 'moderate',
        dailyCalorieTarget: 2000,
        dailyProteinTarget: 150,
        onboardingComplete: false,
        error: null,
      })
    },
  })),
)

export default useUserStore



