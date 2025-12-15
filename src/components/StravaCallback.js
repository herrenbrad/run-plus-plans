import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StravaService from '../services/stravaService';
import FirestoreService from '../services/FirestoreService';
import { auth } from '../firebase/config';

function StravaCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for errors from Strava
        const errorParam = searchParams.get('error');
        if (errorParam) {
          setError(`Strava authorization failed: ${errorParam}`);
          setStatus('error');
          return;
        }

        // Get authorization code
        const code = searchParams.get('code');
        if (!code) {
          setError('No authorization code received from Strava');
          setStatus('error');
          return;
        }

        // Check if user is authenticated
        if (!auth.currentUser) {
          setError('You must be logged in to connect Strava');
          setStatus('error');
          return;
        }

        setStatus('exchanging');

        // Exchange code for tokens
        const tokenData = await StravaService.exchangeToken(code);

        setStatus('saving');

        // Save tokens to Firebase
        const { updateDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');

        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          stravaConnected: true,
          stravaAccessToken: tokenData.access_token,
          stravaRefreshToken: tokenData.refresh_token,
          stravaTokenExpiresAt: tokenData.expires_at,
          stravaAthleteId: tokenData.athlete.id,
          stravaAthleteName: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
          stravaConnectedAt: new Date().toISOString(),
        });

        console.log('✅ Strava connected successfully:', tokenData.athlete);

        setStatus('success');

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } catch (err) {
        console.error('❌ Strava callback error:', err);
        setError(err.message || 'Failed to connect Strava');
        setStatus('error');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

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
        maxWidth: '500px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '40px',
        textAlign: 'center'
      }}>
        {status === 'processing' && (
          <>
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px',
              animation: 'spin 2s linear infinite'
            }}>
              ⏳
            </div>
            <h1 style={{ color: 'white', marginBottom: '10px' }}>Processing...</h1>
            <p style={{ color: '#aaa' }}>Connecting your Strava account</p>
          </>
        )}

        {status === 'exchanging' && (
          <>
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              🔄
            </div>
            <h1 style={{ color: 'white', marginBottom: '10px' }}>Exchanging Tokens...</h1>
            <p style={{ color: '#aaa' }}>Getting your Strava authorization</p>
          </>
        )}

        {status === 'saving' && (
          <>
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px',
              animation: 'bounce 1s ease-in-out infinite'
            }}>
              💾
            </div>
            <h1 style={{ color: 'white', marginBottom: '10px' }}>Saving Connection...</h1>
            <p style={{ color: '#aaa' }}>Almost done!</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
            <h1 style={{ color: '#00FF88', marginBottom: '10px' }}>Strava Connected!</h1>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>
              Your workouts will now sync automatically
            </p>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              Redirecting to dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>❌</div>
            <h1 style={{ color: '#ff4444', marginBottom: '10px' }}>Connection Failed</h1>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Return to Dashboard
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

export default StravaCallback;
