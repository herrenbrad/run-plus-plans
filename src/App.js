import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import './App.css';

// Firebase
import { auth } from './firebase/config';
import FirestoreService from './services/FirestoreService';

// Components
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import OnboardingFlow from './components/OnboardingFlow';
import TrainingPlanPreview from './components/TrainingPlanPreview';
import Dashboard from './components/Dashboard';
import WorkoutDetail from './components/WorkoutDetail';
import AdminApproval from './components/AdminApproval';

// Scroll to top component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  const [user, setUser] = useState(null); // Firebase user
  const [userProfile, setUserProfile] = useState(null);
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for auth

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser ? 'Logged in' : 'Logged out');

      if (firebaseUser) {
        setUser(firebaseUser);

        // Load user data from Firestore
        const result = await FirestoreService.getUserData(firebaseUser.uid);

        if (result.success && result.data) {
          console.log('📦 Loaded user data from Firestore');
          console.log('📊 Data contents:', {
            hasProfile: !!result.data.profile,
            hasTrainingPlan: !!result.data.trainingPlan,
            dataKeys: Object.keys(result.data)
          });

          if (result.data.profile) {
            console.log('✅ Setting user profile');
            setUserProfile(result.data.profile);
          } else {
            console.log('⚠️ No profile found in data');
          }

          if (result.data.trainingPlan) {
            console.log('✅ Setting training plan');
            setTrainingPlan(result.data.trainingPlan);
          } else {
            console.log('⚠️ No training plan found in data');
          }
        } else {
          console.log('ℹ️ No saved data found - new user');
        }
      } else {
        // User logged out - clear everything
        setUser(null);
        setUserProfile(null);
        setTrainingPlan(null);

        // Clear localStorage on logout
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('runeq_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }

      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Helper function to clear all localStorage items
  const clearLocalStorage = () => {
    // Remove all RunEQ localStorage items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('runeq_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('🧹 Cleared localStorage:', keysToRemove);
  };

  const handleOnboardingComplete = async (profile, plan) => {
    console.log('🎯 Onboarding complete - received data:', {
      hasProfile: !!profile,
      hasPlan: !!plan,
      planKeys: plan ? Object.keys(plan) : []
    });

    setUserProfile(profile);
    setTrainingPlan(plan);

    // Clear old localStorage data before saving new plan
    clearLocalStorage();

    // Save to Firestore
    if (user) {
      console.log('💾 Saving profile to Firestore...', profile);
      const profileResult = await FirestoreService.saveUserProfile(user.uid, profile);
      if (!profileResult.success) {
        console.error('❌ Failed to save profile:', profileResult.error);
        alert('Warning: Failed to save your profile. Please try again or contact support.');
        throw new Error('Profile save failed: ' + profileResult.error);
      }

      console.log('💾 Saving training plan to Firestore...', plan);
      const planResult = await FirestoreService.saveTrainingPlan(user.uid, plan);
      if (!planResult.success) {
        console.error('❌ Failed to save training plan:', planResult.error);
        alert('Warning: Failed to save your training plan. Please try again or contact support.');
        throw new Error('Training plan save failed: ' + planResult.error);
      }

      console.log('✅ Successfully saved all data to Firestore');
    } else {
      console.error('❌ No user found - cannot save to Firestore');
      throw new Error('User not authenticated');
    }
  };

  // Helper function to clear all data and logout
  const clearAllData = async () => {
    if (user) {
      await FirestoreService.clearUserData(user.uid);
    }

    setUserProfile(null);
    setTrainingPlan(null);

    // Clear ALL localStorage
    clearLocalStorage();

    // Sign out
    await signOut(auth);

    window.location.href = '/';
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
      }}>
        <div style={{ textAlign: 'center', color: '#00D4FF' }}>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  // Show Auth screen if not logged in
  if (!user) {
    return <Auth />;
  }

  // Check if user account is pending approval
  if (userProfile?.approvalStatus === 'pending') {
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
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⏳</div>
          <h1 style={{ color: '#00D4FF', marginBottom: '16px' }}>Account Pending Approval</h1>
          <p style={{ color: '#AAAAAA', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '24px' }}>
            Thank you for signing up! Your account is currently pending approval.
          </p>
          <p style={{ color: '#AAAAAA', fontSize: '0.95rem', lineHeight: '1.6' }}>
            You'll receive an email at <strong style={{ color: '#FFFFFF' }}>{userProfile?.email}</strong> once your account has been approved.
            This usually takes less than 24 hours.
          </p>
          <button
            onClick={async () => {
              await signOut(auth);
              window.location.href = '/';
            }}
            style={{
              marginTop: '32px',
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <div className="App">
        <Routes>
          <Route
            path="/"
            element={
              trainingPlan ?
                <Navigate to="/dashboard" replace /> :
                <LandingPage />
            }
          />
          <Route
            path="/onboarding"
            element={
              trainingPlan ?
                <Navigate to="/dashboard" replace /> :
                <OnboardingFlow
                  onComplete={handleOnboardingComplete}
                />
            }
          />
          <Route
            path="/preview"
            element={
              trainingPlan ?
                <TrainingPlanPreview
                  userProfile={userProfile}
                  trainingPlan={trainingPlan}
                /> :
                <Navigate to="/onboarding" replace />
            }
          />
          <Route
            path="/dashboard"
            element={
              trainingPlan ?
                <Dashboard
                  userProfile={userProfile}
                  trainingPlan={trainingPlan}
                  clearAllData={clearAllData}
                /> :
                <Navigate to="/onboarding" replace />
            }
          />
          <Route
            path="/workout/:day"
            element={
              <WorkoutDetail
                userProfile={userProfile}
                trainingPlan={trainingPlan}
              />
            }
          />
          <Route
            path="/admin/approvals"
            element={<AdminApproval />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;