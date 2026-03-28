import React from 'react'
import logger from '../utils/logger'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    logger.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-[#0e0e10] p-8 text-white">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-4xl font-bold text-[#00FF7F]">SYSTEM ERROR</h1>
            <p className="mb-2 text-lg text-gray-300">
              Etwas ist schiefgelaufen.
            </p>
            <p className="mb-8 text-sm text-gray-500">
              {this.state.error?.message || 'Unbekannter Fehler'}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={this.handleRetry}
                className="rounded-lg bg-[#00FF7F] px-6 py-3 font-semibold text-[#0e0e10] transition-opacity hover:opacity-80"
              >
                Erneut versuchen
              </button>
              <button
                onClick={() => (window.location.href = '/review')}
                className="rounded-lg border border-gray-600 px-6 py-3 font-semibold text-gray-300 transition-colors hover:border-[#00FF7F] hover:text-[#00FF7F]"
              >
                Zum Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
