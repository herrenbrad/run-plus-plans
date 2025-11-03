import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import FirestoreService from '../services/FirestoreService';
import { TempoWorkoutLibrary } from '../lib/tempo-workout-library.js';
import { IntervalWorkoutLibrary } from '../lib/interval-workout-library.js';
import { LongRunWorkoutLibrary } from '../lib/long-run-workout-library.js';
import { HillWorkoutLibrary } from '../lib/hill-workout-library.js';
import WorkoutOptionsService from '../services/WorkoutOptionsService.js';
import BrickWorkoutService from '../services/brickWorkoutService.js';
import SomethingElseModal from './SomethingElseModal';
import { formatTrainingSystem, formatEquipmentName, formatPhase, titleCase } from '../utils/typography';

function Dashboard({ userProfile, trainingPlan, clearAllData }) {
  const navigate = useNavigate();
  
  // Calculate the actual current week based on training plan start date
  const calculateCurrentWeek = () => {
    if (!trainingPlan?.planOverview?.startDate) {
      return 1; // Default to week 1 if no start date
    }

    const today = new Date();
    const startDate = new Date(trainingPlan.planOverview.startDate);

    // If we're before the start date, return 1 (show first week)
    if (today < startDate) {
      return 1;
    }

    // Calculate weeks since start
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceStart = Math.floor((today - startDate) / msPerWeek);
    return Math.min(weeksSinceStart + 1, trainingPlan?.planOverview?.totalWeeks || 12);
  };

  // Calculate week date range for display
  const getWeekDateRange = (weekNumber) => {
    if (!trainingPlan?.planOverview?.startDate) {
      return null;
    }

    const startDate = new Date(trainingPlan.planOverview.startDate);
    const msPerDay = 24 * 60 * 60 * 1000;

    // Calculate the Monday of this training week
    const weekStartDate = new Date(startDate.getTime() + ((weekNumber - 1) * 7 * msPerDay));
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
  const refreshTrainingPlan = () => {
    if (!userProfile || !trainingPlan) return;
    
    try {
      // Temporarily disabled - using working fallback system
      // const realWorldTrainingService = new RealWorldTrainingService();
      
      // Reconstruct the original form data from user profile and training plan
      const formData = {
        raceDistance: trainingPlan.planOverview.raceDistance,
        raceDate: trainingPlan.planOverview.raceDate,
        startDate: trainingPlan.planOverview.startDate,
        currentRaceTime: userProfile.currentRaceTime,
        runsPerWeek: trainingPlan.planOverview.runsPerWeek,
        experienceLevel: userProfile.experienceLevel || 'recreational',
        standUpBikeType: userProfile.standUpBikeType,
        availableDays: userProfile.availableDays,
        preferredBikeDays: userProfile.preferredBikeDays,
        longRunDay: userProfile.longRunDay || 'Sunday',
        trainingStyle: userProfile.trainingStyle || 'prescribed'
      };
      
      // Create new plan structure compatible with existing UI
      const newPlan = {
        planOverview: {
          raceDistance: formData.raceDistance,
          raceDate: formData.raceDate,
          startDate: formData.startDate,
          totalWeeks: formData.weeksAvailable || 16,
          runsPerWeek: formData.runsPerWeek
        },
        weeks: [] // Will be populated using proper TrainingPlanService
      };
      
      // Preserve any workout modifications from existing plan
      const modifiedWorkouts = JSON.parse(localStorage.getItem('runeq_modifiedWorkouts') || '{}');
      
      // Update localStorage with new plan
      localStorage.setItem('runeq_trainingPlan', JSON.stringify(newPlan));
      
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

    console.log('🔢 Calculating mileage for week:', weekData.week);
    console.log('📋 Workouts:', weekData.workouts);

    let runMiles = 0;
    let bikeMiles = 0; // This will be the actual bike miles (not equivalent)
    let ellipticalMiles = 0; // This will be the actual elliptical miles (not equivalent)
    let runEqMiles = 0; // RunEQ miles are already equivalent - don't convert again!

    weekData.workouts.forEach(workout => {
      const workoutKey = `${weekData.week}-${workout.day}`;
      const modifiedWorkout = modifiedWorkouts[workoutKey];
      const currentWorkout = modifiedWorkout || workout;
      
      console.log(`🏃 ${workout.day}: ${currentWorkout.workout?.name} (type: ${currentWorkout.type})`);

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
          console.log(`   ✅ Extracted ${extractedRunEq} RunEQ miles from "${currentWorkout.workout?.name}" (already equivalent)`);
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
          console.log(`   📏 Extracted ${extractedMiles} miles from "${currentWorkout.workout?.name}"`);
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
          console.log(`   📏 Using default ${defaultMiles} miles for ${currentWorkout.type} workout "${currentWorkout.workout?.name}"`);
          runMiles += defaultMiles;
        }
      }
    });

    // Calculate equivalent miles (bike at 3:1 ratio, elliptical at 2:1 ratio)
    // RunEQ miles are already equivalent, so add them directly
    const bikeEquivalentMiles = bikeMiles / 3;
    const ellipticalEquivalentMiles = ellipticalMiles / 2;
    const equivalentMiles = bikeEquivalentMiles + ellipticalEquivalentMiles + runEqMiles;
    const totalMiles = runMiles + equivalentMiles;

    console.log('📊 Final mileage calculation:');
    console.log(`   Running: ${runMiles} miles`);
    console.log(`   Biking: ${bikeMiles} miles (${bikeEquivalentMiles} equivalent)`);
    console.log(`   Elliptical: ${ellipticalMiles} miles (${ellipticalEquivalentMiles} equivalent)`);
    console.log(`   RunEQ: ${runEqMiles} miles (already equivalent)`);
    console.log(`   Total: ${totalMiles} miles`);

    const result = {
      runMiles: Math.round(runMiles * 10) / 10,
      bikeMiles: Math.round(bikeMiles * 10) / 10,
      ellipticalMiles: Math.round(ellipticalMiles * 10) / 10,
      runEqMiles: Math.round(runEqMiles * 10) / 10,
      equivalentMiles: Math.round(equivalentMiles * 10) / 10,
      totalMiles: Math.round(totalMiles * 10) / 10
    };

    console.log('📊 Rounded result:', result);
    return result;
  };
  
  // Load current week from localStorage or calculate it
  const [currentWeek, setCurrentWeek] = useState(() => {
    // ALWAYS calculate current week based on start date for new plans
    const calculatedWeek = calculateCurrentWeek();

    const savedWeek = localStorage.getItem('runeq_currentWeek');
    const savedStartDate = localStorage.getItem('runeq_startDate');

    // If plan start date changed, use calculated week (new plan)
    if (trainingPlan?.planOverview?.startDate !== savedStartDate) {
      console.log('📅 New plan detected - using calculated week:', calculatedWeek);
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

  // Load modified workouts from localStorage on component mount
  useEffect(() => {
    try {
      const savedModifiedWorkouts = localStorage.getItem('runeq_modifiedWorkouts');
      console.log('📦 Dashboard loading from localStorage:', savedModifiedWorkouts);
      if (savedModifiedWorkouts) {
        const parsed = JSON.parse(savedModifiedWorkouts);
        console.log('📦 Dashboard parsed data:', parsed);
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
            console.log('📦 Loaded modified workouts from Firestore:', result.data);
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
        console.log('💾 Dashboard saving to localStorage:', modifiedWorkouts);
        localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(modifiedWorkouts));
      } catch (error) {
        console.warn('Error saving modified workouts:', error);
      }
    }
  }, [modifiedWorkouts, hasLoaded]);

  // Load workout completion status from training plan on mount
  useEffect(() => {
    if (!trainingPlan?.weeks) return;

    const completions = {};
    trainingPlan.weeks.forEach(week => {
      week.workouts?.forEach(workout => {
        if (workout.completed !== undefined) {
          const workoutKey = `${week.week}-${workout.day}`;
          completions[workoutKey] = {
            completed: workout.completed,
            completedAt: workout.completedAt
          };
        }
      });
    });

    setWorkoutCompletions(completions);
  }, [trainingPlan]);

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

  // Intensity-based color system for workout cards
  const getIntensityColors = (intensity, difficulty) => {
    const intensityMap = {
      'Very Easy': { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', accent: '#22c55e', icon: '😌' },
      'Easy': { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', accent: '#22c55e', icon: '🟢' },
      'Easy-Moderate': { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', accent: '#f59e0b', icon: '🟡' },
      'Moderate': { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', accent: '#f59e0b', icon: '🔶' },
      'Medium-Hard': { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', accent: '#ef4444', icon: '🔸' },
      'Hard': { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', accent: '#ef4444', icon: '🔥' },
      'Very Hard': { bg: 'rgba(220, 38, 127, 0.1)', border: 'rgba(220, 38, 127, 0.3)', accent: '#dc2626', icon: '💥' },
      'Variable': { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', accent: '#a855f7', icon: '⚡' },
      'Variable Hard': { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)', accent: '#a855f7', icon: '⚡' },
      'Progressive': { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', accent: '#3b82f6', icon: '📈' }
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
    console.log('🔍 generateWeekWorkouts - profile:', profile);
    console.log('🚴 preferredBikeDays:', profile?.preferredBikeDays);
    console.log('📀 localStorage userProfile:', localStorage.getItem('runeq_userProfile'));
    console.log('📅 localStorage trainingPlan:', localStorage.getItem('runeq_trainingPlan'));
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

    console.log('🚴 Checking bike days for each day:');
    console.log('  Monday bike day?', profile?.preferredBikeDays?.includes('Monday'));
    console.log('  Tuesday bike day?', profile?.preferredBikeDays?.includes('Tuesday'));  
    console.log('  Wednesday bike day?', profile?.preferredBikeDays?.includes('Wednesday'));
    console.log('  Thursday bike day?', profile?.preferredBikeDays?.includes('Thursday'));
    console.log('  Friday bike day?', profile?.preferredBikeDays?.includes('Friday'));
    console.log('  Saturday bike day?', profile?.preferredBikeDays?.includes('Saturday'));
    console.log('  Sunday bike day?', profile?.preferredBikeDays?.includes('Sunday'));

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
      const startDate = new Date(trainingPlan?.planOverview?.startDate);
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
        console.log('Using training plan data for week', currentWeek, 'with', weekData.workouts.length, 'workouts');
        // Check for brick workouts in the data
        weekData.workouts.forEach(workout => {
          if (workout.type === 'brickLongRun') {
            console.log('Found brick workout:', workout.day, workout.workout?.name);
          }
        });
        return weekData;
      }
    }

    // Fallback to generated workouts if training plan is empty/missing
    console.log('Falling back to generated workouts for week', currentWeek);
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

  const handleSomethingElse = (workout) => {
    setSomethingElseModal({
      isOpen: true,
      workout: workout
    });
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

    const newCompletedStatus = !workout.completed;
    const workoutKey = `${currentWeek}-${workout.day}`;

    // INSTANT UI UPDATE: Update local state immediately for smooth UX
    setWorkoutCompletions(prev => ({
      ...prev,
      [workoutKey]: {
        completed: newCompletedStatus,
        completedAt: newCompletedStatus ? new Date().toISOString() : null
      }
    }));

    // BACKGROUND SAVE: Update Firestore without blocking UI
    try {
      const result = await FirestoreService.markWorkoutComplete(
        auth.currentUser.uid,
        currentWeek,
        workout.day,
        newCompletedStatus
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
    // Store the modified workout
    const workoutKey = `${currentWeek}-${newWorkout.day}`;
    const updatedWorkouts = {
      ...modifiedWorkouts,
      [workoutKey]: newWorkout
    };
    
    setModifiedWorkouts(updatedWorkouts);

    // Save to localStorage immediately
    try {
      localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(updatedWorkouts));
      console.log('💾 Saved workout replacement:', workoutKey, newWorkout.workout?.name);
    } catch (error) {
      console.error('Error saving modified workouts:', error);
    }

    // Close the modal
    handleCloseSomethingElse();
  };

  const handleMakeBrick = (workout) => {
    // Convert the long run to a brick workout
    const originalDistance = parseFloat(workout.workout?.name?.match(/\d+/)?.[0]) || 8;
    const runDistance = Math.round(originalDistance * 0.6);
    const bikeDistance = Math.round(originalDistance * 0.4 * 2.5);

    const brickWorkout = {
      ...workout,
      type: 'brickLongRun',
      workout: {
        name: `Brick Long Run (${runDistance}mi run + ${bikeDistance}mi ${formatEquipmentName(userProfile?.standUpBikeType)})`,
        description: `${runDistance} mile run + ${bikeDistance} mile ${formatEquipmentName(userProfile?.standUpBikeType)} ride`
      },
      focus: 'Brick Endurance',
      equipmentSpecific: true,
      replacementReason: 'Converted to brick workout'
    };

    // Store the modified workout
    const workoutKey = `${currentWeek}-${workout.day}`;
    setModifiedWorkouts(prev => ({
      ...prev,
      [workoutKey]: brickWorkout
    }));
  };

  const handleMakeRegularRun = (workout) => {
    // Remove the modified workout to revert to original
    const workoutKey = `${currentWeek}-${workout.day}`;
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
    
    console.log('🎯 Option selected:', {
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
      
      console.log('📝 Direct state update:', {
        oldState: selectedOptions,
        newState: newSelectedOptions,
        workoutKey,
        selectedOption: selectedOption.shortName
      });
      
      setSelectedOptions(newSelectedOptions);
      
      // Force a re-render to make sure the state updates
      console.log('✨ State update dispatched, should see confirmation buttons next');
      
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
      console.log('✅ SAVED to Firestore:', selectedOption.name, 'for', workout.day);
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

  // Function to get workout (modified or original)
  const getWorkout = (originalWorkout) => {
    const workoutKey = `${currentWeek}-${originalWorkout.day}`;

    // Start with modified workout if it exists, otherwise original
    const baseWorkout = modifiedWorkouts[workoutKey] || originalWorkout;

    // Merge completion status from local state (for instant UI updates)
    const completionData = workoutCompletions[workoutKey];
    if (completionData) {
      return {
        ...baseWorkout,
        completed: completionData.completed,
        completedAt: completionData.completedAt
      };
    }

    return baseWorkout;
  };

  return (
    <>
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ color: '#AAAAAA', padding: '20px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: '0 0 8px 0' }}>
                {(() => {
                  const dateRange = getWeekDateRange(currentWeek);
                  return dateRange
                    ? `Week ${currentWeek} (Week of ${dateRange})`
                    : `Week ${currentWeek} Training`;
                })()}
              </h1>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
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
                <span style={{ color: '#EEEEEE', fontSize: '0.9rem', fontWeight: '500' }}>
                  {formatPhase(currentWeekData.phase || 'base')}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                disabled={currentWeek <= 1}
                style={{ background: 'rgba(255,255,255,0.1)', color: '#AAAAAA', border: '1px solid rgba(255,255,255,0.2)' }}
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
                  padding: '8px 12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  minWidth: '120px'
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
                style={{ background: 'rgba(255,255,255,0.1)', color: '#AAAAAA', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Next →
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Update your training plan with the latest features? This will regenerate workouts using current code while keeping your profile.')) {
                    refreshTrainingPlan();
                  }
                }}
                style={{ 
                  background: 'rgba(34, 197, 94, 0.1)', 
                  color: '#22c55e', 
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  marginLeft: '12px',
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  borderRadius: '4px'
                }}
              >
                🔄 Refresh Plan
              </button>

              {/* Beta Code Setup Button - Only show for admin (your email) */}
              {auth.currentUser?.email === 'herrenbrad@gmail.com' && (
                <button
                  onClick={() => setShowBetaSetup(true)}
                  style={{
                    background: 'rgba(0, 212, 255, 0.1)',
                    color: '#00D4FF',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    marginLeft: '12px',
                    fontSize: '0.8rem',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  🎫 Setup Beta Codes
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
                  marginLeft: '12px',
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
                  marginLeft: '12px',
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
      </div>

      <div className="container" style={{ padding: '20px 16px' }}>
        {/* Current Training System */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
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
            <button 
              className="btn btn-secondary"
              onClick={() => {
                const totalWeeks = trainingPlan?.planOverview?.totalWeeks || 16;
                alert('🔄 Switch Training System\n\nYou\'re at week ' + currentWeek + ' of ' + totalWeeks + ' - perfect timing!\n\n✅ Week ' + (currentWeek-1) + ' progress preserved\n📅 Weeks ' + (currentWeek+1) + '-' + totalWeeks + ' will be redesigned\n🎯 Race day plan unchanged\n\nChoose new system:\n• Practical Periodization (💡 80/20 easy/hard)\n• High Mileage (💪 Volume focused)\n• Polarized (⚡ Elite inspired)\n• Adaptive Pacing (⏱️ Fitness test driven)\n• Ben Parkes Method (🎯 Research-based)\n\nThis feature would show a full system selector!');
              }}
              style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}
            >
              🔄 Switch System
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px', borderRadius: '6px' }}>
              <strong>Focus:</strong> {currentWeekData.phase ? currentWeekData.phase.charAt(0).toUpperCase() + currentWeekData.phase.slice(1) + ' Phase' : 'Periodized Training'}
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px', borderRadius: '6px' }}>
              <strong>Current Phase:</strong> {(currentWeekData.phase || 'base').toUpperCase()}
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px', borderRadius: '6px' }}>
              <strong>Switch Impact:</strong> Minimal at Week {currentWeek}
            </div>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>Week Progress</h2>
            <span className="badge badge-info">
              {currentWeekData.workouts.filter(w => w.completed).length}/{currentWeekData.workouts.filter(w => w.type !== 'rest').length} completed
            </span>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${(currentWeekData.workouts.filter(w => w.completed).length / currentWeekData.workouts.filter(w => w.type !== 'rest').length) * 100}%` 
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
              const workout = getWorkout(originalWorkout);
              return (
              <div 
                key={originalWorkout.day}
                className="card"
                style={{ 
                  background: workout.type === 'rest' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                  border: `2px solid ${getWorkoutTypeColor(workout.type)}20`,
                  borderLeft: `4px solid ${getWorkoutTypeColor(workout.type)}`,
                  opacity: workout.type === 'rest' ? 0.7 : 1,
                  cursor: workout.type === 'rest' ? 'default' : 'pointer'
                }}
                onClick={() => handleWorkoutClick(workout)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <h3 style={{ margin: 0, color: '#EEEEEE', fontSize: '1.1rem', fontWeight: '600' }}>
                          {workout.day}
                          {workout.date && workout.date !== workout.day && (
                            <span style={{ fontSize: '0.8rem', marginLeft: '8px', color: '#AAAAAA' }}>
                              ({workout.date})
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
                      {workout.workout.name}
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

                    <p style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#CCCCCC', lineHeight: '1.4' }}>
                      {workout.workout.description}
                    </p>
                    
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '16px' }}>
                      {/* Mark Complete Button for Rest Days */}
                      <button
                        className="btn"
                        style={{
                          fontSize: '0.85rem',
                          padding: '10px 16px',
                          whiteSpace: 'nowrap',
                          fontWeight: '600',
                          background: workout.completed ? 'rgba(156, 163, 175, 0.1)' : 'rgba(0, 255, 136, 0.1)',
                          color: workout.completed ? '#9ca3af' : '#00FF88',
                          border: workout.completed ? '1px solid rgba(156, 163, 175, 0.3)' : '1px solid rgba(0, 255, 136, 0.3)'
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
                          padding: '8px 16px',
                          whiteSpace: 'nowrap',
                          background: 'rgba(34, 197, 94, 0.1)',
                          color: '#22c55e',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          fontWeight: '600'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSomethingElse(workout);
                        }}
                      >
                        🌟 Feeling Great? Add Workout
                      </button>
                    </div>
                  ) : workout.type !== 'rest' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '16px' }}>
                      {/* Mark Complete Button */}
                      <button
                        className="btn"
                        style={{
                          fontSize: '0.85rem',
                          padding: '10px 16px',
                          whiteSpace: 'nowrap',
                          fontWeight: '600',
                          background: workout.completed ? 'rgba(156, 163, 175, 0.1)' : 'rgba(0, 255, 136, 0.1)',
                          color: workout.completed ? '#9ca3af' : '#00FF88',
                          border: workout.completed ? '1px solid rgba(156, 163, 175, 0.3)' : '1px solid rgba(0, 255, 136, 0.3)'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkComplete(workout);
                        }}
                      >
                        {workout.completed ? '⏪ Undo Complete' : '✅ Mark Complete'}
                      </button>

                      {/* Show adventure options for adventure/flexible users */}
                      {(userProfile?.trainingStyle === 'adventure' || 
                        (userProfile?.trainingStyle === 'flexible' && ['tempo', 'intervals', 'longRun', 'hills'].includes(workout.type))) && 
                       ['tempo', 'intervals', 'longRun', 'hills', 'easy'].includes(workout.type) && (
                        <button 
                          className="btn btn-primary"
                          style={{ fontSize: '0.8rem', padding: '8px 12px', whiteSpace: 'nowrap', background: '#4299e1', border: '1px solid #4299e1' }}
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
                            return showingOptions[workoutKey] ? '📋 Hide Options' : '🎲 Choose Adventure';
                          })()}
                        </button>
                      )}
                      
                      {/* Show brick option prominently for Sunday long runs when user has equipment */}
                      {(workout.type === 'longRun' || workout.type === 'brickLongRun') && userProfile?.standUpBikeType && workout.day === 'Sunday' && (
                        <button 
                          className="btn"
                          style={{ 
                            fontSize: '0.8rem', 
                            padding: '8px 16px', 
                            whiteSpace: 'nowrap',
                            fontWeight: '600',
                            background: workout.type === 'brickLongRun' ? '#48bb78' : '#ed8936',
                            color: 'white',
                            border: `1px solid ${workout.type === 'brickLongRun' ? '#48bb78' : '#ed8936'}`,
                            marginRight: '8px'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            workout.type === 'brickLongRun' ? handleMakeRegularRun(workout) : handleMakeBrick(workout);
                          }}
                        >
                          {workout.type === 'brickLongRun' ? '🏃 Back to Run Only' : '🚴‍♂️ Make Brick Workout'}
                        </button>
                      )}
                      
                      {/* Show standard brick option for non-Sunday long runs */}
                      {(workout.type === 'longRun' || workout.type === 'brickLongRun') && userProfile?.standUpBikeType && workout.day !== 'Sunday' && (
                        <button 
                          className="btn btn-success"
                          style={{ 
                            fontSize: '0.8rem', 
                            padding: '8px 12px', 
                            whiteSpace: 'nowrap', 
                            background: workout.type === 'brickLongRun' ? '#805ad5' : '#ff6b6b', 
                            border: `1px solid ${workout.type === 'brickLongRun' ? '#805ad5' : '#ff6b6b'}`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            workout.type === 'brickLongRun' ? handleMakeRegularRun(workout) : handleMakeBrick(workout);
                          }}
                        >
                          {workout.type === 'brickLongRun' ? '🏃 Make Regular Run' : '🧱 Make Brick Instead'}
                        </button>
                      )}
                      
                      <button 
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSomethingElse(workout);
                        }}
                      >
                        More Options
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Workout Options Display */}
                {(() => {
                const workoutKey = `${currentWeek}-${workout.day}`;
                const options = workoutOptions[workoutKey];
                const isShowing = showingOptions[workoutKey];
                
                if (!isShowing || !options || options.length === 0) return null;
                
                return (
                  <div style={{ marginTop: '12px' }}>
                    <div className="card" style={{ 
                      background: 'rgba(65, 153, 225, 0.15)', 
                      border: '1px solid rgba(65, 153, 225, 0.4)',
                      backdropFilter: 'blur(5px)' // Reduce blur effect
                    }}>
                      <h4 style={{ margin: '0 0 16px 0', color: '#4299e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                  <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: colors.accent }}>
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
                                <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#CCCCCC', lineHeight: '1.4' }}>
                                  {option.description}
                                </p>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#AAAAAA', marginBottom: '8px' }}>
                                  <span>⏱️ {option.timeRequired}</span>
                                  <span>📍 {option.location}</span>
                                  <span>💪 {option.difficulty}</span>
                                </div>
                              </div>
                              <div style={{ 
                                background: colors.accent + '20',
                                color: colors.accent,
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
                              color: colors.accent,
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
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                          💡 <strong>All options target the same training system</strong> - choose based on your mood, time, and location!
                        </p>
                      </div>
                      
                      {/* Confirmation buttons when selection is made */}
                      {(() => {
                        const workoutKey = `${currentWeek}-${workout.day}`;
                        const selectedOption = selectedOptions[workoutKey];
                        
                        console.log('🔍 Checking confirmation buttons:', {
                          workoutKey,
                          selectedOption: selectedOption?.shortName || 'none',
                          hasSelection: !!selectedOption,
                          selectedOptionsState: selectedOptions
                        });
                        
                        if (!selectedOption) {
                          console.log('❌ No selectedOption found for key:', workoutKey);
                          console.log('   Available keys:', Object.keys(selectedOptions));
                          return null;
                        }
                        
                        console.log('✅ Showing confirmation buttons for:', selectedOption.shortName);
                        console.log('   Confirmation buttons should be visible now!');
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
              );
            })}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #ebf8ff 0%, #bee3f8 100%)', border: '1px solid #90cdf4' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#00D4FF' }}>🚀 Your RunEQ Advantages</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#00D4FF', fontSize: '1.2rem' }}>🔄</span>
              <span><strong>Flexible scheduling:</strong> Miss a workout? We'll {userProfile.missedWorkoutPreference}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#00D4FF', fontSize: '1.2rem' }}>🌡️</span>
              <span><strong>Climate smart:</strong> Automatic pace adjustments for your local weather</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#00D4FF', fontSize: '1.2rem' }}>🎨</span>
              <span><strong>Never boring:</strong> 80+ workout variations from research-based sources</span>
            </div>
            {userProfile.standUpBikeType && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#00D4FF', fontSize: '1.2rem' }}>⚡</span>
                <span><strong>Equipment Optimized:</strong> {formatEquipmentName(userProfile.standUpBikeType)}-specific motion training</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#00D4FF', fontSize: '1.2rem' }}>📱</span>
              <span><strong>Cross-platform:</strong> Works on phone, tablet, and web (unlike competitors!)</span>
            </div>
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
      />

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