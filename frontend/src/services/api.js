import axios from 'axios'
import logger from '../utils/logger'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
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

// Token refresh state
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  failedQueue = []
}

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token')

      // Skip refresh for login/register/refresh requests or if no refresh token
      if (!refreshToken || originalRequest.url?.includes('/refresh') || originalRequest.url?.includes('/login')) {
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        delete api.defaults.headers.common['Authorization']
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.dispatchEvent(new CustomEvent('auth:logout'))
        }
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/api/users/refresh`,
          { refresh_token: refreshToken }
        )
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
        processQueue(null, data.access_token)
        originalRequest.headers['Authorization'] = `Bearer ${data.access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        delete api.defaults.headers.common['Authorization']
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.dispatchEvent(new CustomEvent('auth:logout'))
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    
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
        logger.error('Error processing response:', e)
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
