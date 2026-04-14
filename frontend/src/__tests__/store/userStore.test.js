import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUserStore } from '@/store/userStore'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('@/store/useNutritionStore', () => ({
  default: {
    getState: () => ({ setCalorieGoal: vi.fn(), calorieGoal: 0 }),
  },
}))

vi.mock('@/utils/logger', () => ({
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('userStore', () => {
  beforeEach(() => {
    useUserStore.getState().reset()
  })

  it('has correct default state', () => {
    const state = useUserStore.getState()
    expect(state.profile).toBeNull()
    expect(state.name).toBe('')
    expect(state.onboardingComplete).toBe(false)
    expect(state.dailyCalorieTarget).toBe(2000)
    expect(state.dailyProteinTarget).toBe(150)
    expect(state.activityLevel).toBe('moderate')
    expect(state.language).toBe('de')
  })

  it('setProfile updates all fields', () => {
    useUserStore.getState().setProfile({
      full_name: 'Max Mustermann',
      weight_kg: 80,
      height_cm: 180,
      activity_level: 'active',
      daily_calorie_target: 2500,
      daily_protein_target: 180,
      onboarding_complete: true,
      birth_date: '1990-06-15',
    })

    const state = useUserStore.getState()
    expect(state.name).toBe('Max Mustermann')
    expect(state.weight).toBe(80)
    expect(state.height).toBe(180)
    expect(state.activityLevel).toBe('active')
    expect(state.dailyCalorieTarget).toBe(2500)
    expect(state.dailyProteinTarget).toBe(180)
    expect(state.onboardingComplete).toBe(true)
    expect(state.age).toBeGreaterThan(30)
  })

  it('setProfile calculates age from birth_date', () => {
    useUserStore.getState().setProfile({
      birth_date: '2000-01-01',
    })
    const state = useUserStore.getState()
    expect(state.age).toBeGreaterThanOrEqual(26)
    expect(state.age).toBeLessThan(30)
  })

  it('setProfile uses username as fallback for name', () => {
    useUserStore.getState().setProfile({
      username: 'testuser',
    })
    expect(useUserStore.getState().name).toBe('testuser')
  })

  it('setProfile uses defaults when fields missing', () => {
    useUserStore.getState().setProfile({})
    const state = useUserStore.getState()
    expect(state.dailyCalorieTarget).toBe(2000)
    expect(state.dailyProteinTarget).toBe(150)
    expect(state.activityLevel).toBe('moderate')
  })

  it('updateSettings merges settings', () => {
    useUserStore.getState().updateSettings({
      theme: 'light',
      language: 'en',
      units: { weight: 'lbs' },
    })
    const state = useUserStore.getState()
    expect(state.theme).toBe('light')
    expect(state.language).toBe('en')
    expect(state.units.weight).toBe('lbs')
    expect(state.units.height).toBe('cm') // unchanged
  })

  it('reset clears all profile data', () => {
    useUserStore.getState().setProfile({
      full_name: 'Test',
      weight_kg: 90,
      onboarding_complete: true,
    })
    useUserStore.getState().reset()
    const state = useUserStore.getState()
    expect(state.profile).toBeNull()
    expect(state.name).toBe('')
    expect(state.weight).toBeNull()
    expect(state.onboardingComplete).toBe(false)
  })

  it('fetchProfile calls API and sets profile', async () => {
    const api = (await import('@/services/api')).default
    api.get.mockResolvedValueOnce({
      data: { full_name: 'API User', daily_calorie_target: 2200 },
    })

    const result = await useUserStore.getState().fetchProfile()
    expect(result.success).toBe(true)
    expect(useUserStore.getState().name).toBe('API User')
    expect(useUserStore.getState().dailyCalorieTarget).toBe(2200)
  })

  it('fetchProfile handles API error', async () => {
    const api = (await import('@/services/api')).default
    api.get.mockRejectedValueOnce({ response: { data: { detail: 'Unauthorized' } } })

    const result = await useUserStore.getState().fetchProfile()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
    expect(useUserStore.getState().error).toBe('Unauthorized')
  })

  it('updateProfile calls API and updates state', async () => {
    const api = (await import('@/services/api')).default
    api.put.mockResolvedValueOnce({
      data: { full_name: 'Updated', daily_calorie_target: 2800 },
    })

    const result = await useUserStore.getState().updateProfile({ full_name: 'Updated' })
    expect(result.success).toBe(true)
    expect(useUserStore.getState().name).toBe('Updated')
    expect(useUserStore.getState().dailyCalorieTarget).toBe(2800)
  })
})
