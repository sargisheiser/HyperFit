import api from './api'

export async function fetchWorkoutHistory() {
  const response = await api.get('/api/workouts/history')
  return response.data || []
}

export async function saveWorkoutSession(payload) {
  const response = await api.post('/api/workouts/history', payload)
  return response.data
}




