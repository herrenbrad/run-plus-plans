import React, { useState, useEffect } from 'react';
import './Toast.css';

/**
 * Toast Notification System
 * Replaces alert() calls with modern, non-blocking notifications
 */

const ToastContext = React.createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Memoize removeToast to prevent closure issues
  const removeToast = React.useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = React.useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    
    setToasts(prev => {
      // Prevent duplicate toasts with same message
      if (prev.some(t => t.message === message && t.type === type)) {
        return prev;
      }
      return [...prev, toast];
    });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const success = React.useCallback((message, duration) => showToast(message, 'success', duration), [showToast]);
  const error = React.useCallback((message, duration) => showToast(message, 'error', duration), [showToast]);
  const warning = React.useCallback((message, duration) => showToast(message, 'warning', duration), [showToast]);
  const info = React.useCallback((message, duration) => showToast(message, 'info', duration), [showToast]);

  const contextValue = React.useMemo(() => ({
    showToast,
    success,
    error,
    warning,
    info
  }), [showToast, success, error, warning, info]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ message, type, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for fade-out animation
  };

  return (
    <div
      className={`toast toast-${type} ${isVisible ? 'toast-visible' : ''}`}
      onClick={handleClose}
    >
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' && '✓'}
          {type === 'error' && '✕'}
          {type === 'warning' && '⚠'}
          {type === 'info' && 'ℹ'}
        </span>
        <span className="toast-message">{message}</span>
        <button className="toast-close" onClick={handleClose} aria-label="Close">
          ×
        </button>
      </div>
    </div>
  );
}

// Hook for using toast in components
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export default Toast;






