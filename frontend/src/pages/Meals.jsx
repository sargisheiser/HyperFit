import { useState, useEffect } from 'react'
import api from '../services/api'
import { Upload, Sparkles, X, CheckCircle, Utensils } from 'lucide-react'

export default function Meals() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMeals()
  }, [])

  const fetchMeals = async () => {
    try {
      const response = await api.get('/api/meals/')
      setMeals(response.data || [])
    } catch (error) {
      console.error('Error fetching meals:', error)
      setError('Failed to load meals')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    setUploading(true)
    setError('')
    setAnalysisResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/api/meals/upload-and-analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setAnalysisResult(response.data)
      await fetchMeals()
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to analyze meal')
      console.error('Error analyzing meal:', error)
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
          <h1 className="text-3xl font-bold text-gray-900">Meals</h1>
          <p className="mt-2 text-gray-600">Track your nutrition with AI-powered analysis</p>
        </div>
        <label className="btn btn-primary cursor-pointer">
          <Upload className="w-5 h-5 mr-2" />
          Upload & Analyze
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading || analyzing}
          />
        </label>
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
                {uploading ? 'Uploading image...' : 'Analyzing meal with AI...'}
              </p>
              <p className="text-sm text-gray-500">This may take a few seconds</p>
            </div>
          </div>
        </div>
      )}

      {analysisResult && (
        <div className="mb-6 card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <Sparkles className="w-6 h-6 text-primary-600 mr-2" />
              <h3 className="text-xl font-bold text-gray-900">Analysis Results</h3>
            </div>
            <button onClick={() => setAnalysisResult(null)}>
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Food Items</h4>
              <div className="space-y-2">
                {analysisResult.food_items?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-gray-500">{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Nutrition</h4>
              <div className="space-y-2">
                <div className="flex justify-between p-2 bg-white rounded">
                  <span className="text-sm font-medium">Calories</span>
                  <span className="text-sm font-bold text-primary-600">
                    {Math.round(analysisResult.total_calories)}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded">
                  <span className="text-sm">Protein</span>
                  <span className="text-sm">{analysisResult.macronutrients?.protein?.toFixed(1)}g</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded">
                  <span className="text-sm">Carbs</span>
                  <span className="text-sm">{analysisResult.macronutrients?.carbs?.toFixed(1)}g</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded">
                  <span className="text-sm">Fat</span>
                  <span className="text-sm">{analysisResult.macronutrients?.fat?.toFixed(1)}g</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Confidence: {Math.round((analysisResult.confidence_score || 0) * 100)}%
                </p>
                <p className="text-xs text-gray-500">
                  Processed in: {analysisResult.analysis_details?.processing_time}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Meals</h2>
        {meals.length === 0 ? (
          <div className="text-center py-12">
            <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No meals tracked yet</p>
            <p className="text-sm text-gray-400">Upload a food image to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {meals.map((meal) => (
              <div key={meal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="font-semibold text-gray-900">{meal.name || 'Meal'}</h3>
                    {meal.confidence_score && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {Math.round(meal.confidence_score * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Calories:</span>
                      <span className="ml-2 font-medium">{Math.round(meal.estimated_calories || 0)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Protein:</span>
                      <span className="ml-2 font-medium">{meal.protein_grams?.toFixed(1) || 0}g</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Carbs:</span>
                      <span className="ml-2 font-medium">{meal.carbs_grams?.toFixed(1) || 0}g</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Fat:</span>
                      <span className="ml-2 font-medium">{meal.fat_grams?.toFixed(1) || 0}g</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-2 font-medium">
                        {new Date(meal.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
