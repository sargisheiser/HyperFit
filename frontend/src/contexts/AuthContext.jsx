import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { useUserStore } from '../store/userStore'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }

    // Listen for logout events from API interceptor
    const handleLogout = () => {
      logout()
    }
    window.addEventListener('auth:logout', handleLogout)
    
    return () => {
      window.removeEventListener('auth:logout', handleLogout)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/users/me')
      setUser(response.data)
      useUserStore.getState().setProfile(response.data)
    } catch (error) {
      // Only clear token on 401, not on connection errors
      if (error.response?.status === 401 || error.code === 'ERR_BAD_RESPONSE') {
        localStorage.removeItem('token')
        delete api.defaults.headers.common['Authorization']
        setUser(null)
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || error.message?.includes('CONNECTION')) {
        // Backend not running - keep token but don't set user
        console.warn('Backend server not reachable. Make sure it is running on http://localhost:8000')
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/users/login', { email, password })
      const { access_token, refresh_token } = response.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      await fetchUser()
      return { success: true }
    } catch (error) {
      // Handle connection errors specifically
      if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || error.message?.includes('CONNECTION')) {
        return {
          success: false,
          error: 'Cannot connect to server. Please make sure the backend is running on http://localhost:8000'
        }
      }
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Login failed'
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await api.post('/api/users/register', userData)
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Registration API error:', error)
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        return {
          success: false,
          error: 'Cannot connect to server. Make sure the backend is running on http://localhost:8000'
        }
      }
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Registration failed'
      }
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    fetchUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
