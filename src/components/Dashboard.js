import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import FirestoreService from '../services/FirestoreService';
import { PaceCalculator } from '../lib/pace-calculator.js';
import WorkoutOptionsService from '../services/WorkoutOptionsService.js';
import { generateWeekWorkouts } from '../utils/workoutGeneration.js';
import SomethingElseModal from './SomethingElseModal';
import ManagePlanModal from './ManagePlanModal';
import InjuryRecoveryModal from './InjuryRecoveryModal';
import PlanDebugTool from './PlanDebugTool';
import WorkoutCard from './WorkoutCard';
import DashboardHeader from './DashboardHeader';
import DashboardCoaching from './DashboardCoaching';
import { formatTrainingSystem, formatEquipmentName, titleCase } from '../utils/typography';
// Calorie calculator removed - weight significantly affects calories and we don't collect weight data
// import { calorieCalculator } from '../lib/calorie-calculator.js';
import StravaService from '../services/StravaService';
import logger from '../utils/logger';
import { useToast } from './Toast';
import { calculateCurrentWeek, getWeekDateRange, getWorkoutDate, formatWorkoutDate, isWorkoutInPast, isWorkoutBeforePlanStart } from '../utils/weekCalculations';
import { getNormalizedWorkoutType, isLongRun, getWorkoutDistance, cleanWorkoutText, formatWorkoutTypeName } from '../utils/workoutHelpers';
import useStravaSync from '../hooks/useStravaSync';
import useWorkoutCompletion from '../hooks/useWorkoutCompletion';
import useWorkoutActions from '../hooks/useWorkoutActions';
import './Dashboard.css';

