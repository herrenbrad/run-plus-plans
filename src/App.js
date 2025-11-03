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

          if (result.data.profile) {
            setUserProfile(result.data.profile);
          }

          if (result.data.trainingPlan) {
            setTrainingPlan(result.data.trainingPlan);
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
    setUserProfile(profile);
    setTrainingPlan(plan);

    // Clear old localStorage data before saving new plan
    clearLocalStorage();

    // Save to Firestore
    if (user) {
      await FirestoreService.saveUserProfile(user.uid, profile);
      await FirestoreService.saveTrainingPlan(user.uid, plan);
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;