import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle JSON parsing errors
    if (error.response && error.response.data) {
      try {
        // If response is already parsed, return as is
        if (typeof error.response.data === 'object') {
          return Promise.reject(error)
        }
        // Try to parse if it's a string
        if (typeof error.response.data === 'string') {
          try {
            error.response.data = JSON.parse(error.response.data)
          } catch (parseError) {
            // If parsing fails, wrap the error message
            error.response.data = {
              detail: error.response.data || 'An error occurred'
            }
          }
        }
      } catch (e) {
        console.error('Error processing response:', e)
      }
    }
    
    // Handle network errors
    if (!error.response) {
      error.response = {
        data: {
          detail: 'Cannot connect to server. Make sure the backend is running on http://localhost:8000'
        },
        status: 0
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
