import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import './App.css';

// Firebase
import { auth, db } from './firebase/config';
import FirestoreService from './services/FirestoreService';
import logger from './utils/logger';

// Components
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import OnboardingFlow from './components/OnboardingFlow';
import PlanWelcomeScreen from './components/PlanWelcomeScreen';
import TrainingPlanPreview from './components/TrainingPlanPreview';
import Dashboard from './components/Dashboard';
import WorkoutDetail from './components/WorkoutDetail';
import AdminApproval from './components/AdminApproval';
import PhaseMigrationAdmin from './components/PhaseMigrationAdmin';
import StravaCallback from './components/StravaCallback';
import DevMode from './components/DevMode';
import WorkoutTestZone from './components/WorkoutTestZone';
import { ToastProvider, useToast } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

// Scroll to top component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Internal App component that uses hooks
function AppContent() {
  const toast = useToast();
  const APP_VERSION = 'v2.0-approval-fix-' + new Date().toISOString();
  logger.log('🚀 APP VERSION:', APP_VERSION);
  logger.log('📅 Build timestamp:', new Date().toISOString());

  const [user, setUser] = useState(null); // Firebase user
  const [userProfile, setUserProfile] = useState(null);
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [completedWorkouts, setCompletedWorkouts] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for auth

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      logger.log('🔐 Auth state changed:', firebaseUser ? 'Logged in' : 'Logged out');

      if (firebaseUser) {
        setUser(firebaseUser);
        // Don't load data here - let the real-time listener handle it
        logger.log('✅ User authenticated, real-time listener will load data');
      } else {
        // User logged out - clear everything
        setUser(null);
        setUserProfile(null);
        setTrainingPlan(null);
        setCompletedWorkouts(null);

        // Clear localStorage on logout
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('runeq_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Real-time listener for user data changes (especially approval status)
  useEffect(() => {
    if (!user) return;

    logger.log('👂 Setting up real-time listener for user:', user.uid);
    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
      logger.log('🔄 Snapshot received:', { exists: docSnapshot.exists() });

      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        logger.log('📦 User document data:', {
          hasProfile: !!data.profile,
          hasTrainingPlan: !!data.trainingPlan,
          hasEmail: !!data.email,
          approvalStatus: data.approvalStatus,
          allKeys: Object.keys(data)
        });

        // Merge root-level fields with profile data
        const completeProfile = {
          ...data.profile,
          email: data.email,
          displayName: data.displayName,
          approvalStatus: data.approvalStatus,
          createdAt: data.createdAt,
          approvedAt: data.approvedAt,
          approvedBy: data.approvedBy,
          // Strava connection data
          stravaConnected: data.stravaConnected,
          stravaAccessToken: data.stravaAccessToken,
          stravaRefreshToken: data.stravaRefreshToken,
          stravaTokenExpiresAt: data.stravaTokenExpiresAt,
          stravaAthleteId: data.stravaAthleteId,
          stravaAthleteName: data.stravaAthleteName,
          stravaConnectedAt: data.stravaConnectedAt,
          stravaLastSync: data.stravaLastSync
        };

        // MIGRATION: Auto-approve ALL existing users without approvalStatus
        // This is a one-time migration - new signups will have approvalStatus set in Auth.js
        if (!completeProfile.approvalStatus) {
          logger.log('🔄 [Realtime] Migrating existing user without approvalStatus - auto-approving');
          completeProfile.approvalStatus = 'approved';

          updateDoc(userRef, {
            approvalStatus: 'approved',
            approvedAt: new Date(),
            approvedBy: 'auto-migration-all-existing-users'
          }).catch(err => console.error('Failed to migrate user:', err));
        }

        logger.log('✅ Setting userProfile with approvalStatus:', completeProfile.approvalStatus);

        // Check if approval status changed from pending to approved
        if (userProfile?.approvalStatus === 'pending' && completeProfile.approvalStatus === 'approved') {
          logger.log('🎉 User approved! Showing notification...');
          toast.success('Great news! Your account has been approved. Welcome to Run+ Plans!', 8000);
        }

        setUserProfile(completeProfile);

        if (data.trainingPlan) {
          logger.log('✅ Setting training plan');
          setTrainingPlan(data.trainingPlan);
        }

        // Load completedWorkouts from root level (Strava sync writes here)
        if (data.completedWorkouts) {
          logger.log('✅ Setting completed workouts:', Object.keys(data.completedWorkouts).length, 'workouts');
          setCompletedWorkouts(data.completedWorkouts);
        } else {
          setCompletedWorkouts({});
        }
      } else {
        logger.log('⚠️ User document does not exist yet - waiting for creation');
      }

      // Loading complete - either found data or confirmed no document
      setLoading(false);
    }, (error) => {
      console.error('❌ Error listening to user document:', error);
      setLoading(false);
    });

    return () => {
      logger.log('🔇 Cleaning up real-time listener');
      unsubscribe();
    };
  }, [user, userProfile?.approvalStatus]);

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
    logger.log('🧹 Cleared localStorage:', keysToRemove);
  };

  const handleOnboardingComplete = async (profile, plan) => {
    logger.log('🎯 Onboarding complete - received data:', {
      hasProfile: !!profile,
      hasPlan: !!plan,
      planKeys: plan ? Object.keys(plan) : []
    });

    // Debug plan structure
    if (plan && plan.weeks && plan.weeks[0]) {
      logger.log('📊 First week structure:', {
        weekNumber: plan.weeks[0].weekNumber,
        totalMileage: plan.weeks[0].totalMileage,
        workoutsCount: plan.weeks[0].workouts?.length,
        firstWorkout: plan.weeks[0].workouts?.[0]
      });
    }

    setUserProfile(profile);
    setTrainingPlan(plan);

    // Clear old localStorage data before saving new plan
    clearLocalStorage();

    // Save to Firestore
    if (user) {
      logger.log('💾 Saving profile to Firestore...', profile);
      const profileResult = await FirestoreService.saveUserProfile(user.uid, profile);
      if (!profileResult.success) {
        console.error('❌ Failed to save profile:', profileResult.error);
        toast.error('Warning: Failed to save your profile. Please try again or contact support.', 10000);
        throw new Error('Profile save failed: ' + profileResult.error);
      }

      // CRITICAL: Validate plan has weeks array before saving
      if (!plan.weeks || plan.weeks.length === 0) {
        logger.error('❌ CRITICAL: Plan has no weeks array! Cannot save invalid plan.');
        logger.error('   Plan keys:', Object.keys(plan));
        logger.error('   Plan structure:', {
          hasWeeks: !!plan.weeks,
          weeksLength: plan.weeks?.length,
          hasCoaching: !!(plan.aiCoachingAnalysis || plan.fullPlanText)
        });
        toast.error('Plan generation failed - weeks array is missing. Please try again or contact support.', 10000);
        throw new Error('Plan structure is invalid - weeks array is missing');
      }

      logger.log('💾 Saving training plan to Firestore...', {
        weeksCount: plan.weeks.length,
        hasCoaching: !!(plan.aiCoachingAnalysis || plan.fullPlanText)
      });
      const planResult = await FirestoreService.saveTrainingPlan(user.uid, plan);
      if (!planResult.success) {
        console.error('❌ Failed to save training plan:', planResult.error);
        toast.error('Warning: Failed to save your training plan. Please try again or contact support.', 10000);
        throw new Error('Training plan save failed: ' + planResult.error);
      }

      logger.log('✅ Successfully saved all data to Firestore');
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
  logger.log('🔍 Checking approval status:', {
    hasUserProfile: !!userProfile,
    approvalStatus: userProfile?.approvalStatus,
    willShowPendingScreen: userProfile?.approvalStatus === 'pending'
  });

  if (userProfile?.approvalStatus === 'pending') {
    logger.log('🚫 Showing pending approval screen');
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
            path="/auth"
            element={<Auth />}
          />
          <Route
            path="/"
            element={
              user ? (
                trainingPlan ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/onboarding"
            element={
              trainingPlan ?
                <Navigate to="/welcome" replace /> :
                <OnboardingFlow
                  onComplete={handleOnboardingComplete}
                />
            }
          />
          <Route
            path="/welcome"
            element={
              trainingPlan ?
                <PlanWelcomeScreen 
                  trainingPlan={trainingPlan} 
                  userProfile={userProfile}
                  onPlanUpdated={handleOnboardingComplete}
                /> :
                <Navigate to="/onboarding" replace />
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
                  completedWorkouts={completedWorkouts}
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
          <Route
            path="/admin/migrate-phases"
            element={<PhaseMigrationAdmin />}
          />
          <Route
            path="/dev"
            element={<DevMode />}
          />
          <Route
            path="/test-zone"
            element={<WorkoutTestZone />}
          />
          <Route
            path="/auth/strava/callback"
            element={<StravaCallback />}
          />
        </Routes>
      </div>
    </Router>
  );
}

// Main App component with providers
function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;