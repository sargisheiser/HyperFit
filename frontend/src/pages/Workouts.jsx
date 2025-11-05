import { useState, useEffect } from 'react'
import api from '../services/api'
import { Plus, Dumbbell, Upload, Video, Sparkles, X, Camera } from 'lucide-react'
import LiveWorkout from '../components/LiveWorkout'

export default function Workouts() {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState('')
  const [showLiveWorkout, setShowLiveWorkout] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    workout_type: '',
    duration_minutes: '',
    notes: ''
  })

  useEffect(() => {
    fetchWorkouts()
  }, [])

  const fetchWorkouts = async () => {
    try {
      const response = await api.get('/api/workouts/')
      setWorkouts(response.data || [])
    } catch (error) {
      console.error('Error fetching workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/workouts/', {
        ...formData,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null
      })
      setShowForm(false)
      setFormData({ name: '', workout_type: '', duration_minutes: '', notes: '' })
      await fetchWorkouts()
    } catch (error) {
      console.error('Error creating workout:', error)
      setError(error.response?.data?.detail || 'Failed to create workout')
    }
  }

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file')
      return
    }

    setUploading(true)
    setError('')
    setAnalysisResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/api/workouts/upload-and-analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setAnalysisResult(response.data)
      await fetchWorkouts()
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to analyze workout video')
      console.error('Error analyzing workout:', error)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workouts</h1>
          <p className="mt-2 text-gray-600">Track your exercise sessions with AI analysis</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLiveWorkout(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Live Workout
          </button>
          <label className="btn btn-secondary cursor-pointer">
            <Video className="w-5 h-5 mr-2" />
            Upload & Analyze Video
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
              disabled={uploading || analyzing}
            />
          </label>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-secondary"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Workout
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {(uploading || analyzing) && (
        <div className="mb-6 card">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-4"></div>
            <div>
              <p className="font-medium text-gray-900">
                {uploading ? 'Uploading video...' : 'Analyzing workout with AI...'}
              </p>
              <p className="text-sm text-gray-500">This may take a minute for longer videos</p>
            </div>
          </div>
        </div>
      )}

      {analysisResult && (
        <div className="mb-6 card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <Sparkles className="w-6 h-6 text-green-600 mr-2" />
              <h3 className="text-xl font-bold text-gray-900">Analysis Results</h3>
            </div>
            <button onClick={() => setAnalysisResult(null)}>
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Detected Exercises</h4>
              <div className="space-y-2">
                {analysisResult.detected_exercises?.map((exercise, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                    <span className="text-sm font-medium capitalize">{exercise.name}</span>
                    <span className="text-xs text-gray-500">
                      {exercise.reps} reps, {exercise.sets} sets
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between p-2 bg-white rounded">
                  <span className="text-sm font-medium">Total Reps</span>
                  <span className="text-sm font-bold text-green-600">{analysisResult.total_reps}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded">
                  <span className="text-sm font-medium">Total Sets</span>
                  <span className="text-sm font-bold">{analysisResult.total_sets}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded">
                  <span className="text-sm font-medium">Calories Burned</span>
                  <span className="text-sm font-bold text-orange-600">
                    {Math.round(analysisResult.estimated_calories)}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">
                    Form Score: {analysisResult.form_analysis?.overall_score?.toFixed(1)}/10
                  </p>
                  {analysisResult.form_analysis?.recommendations && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Recommendations:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {analysisResult.form_analysis.recommendations.map((rec, idx) => (
                          <li key={idx}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">New Workout</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workout Name
              </label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Morning Run"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  className="input"
                  value={formData.workout_type}
                  onChange={(e) => setFormData({ ...formData, workout_type: e.target.value })}
                >
                  <option value="">Select type</option>
                  <option value="strength">Strength</option>
                  <option value="cardio">Cardio</option>
                  <option value="yoga">Yoga</option>
                  <option value="calisthenics">Calisthenics</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  className="input"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                className="input"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Workout notes..."
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                Save Workout
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Workouts</h2>
        {workouts.length === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No workouts tracked yet</p>
            <p className="text-sm text-gray-400">Add your first workout to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => (
              <div key={workout.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{workout.name || 'Workout'}</h3>
                    <p className="text-sm text-gray-500">{workout.workout_type}</p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(workout.created_at).toLocaleDateString()}
                  </span>
                </div>
                {workout.duration_minutes && (
                  <p className="text-sm text-gray-600">
                    Duration: {workout.duration_minutes} minutes
                  </p>
                )}
                {workout.notes && (
                  <p className="text-sm text-gray-600 mt-2">{workout.notes}</p>
                )}
                {workout.calories_burned && (
                  <p className="text-sm font-medium text-green-600 mt-2">
                    Calories burned: {Math.round(workout.calories_burned)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showLiveWorkout && (
        <LiveWorkout onClose={() => setShowLiveWorkout(false)} />
      )}
    </div>
  )
}
