import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import FirestoreService from '../services/FirestoreService';
import TrainingPlanService from '../services/TrainingPlanService';
import { TempoWorkoutLibrary } from '../lib/tempo-workout-library.js';
import { IntervalWorkoutLibrary } from '../lib/interval-workout-library.js';
import { LongRunWorkoutLibrary } from '../lib/long-run-workout-library.js';
import { HillWorkoutLibrary } from '../lib/hill-workout-library.js';
import WorkoutOptionsService from '../services/WorkoutOptionsService.js';
import BrickWorkoutService from '../services/brickWorkoutService.js';
import SomethingElseModal from './SomethingElseModal';
import ManagePlanModal from './ManagePlanModal';
import { formatTrainingSystem, formatEquipmentName, formatPhase, titleCase } from '../utils/typography';
import { calorieCalculator } from '../lib/calorie-calculator.js';
import StravaService from '../services/StravaService';
import StravaSyncService from '../services/StravaSyncService';
import logger from '../utils/logger';

function Dashboard({ userProfile, trainingPlan, completedWorkouts, clearAllData }) {
  const navigate = useNavigate();
  const [showManagePlanModal, setShowManagePlanModal] = useState(false);
  
  // Calculate the actual current week based on training plan start date
  const calculateCurrentWeek = () => {
    if (!trainingPlan?.planOverview?.startDate) {
      return 1; // Default to week 1 if no start date
    }

    const today = new Date();
    // FIXED: Append T00:00:00 to parse as local timezone, not UTC
    const startDate = new Date(trainingPlan.planOverview.startDate + 'T00:00:00');

    // FIXED: Calculate the Monday of the week containing the start date
    const msPerDay = 24 * 60 * 60 * 1000;
    const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days from Monday
    const mondayOfStartWeek = new Date(startDate.getTime() - (daysFromMonday * msPerDay));

    // If we're before the Monday of the start week, return 1 (show first week)
    if (today < mondayOfStartWeek) {
      return 1;
    }

    // Calculate weeks since the Monday of start week
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceStart = Math.floor((today - mondayOfStartWeek) / msPerWeek);
    return Math.min(weeksSinceStart + 1, trainingPlan?.planOverview?.totalWeeks || 12);
  };

  // Calculate week date range for display
  const getWeekDateRange = (weekNumber) => {
    if (!trainingPlan?.planOverview?.startDate) {
      return null;
    }

    // FIXED: Append T00:00:00 to parse as local timezone, not UTC
    const startDate = new Date(trainingPlan.planOverview.startDate + 'T00:00:00');
    const msPerDay = 24 * 60 * 60 * 1000;

    // FIXED: Calculate the Monday of the week containing the start date
    const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days from Monday
    const mondayOfStartWeek = new Date(startDate.getTime() - (daysFromMonday * msPerDay));

    // Calculate the start of this training week (always Monday)
    const weekStartDate = new Date(mondayOfStartWeek.getTime() + ((weekNumber - 1) * 7 * msPerDay));
    const weekEndDate = new Date(weekStartDate.getTime() + (6 * msPerDay));

    const options = { month: 'short', day: 'numeric' };
    const startStr = weekStartDate.toLocaleDateString('en-US', options);
    const endStr = weekEndDate.toLocaleDateString('en-US', options);

    return `${startStr} - ${endStr}`;
  };

  // Format workout type names for display
  const formatWorkoutTypeName = (type) => {
    const typeNames = {
      'speedWork': 'Speed Work',
      'tempoRuns': 'Tempo Run',
      'longRuns': 'Long Run',
      'cyclete': 'Cyclete Workout',
      'easy': 'Easy Run',
      'rest': 'Rest Day',
      'hills': 'Hill Workout',
      'vo2MaxWork': 'VO2 Max Work',
      'fartlek': 'Fartlek',
      'intervals': 'Intervals'
    };
    return typeNames[type] || type.charAt(0).toUpperCase() + type.slice(1) + ' Workout';
  };

  // Function to refresh the training plan with latest features
  const refreshTrainingPlan = async () => {
    if (!userProfile || !trainingPlan) return;

    try {
      logger.log('🔄 Regenerating training plan with updated workout logic...');

      // Reconstruct the original form data from user profile and training plan
      const formData = {
        raceDistance: trainingPlan.planOverview.raceDistance,
        raceDate: trainingPlan.planOverview.raceDate,
        startDate: trainingPlan.planOverview.startDate,
        currentRaceTime: userProfile.currentRaceTime || '2:00:00',
        runsPerWeek: trainingPlan.planOverview.runsPerWeek || 5,
        experienceLevel: userProfile.experienceLevel || 'recreational',
        standUpBikeType: userProfile.standUpBikeType || null,
        availableDays: userProfile.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        preferredBikeDays: userProfile.preferredBikeDays || [],
        longRunDay: userProfile.longRunDay || 'Sunday',
        trainingStyle: userProfile.trainingStyle || 'prescribed',
        weeksAvailable: trainingPlan.planOverview.totalWeeks || 16,
        hardSessionDays: userProfile.hardSessionDays || ['Wednesday', 'Friday'],
        hardSessionsPerWeek: userProfile.hardSessionsPerWeek || 2,
        currentWeeklyMileage: userProfile.currentWeeklyMileage || 15,
        currentLongRunDistance: userProfile.currentLongRunDistance || 6,
        raceElevationProfile: userProfile.raceElevationProfile || 'flat',
        climate: userProfile.climate || 'temperate',
        trainingPhilosophy: userProfile.trainingPhilosophy || 'practical_periodization',
        missedWorkoutPreference: userProfile.missedWorkoutPreference || 'modify',
        goal: userProfile.goal || 'race'
      };

      logger.log('📋 Form data for regeneration:', formData);

      // Generate new plan using TrainingPlanService
      const trainingPlanService = new TrainingPlanService();
      const result = await trainingPlanService.generatePlanFromOnboarding(formData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate plan');
      }

      const newPlan = result.plan;
      logger.log('✅ New plan generated with', newPlan.weeks?.length, 'weeks');

      // Save to Firebase
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        trainingPlan: newPlan,
        planLastUpdated: new Date().toISOString()
      });

      logger.log('💾 Plan saved to Firebase - reloading...');

      // Reload the page to show updated plan
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing training plan:', error);
      alert('Error refreshing plan. Please try again or contact support.');
    }
  };

  // Calculate mileage breakdown between running and equivalent activities
  const calculateMileageBreakdown = (weekData) => {
    if (!weekData?.workouts) {
      return { runMiles: 0, bikeMiles: 0, ellipticalMiles: 0, runEqMiles: 0, totalMiles: 0, equivalentMiles: 0 };
    }

    logger.log('🔢 Calculating mileage for week:', weekData.week);
    logger.log('📋 Workouts:', weekData.workouts);

    let runMiles = 0;
    let bikeMiles = 0; // This will be the actual bike miles (not equivalent)
    let ellipticalMiles = 0; // This will be the actual elliptical miles (not equivalent)
    let runEqMiles = 0; // RunEQ miles are already equivalent - don't convert again!

    weekData.workouts.forEach(workout => {
      // Get ALL workouts for this day (including two-a-days)
      const allWorkoutsForDay = getWorkouts(workout);

      logger.log(`🏃 ${workout.day}: ${allWorkoutsForDay.length} workout(s)`);

      // Calculate mileage for each workout on this day
      allWorkoutsForDay.forEach((currentWorkout, idx) => {
      logger.log(`   Workout ${idx + 1}: ${currentWorkout.workout?.name} (type: ${currentWorkout.type})`);

      if (currentWorkout.type === 'brick') {
        // For brick workouts, we need to extract both run and bike components
        const runMatch = currentWorkout.workout?.description?.match(/(\d+(?:\.\d+)?)\s*mi.*run/i);
        const bikeMatch = currentWorkout.workout?.description?.match(/(\d+(?:\.\d+)?)\s*mi.*bike/i);

        if (runMatch) runMiles += parseFloat(runMatch[1]);
        if (bikeMatch) bikeMiles += parseFloat(bikeMatch[1]);
      } else if (currentWorkout.workout?.name?.match(/(\d+(?:\.\d+)?)\s*RunEQ\s*Miles?/i)) {
        // RunEQ Miles - already in equivalent format, add directly without conversion!
        const runEqMatch = currentWorkout.workout?.name?.match(/(\d+(?:\.\d+)?)\s*RunEQ\s*Miles?/i);
        if (runEqMatch) {
          const extractedRunEq = parseFloat(runEqMatch[1]);
          logger.log(`   ✅ Extracted ${extractedRunEq} RunEQ miles from "${currentWorkout.workout?.name}" (already equivalent)`);
          runEqMiles += extractedRunEq;
        }
      } else if (currentWorkout.workout?.name?.includes('Bike') || currentWorkout.workout?.name?.includes('Cycling')) {
        // Pure bike workout - actual miles that need conversion
        const bikeMatch = currentWorkout.workout?.name?.match(/(\d+(?:\.\d+)?)/);
        if (bikeMatch) bikeMiles += parseFloat(bikeMatch[1]);
      } else if (currentWorkout.workout?.name?.includes('Elliptical') || currentWorkout.workout?.name?.includes('ElliptiGO')) {
        // Pure elliptical workout - actual miles that need conversion
        const ellipticalMatch = currentWorkout.workout?.name?.match(/(\d+(?:\.\d+)?)/);
        if (ellipticalMatch) ellipticalMiles += parseFloat(ellipticalMatch[1]);
      } else {
        // Regular running workout - extract miles from workout name or description
        // Look for patterns like "5-Mile", "5 miles", "5 mi" etc, but ignore "1000m", "400m" etc
        const runMatch = currentWorkout.workout?.name?.match(/(\d+(?:\.\d+)?)\s*-?\s*(mile|miles|mi)\b/i) || 
                        currentWorkout.workout?.name?.match(/^(\d+(?:\.\d+)?)\s*(mile|miles|mi)/i);
        if (runMatch) {
          const extractedMiles = parseFloat(runMatch[1]);
          logger.log(`   📏 Extracted ${extractedMiles} miles from "${currentWorkout.workout?.name}"`);
          runMiles += extractedMiles;
        } else {
          // Fallback: try to estimate from workout type
          let defaultMiles = 0;
          switch (currentWorkout.type) {
            case 'rest':
              defaultMiles = 0; // Rest days = 0 miles!
              break;
            case 'longRun':
              defaultMiles = 10; // Default long run distance
              break;
            case 'tempo':
              defaultMiles = 6; // Default tempo distance
              break;
            case 'intervals':
              defaultMiles = 5; // Default interval session distance
              break;
            case 'easy':
              defaultMiles = 4; // Default easy run distance
              break;
            case 'hills':
              defaultMiles = 5; // Default hill workout distance
              break;
            default:
              defaultMiles = 4; // Default fallback
          }
          logger.log(`   📏 Using default ${defaultMiles} miles for ${currentWorkout.type} workout "${currentWorkout.workout?.name}"`);
          runMiles += defaultMiles;
        }
      }
      }); // End inner loop (all workouts for this day)
    }); // End outer loop (all days)

    // Calculate equivalent miles (bike at 3:1 ratio, elliptical at 2:1 ratio)
    // RunEQ miles are already equivalent, so add them directly
    const bikeEquivalentMiles = bikeMiles / 3;
    const ellipticalEquivalentMiles = ellipticalMiles / 2;
    const equivalentMiles = bikeEquivalentMiles + ellipticalEquivalentMiles + runEqMiles;
    const totalMiles = runMiles + equivalentMiles;

    logger.log('📊 Final mileage calculation:');
    logger.log(`   Running: ${runMiles} miles`);
    logger.log(`   Biking: ${bikeMiles} miles (${bikeEquivalentMiles} equivalent)`);
    logger.log(`   Elliptical: ${ellipticalMiles} miles (${ellipticalEquivalentMiles} equivalent)`);
    logger.log(`   RunEQ: ${runEqMiles} miles (already equivalent)`);
    logger.log(`   Total: ${totalMiles} miles`);

    const result = {
      runMiles: Math.round(runMiles * 10) / 10,
      bikeMiles: Math.round(bikeMiles * 10) / 10,
      ellipticalMiles: Math.round(ellipticalMiles * 10) / 10,
      runEqMiles: Math.round(runEqMiles * 10) / 10,
      equivalentMiles: Math.round(equivalentMiles * 10) / 10,
      totalMiles: Math.round(totalMiles * 10) / 10
    };

    logger.log('📊 Rounded result:', result);
    return result;
  };

  // Calculate rolling distance totals from completed workouts
  const calculateRollingDistance = () => {
    if (!trainingPlan?.weeks) {
      return { last7Days: 0, last30Days: 0, allTime: 0 };
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let last7Days = 0;
    let last30Days = 0;
    let allTime = 0;

    trainingPlan.weeks.forEach(week => {
      if (!week.workouts) return;

      week.workouts.forEach(workout => {
        // Get all workouts for this day (including two-a-days)
        const allWorkoutsForDay = getWorkouts(workout);

        allWorkoutsForDay.forEach(w => {
          const workoutCompleted = w.completed || workoutCompletions[`${week.week}-${w.day}-${w.workoutIndex || 0}`]?.completed;
          const actualDistance = w.actualDistance || workoutCompletions[`${week.week}-${w.day}-${w.workoutIndex || 0}`]?.actualDistance;

          if (workoutCompleted && actualDistance) {
            const completedAt = w.completedAt || workoutCompletions[`${week.week}-${w.day}-${w.workoutIndex || 0}`]?.completedAt;
            const completedDate = completedAt ? new Date(completedAt) : null;

            allTime += actualDistance;

            if (completedDate) {
              if (completedDate >= sevenDaysAgo) {
                last7Days += actualDistance;
              }
              if (completedDate >= thirtyDaysAgo) {
                last30Days += actualDistance;
              }
            }
          }
        });
      });
    });

    return {
      last7Days: Math.round(last7Days * 10) / 10,
      last30Days: Math.round(last30Days * 10) / 10,
      allTime: Math.round(allTime * 10) / 10
    };
  };

  // Load current week from localStorage or calculate it
  const [currentWeek, setCurrentWeek] = useState(() => {
    // ALWAYS calculate current week based on start date for new plans
    const calculatedWeek = calculateCurrentWeek();

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

  const [somethingElseModal, setSomethingElseModal] = useState({
    isOpen: false,
    workout: null
  });
  const [modifiedWorkouts, setModifiedWorkouts] = useState({});
  const [workoutOptions, setWorkoutOptions] = useState({});
  const [showingOptions, setShowingOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({}); // Track selected but not yet confirmed options
  const [workoutCompletions, setWorkoutCompletions] = useState({}); // Track workout completions for instant UI updates
  const [showBetaSetup, setShowBetaSetup] = useState(false); // Show beta code setup modal
  const [showBrickOptions, setShowBrickOptions] = useState({}); // Track which workouts are showing brick split options
  const [stravaSyncing, setStravaSyncing] = useState(false); // Track Strava sync status
  const [completionModal, setCompletionModal] = useState({
    isOpen: false,
    workout: null,
    distance: '',
    notes: ''
  }); // Track completion modal for distance logging

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

  // Manual Strava sync function
  const handleManualStravaSync = async () => {
    logger.log('🔘 BUTTON CLICKED - handleManualStravaSync called');
    if (!userProfile?.stravaConnected || !auth.currentUser || !trainingPlan) {
      logger.log('❌ Cannot sync - missing requirements:', {
        stravaConnected: userProfile?.stravaConnected,
        hasUser: !!auth.currentUser,
        hasTrainingPlan: !!trainingPlan
      });
      return;
    }

    setStravaSyncing(true);
    logger.log('🔄 Manual Strava sync triggered...');

    try {
      const result = await StravaSyncService.syncActivities(
        auth.currentUser.uid,
        userProfile,
        trainingPlan,
        currentWeek
      );

      if (result.success) {
        logger.log('✅ Strava sync successful:', result);

        // Update last sync time
        localStorage.setItem('runeq_stravaLastSync', new Date().toISOString());

        // Refresh the page to show updated completions
        if (result.workoutsCompleted > 0) {
          logger.log(`🔄 ${result.workoutsCompleted} workouts auto-completed - refreshing...`);
          window.location.reload();
        } else {
          alert(`Sync complete! Found ${result.activitiesFetched} activities, ${result.matchesFound} matched workouts.`);
          setStravaSyncing(false);
        }
      } else {
        console.warn('⚠️ Strava sync failed:', result.error);
        alert(`Sync failed: ${result.error}`);
        setStravaSyncing(false);
      }
    } catch (error) {
      console.error('❌ Strava sync error:', error);
      alert(`Sync error: ${error.message}`);
      setStravaSyncing(false);
    }
  };

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

  // Initialize workout libraries
  const tempoLibrary = new TempoWorkoutLibrary();
  const intervalLibrary = new IntervalWorkoutLibrary();
  const longRunLibrary = new LongRunWorkoutLibrary();
  const hillLibrary = new HillWorkoutLibrary();
  const workoutOptionsService = new WorkoutOptionsService();
  const brickWorkoutService = new BrickWorkoutService();
  
  // Extract distance/duration info for quick glance
  const getWorkoutDistance = (workout) => {
    // Priority 1: Check workout.distance field
    if (workout.distance) {
      return `📏 ${workout.distance}`;
    }

    // Priority 2: Extract from workout name (e.g., "5-Mile Easy Run", "8 RunEQ Miles")
    const nameMatch = workout.workout?.name?.match(/(\d+(?:\.\d+)?)\s*-?\s*(mile|miles|mi|RunEQ|km)/i);
    if (nameMatch) {
      return `📏 ${nameMatch[1]} ${nameMatch[2]}`;
    }

    // Priority 3: Check workoutDetails.repetitions for intervals
    if (workout.workoutDetails?.repetitions) {
      return `🔁 ${workout.workoutDetails.repetitions}`;
    }

    // Priority 4: Check workoutDetails.duration for tempo/time-based
    if (workout.workoutDetails?.duration) {
      return `⏱️ ${workout.workoutDetails.duration}`;
    }

    // Priority 5: Workout type-specific defaults
    switch (workout.type) {
      case 'longRun':
        return '📏 10+ miles';
      case 'tempo':
        return '⏱️ 20-40 min';
      case 'intervals':
        return '🔁 Multiple reps';
      case 'hills':
        return '⛰️ Hill session';
      case 'easy':
        return '📏 4-6 miles';
      case 'bike':
        return '🚴 12+ RunEQ miles';
      default:
        return null;
    }
  };

  // Intensity-based color system for workout cards - BOLD & VIVID 2025
  const getIntensityColors = (intensity, difficulty) => {
    const intensityMap = {
      'Very Easy': { bg: 'rgba(34, 197, 94, 0.4)', border: 'rgba(34, 197, 94, 0.8)', accent: '#22c55e', icon: '😌' },
      'Easy': { bg: 'rgba(34, 197, 94, 0.45)', border: 'rgba(34, 197, 94, 0.9)', accent: '#22c55e', icon: '🟢' },
      'Easy-Moderate': { bg: 'rgba(245, 158, 11, 0.4)', border: 'rgba(245, 158, 11, 0.8)', accent: '#f59e0b', icon: '🟡' },
      'Moderate': { bg: 'rgba(245, 158, 11, 0.45)', border: 'rgba(245, 158, 11, 0.9)', accent: '#f59e0b', icon: '🔶' },
      'Medium-Hard': { bg: 'rgba(239, 68, 68, 0.4)', border: 'rgba(239, 68, 68, 0.8)', accent: '#ef4444', icon: '🔸' },
      'Hard': { bg: 'rgba(239, 68, 68, 0.45)', border: 'rgba(239, 68, 68, 0.9)', accent: '#ef4444', icon: '🔥' },
      'Very Hard': { bg: 'rgba(220, 38, 127, 0.4)', border: 'rgba(220, 38, 127, 0.8)', accent: '#dc2626', icon: '💥' },
      'Variable': { bg: 'rgba(168, 85, 247, 0.4)', border: 'rgba(168, 85, 247, 0.8)', accent: '#a855f7', icon: '⚡' },
      'Variable Hard': { bg: 'rgba(168, 85, 247, 0.45)', border: 'rgba(168, 85, 247, 0.9)', accent: '#a855f7', icon: '⚡' },
      'Progressive': { bg: 'rgba(59, 130, 246, 0.4)', border: 'rgba(59, 130, 246, 0.8)', accent: '#3b82f6', icon: '📈' }
    };

    // Fallback based on difficulty if intensity not found
    if (!intensityMap[intensity] && difficulty) {
      const difficultyMap = {
        'Low': intensityMap['Easy'],
        'Low-Moderate': intensityMap['Easy-Moderate'],
        'Moderate': intensityMap['Moderate'],
        'Moderate-High': intensityMap['Medium-Hard'],
        'High': intensityMap['Hard'],
        'Very High': intensityMap['Very Hard']
      };
      return difficultyMap[difficulty] || intensityMap['Moderate'];
    }

    return intensityMap[intensity] || intensityMap['Moderate'];
  };
  
  // Generate dynamic workouts based on week and user profile
  const generateWeekWorkouts = (week, profile) => {
    // Debug: Log profile data to see what we have
    logger.log('🔍 generateWeekWorkouts - profile:', profile);
    logger.log('🚴 preferredBikeDays:', profile?.preferredBikeDays);
    logger.log('📀 localStorage userProfile:', localStorage.getItem('runeq_userProfile'));
    logger.log('📅 localStorage trainingPlan:', localStorage.getItem('runeq_trainingPlan'));
    // Create workout pool for different training focuses
    const workoutPools = {
      tempo: [
        tempoLibrary.getRandomWorkout('TRADITIONAL_TEMPO'),
        tempoLibrary.getRandomWorkout('ALTERNATING_TEMPO'),
        tempoLibrary.getRandomWorkout('PROGRESSIVE_TEMPO'),
        tempoLibrary.getRandomWorkout('TEMPO_INTERVALS')
      ],
      intervals: [
        intervalLibrary.getRandomWorkout('SHORT_SPEED'),
        intervalLibrary.getRandomWorkout('VO2_MAX'),
        intervalLibrary.getRandomWorkout('LONG_INTERVALS')
      ],
      hills: [
        hillLibrary.getRandomWorkout('short_power'),
        hillLibrary.getRandomWorkout('long_strength'),
        hillLibrary.getRandomWorkout('hill_circuits')
      ],
      longRuns: [
        longRunLibrary.getRandomWorkout('TRADITIONAL_EASY'),
        longRunLibrary.getRandomWorkout('PROGRESSIVE_RUNS'),
        longRunLibrary.getRandomWorkout('MIXED_PACE_LONG'),
        longRunLibrary.getRandomWorkout('RACE_SIMULATION')
      ]
    };
    
    // Create pure cyclete workouts for preferred bike days
    const generateCycleteWorkout = (day, intensity = 'Moderate') => {
      const distances = { 'Easy': 8, 'Moderate': 12, 'Hard': 16, 'Very Hard': 20 };
      const distance = distances[intensity] || 12;

      return {
        name: `${distance}-Mile ${formatEquipmentName(profile.standUpBikeType)} Ride`,
        description: `${distance} miles on ${formatEquipmentName(profile.standUpBikeType)} @ steady aerobic effort`
      };
    };
    
    // Select workouts based on week (cycling through different focuses)
    const weekPattern = [
      { tuesday: 'tempo', saturday: 'intervals', sunday: 'longRuns' },      // Week 1
      { tuesday: 'hills', saturday: 'tempo', sunday: 'longRuns' },          // Week 2  
      { tuesday: 'intervals', saturday: 'hills', sunday: 'longRuns' },      // Week 3
      { tuesday: 'tempo', saturday: 'intervals', sunday: 'longRuns' }       // Week 4
    ];
    
    const pattern = weekPattern[(week - 1) % weekPattern.length];
    
    // Select specific workouts
    const tuesdayWorkout = workoutPools[pattern.tuesday][(week - 1) % workoutPools[pattern.tuesday].length];
    const saturdayWorkout = workoutPools[pattern.saturday][(week - 1) % workoutPools[pattern.saturday].length];
    const sundayWorkout = workoutPools[pattern.sunday][(week - 1) % workoutPools[pattern.sunday].length];
    
    // Helper to get workout type and focus
    const getWorkoutTypeAndFocus = (workoutType) => {
      const mapping = {
        tempo: { type: 'tempo', focus: 'Lactate Threshold' },
        intervals: { type: 'intervals', focus: 'Speed & Power' },
        hills: { type: 'hills', focus: 'Strength & Power' },
        longRuns: { type: 'longRun', focus: 'Endurance' }
      };
      return mapping[workoutType] || { type: 'easy', focus: 'Recovery' };
    };

    const tuesdayTypeInfo = getWorkoutTypeAndFocus(pattern.tuesday);
    const saturdayTypeInfo = getWorkoutTypeAndFocus(pattern.saturday);
    const sundayTypeInfo = getWorkoutTypeAndFocus(pattern.sunday);

    logger.log('🚴 Checking bike days for each day:');
    logger.log('  Monday bike day?', profile?.preferredBikeDays?.includes('Monday'));
    logger.log('  Tuesday bike day?', profile?.preferredBikeDays?.includes('Tuesday'));  
    logger.log('  Wednesday bike day?', profile?.preferredBikeDays?.includes('Wednesday'));
    logger.log('  Thursday bike day?', profile?.preferredBikeDays?.includes('Thursday'));
    logger.log('  Friday bike day?', profile?.preferredBikeDays?.includes('Friday'));
    logger.log('  Saturday bike day?', profile?.preferredBikeDays?.includes('Saturday'));
    logger.log('  Sunday bike day?', profile?.preferredBikeDays?.includes('Sunday'));

    return [
      { 
        day: 'Monday', 
        type: profile?.preferredBikeDays?.includes('Monday') ? 'bike' : 'rest',
        workout: profile?.preferredBikeDays?.includes('Monday') ? 
          generateCycleteWorkout('Monday', 'Easy') : 
          { name: 'Rest Day', description: 'Complete rest or light cross-training' }, 
        focus: profile?.preferredBikeDays?.includes('Monday') ? 'Active Recovery' : 'Recovery',
        completed: false,
        equipmentSpecific: profile?.preferredBikeDays?.includes('Monday') && !!profile?.standUpBikeType
      },
      { 
        day: 'Tuesday', 
        type: profile?.preferredBikeDays?.includes('Tuesday') ? 'bike' : tuesdayTypeInfo.type,
        workout: profile?.preferredBikeDays?.includes('Tuesday') ? 
          generateCycleteWorkout('Tuesday', 'Moderate') : 
          { 
            name: tuesdayWorkout.name,
            description: tuesdayWorkout.description
          }, 
        focus: profile?.preferredBikeDays?.includes('Tuesday') ? 'Aerobic Base' : tuesdayTypeInfo.focus,
        completed: false,
        equipmentSpecific: profile?.preferredBikeDays?.includes('Tuesday') && !!profile?.standUpBikeType,
        workoutDetails: tuesdayWorkout
      },
      { 
        day: 'Wednesday', 
        type: profile?.preferredBikeDays?.includes('Wednesday') ? 'bike' : 'rest',
        workout: profile?.preferredBikeDays?.includes('Wednesday') ? 
          generateCycleteWorkout('Wednesday', 'Easy') : 
          { name: 'Rest Day', description: 'Complete rest or light cross-training' }, 
        focus: profile?.preferredBikeDays?.includes('Wednesday') ? 'Active Recovery' : 'Recovery',
        completed: false,
        equipmentSpecific: profile?.preferredBikeDays?.includes('Wednesday') && !!profile?.standUpBikeType
      },
      { 
        day: 'Thursday', 
        type: profile?.preferredBikeDays?.includes('Thursday') ? 'bike' : 'easy',
        workout: profile?.preferredBikeDays?.includes('Thursday') ? 
          generateCycleteWorkout('Thursday', 'Easy') : 
          { name: 'Easy Run', description: 'Conversational pace, aerobic base building' }, 
        focus: 'Recovery',
        completed: false,
        equipmentSpecific: profile?.preferredBikeDays?.includes('Thursday') && !!profile?.standUpBikeType
      },
      { 
        day: 'Friday', 
        type: profile?.preferredBikeDays?.includes('Friday') ? 'bike' : 'rest',
        workout: profile?.preferredBikeDays?.includes('Friday') ? 
          generateCycleteWorkout('Friday', 'Easy') : 
          { name: 'Rest Day', description: 'Complete rest or light cross-training' }, 
        focus: profile?.preferredBikeDays?.includes('Friday') ? 'Active Recovery' : 'Recovery',
        completed: false,
        equipmentSpecific: profile?.preferredBikeDays?.includes('Friday') && !!profile?.standUpBikeType
      },
      { 
        day: 'Saturday', 
        type: profile?.preferredBikeDays?.includes('Saturday') ? 'bike' : saturdayTypeInfo.type,
        workout: profile?.preferredBikeDays?.includes('Saturday') ? 
          generateCycleteWorkout('Saturday', 'Hard') : 
          { 
            name: saturdayWorkout.name,
            description: saturdayWorkout.description
          }, 
        focus: profile?.preferredBikeDays?.includes('Saturday') ? 'Aerobic Power' : saturdayTypeInfo.focus,
        completed: false,
        equipmentSpecific: profile?.preferredBikeDays?.includes('Saturday') && !!profile?.standUpBikeType,
        workoutDetails: saturdayWorkout
      },
      { 
        day: 'Sunday', 
        type: sundayTypeInfo.type,
        workout: { 
          name: sundayWorkout.name,
          description: sundayWorkout.description
        }, 
        focus: sundayTypeInfo.focus,
        completed: false,
        workoutDetails: sundayWorkout
      }
    ];
  };
  
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
        return weekData;
      }
    }

    // Fallback to generated workouts if training plan is empty/missing
    logger.log('Falling back to generated workouts for week', currentWeek);
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
      preparation: '#ffd700'      // Gold - preparation phase
    };
    return colors[type] || '#718096';
  };

  const handleWorkoutClick = (workout) => {
    if (workout.type === 'rest' || workout.type === 'preparation') return;
    
    // Create safe day identifier
    const dayId = (workout.day || 'unknown').toLowerCase().replace(/\s+/g, '-');
    
    navigate(`/workout/${dayId}`, {
      state: { 
        workout: workout,
        userProfile: userProfile,
        currentWeek: currentWeek,
        weekData: currentWeekData
      }
    });
  };

  const handleSomethingElse = (workout, mode = 'replace') => {
    setSomethingElseModal({
      isOpen: true,
      workout: workout,
      mode: mode // 'replace' or 'add'
    });
  };

  const handleAddWorkout = (originalWorkout) => {
    // Open Something Else modal in "add" mode
    handleSomethingElse(originalWorkout, 'add');
  };

  const handleRemoveWorkout = (originalWorkout, workoutIndex) => {
    if (workoutIndex === 0) {
      alert("Cannot remove the primary workout. Use 'Something Else' to replace it instead.");
      return;
    }

    const workoutKey = `${currentWeek}-${originalWorkout.day}-${workoutIndex}`;

    // Remove the workout from modifiedWorkouts
    const updatedWorkouts = { ...modifiedWorkouts };
    delete updatedWorkouts[workoutKey];

    // Reindex remaining workouts (shift down)
    const dayKey = `${currentWeek}-${originalWorkout.day}`;
    const workoutsToReindex = [];

    // Collect all workouts for this day with higher indices
    Object.keys(updatedWorkouts).forEach(key => {
      if (key.startsWith(dayKey)) {
        const keyIndex = parseInt(key.split('-').pop());
        if (keyIndex > workoutIndex) {
          workoutsToReindex.push({ key, index: keyIndex, workout: updatedWorkouts[key] });
          delete updatedWorkouts[key];
        }
      }
    });

    // Reindex them
    workoutsToReindex.sort((a, b) => a.index - b.index).forEach((item, newIndex) => {
      const newKey = `${dayKey}-${workoutIndex + newIndex}`;
      updatedWorkouts[newKey] = item.workout;
    });

    setModifiedWorkouts(updatedWorkouts);

    // Save to localStorage
    localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(updatedWorkouts));
  };

  const handleCloseSomethingElse = () => {
    setSomethingElseModal({
      isOpen: false,
      workout: null
    });
  };

  const handleMarkComplete = async (workout) => {
    if (!auth.currentUser) {
      console.error('No user logged in');
      return;
    }

    // If uncompleting, just toggle off immediately
    if (workout.completed) {
      const newCompletedStatus = false;
      const workoutIndex = workout.workoutIndex || 0;
      const workoutKey = `${currentWeek}-${workout.day}-${workoutIndex}`;

      // INSTANT UI UPDATE: Update local state immediately for smooth UX
      setWorkoutCompletions(prev => ({
        ...prev,
        [workoutKey]: {
          completed: newCompletedStatus,
          completedAt: null,
          actualDistance: null,
          notes: null
        }
      }));

      // BACKGROUND SAVE: Update Firestore without blocking UI
      try {
        const result = await FirestoreService.markWorkoutComplete(
          auth.currentUser.uid,
          currentWeek,
          workout.day,
          newCompletedStatus,
          null, // distance
          null  // notes
        );

        if (!result.success) {
          console.error('Failed to save completion status');
          setWorkoutCompletions(prev => {
            const updated = { ...prev };
            delete updated[workoutKey];
            return updated;
          });
          alert('Failed to save. Please try again.');
        }
      } catch (error) {
        console.error('Error uncompleting workout:', error);
      }
      return;
    }

    // For rest days, just mark complete without modal
    if (workout.type === 'rest') {
      const newCompletedStatus = true;
      const workoutIndex = workout.workoutIndex || 0;
      const workoutKey = `${currentWeek}-${workout.day}-${workoutIndex}`;

      setWorkoutCompletions(prev => ({
        ...prev,
        [workoutKey]: {
          completed: newCompletedStatus,
          completedAt: new Date().toISOString()
        }
      }));

      try {
        await FirestoreService.markWorkoutComplete(
          auth.currentUser.uid,
          currentWeek,
          workout.day,
          newCompletedStatus
        );
      } catch (error) {
        console.error('Error completing rest day:', error);
      }
      return;
    }

    // For actual workouts, show completion modal with distance tracking
    setCompletionModal({
      isOpen: true,
      workout: workout,
      distance: workout.distance?.toString() || '',
      notes: ''
    });
  };

  // Handle saving workout completion with distance
  const handleSaveCompletion = async () => {
    const { workout, distance, notes } = completionModal;
    if (!workout || !auth.currentUser) return;

    const newCompletedStatus = true;
    const workoutIndex = workout.workoutIndex || 0;
    const workoutKey = `${currentWeek}-${workout.day}-${workoutIndex}`;

    // INSTANT UI UPDATE
    setWorkoutCompletions(prev => ({
      ...prev,
      [workoutKey]: {
        completed: newCompletedStatus,
        completedAt: new Date().toISOString(),
        actualDistance: distance ? parseFloat(distance) : null,
        notes: notes || null
      }
    }));

    // Close modal
    setCompletionModal({ isOpen: false, workout: null, distance: '', notes: '' });

    // BACKGROUND SAVE
    try {
      const result = await FirestoreService.markWorkoutComplete(
        auth.currentUser.uid,
        currentWeek,
        workout.day,
        newCompletedStatus,
        distance ? parseFloat(distance) : null,
        notes || null
      );

      if (!result.success) {
        // Rollback on failure
        console.error('Failed to save completion status');
        setWorkoutCompletions(prev => {
          const updated = { ...prev };
          delete updated[workoutKey];
          return updated;
        });
        alert('Failed to save. Please try again.');
      }
    } catch (error) {
      // Rollback on error
      console.error('Error saving completion:', error);
      setWorkoutCompletions(prev => {
        const updated = { ...prev };
        delete updated[workoutKey];
        return updated;
      });
      alert('Failed to save. Please try again.');
    }
  };

  const handleWorkoutReplacement = (newWorkout) => {
    const mode = somethingElseModal.mode || 'replace';
    const dayKey = `${currentWeek}-${newWorkout.day}`;

    if (mode === 'add') {
      // Find the next available index for this day
      let nextIndex = 0;
      while (modifiedWorkouts[`${dayKey}-${nextIndex}`]) {
        nextIndex++;
      }

      // If nextIndex is 0 and we already have an original workout, start at 1
      if (nextIndex === 0) {
        nextIndex = 1;
      }

      const workoutKey = `${dayKey}-${nextIndex}`;
      const updatedWorkouts = {
        ...modifiedWorkouts,
        [workoutKey]: newWorkout
      };

      setModifiedWorkouts(updatedWorkouts);
      localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(updatedWorkouts));
      logger.log('💾 Added second workout:', workoutKey, newWorkout.workout?.name);
    } else {
      // Replace mode - use index 0
      const workoutKey = `${dayKey}-0`;
      const updatedWorkouts = {
        ...modifiedWorkouts,
        [workoutKey]: newWorkout
      };

      setModifiedWorkouts(updatedWorkouts);
      localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(updatedWorkouts));
      logger.log('💾 Replaced workout:', workoutKey, newWorkout.workout?.name);
    }

    // Close the modal
    handleCloseSomethingElse();
  };

  const handleShowBrickOptions = (workout) => {
    const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
    setShowBrickOptions(prev => ({
      ...prev,
      [workoutKey]: true
    }));
  };

  const handleHideBrickOptions = (workout) => {
    const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
    setShowBrickOptions(prev => ({
      ...prev,
      [workoutKey]: false
    }));
  };

  const handleMakeBrick = (workout, split = 'balanced') => {
    // Convert the long run to a brick workout
    const originalDistance = parseFloat(workout.workout?.name?.match(/\d+/)?.[0]) || 8;

    // Different split ratios (all equal the same total training load)
    let runDistance, bikeRunEqDistance, splitLabel;

    switch(split) {
      case 'heavy-run':
        runDistance = Math.round(originalDistance * 0.8);
        bikeRunEqDistance = Math.round(originalDistance * 0.2);
        splitLabel = 'Heavy Run';
        break;
      case 'balanced':
        runDistance = Math.round(originalDistance * 0.6);
        bikeRunEqDistance = Math.round(originalDistance * 0.4);
        splitLabel = 'Balanced';
        break;
      case 'heavy-bike':
        runDistance = Math.round(originalDistance * 0.4);
        bikeRunEqDistance = Math.round(originalDistance * 0.6);
        splitLabel = 'Heavy Bike';
        break;
      case 'light-run':
        runDistance = Math.round(originalDistance * 0.2);
        bikeRunEqDistance = Math.round(originalDistance * 0.8);
        splitLabel = 'Light Run';
        break;
      default:
        runDistance = Math.round(originalDistance * 0.6);
        bikeRunEqDistance = Math.round(originalDistance * 0.4);
        splitLabel = 'Balanced';
    }

    const brickWorkout = {
      ...workout,
      type: 'brickLongRun',
      workout: {
        name: `Brick Long Run (${runDistance}mi run + ${bikeRunEqDistance} RunEQ Miles ${formatEquipmentName(userProfile?.standUpBikeType)})`,
        description: `${splitLabel} brick: ${runDistance} mile run + ${bikeRunEqDistance} RunEQ miles on ${formatEquipmentName(userProfile?.standUpBikeType)}`
      },
      focus: 'Brick Endurance',
      equipmentSpecific: true,
      replacementReason: `Converted to ${splitLabel.toLowerCase()} brick workout`
    };

    // Store the modified workout using indexed key format
    const workoutIndex = workout.workoutIndex || 0;
    const workoutKey = `${currentWeek}-${workout.day}-${workoutIndex}`;
    setModifiedWorkouts(prev => ({
      ...prev,
      [workoutKey]: brickWorkout
    }));

    // Hide the options after selection
    handleHideBrickOptions(workout);
  };

  const handleMakeRegularRun = (workout) => {
    // Remove the modified workout to revert to original
    const workoutIndex = workout.workoutIndex || 0;
    const workoutKey = `${currentWeek}-${workout.day}-${workoutIndex}`;
    setModifiedWorkouts(prev => {
      const updated = { ...prev };
      delete updated[workoutKey];
      return updated;
    });
  };

  const handleShowOptions = (workout) => {
    const workoutKey = `${currentWeek}-${workout.day}`;
    
    // Get options based on workout type
    let options = [];
    const targetDistance = parseFloat(workout.workout?.name?.match(/\d+/)?.[0]) || 8;
    
    switch (workout.type) {
      case 'intervals':
        options = workoutOptionsService.getSpeedOptions(currentWeek, userProfile);
        break;
      case 'tempo':
        options = workoutOptionsService.getTempoOptions(currentWeek, userProfile);
        break;
      case 'longRun':
        options = workoutOptionsService.getLongRunOptions(currentWeek, userProfile, targetDistance);
        break;
      case 'hills':
        options = workoutOptionsService.getHillOptions(currentWeek, userProfile);
        break;
      case 'easy':
        options = workoutOptionsService.getEasyOptions(currentWeek, userProfile, 4);
        break;
      default:
        options = [];
    }

    setWorkoutOptions(prev => ({
      ...prev,
      [workoutKey]: options
    }));

    setShowingOptions(prev => ({
      ...prev,
      [workoutKey]: true
    }));
  };

  const handleHideOptions = (workout) => {
    const workoutKey = `${currentWeek}-${workout.day}`;
    setShowingOptions(prev => ({
      ...prev,
      [workoutKey]: false
    }));
  };

  const handleSelectOption = (workout, selectedOption) => {
    const workoutKey = `${currentWeek}-${workout.day}`;
    
    logger.log('🎯 Option selected:', {
      workoutKey,
      selectedOption: selectedOption.shortName,
      workout: workout.day,
      currentWeek,
      selectedOptionObject: selectedOption
    });
    
    try {
      // Store the selected option for preview/confirmation using direct object
      const newSelectedOptions = {
        ...selectedOptions,
        [workoutKey]: selectedOption
      };
      
      logger.log('📝 Direct state update:', {
        oldState: selectedOptions,
        newState: newSelectedOptions,
        workoutKey,
        selectedOption: selectedOption.shortName
      });
      
      setSelectedOptions(newSelectedOptions);
      
      // Force a re-render to make sure the state updates
      logger.log('✨ State update dispatched, should see confirmation buttons next');
      
    } catch (error) {
      console.error('❌ Error in handleSelectOption:', error);
    }
  };

  const handleConfirmSelection = async (workout) => {
    const workoutKey = `${currentWeek}-${workout.day}`;
    const selectedOption = selectedOptions[workoutKey];

    if (!selectedOption) return;

    // Create the new workout - copy ALL fields from selectedOption
    const newWorkout = {
      ...workout,
      workout: {
        ...selectedOption, // Copy ALL workout fields (structure, benefits, effort, notes, etc.)
      },
      focus: selectedOption.focus || workout.focus,
      replacementReason: 'Choose Your Adventure selection'
    };

    // Update state and localStorage immediately for UI responsiveness
    const updatedWorkouts = {
      ...modifiedWorkouts,
      [workoutKey]: newWorkout
    };

    setModifiedWorkouts(updatedWorkouts);
    localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(updatedWorkouts));

    // Save to Firestore for cross-device sync
    if (auth.currentUser) {
      await FirestoreService.saveModifiedWorkout(
        auth.currentUser.uid,
        currentWeek,
        workout.day,
        newWorkout
      );
      logger.log('✅ SAVED to Firestore:', selectedOption.name, 'for', workout.day);
    }

    // Clear selection and hide options immediately
    setSelectedOptions({});
    setShowingOptions(prev => ({ ...prev, [workoutKey]: false }));
  };

  const handleCancelSelection = (workout) => {
    const workoutKey = `${currentWeek}-${workout.day}`;

    // Clear the selection
    setSelectedOptions(prev => {
      const updated = { ...prev };
      delete updated[workoutKey];
      return updated;
    });
  };

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

      alert(`✅ Success!\n\nAll ${successCount} beta codes added to Firestore!\n\nYou can now:\n1. Check Firebase Console → Firestore → betaCodes\n2. Update Firestore security rules (see FIRESTORE_RULES.md)\n3. Start sending codes to beta testers!`);
      setShowBetaSetup(false);
    } catch (error) {
      console.error('Error adding beta codes:', error);
      alert(`❌ Error adding beta codes:\n\n${error.message}\n\nMake sure Firestore security rules allow writes for authenticated users.`);
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
        {/* Header */}
      <div style={{ color: '#AAAAAA', padding: '20px 0' }}>
        <div className="container">
          {/* Title Row */}
          <div style={{ marginBottom: '12px' }}>
            <h1 style={{ margin: '0', lineHeight: '1.2' }}>
              Week {currentWeek}
            </h1>
            {(() => {
              const dateRange = getWeekDateRange(currentWeek);
              return dateRange ? (
                <div style={{
                  fontSize: '0.9rem',
                  color: '#AAAAAA',
                  marginTop: '4px'
                }}>
                  Week of {dateRange}
                </div>
              ) : null;
            })()}
          </div>

          {/* Stats Row */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                {(() => {
                  const mileageBreakdown = calculateMileageBreakdown(currentWeekData);
                  const hasEquivalentMiles = mileageBreakdown.equivalentMiles > 0;
                  
                  return (
                    <div style={{ 
                      background: 'rgba(0, 212, 255, 0.2)', 
                      color: '#00D4FF', 
                      padding: '8px 14px', 
                      borderRadius: '10px',
                      fontWeight: '600',
                      fontSize: '1.1rem',
                      border: '1px solid rgba(0, 212, 255, 0.3)'
                    }}>
                      📊 {mileageBreakdown.totalMiles} Miles This Week
                      {hasEquivalentMiles && (
                        <div style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: '500', 
                          marginTop: '4px',
                          color: '#66E8FF'
                        }}>
                          {mileageBreakdown.runMiles}mi run
                          {mileageBreakdown.bikeMiles > 0 && ` + ${mileageBreakdown.bikeMiles}mi bike`}
                          {mileageBreakdown.ellipticalMiles > 0 && ` + ${mileageBreakdown.ellipticalMiles}mi elliptical`}
                          <span style={{ fontSize: '0.75rem', opacity: 0.8, display: 'block', marginTop: '2px' }}>
                            ({mileageBreakdown.equivalentMiles}mi equivalent activity)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {(() => {
                  // Calculate weekly calorie total for bike workouts
                  let totalCalories = { min: 0, max: 0 };
                  const bikeWorkouts = currentWeekData.workouts?.filter(w =>
                    (w.type === 'bike' || w.equipmentSpecific) && w.distance && w.distance > 0
                  ) || [];

                  bikeWorkouts.forEach(workout => {
                    const calories = calorieCalculator.calculateWorkoutCalories(workout);
                    if (calories) {
                      totalCalories.min += calories.min;
                      totalCalories.max += calories.max;
                    }
                  });

                  // Only show if there are bike workouts this week
                  if (bikeWorkouts.length === 0) return null;

                  return (
                    <div style={{
                      background: 'rgba(255, 149, 0, 0.15)',
                      color: '#FF9500',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontWeight: '600',
                      fontSize: '1.1rem',
                      border: '1px solid rgba(255, 149, 0, 0.3)'
                    }}>
                      🔥 {Math.round(totalCalories.min)}-{Math.round(totalCalories.max)} Cal This Week
                      <div style={{
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        marginTop: '4px',
                        color: '#FFB84D'
                      }}>
                        {bikeWorkouts.length} bike workout{bikeWorkouts.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })()}
                {(() => {
                  const rollingDistance = calculateRollingDistance();
                  const hasCompletedWorkouts = rollingDistance.allTime > 0;

                  if (!hasCompletedWorkouts) return null;

                  return (
                    <div style={{
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#22c55e',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontWeight: '600',
                      fontSize: '1.1rem',
                      border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}>
                      🏃 {rollingDistance.last7Days} Miles (7 days)
                      <div style={{
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        marginTop: '4px',
                        color: '#4ade80'
                      }}>
                        {rollingDistance.last30Days}mi last 30 days • {rollingDistance.allTime}mi total
                      </div>
                    </div>
                  );
                })()}
          </div>

          {/* Training Phase Banner with Coach Encouragement */}
          {(() => {
            const phase = currentWeekData.phase || 'base';
            const phaseConfig = {
              base: {
                color: '#3b82f6',
                bgColor: 'rgba(59, 130, 246, 0.15)',
                borderColor: 'rgba(59, 130, 246, 0.4)',
                icon: '🏃',
                message: 'Building your aerobic foundation - consistency over intensity'
              },
              build: {
                color: '#f59e0b',
                bgColor: 'rgba(245, 158, 11, 0.15)',
                borderColor: 'rgba(245, 158, 11, 0.4)',
                icon: '🏗️',
                message: 'Building strength and speed - time to push harder'
              },
              peak: {
                color: '#ef4444',
                bgColor: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                icon: '🏔️',
                message: 'Peak fitness - your hardest workouts are here'
              },
              taper: {
                color: '#8b5cf6',
                bgColor: 'rgba(139, 92, 246, 0.15)',
                borderColor: 'rgba(139, 92, 246, 0.4)',
                icon: '⚡',
                message: 'Tapering for race day - trust your training'
              },
              recovery: {
                color: '#22c55e',
                bgColor: 'rgba(34, 197, 94, 0.15)',
                borderColor: 'rgba(34, 197, 94, 0.4)',
                icon: '🌱',
                message: 'Recovery week - let your body adapt and rebuild'
              }
            };

            const config = phaseConfig[phase] || phaseConfig.base;

            return (
              <div style={{
                background: config.bgColor,
                border: `2px solid ${config.borderColor}`,
                borderRadius: '12px',
                padding: '14px 18px',
                marginTop: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ fontSize: '1.8rem', lineHeight: '1' }}>{config.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    color: config.color,
                    fontSize: '1rem',
                    fontWeight: '700',
                    marginBottom: '2px'
                  }}>
                    {formatPhase(phase)}
                  </div>
                  <div style={{
                    color: '#CCCCCC',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}>
                    {config.message}
                  </div>
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
                className="btn btn-secondary"
                onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                disabled={currentWeek <= 1}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#AAAAAA',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  borderRadius: '4px'
                }}
              >
                ← Prev
              </button>

              <select
                value={currentWeek}
                onChange={(e) => setCurrentWeek(parseInt(e.target.value, 10))}
                style={{
                  background: 'rgba(0, 212, 255, 0.15)',
                  color: '#00D4FF',
                  border: '2px solid rgba(0, 212, 255, 0.4)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  minWidth: '100px'
                }}
              >
                {Array.from({ length: trainingPlan?.planOverview?.totalWeeks || 12 }, (_, i) => i + 1).map(week => (
                  <option key={week} value={week} style={{ background: '#1a1a1a', color: '#00D4FF' }}>
                    Week {week}
                  </option>
                ))}
              </select>

              <button
                className="btn btn-secondary"
                onClick={() => setCurrentWeek(Math.min(trainingPlan?.planOverview?.totalWeeks || 12, currentWeek + 1))}
                disabled={currentWeek === (trainingPlan?.planOverview?.totalWeeks || 12)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#AAAAAA',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  borderRadius: '4px'
                }}
              >
                Next →
              </button>
              {/* Removed Refresh Plan button - replaced by Manage Plan feature */}
              {/* <button
                onClick={() => {
                  if (window.confirm('Update your training plan with the latest features? This will regenerate workouts using current code while keeping your profile.')) {
                    refreshTrainingPlan();
                  }
                }}
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  borderRadius: '4px'
                }}
              >
                🔄 Refresh Plan
              </button> */}

              <button
                onClick={() => setShowManagePlanModal(true)}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Adjust training schedule, days, and preferences"
              >
                ⚙️ Manage Plan
              </button>

              {/* Connect Strava Button */}
              {userProfile?.stravaConnected ? (
                <>
                  <button
                    style={{
                      background: 'rgba(252, 76, 2, 0.1)',
                      color: '#FC4C02',
                      border: '1px solid rgba(252, 76, 2, 0.3)',
                      fontSize: '0.8rem',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    title={`Connected as ${userProfile.stravaAthleteName || 'Strava athlete'}`}
                  >
                    ✓ Strava Connected
                  </button>
                  <button
                    onClick={(e) => {
                      logger.log('🔘 BUTTON CLICKED INLINE - Event:', e);
                      logger.log('🔘 stravaSyncing:', stravaSyncing);
                      logger.log('🔘 userProfile?.stravaConnected:', userProfile?.stravaConnected);
                      logger.log('🔘 auth.currentUser:', auth.currentUser);
                      logger.log('🔘 trainingPlan:', trainingPlan);
                      e.preventDefault();
                      e.stopPropagation();
                      handleManualStravaSync();
                    }}
                    disabled={stravaSyncing}
                    style={{
                      background: stravaSyncing ? 'rgba(100, 100, 100, 0.1)' : 'rgba(252, 76, 2, 0.2)',
                      color: stravaSyncing ? '#666' : '#FC4C02',
                      border: `1px solid ${stravaSyncing ? 'rgba(100, 100, 100, 0.3)' : 'rgba(252, 76, 2, 0.4)'}`,
                      fontSize: '0.8rem',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: stravaSyncing ? 'not-allowed' : 'pointer',
                      opacity: stravaSyncing ? 0.6 : 1,
                      pointerEvents: stravaSyncing ? 'none' : 'auto'
                    }}
                    title="Manually sync your Strava activities"
                  >
                    {stravaSyncing ? '⏳ Syncing...' : '🔄 Sync Now'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    const authUrl = StravaService.getAuthorizationUrl();
                    window.location.href = authUrl;
                  }}
                  style={{
                    background: 'rgba(252, 76, 2, 0.1)',
                    color: '#FC4C02',
                    border: '1px solid rgba(252, 76, 2, 0.3)',
                    fontSize: '0.8rem',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  🔗 Connect Strava
                </button>
              )}

              <button
                onClick={() => {
                  if (window.confirm('Clear all data and start over? This will reset your profile and training plan.')) {
                    clearAllData();
                  }
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Clear all data and restart onboarding"
              >
                🗑️ Reset
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('Logout? Your data is saved and will be here when you log back in.')) {
                    await signOut(auth);
                  }
                }}
                style={{
                  background: 'rgba(156, 163, 175, 0.1)',
                  color: '#9ca3af',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Logout (your data is saved)"
              >
                🚪 Logout
              </button>
            </div>
        </div>
      </div>

      <div className="container" style={{ padding: '20px 16px' }}>
        {/* Current Training System */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#00D4FF' }}>Current Training System</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🔬</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                {formatTrainingSystem(trainingPlan?.planOverview?.trainingPhilosophy || userProfile?.trainingPhilosophy || 'Zone-Based Training')}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#00D4FF' }}>
              Week {currentWeek} of {trainingPlan?.planOverview?.totalWeeks || 16} • Periodized training system
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
            <h2 style={{ margin: 0 }}>Week Progress</h2>
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
              <span style={{ fontSize: '1.5rem' }}>🌡️</span>
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

        {/* Daily Workouts */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h2 style={{ margin: 0 }}>This Week's Workouts</h2>
            <p style={{ margin: '8px 0 0 0', color: '#666' }}>
              {userProfile.standUpBikeType && 'Equipment-specific workouts marked with ⚡'}
            </p>
          </div>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {currentWeekData.workouts.map((originalWorkout) => {
              const workouts = getWorkouts(originalWorkout);
              return (
              <div key={originalWorkout.day} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {workouts.map((workout, workoutIdx) => (
              <div
                key={`${originalWorkout.day}-${workoutIdx}`}
                className="card"
                style={{
                  background: workout.type === 'rest' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                  border: `2px solid ${getWorkoutTypeColor(workout.type)}20`,
                  borderLeft: `4px solid ${getWorkoutTypeColor(workout.type)}`,
                  opacity: workout.type === 'rest' ? 0.7 : 1,
                  cursor: workout.type === 'rest' ? 'default' : 'pointer',
                  position: 'relative'
                }}
                onClick={() => handleWorkoutClick(workout)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <h3 style={{ margin: 0, color: '#EEEEEE', fontSize: '1.1rem', fontWeight: '600' }}>
                          {workout.day}
                          {workout.date && (
                            <span style={{ fontSize: '0.85rem', marginLeft: '8px', color: '#AAAAAA', fontWeight: '400' }}>
                              {workout.date}
                            </span>
                          )}
                          {workouts.length > 1 && (
                            <span style={{
                              fontSize: '0.75rem',
                              marginLeft: '8px',
                              background: 'rgba(0, 212, 255, 0.2)',
                              color: '#00D4FF',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontWeight: '700',
                              border: '1px solid rgba(0, 212, 255, 0.4)'
                            }}>
                              Workout {workoutIdx + 1}/{workouts.length}
                            </span>
                          )}
                        </h3>
                      </div>
                      {workout.equipmentSpecific && (
                        <span style={{ fontSize: '1rem' }}>⚡</span>
                      )}
                      {workout.type === 'bike' && (
                        <span style={{ fontSize: '1rem', color: '#ff9500' }} title="Pure bike workout">🚴</span>
                      )}
                      {(workout.type === 'brick' || workout.type === 'brickLongRun') && (
                        <span style={{ fontSize: '1rem', color: '#ff6b6b' }} title="Brick workout (Run + Bike combination)">🧱</span>
                      )}
                      {workout.completed && (
                        <span style={{ color: '#00FF88', fontSize: '1.2rem' }}>✓</span>
                      )}
                      {workout.replacementReason && (
                        <span style={{ color: 'var(--runeq-accent)', fontSize: '1.2rem' }} title={`Changed: ${workout.replacementReason}`}>🔄</span>
                      )}
                    </div>
                    
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: getWorkoutTypeColor(workout.type) }}>
                      {workout.workout?.name || workout.name || 'Workout'}
                    </h4>

                    {/* Distance/Duration info badge */}
                    {getWorkoutDistance(workout) && (
                      <div style={{
                        display: 'inline-block',
                        background: 'rgba(0, 212, 255, 0.15)',
                        color: '#00D4FF',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        marginBottom: '8px',
                        border: '1px solid rgba(0, 212, 255, 0.3)'
                      }}>
                        {getWorkoutDistance(workout)}
                      </div>
                    )}

                    {/* Expected Calorie Burn - Stand-Up Bike Workouts Only */}
                    {(workout.type === 'bike' || workout.equipmentSpecific) && (() => {
                      const calories = calorieCalculator.calculateWorkoutCalories(workout);
                      return calories ? (
                        <div style={{
                          display: 'inline-block',
                          background: 'rgba(255, 149, 0, 0.15)',
                          color: '#FF9500',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          marginBottom: '8px',
                          marginLeft: '8px',
                          border: '1px solid rgba(255, 149, 0, 0.3)'
                        }}>
                          🔥 {calories.range} cal
                        </div>
                      ) : null;
                    })()}

                    {(workout.workout?.description || workout.description) && (
                      <p style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#CCCCCC', lineHeight: '1.4' }}>
                        {workout.workout?.description || workout.description}
                      </p>
                    )}

                    {/* Completed Workout Stats - Show Strava-synced data */}
                    {workout.completed && (() => {
                      const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
                      const completionData = workoutCompletions[workoutKey];

                      if (!completionData) return null;

                      const hasRichData = completionData.pace || completionData.avgHeartRate || completionData.cadence || completionData.elevationGain;

                      return (
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 212, 255, 0.15) 100%)',
                          border: '1px solid rgba(0, 255, 136, 0.3)',
                          borderRadius: '12px',
                          padding: '12px',
                          marginBottom: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1rem' }}>✓</span>
                            <span style={{ color: '#00FF88', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.5px' }}>
                              {completionData.autoCompletedFromStrava ? '🔗 SYNCED FROM STRAVA' : 'COMPLETED'}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', fontSize: '0.85rem' }}>
                            {completionData.distance && (
                              <div>
                                <div style={{ color: '#999', fontSize: '0.75rem' }}>Distance</div>
                                <div style={{ color: '#FFF', fontWeight: '600' }}>{completionData.distance} mi</div>
                              </div>
                            )}
                            {completionData.duration && (
                              <div>
                                <div style={{ color: '#999', fontSize: '0.75rem' }}>Duration</div>
                                <div style={{ color: '#FFF', fontWeight: '600' }}>{completionData.duration} min</div>
                              </div>
                            )}
                            {completionData.pace && (
                              <div>
                                <div style={{ color: '#999', fontSize: '0.75rem' }}>Pace</div>
                                <div style={{ color: '#FFF', fontWeight: '600' }}>{completionData.pace}</div>
                              </div>
                            )}
                            {completionData.avgHeartRate && (
                              <div>
                                <div style={{ color: '#999', fontSize: '0.75rem' }}>Avg HR</div>
                                <div style={{ color: '#FFF', fontWeight: '600' }}>{completionData.avgHeartRate} bpm</div>
                              </div>
                            )}
                            {completionData.cadence && (
                              <div>
                                <div style={{ color: '#999', fontSize: '0.75rem' }}>Cadence</div>
                                <div style={{ color: '#FFF', fontWeight: '600' }}>{Math.round(completionData.cadence)} spm</div>
                              </div>
                            )}
                            {completionData.elevationGain && (
                              <div>
                                <div style={{ color: '#999', fontSize: '0.75rem' }}>Elevation</div>
                                <div style={{ color: '#FFF', fontWeight: '600' }}>{completionData.elevationGain} ft</div>
                              </div>
                            )}
                          </div>

                          {completionData.notes && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                              <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: '4px' }}>Notes</div>
                              <div style={{ color: '#CCC', fontSize: '0.85rem' }}>{completionData.notes}</div>
                            </div>
                          )}

                          {completionData.stravaActivityUrl && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                              <a
                                href={completionData.stravaActivityUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#FC4C02',
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                View on Strava →
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span 
                        className="badge"
                        style={{ 
                          background: `${getWorkoutTypeColor(workout.type)}30`,
                          color: getWorkoutTypeColor(workout.type),
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}
                      >
                        {workout.focus}
                      </span>
                      {workout.equipmentSpecific && userProfile?.preferredBikeDays?.includes(workout.day) && (
                        <span className="badge badge-warning" style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                          {formatEquipmentName(userProfile.standUpBikeType)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {workout.type === 'rest' ? (
                    // Rest day specific buttons
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      minWidth: '140px',
                      flexShrink: 0
                    }}>
                      {/* Mark Complete Button for Rest Days */}
                      <button
                        className="btn"
                        style={{
                          fontSize: '0.85rem',
                          padding: '10px 12px',
                          fontWeight: '600',
                          background: workout.completed ? 'rgba(156, 163, 175, 0.1)' : 'rgba(0, 255, 136, 0.1)',
                          color: workout.completed ? '#9ca3af' : '#00FF88',
                          border: workout.completed ? '1px solid rgba(156, 163, 175, 0.3)' : '1px solid rgba(0, 255, 136, 0.3)',
                          textAlign: 'center'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkComplete(workout);
                        }}
                      >
                        {workout.completed ? '⏪ Undo Rest' : '✅ Rested'}
                      </button>

                      <button
                        className="btn"
                        style={{
                          fontSize: '0.8rem',
                          padding: '8px 12px',
                          background: 'rgba(34, 197, 94, 0.1)',
                          color: '#22c55e',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          fontWeight: '600',
                          textAlign: 'center'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSomethingElse(workout);
                        }}
                      >
                        🌟 Add Workout
                      </button>
                    </div>
                  ) : workout.type !== 'rest' && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      minWidth: '140px',
                      flexShrink: 0
                    }}>
                      {/* Mark Complete Button - Conditional based on Strava */}
                      <button
                        className="btn"
                        style={{
                          fontSize: '0.85rem',
                          padding: '10px 12px',
                          fontWeight: '600',
                          background: workout.completed
                            ? 'rgba(156, 163, 175, 0.1)'
                            : userProfile?.stravaConnected
                              ? 'rgba(0, 212, 255, 0.1)'
                              : 'rgba(0, 255, 136, 0.1)',
                          color: workout.completed
                            ? '#9ca3af'
                            : userProfile?.stravaConnected
                              ? '#00D4FF'
                              : '#00FF88',
                          border: workout.completed
                            ? '1px solid rgba(156, 163, 175, 0.3)'
                            : userProfile?.stravaConnected
                              ? '1px solid rgba(0, 212, 255, 0.3)'
                              : '1px solid rgba(0, 255, 136, 0.3)',
                          textAlign: 'center',
                          cursor: workout.completed
                            ? 'pointer'
                            : userProfile?.stravaConnected
                              ? 'default'
                              : 'pointer',
                          opacity: userProfile?.stravaConnected && !workout.completed ? 0.7 : 1
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Only allow manual completion if not connected to Strava or if undoing
                          if (!userProfile?.stravaConnected || workout.completed) {
                            handleMarkComplete(workout);
                          }
                        }}
                      >
                        {workout.completed
                          ? '⏪ Undo'
                          : userProfile?.stravaConnected
                            ? <>
                                <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' }}>
                                  <path fill="#FC4C02" d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                                </svg>
                                Strava Sync
                              </>
                            : '📝 Log Workout'}
                      </button>

                      {/* Show adventure options for adventure/flexible users */}
                      {(userProfile?.trainingStyle === 'adventure' ||
                        (userProfile?.trainingStyle === 'flexible' && ['tempo', 'intervals', 'longRun', 'hills'].includes(workout.type))) &&
                       ['tempo', 'intervals', 'longRun', 'hills', 'easy'].includes(workout.type) &&
                       !(() => {
                         const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
                         const completionData = workoutCompletions[workoutKey];
                         return completionData?.autoCompletedFromStrava;
                       })() && (
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#4299e1', border: '1px solid #4299e1', textAlign: 'center' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const workoutKey = `${currentWeek}-${workout.day}`;
                            if (showingOptions[workoutKey]) {
                              handleHideOptions(workout);
                            } else {
                              handleShowOptions(workout);
                            }
                          }}
                        >
                          {(() => {
                            const workoutKey = `${currentWeek}-${workout.day}`;
                            return showingOptions[workoutKey] ? '📋 Hide' : '🎲 Choose Adventure';
                          })()}
                        </button>
                      )}
                      
                      {/* Show brick option prominently for Sunday long runs when user has equipment */}
                      {(workout.type === 'longRun' || workout.type === 'brickLongRun') && userProfile?.standUpBikeType && workout.day === 'Sunday' &&
                       !(() => {
                         const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
                         const completionData = workoutCompletions[workoutKey];
                         return completionData?.autoCompletedFromStrava;
                       })() && (
                        <button
                          className="btn"
                          style={{
                            fontSize: '0.8rem',
                            padding: '8px 12px',
                            fontWeight: '600',
                            background: workout.type === 'brickLongRun' ? '#48bb78' : '#ed8936',
                            color: 'white',
                            border: `1px solid ${workout.type === 'brickLongRun' ? '#48bb78' : '#ed8936'}`,
                            textAlign: 'center'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (workout.type === 'brickLongRun') {
                              handleMakeRegularRun(workout);
                            } else {
                              const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
                              if (showBrickOptions[workoutKey]) {
                                handleHideBrickOptions(workout);
                              } else {
                                handleShowBrickOptions(workout);
                              }
                            }
                          }}
                        >
                          {workout.type === 'brickLongRun' ? '🏃 Run Only' : '🧱 Make Brick'}
                        </button>
                      )}
                      
                      {/* Show standard brick option for non-Sunday long runs */}
                      {(workout.type === 'longRun' || workout.type === 'brickLongRun') && userProfile?.standUpBikeType && workout.day !== 'Sunday' &&
                       !(() => {
                         const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
                         const completionData = workoutCompletions[workoutKey];
                         return completionData?.autoCompletedFromStrava;
                       })() && (
                        <button
                          className="btn btn-success"
                          style={{
                            fontSize: '0.8rem',
                            padding: '8px 12px',
                            fontWeight: '600',
                            background: workout.type === 'brickLongRun' ? '#805ad5' : '#ff6b6b',
                            color: 'white',
                            border: `1px solid ${workout.type === 'brickLongRun' ? '#805ad5' : '#ff6b6b'}`,
                            textAlign: 'center'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (workout.type === 'brickLongRun') {
                              handleMakeRegularRun(workout);
                            } else {
                              const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
                              if (showBrickOptions[workoutKey]) {
                                handleHideBrickOptions(workout);
                              } else {
                                handleShowBrickOptions(workout);
                              }
                            }
                          }}
                        >
                          {workout.type === 'brickLongRun' ? '🏃 Run Only' : '🧱 Make Brick'}
                        </button>
                      )}

                      {/* Life Adaptations - hide if synced from Strava */}
                      {!(() => {
                        const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
                        const completionData = workoutCompletions[workoutKey];
                        return completionData?.autoCompletedFromStrava;
                      })() && (
                        <button
                          className="btn"
                          style={{
                            fontSize: '0.8rem',
                            padding: '8px 14px',
                            textAlign: 'center',
                            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(0, 255, 136, 0.2) 100%)',
                            border: '2px solid rgba(0, 212, 255, 0.5)',
                            color: '#00D4FF',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.35) 0%, rgba(0, 255, 136, 0.3) 100%)';
                            e.currentTarget.style.border = '2px solid rgba(0, 212, 255, 0.8)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(0, 255, 136, 0.2) 100%)';
                            e.currentTarget.style.border = '2px solid rgba(0, 212, 255, 0.5)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSomethingElse(workout);
                          }}
                        >
                          Life Adaptations
                        </button>
                      )}

                      {/* Revert to Original button for replaced workouts */}
                      {workout.replacementReason && workoutIdx === 0 && (
                        <button
                          className="btn"
                          style={{
                            fontSize: '0.8rem',
                            padding: '6px 12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMakeRegularRun(workout);
                          }}
                          title="Restore the original scheduled workout"
                        >
                          ↩️ Revert to Original
                        </button>
                      )}

                      {/* Remove button for secondary workouts */}
                      {workoutIdx > 0 && (
                        <button
                          className="btn"
                          style={{
                            fontSize: '0.8rem',
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Remove this workout?')) {
                              handleRemoveWorkout(originalWorkout, workoutIdx);
                            }
                          }}
                        >
                          🗑️ Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Brick Workout Split Options */}
                {(() => {
                  const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
                  const isShowingBrickOptions = showBrickOptions[workoutKey];
                  const originalDistance = parseFloat(workout.workout?.name?.match(/\d+/)?.[0]) || 10;

                  if (!isShowingBrickOptions || workout.type !== 'longRun') return null;

                  const splitOptions = [
                    {
                      key: 'heavy-run',
                      emoji: '🏃‍♂️',
                      label: 'Heavy Run',
                      runMiles: Math.round(originalDistance * 0.8),
                      bikeMiles: Math.round(originalDistance * 0.2),
                      description: 'Feeling strong - mostly running',
                      color: '#4299e1'
                    },
                    {
                      key: 'balanced',
                      emoji: '⚖️',
                      label: 'Balanced',
                      runMiles: Math.round(originalDistance * 0.6),
                      bikeMiles: Math.round(originalDistance * 0.4),
                      description: 'Standard brick workout',
                      color: '#ed8936'
                    },
                    {
                      key: 'heavy-bike',
                      emoji: '🚴',
                      label: 'Heavy Bike',
                      runMiles: Math.round(originalDistance * 0.4),
                      bikeMiles: Math.round(originalDistance * 0.6),
                      description: 'Legs need a break - more biking',
                      color: '#9f7aea'
                    },
                    {
                      key: 'light-run',
                      emoji: '🚴‍♂️',
                      label: 'Light Run',
                      runMiles: Math.round(originalDistance * 0.2),
                      bikeMiles: Math.round(originalDistance * 0.8),
                      description: 'Recovery mode - minimal running',
                      color: '#48bb78'
                    }
                  ];

                  return (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '0'
                      }}>
                        <h4 style={{ margin: '0 0 16px 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: '700' }}>
                          🧱 Choose Your Brick Workout Split
                        </h4>
                        <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#CCCCCC' }}>
                          All options = {originalDistance} miles total training load. Pick based on how your legs feel today:
                        </p>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {splitOptions.map((option) => (
                            <div
                              key={option.key}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '2px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                padding: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMakeBrick(workout, option.key);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = option.color;
                                e.currentTarget.style.background = `${option.color}15`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '1.5rem' }}>{option.emoji}</span>
                                  <strong style={{ color: option.color, fontSize: '1.1rem' }}>{option.label}</strong>
                                </div>
                                <span style={{ fontSize: '0.9rem', color: '#00D4FF', fontWeight: 'bold' }}>
                                  {option.runMiles}mi + {option.bikeMiles} RunEQ
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: '#aaa' }}>
                                {option.description}
                              </p>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHideBrickOptions(workout);
                          }}
                          style={{
                            marginTop: '16px',
                            padding: '8px 16px',
                            background: 'rgba(156, 163, 175, 0.1)',
                            color: '#9ca3af',
                            border: '1px solid rgba(156, 163, 175, 0.3)',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            width: '100%'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Workout Options Display */}
                {(() => {
                const workoutKey = `${currentWeek}-${workout.day}`;
                const options = workoutOptions[workoutKey];
                const isShowing = showingOptions[workoutKey];
                
                if (!isShowing || !options || options.length === 0) return null;
                
                return (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '0'
                    }}>
                      <h4 style={{ margin: '0 0 16px 0', color: '#00D4FF', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: '700' }}>
                        🎲 Choose Your {workout.type === 'longRun' ? 'Long Run' :
                                        workout.type === 'intervals' ? 'Speed' :
                                        workout.type === 'tempo' ? 'Tempo' :
                                        workout.type === 'hills' ? 'Hill' :
                                        'Easy Run'} Adventure
                      </h4>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {options.map((option, index) => {
                          const colors = getIntensityColors(option.intensity, option.difficulty);
                          const workoutKey = `${currentWeek}-${workout.day}`;
                          const isSelected = selectedOptions[workoutKey]?.id === option.id;
                          
                          return (
                            <div 
                            key={option.id}
                            className="card"
                            style={{ 
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(74, 222, 128, 0.2)' : colors.bg,
                              border: isSelected ? '3px solid #4ade80' : `2px solid ${colors.border}`,
                              borderLeft: isSelected ? '6px solid #22c55e' : `6px solid ${colors.accent}`,
                              transition: 'all 0.2s ease',
                              backdropFilter: 'blur(3px)', // Much reduced blur
                              boxShadow: isSelected ? '0 4px 20px rgba(74, 222, 128, 0.4)' : `0 4px 16px ${colors.accent}20`,
                              transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation(); // Prevent workout detail navigation
                              handleSelectOption(workout, option);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = colors.bg.replace('0.1', '0.2').replace('0.15', '0.25');
                              e.currentTarget.style.border = `2px solid ${colors.accent}`;
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = `0 4px 12px ${colors.accent}40`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = colors.bg;
                              e.currentTarget.style.border = `2px solid ${colors.border}`;
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '1.2rem' }}>{colors.icon}</span>
                                  <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#FFFFFF' }}>
                                    {option.name}
                                  </h5>
                                  {isSelected && (
                                    <span style={{ 
                                      background: '#22c55e', 
                                      color: 'white', 
                                      padding: '2px 6px', 
                                      borderRadius: '4px', 
                                      fontSize: '0.7rem',
                                      fontWeight: '600'
                                    }}>
                                      ✓ SELECTED
                                    </span>
                                  )}
                                </div>
                                <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#FFFFFF', lineHeight: '1.4', opacity: '1' }}>
                                  {option.description}
                                </p>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#FFFFFF', opacity: '1', marginBottom: '8px' }}>
                                  <span>⏱️ {option.timeRequired}</span>
                                  <span>📍 {option.location}</span>
                                  <span>💪 {option.difficulty}</span>
                                </div>
                              </div>
                              <div style={{
                                background: colors.accent + '20',
                                color: '#FFFFFF',
                                padding: '6px 12px',
                                borderRadius: '16px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                marginLeft: '12px',
                                border: `1px solid ${colors.accent}40`
                              }}>
                                {option.focus}
                              </div>
                            </div>
                            <div style={{
                              background: colors.accent + '15',
                              color: '#FFFFFF',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              border: `1px solid ${colors.accent}30`
                            }}>
                              💡 {option.benefits}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                      
                      <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#CCCCCC', fontStyle: 'italic' }}>
                          💡 <strong>All options target the same training system</strong> - choose based on your mood, time, and location!
                        </p>
                      </div>
                      
                      {/* Confirmation buttons when selection is made */}
                      {(() => {
                        const workoutKey = `${currentWeek}-${workout.day}`;
                        const selectedOption = selectedOptions[workoutKey];
                        
                        logger.log('🔍 Checking confirmation buttons:', {
                          workoutKey,
                          selectedOption: selectedOption?.shortName || 'none',
                          hasSelection: !!selectedOption,
                          selectedOptionsState: selectedOptions
                        });
                        
                        if (!selectedOption) {
                          logger.log('❌ No selectedOption found for key:', workoutKey);
                          logger.log('   Available keys:', Object.keys(selectedOptions));
                          return null;
                        }
                        
                        logger.log('✅ Showing confirmation buttons for:', selectedOption.shortName);
                        logger.log('   Confirmation buttons should be visible now!');
                        console.warn('🚨 BUTTONS RENDERING NOW - they should be bright green and obvious!');
                        
                        return (
                          <div style={{ 
                            marginTop: '16px', 
                            padding: '20px', 
                            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.3), rgba(34, 197, 94, 0.2))', 
                            border: '3px solid #22c55e',
                            borderRadius: '12px',
                            boxShadow: '0 8px 25px rgba(34, 197, 94, 0.4)',
                            position: 'relative',
                            zIndex: 1000
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              marginBottom: '12px'
                            }}>
                              <span style={{ fontSize: '1.2rem' }}>✅</span>
                              <span style={{ 
                                color: '#4ade80', 
                                fontWeight: '600',
                                fontSize: '0.9rem'
                              }}>
                                Selected: {selectedOption.shortName}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation(); // Prevent workout detail navigation
                                  handleConfirmSelection(workout);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '12px 20px',
                                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                  color: 'white',
                                  border: '2px solid #16a34a',
                                  borderRadius: '8px',
                                  fontSize: '1rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#22c55e'}
                                onMouseLeave={(e) => e.target.style.background = '#4ade80'}
                              >
                                ✓ Confirm Selection
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation(); // Prevent workout detail navigation
                                  handleCancelSelection(workout);
                                }}
                                style={{
                                  padding: '8px 16px',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                                  e.target.style.borderColor = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                                  e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                }}
                              >
                                ✗ Cancel
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
                })()}
              </div>
              ))}

              {/* Add Workout Button */}
              <button
                className="btn"
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
            border: '2px solid rgba(0, 212, 255, 0.3)'
          }}>
            <h2 style={{ color: '#00D4FF', marginTop: 0, marginBottom: '20px' }}>
              Mark Workout Complete
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#FFFFFF', fontSize: '16px', marginBottom: '8px' }}>
                {completionModal.workout?.workout?.name || completionModal.workout?.name}
              </h3>
              <p style={{ color: '#AAAAAA', fontSize: '14px', margin: 0 }}>
                {completionModal.workout?.type} - {completionModal.workout?.focus}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#CCCCCC',
                fontSize: '14px',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Distance Completed (miles)
              </label>
              <input
                type="number"
                step="0.1"
                value={completionModal.distance}
                onChange={(e) => setCompletionModal(prev => ({ ...prev, distance: e.target.value }))}
                placeholder="Enter distance"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                color: '#CCCCCC',
                fontSize: '14px',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Notes (optional)
              </label>
              <textarea
                value={completionModal.notes}
                onChange={(e) => setCompletionModal(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="How did it feel? Any observations?"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontFamily: 'inherit',
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
                onClick={() => setCompletionModal({ isOpen: false, workout: null, distance: '', notes: '' })}
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
            padding: '40px',
            maxWidth: '600px',
            width: '100%',
            border: '2px solid rgba(0, 212, 255, 0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ color: '#00D4FF', marginTop: 0 }}>🎫 Setup Beta Codes</h2>
            <p style={{ color: '#AAAAAA', marginBottom: '20px' }}>
              This will add 10 unique single-use beta codes to Firestore.
            </p>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '30px',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}>
              <strong style={{ color: '#00D4FF' }}>Your 10 Beta Codes:</strong>
              <div style={{ marginTop: '10px' }}>
                <div>1. VVVFRS</div>
                <div>2. SVTQHH</div>
                <div>3. EN88AQ</div>
                <div>4. H8RXZ6</div>
                <div>5. 69JUVC</div>
                <div>6. XJXHZM</div>
                <div>7. 2EHTS9</div>
                <div>8. ZWNVSS</div>
                <div>9. KFCHAK</div>
                <div>10. 8E685H</div>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 184, 0, 0.1)',
              border: '1px solid rgba(255, 184, 0, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              color: '#FFB800'
            }}>
              <strong>⚠️ Before clicking:</strong>
              <ol style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
                <li>Make sure Firestore security rules are updated</li>
                <li>This only needs to be done once</li>
                <li>Each code can only be used once</li>
              </ol>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSetupBetaCodes}
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
                🚀 Add Codes to Firestore
              </button>
              <button
                onClick={() => setShowBetaSetup(false)}
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
      </div>
    </>
  );
}

export default Dashboard;
