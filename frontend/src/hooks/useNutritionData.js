import { useEffect, useRef } from 'react'
import logger from '../utils/logger'
import useNutritionStore from '../store/useNutritionStore'
import useUserStore from '../store/userStore'
import { fetchNutritionSnapshot } from '../services/nutritionService'
import { calculateDailyCalories } from '../utils/calorieCalculator'
import { useAuth } from '../contexts/AuthContext'

export default function useNutritionData() {
  const { user } = useAuth()
  const { profile } = useUserStore((state) => ({
    profile: state.profile,
  }))
  const {
    hydrate,
    resetDailySnapshot,
    isLoading,
    calorieGoal,
    calorieIntake,
    macros,
    weight,
    bodyFat,
    history,
    lastError,
    setWeight,
    setCalorieGoal,
    checkInData,
  } = useNutritionStore((state) => ({
    hydrate: state.hydrate,
    resetDailySnapshot: state.resetDailySnapshot,
    isLoading: state.isLoading,
    calorieGoal: state.calorieGoal,
    calorieIntake: state.calorieIntake,
    macros: state.macros,
    weight: state.weight,
    bodyFat: state.bodyFat,
    history: state.history,
    lastError: state.lastError,
    setWeight: state.setWeight,
    setCalorieGoal: state.setCalorieGoal,
    checkInData: state.checkInData,
  }))

  // Sync weight from profile to nutrition store when profile loads or changes
  useEffect(() => {
    if (profile?.weight_kg && typeof profile.weight_kg === 'number') {
      // Only sync if nutrition store doesn't have weight or profile weight is different
      if (!weight || Math.abs(weight - profile.weight_kg) > 0.1) {
        logger.debug('[Nutrition] Syncing weight from profile:', profile.weight_kg)
        setWeight(profile.weight_kg)
      }
    }
  }, [profile?.weight_kg, weight, setWeight])

  // Sync daily targets based on activity level and profile data
  // Only update if activity level changed or calorie goal is 0/missing
  useEffect(() => {
    if (!profile || !profile.activity_level) return
    
    // Use profile daily_calorie_target if available (highest priority)
    if (profile.daily_calorie_target && profile.daily_calorie_target > 0) {
      if (profile.daily_calorie_target !== calorieGoal) {
        logger.debug('[Nutrition] Syncing calorie goal from profile:', profile.daily_calorie_target)
        setCalorieGoal(profile.daily_calorie_target)
      }
      return // Don't recalculate if profile has a target
    }
    
    // Only recalculate if calorie goal is missing/zero
    if (calorieGoal && calorieGoal > 0) return
    
    const goal = checkInData?.goal || 'build'
    
    try {
      const aiCalculated = calculateDailyCalories(profile, goal)
      
      // Only update if we have a valid target
      if (aiCalculated.targetCalories && aiCalculated.targetCalories > 0) {
        logger.debug('[Nutrition] Syncing calorie goal from AI calculation:', {
          activityLevel: profile.activity_level,
          newGoal: aiCalculated.targetCalories,
        })
        setCalorieGoal(aiCalculated.targetCalories)
      }
    } catch (error) {
      logger.warn('[Nutrition] Failed to calculate calorie goal:', error)
    }
  }, [profile, calorieGoal, checkInData?.goal, setCalorieGoal])

  // Fetch nutrition snapshot - use ref to prevent unnecessary re-fetches
  const profileRef = useRef(profile)
  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    if (!user?.id) {
      resetDailySnapshot()
      return
    }
    
    // Only refetch if user ID changes or profile ID/activity level changes
    const currentProfile = profileRef.current
    
    hydrate(() => fetchNutritionSnapshot(user.id, currentProfile))
  }, [hydrate, resetDailySnapshot, user?.id])

  return {
    userId: user?.id,
    isLoading,
    calorieGoal,
    calorieIntake,
    macros,
    weight,
    bodyFat,
    history,
    lastError,
  }
}

