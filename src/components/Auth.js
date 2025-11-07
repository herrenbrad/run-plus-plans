import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Logged in successfully');
      } else {
        // Sign up - Create account with pending approval
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Update profile with display name
        if (displayName) {
          await updateProfile(userCredential.user, {
            displayName: displayName
          });
        }

        // Create user profile with approval status
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: email,
          displayName: displayName || '',
          approvalStatus: 'pending',
          createdAt: serverTimestamp(),
          approvedAt: null,
          approvedBy: null
        });

        console.log('✅ Account created successfully - pending approval');
      }
    } catch (err) {
      console.error('❌ Auth error:', err);

      // User-friendly error messages
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Please login instead.');
          break;
        case 'auth/weak-password':
          setError('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 special character.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Invalid email or password.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        default:
          // Show the actual error message for better debugging
          if (err.message) {
            setError(err.message);
          } else {
            setError('An error occurred. Please try again.');
          }
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      console.log('✅ Password reset email sent');
    } catch (err) {
      console.error('❌ Password reset error:', err);
      setError('Could not send reset email. Please check your email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/logo.png"
            alt="Run+ Plans"
            style={{
              maxWidth: '200px',
              height: 'auto',
              marginBottom: '16px'
            }}
          />
          <p style={{
            color: '#AAAAAA',
            fontSize: '0.95rem',
            lineHeight: '1.4'
          }}>
            Smart training that adapts to injuries, equipment, and real life
          </p>
        </div>

        {resetEmailSent ? (
          <div style={{
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            color: '#00D4FF',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <p style={{ margin: 0 }}>
              ✅ Password reset email sent! Check your inbox.
            </p>
            <button
              onClick={() => setResetEmailSent(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#00D4FF',
                textDecoration: 'underline',
                cursor: 'pointer',
                marginTop: '12px'
              }}
            >
              Back to login
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#CCCCCC', marginBottom: '8px' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoComplete="name"
                    placeholder="Your name"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#CCCCCC', marginBottom: '8px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#CCCCCC', marginBottom: '8px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder={isLogin ? "Enter your password" : "Create a strong password"}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '1rem'
                  }}
                />
                {!isLogin && (
                  <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px', marginBottom: 0 }}>
                    At least 8 characters with 1 uppercase, 1 lowercase, and 1 special character
                  </p>
                )}
              </div>

              {error && (
                <div style={{
                  background: 'rgba(229, 62, 62, 0.1)',
                  border: '1px solid rgba(229, 62, 62, 0.3)',
                  borderRadius: '6px',
                  padding: '12px',
                  color: '#FC8181',
                  marginBottom: '16px',
                  fontSize: '0.9rem'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading ? '#666666' : '#00D4FF',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000000',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginBottom: '16px'
                }}
              >
                {loading ? 'Loading...' : (isLogin ? 'Login' : 'Create Account')}
              </button>

              {isLogin && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#00D4FF',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'block',
                    margin: '0 auto 16px'
                  }}
                >
                  Forgot password?
                </button>
              )}
            </form>

            <div style={{
              textAlign: 'center',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#AAAAAA',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {isLogin ? (
                  <>Don't have an account? <span style={{ color: '#00D4FF' }}>Sign up</span></>
                ) : (
                  <>Already have an account? <span style={{ color: '#00D4FF' }}>Login</span></>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Auth;
