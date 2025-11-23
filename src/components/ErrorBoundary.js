import React from 'react';
import logger from '../utils/logger';

/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI instead of crashing the app
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console and any error tracking service
    logger.error('❌ Error Boundary caught an error:', error);
    logger.error('Error Info:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // TODO: Send to error tracking service (Sentry, etc.)
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Optionally reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          padding: '20px',
          color: '#ffffff'
        }}>
          <div style={{
            maxWidth: '600px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '40px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⚠️</div>
            <h1 style={{ color: '#00D4FF', marginBottom: '16px' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#AAAAAA', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '24px' }}>
              We're sorry, but something unexpected happened. Our team has been notified.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                marginTop: '24px',
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                textAlign: 'left',
                fontSize: '0.9rem',
                color: '#CCCCCC'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '12px', color: '#00D4FF' }}>
                  Error Details (Development Only)
                </summary>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflow: 'auto',
                  maxHeight: '300px',
                  fontSize: '0.85rem'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(0, 212, 255, 0.2)',
                  border: '1px solid rgba(0, 212, 255, 0.5)',
                  borderRadius: '6px',
                  color: '#00D4FF',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(0, 212, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(0, 212, 255, 0.2)';
                }}
              >
                Reload App
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