function Dashboard({ userProfile, trainingPlan, completedWorkouts, clearAllData }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [showManagePlanModal, setShowManagePlanModal] = useState(false);
  const [showInjuryRecoveryModal, setShowInjuryRecoveryModal] = useState(false);
  const [showDebugTool, setShowDebugTool] = useState(false);
  
  // Week calculation functions now imported from utils/weekCalculations.js
  // Using wrapper functions to maintain same API within component
  const calculateCurrentWeekLocal = () => calculateCurrentWeek(trainingPlan);
  const getWeekDateRangeLocal = (weekNumber) => getWeekDateRange(weekNumber, trainingPlan);
  const getWorkoutDateLocal = (weekNumber, dayName) => {
    const date = getWorkoutDate(weekNumber, dayName, trainingPlan);
    return date ? formatWorkoutDate(date) : null;
  };

  // Helper functions now imported from workoutHelpers.js and weekCalculations.js
  // Date helpers now imported from weekCalculations.js
  // Stats calculations now imported from statsCalculations.js

  // Load current week from localStorage or calculate it
  const [currentWeek, setCurrentWeek] = useState(() => {
    // ALWAYS calculate current week based on start date for new plans
    const calculatedWeek = calculateCurrentWeekLocal();

    const savedWeek = localStorage.getItem('runeq_currentWeek');
    const savedStartDate = localStorage.getItem('runeq_startDate');

    // If plan start date changed, use calculated week (new plan)
    if (trainingPlan?.planOverview?.startDate !== savedStartDate) {
      logger.log('📅 New plan detected - using calculated week:', calculatedWeek);
      localStorage.setItem('runeq_startDate', trainingPlan?.planOverview?.startDate);
      return calculatedWeek;
    }

    // Otherwise use saved week if valid
    if (savedWeek) {
      const weekNum = parseInt(savedWeek, 10);
      if (weekNum >= 1 && weekNum <= (trainingPlan?.planOverview?.totalWeeks || 12)) {
        return weekNum;
      }
    }

    return calculatedWeek;
  });

  // Save current week to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('runeq_currentWeek', currentWeek.toString());
  }, [currentWeek]);

  const [modifiedWorkouts, setModifiedWorkouts] = useState({});
  const [workoutCompletions, setWorkoutCompletions] = useState({}); // Track workout completions for instant UI updates
  const [showBetaSetup, setShowBetaSetup] = useState(false); // Show beta code setup modal

  // Load modified workouts from localStorage on component mount
  useEffect(() => {
    try {
      const savedModifiedWorkouts = localStorage.getItem('runeq_modifiedWorkouts');
      logger.log('📦 Dashboard loading from localStorage:', savedModifiedWorkouts);
      if (savedModifiedWorkouts) {
        const parsed = JSON.parse(savedModifiedWorkouts);
        logger.log('📦 Dashboard parsed data:', parsed);
        setModifiedWorkouts(parsed);
      }
      setHasLoaded(true); // Mark as loaded after attempting to load data
    } catch (error) {
      console.warn('Error loading modified workouts:', error);
      localStorage.removeItem('runeq_modifiedWorkouts');
      setHasLoaded(true); // Still mark as loaded even if there was an error
    }
  }, []);

  // Load modified workouts from Firestore (syncs across devices)
  useEffect(() => {
    const loadModifiedWorkoutsFromFirestore = async () => {
      if (auth.currentUser) {
        try {
          const result = await FirestoreService.getModifiedWorkouts(auth.currentUser.uid);
          if (result.success && result.data && Object.keys(result.data).length > 0) {
            logger.log('📦 Loaded modified workouts from Firestore:', result.data);
            setModifiedWorkouts(result.data);
            // Update localStorage with Firestore data (authoritative source)
            localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(result.data));
          }
        } catch (error) {
          console.warn('Error loading modified workouts from Firestore:', error);
        }
      }
    };

    loadModifiedWorkoutsFromFirestore();
  }, [auth.currentUser?.uid]);

  // Save modified workouts to localStorage whenever they change (but not on initial load)
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (hasLoaded) {
      try {
        logger.log('💾 Dashboard saving to localStorage:', modifiedWorkouts);
        localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(modifiedWorkouts));
      } catch (error) {
        console.warn('Error saving modified workouts:', error);
      }
    }
  }, [modifiedWorkouts, hasLoaded]);

  // Load workout completion status from Firebase completedWorkouts object
  useEffect(() => {
    if (!completedWorkouts) {
      setWorkoutCompletions({});
      return;
    }

    logger.log('📦 Dashboard: Loading completions from Firebase:', completedWorkouts);
    setWorkoutCompletions(completedWorkouts);
  }, [completedWorkouts]);

  // Strava sync hook
  const { stravaSyncing, handleManualStravaSync, handleDisconnectStrava } = useStravaSync({
    userProfile,
    trainingPlan,
    currentWeek
  });

  // Workout completion hook
  const {
    completionModal,
    setCompletionModal,
    handleMarkComplete,
    handleSaveCompletion,
    handleCloseCompletionModal
  } = useWorkoutCompletion({
    currentWeek,
    workoutCompletions,
    setWorkoutCompletions
  });

  // Workout actions hook (replaces all workout modification handlers)
  const workoutActions = useWorkoutActions({
    currentWeek,
    userProfile,
    modifiedWorkouts,
    setModifiedWorkouts,
    toast
  });

  // DISABLED: Auto-sync was interfering with testing. Use "Sync Now" button instead.
  // Auto-sync Strava activities on dashboard load
  // useEffect(() => {
  //   const syncStrava = async () => {
  //     if (!userProfile?.stravaConnected || !auth.currentUser || !trainingPlan) {
  //       return;
  //     }

  //     // Check if we've synced recently (within last hour)
  //     const lastSync = localStorage.getItem('runeq_stravaLastSync');
  //     if (lastSync) {
  //       const lastSyncTime = new Date(lastSync);
  //       const now = new Date();
  //       const hoursSinceSync = (now - lastSyncTime) / (1000 * 60 * 60);

  //       if (hoursSinceSync < 1) {
  //         logger.log('⏭️ Skipping Strava sync - synced recently');
  //         return;
  //       }
  //     }

  //     logger.log('🔄 Auto-syncing Strava activities...');

  //     try {
  //       const result = await StravaSyncService.syncActivities(
  //         auth.currentUser.uid,
  //         userProfile,
  //         trainingPlan,
  //         currentWeek
  //       );

  //       if (result.success) {
  //         logger.log('✅ Strava sync successful:', result);

  //         // Update last sync time
  //         localStorage.setItem('runeq_stravaLastSync', new Date().toISOString());

  //         // Refresh the page to show updated completions
  //         if (result.workoutsCompleted > 0) {
  //           logger.log(`🔄 ${result.workoutsCompleted} workouts auto-completed - refreshing...`);
  //           window.location.reload();
  //         }
  //       } else {
  //         console.warn('⚠️ Strava sync failed:', result.error);
  //       }
  //     } catch (error) {
  //       console.error('❌ Strava sync error:', error);
  //     }
  //   };

  //   // Run sync after a short delay to avoid blocking initial render
  //   const syncTimeout = setTimeout(syncStrava, 2000);

  //   return () => clearTimeout(syncTimeout);
  // }, [userProfile?.stravaConnected, auth.currentUser, trainingPlan, currentWeek]);

  // Get current week data from training plan or fallback
  const getCurrentWeekData = () => {
    // If we're before training starts (currentWeek = 0), show pre-training message
    if (currentWeek <= 0) {
      // FIXED: Append T00:00:00 to parse as local timezone, not UTC
      const startDate = new Date(trainingPlan?.planOverview?.startDate + 'T00:00:00');
      return {
        week: 0,
        weekDates: { displayText: `Training starts ${startDate.toLocaleDateString()}` },
        phase: 'preparation',
        totalMileage: 0,
        workouts: [{
          day: 'Preparation',
          type: 'preparation',
          workout: {
            name: 'Training Starts Soon!',
            description: `Your RunEQ training plan will begin on ${startDate.toLocaleDateString()}. Get ready!`
          },
          focus: 'Preparation',
          completed: false
        }]
      };
    }

    // Using working fallback system - all RealWorld crap removed

    // First try to use training plan data
    if (trainingPlan && trainingPlan.weeks && trainingPlan.weeks.length > 0) {
      const weekData = trainingPlan.weeks[currentWeek - 1];
      if (weekData && weekData.workouts && weekData.workouts.length > 0) {
        logger.log('Using training plan data for week', currentWeek, 'with', weekData.workouts.length, 'workouts');
        // Check for brick workouts in the data
        weekData.workouts.forEach(workout => {
          if (workout.type === 'brickLongRun') {
            logger.log('Found brick workout:', workout.day, workout.workout?.name);
          }
        });
        
        // CRITICAL: Check for injury recovery and set weekType if missing
        // This ensures injury recovery UI and coaching are displayed correctly
        if (trainingPlan.injuryRecoveryActive && trainingPlan.injuryRecoveryInfo) {
          const { startWeek, endWeek, returnWeek } = trainingPlan.injuryRecoveryInfo;
          
          // If weekType is not set, determine it based on current week
          if (!weekData.weekType) {
            if (currentWeek >= startWeek && currentWeek <= endWeek) {
              weekData.weekType = 'injury-recovery';
              logger.log(`🏥 Week ${currentWeek} marked as injury-recovery (${startWeek}-${endWeek})`);
            } else if (currentWeek === returnWeek) {
              weekData.weekType = 'return-to-running';
              logger.log(`🎯 Week ${currentWeek} marked as return-to-running`);
            }
          }
        }
        
        return weekData;
      }
    }

    // CRITICAL: If weeks array is empty but we have AI coaching analysis, the plan structure is missing
    // This is a data structure issue - the plan needs to be regenerated
    if (trainingPlan && (trainingPlan.aiCoachingAnalysis || trainingPlan.fullPlanText) && (!trainingPlan.weeks || trainingPlan.weeks.length === 0)) {
      logger.error('⚠️ CRITICAL: Training plan has AI coaching but no weeks array!');
      logger.error('   This means the plan structure was not saved correctly.');
      logger.error('   The coach\'s analysis shows the correct workouts, but they\'re not in the weeks array.');
      logger.error('   Solution: User needs to regenerate the plan or we need to parse the coaching text.');
      
      // Don't show toast during render - it causes React warnings
      // The fallback workouts will be used instead
    }

    // Fallback to generated workouts if training plan is empty/missing
    logger.log('⚠️ Falling back to generated workouts for week', currentWeek, '- these may not match your AI-generated plan!');
    return {
      week: currentWeek,
      weekDates: { displayText: `Week ${currentWeek}` },
      phase: 'base',
      totalMileage: 15,
      workouts: generateWeekWorkouts(currentWeek, userProfile)
    };
  };

  const currentWeekData = getCurrentWeekData();

  const getWorkoutTypeColor = (type) => {
    const colors = {
      tempo: '#4299e1',           // Blue - steady effort
      intervals: '#e53e3e',       // Red - high intensity
      hills: '#38a169',           // Green - strength/power
      longRun: '#805ad5',         // Purple - endurance
      bike: '#ff9500',            // Orange - pure bike workouts
      brick: '#ff6b6b',           // Coral - brick workouts (run+bike combo)
      brickLongRun: '#ff6b6b',    // Coral - brick workouts (run+bike combo)
      easy: '#718096',            // Gray - recovery
      rest: '#a0aec0',            // Light gray - rest
      rest_or_xt: '#22c55e',      // Green - rest or cross-train (user's choice)
      preparation: '#ffd700'      // Gold - preparation phase
    };
    return colors[type] || '#718096';
  };

  const handleWorkoutClick = (workout) => {
    if (workout.type === 'rest' || workout.type === 'rest_or_xt' || workout.type === 'preparation') return;
    
    // Create safe day identifier
    const dayId = (workout.day || 'unknown').toLowerCase().replace(/\s+/g, '-');
    
    navigate(`/workout/${dayId}`, {
      state: {
        workout: workout,
        userProfile: {
          ...userProfile,
          // Include VDOT paces and track intervals from training plan
          paces: trainingPlan?.paces,
          trackIntervals: trainingPlan?.trackIntervals
        },
        currentWeek: currentWeek,
        weekData: currentWeekData
      }
    });
  };

  // All workout action handlers are now provided by useWorkoutActions hook
  // Destructure for convenience
  const {
    somethingElseModal,
    showBrickOptions,
    showingOptions,
    workoutOptions,
    selectedOptions,
    handleSomethingElse,
    handleCloseSomethingElse,
    handleAddWorkout,
    handleRemoveWorkout,
    handleWorkoutReplacement,
    handleSwapWorkouts,
    handleMoveWorkout,
    handleShowBrickOptions,
    handleHideBrickOptions,
    handleMakeBrick,
    handleMakeRegularRun,
    handleShowOptions,
    handleHideOptions,
    handleSelectOption,
    handleConfirmSelection,
    handleCancelSelection
  } = workoutActions;

  // Beta code setup handler
  const handleSetupBetaCodes = async () => {
    const BETA_CODES = [
      'VVVFRS', 'SVTQHH', 'EN88AQ', 'H8RXZ6', '69JUVC',
      'XJXHZM', '2EHTS9', 'ZWNVSS', 'KFCHAK', '8E685H'
    ];

    try {
      let successCount = 0;
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');

      for (const code of BETA_CODES) {
        const docRef = doc(db, 'betaCodes', code);
        await setDoc(docRef, {
          code: code,
          used: false,
          usedBy: null,
          usedAt: null,
          createdAt: serverTimestamp(),
          createdFor: '',
          notes: ''
        });
        successCount++;
      }

      toast.success(`Success! All ${successCount} beta codes added to Firestore! Check Firebase Console → Firestore → betaCodes`, 8000);
      setShowBetaSetup(false);
    } catch (error) {
      console.error('Error adding beta codes:', error);
      toast.error(`Error adding beta codes: ${error.message}. Make sure Firestore security rules allow writes for authenticated users.`, 10000);
    }
  };

  // Function to get workouts for a day (supports multiple workouts per day)
  const getWorkouts = (originalWorkout) => {
    const workouts = [];
    const dayKey = `${currentWeek}-${originalWorkout.day}`;

    // Check for multiple workouts (indexed: 0, 1, 2, ...)
    let index = 0;
    let foundWorkout = true;

    while (foundWorkout) {
      const workoutKey = `${dayKey}-${index}`;
      const modifiedWorkout = modifiedWorkouts[workoutKey];

      if (modifiedWorkout) {
        // Found a modified workout at this index
        const completionData = workoutCompletions[workoutKey];
        workouts.push({
          ...modifiedWorkout,
          completed: completionData?.completed || false,
          completedAt: completionData?.completedAt || null,
          workoutIndex: index
        });
        index++;
      } else if (index === 0) {
        // No modified workout at index 0, use original
        const completionData = workoutCompletions[workoutKey];
        workouts.push({
          ...originalWorkout,
          completed: completionData?.completed || false,
          completedAt: completionData?.completedAt || null,
          workoutIndex: 0
        });
        foundWorkout = false;
      } else {
        // No more workouts found
        foundWorkout = false;
      }
    }

    return workouts;
  };

  // Legacy function for backward compatibility (returns first workout only)
  const getWorkout = (originalWorkout) => {
    const workouts = getWorkouts(originalWorkout);
    return workouts[0] || originalWorkout;
  };

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
        <div className="dashboard-pending-approval" style={{
          maxWidth: '500px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div className="pending-emoji" style={{ fontSize: '4rem', marginBottom: '20px' }}>⏳</div>
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
              navigate('/');
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
    <>
      <div style={{ minHeight: '100vh' }}>
        <DashboardHeader
          currentWeek={currentWeek}
          setCurrentWeek={setCurrentWeek}
          trainingPlan={trainingPlan}
          currentWeekData={currentWeekData}
          workoutCompletions={workoutCompletions}
          getWorkouts={getWorkouts}
          userProfile={userProfile}
          setShowManagePlanModal={setShowManagePlanModal}
          setShowInjuryRecoveryModal={setShowInjuryRecoveryModal}
          setShowDebugTool={setShowDebugTool}
          clearAllData={clearAllData}
          toast={toast}
        />

      <div className="container dashboard-container" style={{ padding: '20px 16px' }}>
        {/* Current Training System */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 className="dashboard-section-header" style={{ margin: '0 0 4px 0', color: '#00D4FF' }}>Current Training System</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🔬</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                {formatTrainingSystem(trainingPlan?.planOverview?.trainingPhilosophy || userProfile?.trainingPhilosophy || 'Zone-Based Training')}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#00D4FF' }}>
              Week {currentWeek} of {trainingPlan?.planOverview?.totalWeeks || 16}
              {getWeekDateRangeLocal(currentWeek) && ` • ${getWeekDateRangeLocal(currentWeek)}`}
              {' • Periodized training system'}
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px', borderRadius: '6px' }}>
              <strong>Focus:</strong> {currentWeekData.phase ? currentWeekData.phase.charAt(0).toUpperCase() + currentWeekData.phase.slice(1) + ' Phase' : 'Periodized Training'}
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px', borderRadius: '6px' }}>
              <strong>Current Phase:</strong> {(currentWeekData.phase || 'base').toUpperCase()}
            </div>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="dashboard-section-header" style={{ margin: 0 }}>Week Progress</h2>
            <span className="badge badge-info">
              {(() => {
                // Use getWorkout() to get completion status from both Firestore AND local state
                const completedCount = currentWeekData.workouts.filter(w => getWorkout(w).completed).length;
                const totalCount = currentWeekData.workouts.filter(w => w.type !== 'rest').length;
                return `${completedCount}/${totalCount} completed`;
              })()}
            </span>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(() => {
                  const completedCount = currentWeekData.workouts.filter(w => getWorkout(w).completed).length;
                  const totalCount = currentWeekData.workouts.filter(w => w.type !== 'rest').length;
                  return (completedCount / totalCount) * 100;
                })()}%`
              }}
            ></div>
          </div>
        </div>

        {/* Climate Alert (if applicable) */}
        {userProfile.climate === 'hot_humid' && (
          <div className="card" style={{ marginBottom: '20px', background: 'rgba(255, 184, 0, 0.1)', border: '1px solid rgba(255, 184, 0, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="dashboard-alert-emoji" style={{ fontSize: '1.5rem' }}>🌡️</span>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: '#c05621' }}>Climate Adjustment Active</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#744210' }}>
                  Paces automatically adjusted for {userProfile.climate.replace('_', ' ')} conditions.
                  Add 30-60 seconds per mile to easy runs when very humid.
                </p>
              </div>
            </div>
          </div>
        )}

        <DashboardCoaching
          trainingPlan={trainingPlan}
          currentWeekData={currentWeekData}
          userProfile={userProfile}
        />

        {/* Daily Workouts */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h2 className="dashboard-section-header" style={{ margin: 0 }}>This Week's Workouts</h2>
            <p style={{ margin: '8px 0 0 0', color: '#666' }}>
              {userProfile.standUpBikeType && 'Equipment-specific workouts marked with ⚡'}
            </p>
          </div>
          
          <div className="dashboard-workout-list" style={{ display: 'grid', gap: '16px' }}>
            {currentWeekData.workouts
              .filter(originalWorkout =>
                !isWorkoutInPast(currentWeek, originalWorkout.day, trainingPlan) &&
                !isWorkoutBeforePlanStart(currentWeek, originalWorkout.day, trainingPlan)
              )
              .map((originalWorkout) => {
              const workouts = getWorkouts(originalWorkout);
              // Add dates to workouts
              const workoutsWithDates = workouts.map(w => ({
                ...w,
                date: getWorkoutDateLocal(currentWeek, originalWorkout.day)
              }));
              return (
              <div key={originalWorkout.day} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {workoutsWithDates.map((workout, workoutIdx) => (
              <WorkoutCard
                key={`${originalWorkout.day}-${workoutIdx}`}
                workout={workout}
                workoutIdx={workoutIdx}
                workouts={workouts}
                currentWeek={currentWeek}
                userProfile={userProfile}
                workoutCompletions={workoutCompletions}
                onWorkoutClick={handleWorkoutClick}
                onMarkComplete={handleMarkComplete}
                onSomethingElse={handleSomethingElse}
                onShowBrickOptions={handleShowBrickOptions}
                onHideBrickOptions={handleHideBrickOptions}
                onMakeBrick={handleMakeBrick}
                onMakeRegularRun={handleMakeRegularRun}
                onShowOptions={handleShowOptions}
                onHideOptions={handleHideOptions}
                onSelectOption={handleSelectOption}
                onConfirmSelection={handleConfirmSelection}
                onCancelSelection={handleCancelSelection}
                onRemoveWorkout={(w) => handleRemoveWorkout(originalWorkout, workoutIdx)}
                showBrickOptions={showBrickOptions}
                showingOptions={showingOptions}
                workoutOptions={workoutOptions}
                selectedOptions={selectedOptions}
              />
              ))}

              {/* Add Workout Button */}
              <button
                className="btn dashboard-add-workout-button"
                style={{
                  width: '100%',
                  fontSize: '0.9rem',
                  padding: '12px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  border: '2px dashed rgba(34, 197, 94, 0.3)',
                  fontWeight: '600',
                  marginTop: workouts.length > 1 ? '0' : '8px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddWorkout(originalWorkout);
                }}
              >
                ➕ Add Second Workout (Two-a-Day)
              </button>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Something Else Modal */}
      <SomethingElseModal
        isOpen={somethingElseModal.isOpen}
        onClose={handleCloseSomethingElse}
        currentWorkout={somethingElseModal.workout}
        userProfile={userProfile}
        trainingPlan={trainingPlan}
        onWorkoutSelect={handleWorkoutReplacement}
        weather={null} // TODO: Add weather API integration
        mode={somethingElseModal.mode || 'replace'} // Pass mode to modal
      />

      {/* Manage Plan Modal */}
      <ManagePlanModal
        isOpen={showManagePlanModal}
        onClose={() => setShowManagePlanModal(false)}
        userProfile={userProfile}
        trainingPlan={trainingPlan}
        currentWeek={currentWeek}
      />

      {/* Injury Recovery Modal */}
      <InjuryRecoveryModal
        isOpen={showInjuryRecoveryModal}
        onClose={() => setShowInjuryRecoveryModal(false)}
        userProfile={userProfile}
        trainingPlan={trainingPlan}
        currentWeek={currentWeek}
      />

      {/* Plan Debug Tool */}
      {showDebugTool && (
        <PlanDebugTool
          userProfile={userProfile}
          trainingPlan={trainingPlan}
          onClose={() => setShowDebugTool(false)}
        />
      )}

      {/* Workout Completion Modal */}
      {completionModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#FFFFFF', fontSize: '24px' }}>
              Log Workout: {completionModal.workout?.workout?.name || completionModal.workout?.name || 'Workout'}
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#CCCCCC', fontSize: '14px' }}>
                Distance (miles)
              </label>
              <input
                type="number"
                step="0.1"
                value={completionModal.distance || ''}
                onChange={(e) => setCompletionModal({ ...completionModal, distance: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#CCCCCC', fontSize: '14px' }}>
                Duration (minutes)
              </label>
              <input
                type="number"
                value={completionModal.duration || ''}
                onChange={(e) => setCompletionModal({ ...completionModal, duration: parseInt(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#CCCCCC', fontSize: '14px' }}>
                Notes (optional)
              </label>
              <textarea
                value={completionModal.notes || ''}
                onChange={(e) => setCompletionModal({ ...completionModal, notes: e.target.value })}
                placeholder="How did it feel? Any observations?"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  minHeight: '100px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSaveCompletion}
                style={{
                  flex: 1,
                  padding: '15px',
                  background: '#00D4FF',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
              <button
                onClick={handleCloseCompletionModal}
                style={{
                  padding: '15px 30px',
                  background: 'rgba(156, 163, 175, 0.1)',
                  color: '#9CA3AF',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beta Code Setup Modal - Admin Only */}
      {showBetaSetup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            border: '2px solid rgba(0, 212, 255, 0.3)'
          }}>
            <h2 style={{ color: '#00D4FF', marginTop: 0, marginBottom: '20px' }}>
              Beta Code Setup
            </h2>
            <p style={{ color: '#CCCCCC', marginBottom: '20px' }}>
              This feature is for admin use only.
            </p>
            <button
              onClick={() => setShowBetaSetup(false)}
              style={{
                padding: '12px 24px',
                background: 'rgba(156, 163, 175, 0.1)',
                color: '#9CA3AF',
                border: '1px solid rgba(156, 163, 175, 0.3)',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default Dashboard;
