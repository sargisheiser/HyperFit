import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNutritionStore } from '@/store/useNutritionStore'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

vi.mock('@/store/userStore', () => ({
  default: {
    getState: () => ({
      profile: { weight_kg: 80, daily_calorie_target: 2500 },
      dailyCalorieTarget: 2500,
    }),
  },
}))

vi.mock('@/services/nutritionService', () => ({
  DEFAULT_SNAPSHOT: {
    calorieGoal: 2000,
    calorieIntake: 0,
    macros: {
      protein: { target: 150, current: 0 },
      carbs: { target: 250, current: 0 },
      fat: { target: 70, current: 0 },
    },
    weight: null,
    compliance: null,
    history: [],
  },
  mapDailyNutritionToSnapshot: vi.fn((data) => ({
    calorieGoal: data?.calorieGoal || data?.calories_goal || 2000,
    calorieIntake: data?.calorieIntake || data?.calories_consumed || 0,
    macros: data?.macros || {
      protein: { target: 150, current: 0 },
      carbs: { target: 250, current: 0 },
      fat: { target: 70, current: 0 },
    },
    weight: data?.weight || null,
    bodyFat: data?.bodyFat || null,
    compliance: data?.compliance || null,
    history: data?.history || [],
  })),
}))

vi.mock('@/utils/calorieCalculator', () => ({
  calculateDailyCalories: vi.fn(() => 2200),
}))

vi.mock('@/utils/logger', () => ({
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('useNutritionStore', () => {
  beforeEach(() => {
    const { setState } = useNutritionStore
    setState({
      isLoading: false,
      calorieGoal: 0,
      calorieIntake: 0,
      weight: null,
      bodyFat: null,
      compliance: null,
      checkInStep: 0,
      macros: {
        protein: { target: 0, current: 0 },
        carbs: { target: 0, current: 0 },
        fat: { target: 0, current: 0 },
      },
      history: [],
      lastError: null,
    })
  })

  it('has correct default state', () => {
    const state = useNutritionStore.getState()
    expect(state.calorieGoal).toBe(0)
    expect(state.calorieIntake).toBe(0)
    expect(state.weight).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.macros.protein.target).toBe(0)
  })

  it('setCalorieGoal updates goal', async () => {
    await useNutritionStore.getState().setCalorieGoal(2500, { skipSync: true })
    expect(useNutritionStore.getState().calorieGoal).toBe(2500)
  })

  it('setDailySnapshot updates nutrition data', () => {
    useNutritionStore.getState().setDailySnapshot({
      calorieGoal: 2200,
      calorieIntake: 1500,
      macros: {
        protein: { target: 150, current: 100 },
        carbs: { target: 250, current: 180 },
        fat: { target: 70, current: 50 },
      },
      weight: 78.5,
      compliance: 68.2,
    })

    const state = useNutritionStore.getState()
    expect(state.calorieGoal).toBe(2200)
    expect(state.calorieIntake).toBe(1500)
    expect(state.weight).toBe(78.5)
  })

  it('setState updates checkInStep', () => {
    useNutritionStore.setState({ checkInStep: 3 })
    expect(useNutritionStore.getState().checkInStep).toBe(3)
  })

  it('setState merges checkInData', () => {
    useNutritionStore.setState({
      checkInData: { ...useNutritionStore.getState().checkInData, adherence: 'good', weight: 79 },
    })
    const data = useNutritionStore.getState().checkInData
    expect(data.adherence).toBe('good')
    expect(data.weight).toBe(79)
    expect(data.goal).toBe('maintain')
  })
})
