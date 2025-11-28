import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import SomethingElseModal from './SomethingElseModal';
import { formatEquipmentName, formatHeartRate, formatIntensity } from '../utils/typography';
import { auth } from '../firebase/config';
import FirestoreService from '../services/FirestoreService';
// Calorie calculator removed - weight significantly affects calories and we don't collect weight data
// import { calorieCalculator } from '../lib/calorie-calculator.js';
import AICoachService from '../services/AICoachService';
import logger from '../utils/logger';
import './WorkoutDetail.css';

// Import workout libraries for fallback lookup
import { PaceCalculator } from '../lib/pace-calculator';
import { transformWorkoutForDisplay } from '../utils/transformWorkoutForDisplay';

// Initialize libraries
const paceCalculator = new PaceCalculator();

function WorkoutDetail({ userProfile, trainingPlan }) {
  const navigate = useNavigate();
  const { day } = useParams();
  const location = useLocation();
  const [somethingElseModal, setSomethingElseModal] = useState({
    isOpen: false,
    workout: null
  });
  const [modifiedWorkout, setModifiedWorkout] = useState(null);
  const [completionData, setCompletionData] = useState(null);
  const [coachingAnalysis, setCoachingAnalysis] = useState(null);
  const [loadingCoaching, setLoadingCoaching] = useState(false);
  const [coachingError, setCoachingError] = useState(null);

  // Get workout data from navigation state (passed from Dashboard) or fall back to training plan
  const workoutFromState = location.state?.workout;
  const userProfileFromState = location.state?.userProfile || userProfile;
  const currentWeekNumber = location.state?.currentWeek || 1;
  const weekDataFromState = location.state?.weekData;

  // Get VDOT paces - try multiple sources:
  // 1. Paces passed from Dashboard (userProfileFromState.paces)
  // 2. Paces on training plan directly (trainingPlan?.paces)
  // 3. Calculate from user's goal time if we have it
  // Helper: Calculate actual race pace from goal time and distance
  const calculateRacePace = (goalTime, raceDistance) => {
    if (!goalTime || !raceDistance) return null;

    // Parse goal time (formats: "2:00:00", "1:45:00", "Half-2:00:00")
    let timeStr = goalTime;
    if (timeStr.includes('-')) {
      timeStr = timeStr.split('-')[1];
    }

    const parts = timeStr.split(':').map(Number);
    let totalMinutes;
    if (parts.length === 3) {
      totalMinutes = parts[0] * 60 + parts[1] + parts[2] / 60;
    } else if (parts.length === 2) {
      totalMinutes = parts[0] + parts[1] / 60;
    } else {
      return null;
    }

    // Get distance in miles
    const distanceMap = {
      '5K': 3.1,
      '10K': 6.2,
      'Half': 13.1,
      'Half Marathon': 13.1,
      'Marathon': 26.2
    };
    const miles = distanceMap[raceDistance] || parseFloat(raceDistance);
    if (!miles) return null;

    // Calculate pace per mile
    const paceMinutes = totalMinutes / miles;
    const mins = Math.floor(paceMinutes);
    const secs = Math.round((paceMinutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVdotPaces = () => {
    // Get goal time and race distance for calculating actual race pace
    const goalTime = trainingPlan?.planOverview?.goalTime || userProfileFromState?.raceTime || userProfile?.raceTime;
    const raceDistance = trainingPlan?.planOverview?.raceDistance || userProfileFromState?.raceDistance || userProfile?.raceDistance;
    const racePace = calculateRacePace(goalTime, raceDistance);

    // Helper to add race pace to paces object
    // CRITICAL: Always calculate racePace for sandwich/simulation workouts
    const addRacePace = (paces) => {
      if (!paces) return paces;
      // Always add racePace if we can calculate it (even if paces object exists)
      if (racePace) {
        return {
          ...paces,
          racePace: { pace: racePace }, // Actual goal race pace (e.g., 9:09 for 2:00 half)
          raceDistance: raceDistance
        };
      }
      return paces;
    };

    // First, try paces from state
    if (userProfileFromState?.paces?.easy) {
      return addRacePace(userProfileFromState.paces);
    }

    // Second, try paces from training plan
    if (trainingPlan?.paces?.easy) {
      return addRacePace(trainingPlan.paces);
    }

    // Third, calculate from goal time if available
    if (goalTime && raceDistance) {
      try {
        const result = paceCalculator.calculateFromGoal(raceDistance, goalTime);
        if (result?.paces?.easy) {
          return addRacePace(result.paces);
        }
      } catch (e) {
        // Could not calculate paces
      }
    }

    return null;
  };

  const vdotPaces = getVdotPaces();
  
  const getDayWorkout = (dayName) => {
    // Use week data from state if available
    if (weekDataFromState && weekDataFromState.workouts) {
      return weekDataFromState.workouts.find(w => 
        w.day && w.day.toLowerCase() === dayName.toLowerCase()
      );
    }
    
    if (!trainingPlan || !trainingPlan.weeks) {
      return null;
    }
    
    // Get from current week or fall back to week 1
    const currentWeekIndex = Math.min(currentWeekNumber - 1, trainingPlan.weeks.length - 1);
    const currentWeek = trainingPlan.weeks[currentWeekIndex];
    if (!currentWeek || !currentWeek.workouts) {
      return null;
    }
    
    return currentWeek.workouts.find(w => 
      w.day && w.day.toLowerCase() === dayName.toLowerCase()
    );
  };
  
  const workoutData = workoutFromState || getDayWorkout(day);

  // Fetch completion data from Firebase
  useEffect(() => {
    const fetchCompletionData = async () => {
      if (!auth.currentUser || !workoutData) return;

      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');

        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          const completedWorkouts = data.completedWorkouts || {};

          // Build workout key based on workout index (for two-a-days)
          const workoutIndex = workoutData.workoutIndex || 0;
          const workoutKey = `${currentWeekNumber}-${workoutData.day}-${workoutIndex}`;

          if (completedWorkouts[workoutKey]) {
            setCompletionData(completedWorkouts[workoutKey]);
          }
        }
      } catch (error) {
        console.error('Error fetching completion data:', error);
      }
    };

    fetchCompletionData();
  }, [workoutData, currentWeekNumber]);

  // Fallback workout details in case the training plan doesn't have the data
  const workoutDetails = {
    tuesday: {
      name: userProfile?.standUpBikeType ? 'Progressive Build Session' : 'Sandwich Tempo',
      type: 'tempo',
      focus: 'Lactate Threshold',
      duration: '45 minutes',
      description: userProfile?.standUpBikeType ?
        'Gradually increasing intensity throughout session on your stand-up bike' :
        'Tempo effort sandwiched between easy running',
      structure: userProfile?.standUpBikeType ?
        '20 min easy + 20-40 min progressive build to tempo + 10 min easy' :
        '10-15 min easy warmup + 15-20 min tempo + 5-10 min easy cooldown',
      equipmentSpecific: !!userProfile?.standUpBikeType,
      intensity: 'Medium-hard effort, sustainable for 20-60 minutes',
      heartRate: '86-90% Max HR',
      paceGuidance: userProfile?.standUpBikeType ?
        `${formatEquipmentName(userProfile?.standUpBikeType)} specific: Focus on smooth ${userProfile?.standUpBikeType === 'cyclete' ? 'teardrop' : 'elliptical'} motion` :
        'Half marathon to 10-mile race pace',
      safetyNotes: [
        'Start conservatively - tempo should feel "controlled discomfort"',
        'If breathing becomes labored, slow down slightly',
        'Better to run slightly too easy than too hard'
      ],
      alternatives: {
        tooHot: 'Move indoors or to early morning',
        tooTired: 'Easy run with 4-6 x 1 minute pickups',
        timeConstraint: '20 min tempo run instead of full session',
        noEquipment: userProfile?.standUpBikeType ? 'Traditional running tempo workout' : 'Treadmill with 1% incline'
      }
    },
    thursday: {
      name: 'Easy Run',
      type: 'easy',
      focus: 'Recovery',
      duration: '35-45 minutes',
      description: 'Conversational pace, aerobic base building',
      structure: 'Easy effort throughout, should feel refreshed after',
      equipmentSpecific: false,
      intensity: 'Easy conversational pace',
      heartRate: '65-79% Max HR',
      paceGuidance: 'Should be able to speak in full sentences',
      safetyNotes: [
        'This should feel easy - not a workout day',
        'Focus on form and relaxation',
        'Cut short if feeling overly fatigued'
      ],
      alternatives: {
        tooHot: 'Move to air conditioning or pool running',
        tooTired: 'Walk or very easy bike ride',
        injury: 'Cross-training or complete rest',
        timeConstraint: '20-30 minutes is fine'
      }
    },
    sunday: {
      name: 'Conversational Long Run',
      type: 'longRun',
      focus: 'Endurance',
      duration: '60-75 minutes',
      description: 'Easy long run emphasizing conversational pace',
      structure: 'Run with partner/group, maintain conversation throughout',
      equipmentSpecific: false,
      intensity: 'Easy conversational pace',
      heartRate: '65-78% Max HR',
      paceGuidance: 'If you can\'t hold a conversation, you\'re going too fast',
      safetyNotes: [
        'Carry water for runs over 60 minutes',
        'Know your route and have bailout options',
        'Focus on time on feet, not speed'
      ],
      alternatives: {
        tooHot: 'Start very early or split into two shorter runs',
        timeConstraint: 'Run for available time, maintain easy effort',
        noPartner: 'Solo run with audiobook or podcast',
        injury: 'Long bike ride or pool running session'
      }
    }
  };

  // Get the base workout and apply any modifications
  const normalizedProfile = userProfileFromState || userProfile;
  const baseWorkout = workoutData
    ? transformWorkoutForDisplay({
        workoutData,
        userProfile: normalizedProfile,
        trainingPlan,
        vdotPaces
      })
    : workoutDetails[day] || workoutDetails.tuesday;
  const currentWorkout = modifiedWorkout || baseWorkout;

  // Helper function to format structured workout data
  const formatStructure = (structure) => {
    if (typeof structure === 'string') return structure;

    if (Array.isArray(structure)) {
      return structure.map((segment, index) => {
        if (typeof segment === 'object') {
          const parts = [];
          if (segment.duration) parts.push(segment.duration);
          if (segment.type) parts.push(segment.type);
          if (segment.intensity) parts.push(`@ ${segment.intensity}`);
          if (segment.description) parts.push(`(${segment.description})`);
          if (segment.activity) parts.push(segment.activity);
          return parts.join(' ');
        }
        return segment;
      }).join(' → ');
    }

    if (typeof structure === 'object') {
      // Handle workout object with warmup/main/recovery/cooldown
      const parts = [];
      if (structure.warmup) parts.push(`**Warmup:** ${structure.warmup}`);
      if (structure.main) parts.push(`**Main Set:** ${structure.main}`);
      if (structure.recovery) parts.push(`**Recovery:** ${structure.recovery}`);
      if (structure.cooldown) parts.push(`**Cooldown:** ${structure.cooldown}`);
      if (structure.repeat) parts.push(`**Repeat:** ${structure.repeat}`);
      if (structure.effort) parts.push(`**Effort:** ${structure.effort}`);
      if (structure.technique) parts.push(`**Technique:** ${structure.technique}`);
      if (structure.style) parts.push(`**Style:** ${structure.style}`);
      if (structure.approach) parts.push(`**Approach:** ${structure.approach}`);
      if (structure.pattern) parts.push(`**Pattern:** ${structure.pattern}`);

      if (parts.length > 0) {
        return parts.join('\n\n');
      }

      // Fallback for other object types
      return Object.entries(structure).map(([key, value]) => `${key}: ${value}`).join(', ');
    }

    return 'Complete the workout as prescribed';
  };

  // Helper function to format pace guidance object
  const formatPaceGuidance = (paceGuidance) => {
    if (typeof paceGuidance === 'string') return paceGuidance;
    if (typeof paceGuidance === 'object') {
      const entries = Object.entries(paceGuidance);
      if (entries.length === 1) {
        return entries[0][1]; // Return just the value if only one entry
      }
      return entries.map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`).join(' | ');
    }
    return 'Steady, controlled effort';
  };

  const getWorkoutTypeColor = (type) => {
    const colors = {
      tempo: '#4299e1',
      intervals: '#e53e3e',
      hills: '#38a169',
      longRun: '#805ad5',
      easy: '#718096'
    };
    return colors[type] || '#718096';
  };

  const getWorkoutTypeGradient = (type) => {
    const gradients = {
      tempo: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      intervals: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      hills: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      longRun: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      easy: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    };
    return gradients[type] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  };

  const getWorkoutTypeEmoji = (type) => {
    const emojis = {
      tempo: '⚡',
      intervals: '🔥',
      hills: '⛰️',
      longRun: '🏃',
      easy: '🌤️'
    };
    return emojis[type] || '💪';
  };

  const handleSomethingElse = () => {
    // Convert the workout to the format expected by the modal
    const modalWorkout = {
      day: day.charAt(0).toUpperCase() + day.slice(1), // Capitalize day
      type: currentWorkout.type,
      workout: {
        name: currentWorkout.name,
        description: currentWorkout.description
      },
      focus: currentWorkout.focus,
      equipmentSpecific: currentWorkout.equipmentSpecific
    };
    
    setSomethingElseModal({
      isOpen: true,
      workout: modalWorkout
    });
  };

  const handleCloseSomethingElse = () => {
    setSomethingElseModal({
      isOpen: false,
      workout: null
    });
  };

  const handleWorkoutReplacement = async (newWorkout) => {
    // Convert the new workout back to the WorkoutDetail format
    // IMPORTANT: Keep workout data nested under 'workout' property for transformWorkoutForDisplay to extract properly
    const updatedWorkout = {
      ...baseWorkout,
      workout: {
        ...newWorkout.workout // Keep nested structure with ALL fields (structure, benefits, effort, etc.)
      },
      name: newWorkout.workout.name,
      description: newWorkout.workout.description,
      type: newWorkout.type,
      focus: newWorkout.focus,
      equipmentSpecific: newWorkout.equipmentSpecific,
      replacementReason: newWorkout.replacementReason
    };

    setModifiedWorkout(updatedWorkout);

    // Prepare workout data for storage
    const workoutKey = `${currentWeekNumber}-${day}`;
    const workoutToSave = {
      day: day.charAt(0).toUpperCase() + day.slice(1),
      workout: {
        ...newWorkout.workout // Copy ALL workout fields
      },
      focus: newWorkout.focus,
      type: newWorkout.type,
      equipmentSpecific: newWorkout.equipmentSpecific,
      replacementReason: newWorkout.replacementReason
    };

    // Save to localStorage immediately for UI responsiveness
    const savedWorkouts = JSON.parse(localStorage.getItem('runeq_modifiedWorkouts') || '{}');
    savedWorkouts[workoutKey] = workoutToSave;
    localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(savedWorkouts));
    console.log('💾 WorkoutDetail saved to localStorage:', workoutKey, newWorkout.workout.name);

    // Save to Firestore for cross-device sync
    if (auth.currentUser) {
      await FirestoreService.saveModifiedWorkout(
        auth.currentUser.uid,
        currentWeekNumber,
        day,
        workoutToSave
      );
      console.log('✅ SAVED to Firestore:', newWorkout.workout.name, 'for', day);
    }

    handleCloseSomethingElse();
  };

  const handleGetCoaching = async () => {
    if (!completionData) {
      // Note: useToast hook would need to be added to WorkoutDetail component
      // For now, using console.warn as fallback
      console.warn('No workout data available for analysis');
      return;
    }

    // Check if API key is set (for local dev)
    const apiKey = prompt('Enter your Anthropic API key (local dev only):');
    if (!apiKey) return;

    setLoadingCoaching(true);
    setCoachingError(null);

    try {
      // Initialize AI Coach service with API key
      AICoachService.initialize(apiKey);

      // Determine actual workout type from completion data
      // CRITICAL: If this is a life adaptation, use the SCHEDULED workout type, not the activity type
      let actualWorkoutType = 'Run'; // default
      let isLifeAdaptation = completionData.isLifeAdaptation || false;

      // If this is a life adaptation, check the scheduled workout type
      if (isLifeAdaptation && currentWorkout) {
        const scheduledType = currentWorkout.type;
        const isBikeWorkout = scheduledType === 'bike' || currentWorkout.equipmentSpecific;
        
        if (isBikeWorkout) {
          // Scheduled was bike, but activity was run - treat as bike for coaching
          actualWorkoutType = 'Ride';
          logger.log('🔄 Life adaptation detected: Using scheduled bike workout type for coaching');
        } else {
          // Scheduled was run, but activity was bike - treat as run for coaching
          actualWorkoutType = 'Run';
          logger.log('🔄 Life adaptation detected: Using scheduled run workout type for coaching');
        }
      } else {
        // Not a life adaptation - determine from activity data
        // Check if we have lap data with pace (indicates running)
        if (completionData.laps && completionData.laps.length > 0 && completionData.laps[0].pace) {
          actualWorkoutType = 'Run';
        }
        // Check if we have overall pace in completion data
        else if (completionData.pace && completionData.pace.includes('/mi')) {
          actualWorkoutType = 'Run';
        }
        // If no pace data, it's likely a bike ride
        else if (completionData.laps && completionData.laps.length > 0 && !completionData.laps[0].pace) {
          actualWorkoutType = 'Ride';
        }
      }

      // Build workout data for analysis
      const workoutDataForAI = {
        type: actualWorkoutType,
        distance: completionData.distance,
        duration: completionData.duration,
        pace: completionData.pace,
        elevationGain: completionData.elevationGain,
        avgHeartRate: completionData.avgHeartRate,
        maxHeartRate: completionData.maxHeartRate,
        laps: completionData.laps,
        // Pass stand-up bike type if this is a Ride (either actual ride or life adaptation to bike workout)
        standUpBikeType: actualWorkoutType === 'Ride' ? userProfileFromState?.standUpBikeType : null,
        // Pass life adaptation flag so AI knows to adjust coaching
        isLifeAdaptation: isLifeAdaptation
      };

      // DEBUG: Log what we're sending to the AI
      console.log('🔍 AI Coach Debug:', {
        actualWorkoutType,
        stravaUrl: completionData.stravaActivityUrl,
        standUpBikeType: workoutDataForAI.standUpBikeType,
        fullData: workoutDataForAI
      });

      // Build upcoming workouts context
      let upcomingWorkouts = null;
      if (trainingPlan && weekDataFromState) {
        const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const currentDayIndex = daysOfWeek.indexOf(day.toLowerCase());
        const nextFewDays = [];

        // weekDataFromState.workouts can be either an array or an object keyed by day name
        const workouts = weekDataFromState.workouts;
        const isArray = Array.isArray(workouts);

        // Get next 3-4 workouts from current week
        for (let i = currentDayIndex + 1; i < Math.min(currentDayIndex + 4, daysOfWeek.length); i++) {
          const dayName = daysOfWeek[i];
          let workout = null;
          
          if (isArray) {
            // If workouts is an array, find by day name
            workout = workouts.find(w => w.day && w.day.toLowerCase() === dayName);
          } else {
            // If workouts is an object, access by day name key
            workout = workouts?.[dayName];
          }
          
          if (workout && (workout.name || workout.workout?.name)) {
            const dayLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            const workoutName = workout.name || workout.workout?.name || 'Workout';
            nextFewDays.push(`${dayLabel}: ${workoutName}`);
          }
        }

        if (nextFewDays.length > 0) {
          upcomingWorkouts = nextFewDays.join(', ');
        }
      }

      // Build context options
      const contextOptions = {
        prescribedWorkout: currentWorkout.name ?
          `${currentWorkout.name}: ${currentWorkout.description}` :
          null,
        trainingContext: trainingPlan ?
          `Week ${currentWeekNumber} of ${trainingPlan.weeks?.length || 'N/A'} week training plan for ${trainingPlan.goalRace || 'race'}` :
          null,
        upcomingWorkouts: upcomingWorkouts
      };

      // Get AI analysis
      const analysis = await AICoachService.analyzeWorkout(workoutDataForAI, contextOptions);
      setCoachingAnalysis(analysis);
    } catch (error) {
      console.error('Error getting coaching analysis:', error);
      setCoachingError(error.message || 'Failed to get coaching analysis');
    } finally {
      setLoadingCoaching(false);
    }
  };

  return (
    <div className="workout-detail" style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Hero Header - Dark Theme */}
      <div className="workout-detail-header" style={{
        background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}15 0%, #1a1a1a 50%, #0a0a0a 100%)`,
        borderBottom: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}30`,
        padding: '32px 0 48px 0',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 -1px 0 ${getWorkoutTypeColor(currentWorkout.type)}20`
      }}>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: '#2a2a2a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold'
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#2a2a2a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#999',
                fontSize: '0.9rem',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                fontWeight: '600',
                gap: '6px'
              }}
              title="Reload workout data from libraries (useful after code changes)"
            >
              Refresh
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{
                margin: 0,
                color: 'white',
                fontSize: '2.5rem',
                fontWeight: '800',
                letterSpacing: '-0.5px'
              }}>
                {typeof currentWorkout.name === 'string' ? currentWorkout.name :
                 typeof currentWorkout.name === 'object' ? JSON.stringify(currentWorkout.name) :
                 'Workout'}
              </h1>

              {/* CROSS-TRAINING EQUIPMENT INDICATOR */}
              {currentWorkout.crossTrainingType && (() => {
                const equipmentInfo = {
                  'pool': { emoji: '🏊', color: '#3b82f6', label: 'Pool / Aqua Running' },
                  'aquaRunning': { emoji: '🏊', color: '#3b82f6', label: 'Aqua Running' },
                  'rowing': { emoji: '🚣', color: '#22c55e', label: 'Rowing Machine' },
                  'elliptical': { emoji: '⚡', color: '#f59e0b', label: 'Elliptical' },
                  'swimming': { emoji: '🏊‍♂️', color: '#06b6d4', label: 'Swimming' },
                  'stationaryBike': { emoji: '🚴‍♀️', color: '#8b5cf6', label: 'Stationary Bike' },
                  'standUpBike': { emoji: '🚴', color: '#ec4899', label: 'Stand-Up Bike' },
                  'cyclete': { emoji: '🚴', color: '#ec4899', label: 'Cyclete' },
                  'elliptigo': { emoji: '🚴', color: '#ec4899', label: 'ElliptiGO' }
                };
                const info = equipmentInfo[currentWorkout.crossTrainingType] || { emoji: '🏃', color: '#999', label: 'Cross-Training' };
                return (
                  <div className="workout-equipment-indicator" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: `linear-gradient(135deg, ${info.color}15 0%, ${info.color}25 100%)`,
                    border: `2px solid ${info.color}`,
                    borderRadius: '12px',
                    padding: '12px 20px',
                    marginTop: '16px'
                  }}>
                    <span className="workout-equipment-emoji" style={{ fontSize: '2rem' }}>{info.emoji}</span>
                    <div>
                      <div style={{ color: info.color, fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Cross-Training Workout
                      </div>
                      <div className="workout-equipment-label" style={{ color: 'white', fontSize: '1.3rem', fontWeight: '800', marginTop: '2px' }}>
                        {info.label}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <p className="workout-subtitle" style={{
                margin: '8px 0 0 0',
                color: '#999',
                fontSize: '1.1rem',
                fontWeight: '500'
              }}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span
              className="workout-badge"
              style={{
                background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}20 0%, ${getWorkoutTypeColor(currentWorkout.type)}40 100%)`,
                border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}`,
                color: getWorkoutTypeColor(currentWorkout.type),
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '700'
              }}
            >
              {getWorkoutTypeEmoji(currentWorkout.type)} {currentWorkout.focus}
            </span>
            {currentWorkout.equipmentSpecific && userProfile?.standUpBikeType && (
              <span style={{
                background: '#2a2a2a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#999',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                {formatEquipmentName(userProfile.standUpBikeType)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '24px 16px' }}>
        {/* KEY METRICS - INSTANT SCAN */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Pace Card */}
          <div className="workout-detail-card workout-metric-card" style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}25 0%, ${getWorkoutTypeColor(currentWorkout.type)}08 50%, rgba(255, 255, 255, 0.05) 100%)`,
            padding: '20px',
            borderRadius: '16px',
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}50`,
            boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}20, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}15`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
            e.currentTarget.style.boxShadow = `0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}60, 0 0 30px ${getWorkoutTypeColor(currentWorkout.type)}30`;
            e.currentTarget.style.borderColor = `${getWorkoutTypeColor(currentWorkout.type)}70`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}20, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}15`;
            e.currentTarget.style.borderColor = `${getWorkoutTypeColor(currentWorkout.type)}50`;
          }}
          >
            <div className="workout-metric-label" style={{ color: '#999', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Target Pace
            </div>
            <div className="workout-metric-value" style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800', lineHeight: '1.2', textShadow: `0 2px 8px ${getWorkoutTypeColor(currentWorkout.type)}40` }}>
              {formatPaceGuidance(currentWorkout.paceGuidance)}
            </div>
          </div>

          {/* Intensity Card */}
          <div className="workout-detail-card workout-metric-card" style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}25 0%, ${getWorkoutTypeColor(currentWorkout.type)}08 50%, rgba(255, 255, 255, 0.05) 100%)`,
            padding: '20px',
            borderRadius: '16px',
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}50`,
            boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}20, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}15`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
            e.currentTarget.style.boxShadow = `0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}60, 0 0 30px ${getWorkoutTypeColor(currentWorkout.type)}30`;
            e.currentTarget.style.borderColor = `${getWorkoutTypeColor(currentWorkout.type)}70`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}20, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}15`;
            e.currentTarget.style.borderColor = `${getWorkoutTypeColor(currentWorkout.type)}50`;
          }}
          >
            <div className="workout-metric-label" style={{ color: '#999', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Intensity
            </div>
            <div className="workout-metric-value" style={{ color: 'white', fontSize: '1.1rem', fontWeight: '700', lineHeight: '1.3', textShadow: `0 2px 6px ${getWorkoutTypeColor(currentWorkout.type)}40` }}>
              {typeof currentWorkout.intensity === 'string' ? formatIntensity(currentWorkout.intensity) :
               typeof currentWorkout.intensity === 'object' ? JSON.stringify(currentWorkout.intensity) :
               'Medium Effort'}
            </div>
          </div>

          {/* Heart Rate Card */}
          <div className="workout-detail-card workout-metric-card" style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}25 0%, ${getWorkoutTypeColor(currentWorkout.type)}08 50%, rgba(255, 255, 255, 0.05) 100%)`,
            padding: '20px',
            borderRadius: '16px',
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}50`,
            boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}20, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}15`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
            e.currentTarget.style.boxShadow = `0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}60, 0 0 30px ${getWorkoutTypeColor(currentWorkout.type)}30`;
            e.currentTarget.style.borderColor = `${getWorkoutTypeColor(currentWorkout.type)}70`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}20, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}15`;
            e.currentTarget.style.borderColor = `${getWorkoutTypeColor(currentWorkout.type)}50`;
          }}
          >
            <div className="workout-metric-label" style={{ color: '#999', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Heart Rate Zone
            </div>
            <div className="workout-metric-value" style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800', lineHeight: '1.2', textShadow: `0 2px 8px ${getWorkoutTypeColor(currentWorkout.type)}40` }}>
              {typeof currentWorkout.heartRate === 'string' ? formatHeartRate(currentWorkout.heartRate) :
               typeof currentWorkout.heartRate === 'object' ? JSON.stringify(currentWorkout.heartRate) :
               '70-85% Max HR'}
            </div>
          </div>

          {/* Calorie display removed - weight significantly affects calories and we don't collect weight data */}
        </div>

        {/* COMPLETED WORKOUT STATS - Show actual performance data */}
        {workoutData?.completed && completionData && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 212, 255, 0.12) 50%, rgba(255, 255, 255, 0.05) 100%)',
            border: '2px solid rgba(0, 255, 136, 0.4)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 255, 136, 0.2), 0 0 25px rgba(0, 255, 136, 0.15)',
            transition: 'all 0.3s ease'
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              color: 'white',
              fontSize: '1.8rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {completionData.autoCompletedFromStrava ? 'Synced from Strava' : 'Workout Completed'}
            </h2>

            {/* Performance Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
              marginBottom: completionData.notes || completionData.stravaActivityUrl ? '20px' : '0'
            }}>
              {completionData.distance && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 212, 255, 0.05) 100%)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(0, 212, 255, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '110px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 212, 255, 0.4), 0 0 25px rgba(0, 212, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)';
                }}
                >
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Distance
                  </div>
                  <div>
                    <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: '800', lineHeight: '1' }}>
                      {completionData.distance}
                    </div>
                    <div style={{ color: '#999', fontSize: '0.85rem', marginTop: '4px' }}>
                      miles
                    </div>
                  </div>
                </div>
              )}

              {completionData.duration && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 212, 255, 0.05) 100%)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(0, 212, 255, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '110px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 212, 255, 0.4), 0 0 25px rgba(0, 212, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)';
                }}
                >
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Duration
                  </div>
                  <div>
                    <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: '800', lineHeight: '1' }}>
                      {completionData.duration}
                    </div>
                    <div style={{ color: '#999', fontSize: '0.85rem', marginTop: '4px' }}>
                      minutes
                    </div>
                  </div>
                </div>
              )}

              {completionData.pace && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 212, 255, 0.05) 100%)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(0, 212, 255, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '110px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 212, 255, 0.4), 0 0 25px rgba(0, 212, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)';
                }}
                >
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Pace
                  </div>
                  <div>
                    <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: '800', lineHeight: '1' }}>
                      {completionData.pace.replace('/mi', '')}
                    </div>
                    <div style={{ color: '#999', fontSize: '0.85rem', marginTop: '4px' }}>
                      per mile
                    </div>
                  </div>
                </div>
              )}

              {completionData.avgHeartRate && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 212, 255, 0.05) 100%)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(0, 212, 255, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '110px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 212, 255, 0.4), 0 0 25px rgba(0, 212, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)';
                }}
                >
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Avg Heart Rate
                  </div>
                  <div>
                    <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: '800', lineHeight: '1' }}>
                      {completionData.avgHeartRate}
                    </div>
                    <div style={{ color: '#999', fontSize: '0.85rem', marginTop: '4px' }}>
                      bpm
                    </div>
                  </div>
                </div>
              )}

              {completionData.maxHeartRate && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 212, 255, 0.05) 100%)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(0, 212, 255, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '110px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 212, 255, 0.4), 0 0 25px rgba(0, 212, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)';
                }}
                >
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Max Heart Rate
                  </div>
                  <div>
                    <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: '800', lineHeight: '1' }}>
                      {completionData.maxHeartRate}
                    </div>
                    <div style={{ color: '#999', fontSize: '0.85rem', marginTop: '4px' }}>
                      bpm
                    </div>
                  </div>
                </div>
              )}

              {completionData.cadence && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 212, 255, 0.05) 100%)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(0, 212, 255, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '110px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 212, 255, 0.4), 0 0 25px rgba(0, 212, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)';
                }}
                >
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Cadence
                  </div>
                  <div>
                    <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: '800', lineHeight: '1' }}>
                      {Math.round(completionData.cadence)}
                    </div>
                    <div style={{ color: '#999', fontSize: '0.85rem', marginTop: '4px' }}>
                      steps/min
                    </div>
                  </div>
                </div>
              )}

              {completionData.elevationGain && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 212, 255, 0.05) 100%)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(0, 212, 255, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '110px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 212, 255, 0.4), 0 0 25px rgba(0, 212, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.15)';
                }}
                >
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Elevation Gain
                  </div>
                  <div>
                    <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: '800', lineHeight: '1' }}>
                      {completionData.elevationGain}
                    </div>
                    <div style={{ color: '#999', fontSize: '0.85rem', marginTop: '4px' }}>
                      feet
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes Section */}
            {completionData.notes && (
              <div style={{
                background: '#0a0a0a',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                marginBottom: completionData.stravaActivityUrl ? '16px' : '0'
              }}>
                <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Notes
                </div>
                <div style={{ color: '#DDD', fontSize: '1rem', lineHeight: '1.6' }}>
                  {completionData.notes}
                </div>
              </div>
            )}

            {/* Strava Link */}
            {completionData.stravaActivityUrl && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: '8px'
              }}>
                <a
                  href={completionData.stravaActivityUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#FC4C02',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(252, 76, 2, 0.4)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(252, 76, 2, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(252, 76, 2, 0.4)';
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>🔗</span>
              View on Strava
                </a>
              </div>
            )}

            {/* AI Coaching Button */}
            {completionData.laps && completionData.laps.length > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: '16px',
                marginTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <button
                  onClick={handleGetCoaching}
                  disabled={loadingCoaching}
                  style={{
                    background: loadingCoaching ? '#1a1a1a' : 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)',
                    color: 'white',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    fontSize: '1.05rem',
                    fontWeight: '700',
                    border: 'none',
                    cursor: loadingCoaching ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: loadingCoaching ? 'none' : '0 4px 12px rgba(0, 212, 255, 0.4)',
                    transition: 'all 0.2s',
                    opacity: loadingCoaching ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!loadingCoaching) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 16px rgba(0, 212, 255, 0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loadingCoaching) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 212, 255, 0.4)';
                    }
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{loadingCoaching ? '⏳' : '🤖'}</span>
                  {loadingCoaching ? 'Analyzing Workout...' : 'Get Coaching'}
                </button>
              </div>
            )}

            {/* AI Coaching Analysis Display */}
            {coachingAnalysis && (
              <div style={{
                marginTop: '20px',
                background: 'linear-gradient(135deg, #1a2a3a 0%, #0f1f2f 100%)',
                padding: '24px',
                borderRadius: '16px',
                border: '2px solid #00D4FF'
              }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  color: '#00D4FF',
                  fontSize: '1.4rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>💡</span>
                  Workout Insights
                </h4>
                <div className="workout-coaching-text" style={{
                  color: '#DDD',
                  fontSize: '1.05rem',
                  lineHeight: '1.8',
                  whiteSpace: 'pre-line'
                }}>
                  {coachingAnalysis}
                </div>
              </div>
            )}

            {/* Coaching Error Display */}
            {coachingError && (
              <div style={{
                marginTop: '20px',
                background: '#2a1a1a',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e53e3e'
              }}>
                <div style={{ color: '#e53e3e', fontSize: '1rem', fontWeight: '600' }}>
                  Error getting coaching analysis: {coachingError}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKOUT STRUCTURE - VISUAL BREAKDOWN */}
        <div className="workout-detail-card workout-section" style={{
          background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}15 0%, rgba(255, 255, 255, 0.05) 100%)`,
          border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}30`,
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}15, 0 0 25px ${getWorkoutTypeColor(currentWorkout.type)}10`,
          transition: 'all 0.3s ease'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            color: 'white',
            fontSize: '1.8rem',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            Workout Structure
          </h2>

          <div className="workout-structure-text" style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}08 0%, rgba(0, 0, 0, 0.3) 100%)`,
            padding: '20px',
            borderRadius: '16px',
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}20`,
            fontSize: '1.1rem',
            lineHeight: '2',
            color: '#ddd',
            fontWeight: '500',
            whiteSpace: 'pre-line',
            boxShadow: `inset 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}10, 0 0 15px ${getWorkoutTypeColor(currentWorkout.type)}08`
          }}>
            {formatStructure(currentWorkout.structure)}
          </div>
        </div>

        {/* DESCRIPTION */}
        {currentWorkout.description && (
          <div className="workout-detail-card workout-section" style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}12 0%, rgba(255, 255, 255, 0.05) 100%)`,
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}25`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}10, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}08`,
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              color: 'white',
              fontSize: '1.3rem',
              fontWeight: '700'
            }}>
              About This Workout
            </h3>
            <p className="workout-description-text" style={{ fontSize: '1rem', margin: 0, lineHeight: '1.7', color: '#ddd' }}>
              {typeof currentWorkout.description === 'string' ? currentWorkout.description :
               typeof currentWorkout.description === 'object' ? JSON.stringify(currentWorkout.description) :
               'Standard workout description'}
            </p>
          </div>
        )}

        {/* BENEFITS - Cross-Training Workouts */}
        {currentWorkout.benefits && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.08) 50%, rgba(255, 255, 255, 0.05) 100%)',
            border: '2px solid rgba(34, 197, 94, 0.4)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(34, 197, 94, 0.2), 0 0 20px rgba(34, 197, 94, 0.15)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              color: '#22c55e',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>💪</span> Benefits
            </h3>
            <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
              {typeof currentWorkout.benefits === 'string' ? currentWorkout.benefits :
               Array.isArray(currentWorkout.benefits) ? currentWorkout.benefits.join(', ') :
               typeof currentWorkout.benefits === 'object' ? JSON.stringify(currentWorkout.benefits) :
               'Training adaptation'}
            </p>
          </div>
        )}

        {/* TECHNIQUE - Cross-Training Workouts */}
        {currentWorkout.technique && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(255, 255, 255, 0.05) 100%)',
            border: '2px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.2), 0 0 20px rgba(59, 130, 246, 0.15)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              color: '#3b82f6',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>🎯</span> Technique
            </h3>
            <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
              {typeof currentWorkout.technique === 'string' ? currentWorkout.technique :
               typeof currentWorkout.technique === 'object' ? JSON.stringify(currentWorkout.technique) :
               'Maintain good form'}
            </p>
          </div>
        )}

        {/* EFFORT ZONES - Cross-Training Workouts */}
        {currentWorkout.effort && typeof currentWorkout.effort === 'object' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.08) 50%, rgba(255, 255, 255, 0.05) 100%)',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(239, 68, 68, 0.2), 0 0 20px rgba(239, 68, 68, 0.15)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#ef4444',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>❤️</span> Effort Guidelines
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {currentWorkout.effort.heartRate && (
                <div>
                  <strong style={{ color: '#999', display: 'block', marginBottom: '4px' }}>Heart Rate:</strong>
                  <span style={{ color: '#ddd', fontSize: '1rem' }}>{currentWorkout.effort.heartRate}</span>
                </div>
              )}
              {currentWorkout.effort.perceived && (
                <div>
                  <strong style={{ color: '#999', display: 'block', marginBottom: '4px' }}>Perceived Effort:</strong>
                  <span style={{ color: '#ddd', fontSize: '1rem' }}>{currentWorkout.effort.perceived}</span>
                </div>
              )}
              {currentWorkout.effort.cadence && (
                <div>
                  <strong style={{ color: '#999', display: 'block', marginBottom: '4px' }}>Cadence:</strong>
                  <span style={{ color: '#ddd', fontSize: '1rem' }}>{currentWorkout.effort.cadence}</span>
                </div>
              )}
              {currentWorkout.effort.strokeRate && (
                <div>
                  <strong style={{ color: '#999', display: 'block', marginBottom: '4px' }}>Stroke Rate:</strong>
                  <span style={{ color: '#ddd', fontSize: '1rem' }}>{currentWorkout.effort.strokeRate}</span>
                </div>
              )}
              {currentWorkout.effort.legTurnover && (
                <div>
                  <strong style={{ color: '#999', display: 'block', marginBottom: '4px' }}>Leg Turnover:</strong>
                  <span style={{ color: '#ddd', fontSize: '1rem' }}>{currentWorkout.effort.legTurnover}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EQUIPMENT SETTINGS - Cross-Training Workouts */}
        {currentWorkout.settings && typeof currentWorkout.settings === 'object' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.08) 50%, rgba(255, 255, 255, 0.05) 100%)',
            border: '2px solid rgba(168, 85, 247, 0.5)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(168, 85, 247, 0.2), 0 0 20px rgba(168, 85, 247, 0.15)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#a855f7',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>⚙️</span> Equipment Settings
            </h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              {currentWorkout.settings.intervals && (
                <div>
                  <strong style={{ color: '#a855f7', fontSize: '1rem', display: 'block', marginBottom: '8px' }}>Intervals:</strong>
                  <div style={{ paddingLeft: '12px', display: 'grid', gap: '6px' }}>
                    {currentWorkout.settings.intervals.strokeRate && (
                      <div style={{ color: '#ddd', fontSize: '0.95rem' }}>
                        <span style={{ color: '#999' }}>Stroke Rate:</span> {currentWorkout.settings.intervals.strokeRate} spm
                      </div>
                    )}
                    {currentWorkout.settings.intervals.pace && (
                      <div style={{ color: '#ddd', fontSize: '0.95rem' }}>
                        <span style={{ color: '#999' }}>Pace:</span> {currentWorkout.settings.intervals.pace}
                      </div>
                    )}
                    {currentWorkout.settings.intervals.resistance && (
                      <div style={{ color: '#ddd', fontSize: '0.95rem' }}>
                        <span style={{ color: '#999' }}>Resistance:</span> {currentWorkout.settings.intervals.resistance}
                      </div>
                    )}
                    {currentWorkout.settings.intervals.incline && (
                      <div style={{ color: '#ddd', fontSize: '0.95rem' }}>
                        <span style={{ color: '#999' }}>Incline:</span> {currentWorkout.settings.intervals.incline}
                      </div>
                    )}
                    {currentWorkout.settings.intervals.cadence && (
                      <div style={{ color: '#ddd', fontSize: '0.95rem' }}>
                        <span style={{ color: '#999' }}>Cadence:</span> {currentWorkout.settings.intervals.cadence}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {currentWorkout.settings.recovery && (
                <div>
                  <strong style={{ color: '#a855f7', fontSize: '1rem', display: 'block', marginBottom: '8px' }}>Recovery:</strong>
                  <div style={{ paddingLeft: '12px', display: 'grid', gap: '6px' }}>
                    {currentWorkout.settings.recovery.strokeRate && (
                      <div style={{ color: '#ddd', fontSize: '0.95rem' }}>
                        <span style={{ color: '#999' }}>Stroke Rate:</span> {currentWorkout.settings.recovery.strokeRate} spm
                      </div>
                    )}
                    {currentWorkout.settings.recovery.pace && (
                      <div style={{ color: '#ddd', fontSize: '0.95rem' }}>
                        <span style={{ color: '#999' }}>Pace:</span> {currentWorkout.settings.recovery.pace}
                      </div>
                    )}
                    {currentWorkout.settings.recovery.resistance && (
                      <div style={{ color: '#ddd', fontSize: '0.95rem' }}>
                        <span style={{ color: '#999' }}>Resistance:</span> {currentWorkout.settings.recovery.resistance}
                      </div>
                    )}
                    {currentWorkout.settings.recovery.incline && (
                      <div style={{ color: '#ddd', fontSize: '0.95rem' }}>
                        <span style={{ color: '#999' }}>Incline:</span> {currentWorkout.settings.recovery.incline}
                      </div>
                    )}
                    {currentWorkout.settings.recovery.cadence && (
                      <div style={{ color: '#ddd', fontSize: '0.95rem' }}>
                        <span style={{ color: '#999' }}>Cadence:</span> {currentWorkout.settings.recovery.cadence}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {currentWorkout.settings.heartRate && (
                <div style={{ color: '#ddd', fontSize: '0.95rem' }}>
                  <strong style={{ color: '#999' }}>Heart Rate:</strong> {currentWorkout.settings.heartRate}
                </div>
              )}
              {currentWorkout.settings.power && (
                <div style={{ color: '#ddd', fontSize: '0.95rem' }}>
                  <strong style={{ color: '#999' }}>Power:</strong> {currentWorkout.settings.power}
                </div>
              )}
            </div>
          </div>
        )}

        {/* COACHING TIPS - Cross-Training Workouts */}
        {currentWorkout.coachingTips && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
            border: '2px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              color: '#8b5cf6',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>💡</span> Coaching Tips
            </h3>
            <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
              {typeof currentWorkout.coachingTips === 'string' ? currentWorkout.coachingTips :
               typeof currentWorkout.coachingTips === 'object' ? JSON.stringify(currentWorkout.coachingTips) :
               'Execute as prescribed'}
            </p>
          </div>
        )}


        {/* Climate Adaptation */}
        {userProfile?.climate === 'hot_humid' && (
          <div style={{
            background: `linear-gradient(135deg, rgba(255, 149, 0, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)`,
            border: '2px solid rgba(255, 149, 0, 0.4)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 149, 0, 0.2), 0 0 20px rgba(255, 149, 0, 0.15)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              Climate Adjustments
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <strong style={{ color: '#999', display: 'block', marginBottom: '4px' }}>Pace:</strong>
                  <span style={{ color: '#ddd' }}>Add 30-60 seconds per mile in high humidity</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <strong style={{ color: '#999', display: 'block', marginBottom: '4px' }}>Hydration:</strong>
                  <span style={{ color: '#ddd' }}>Drink before feeling thirsty</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <strong style={{ color: '#999', display: 'block', marginBottom: '4px' }}>Timing:</strong>
                  <span style={{ color: '#ddd' }}>Early morning (before 7am) or late evening recommended</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <strong style={{ color: '#999', display: 'block', marginBottom: '4px' }}>Effort:</strong>
                  <span style={{ color: '#ddd' }}>Focus on effort level rather than exact pace</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Safety Notes */}
        <div style={{
          background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}10 0%, rgba(255, 255, 255, 0.05) 100%)`,
          border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}25`,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}10, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}08`,
          transition: 'all 0.3s ease'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            Safety & Execution Notes
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {(Array.isArray(currentWorkout.safetyNotes) ? currentWorkout.safetyNotes : [
              'Listen to your body and adjust as needed',
              'Stay hydrated throughout the workout',
              'Stop if you feel pain or excessive fatigue'
            ]).map((note, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '8px 0' }}>
                <span className="workout-safety-bullet" style={{ color: '#666', fontSize: '1.5rem', minWidth: '24px' }}>•</span>
                <span className="workout-body-text" style={{ fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                  {typeof note === 'string' ? note : JSON.stringify(note)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Hill Requirements - only for hill workouts */}
        {currentWorkout.hillRequirement && (
          <div style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}12 0%, rgba(255, 255, 255, 0.05) 100%)`,
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}35`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}15, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}12`,
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              Hill Requirements
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {currentWorkout.hillRequirement.description && (
                <div>
                  <strong style={{ color: '#999', display: 'block', marginBottom: '8px', fontSize: '1.1rem' }}>
                    Description:
                  </strong>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                    {currentWorkout.hillRequirement.description}
                  </p>
                </div>
              )}
              {currentWorkout.hillRequirement.grade && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ color: '#999', fontSize: '1.1rem' }}>Grade:</strong>
                  <span style={{ fontSize: '1rem', color: '#ddd' }}>
                    {currentWorkout.hillRequirement.grade}
                  </span>
                </div>
              )}
              {currentWorkout.hillRequirement.distance && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ color: '#999', fontSize: '1.1rem' }}>Distance:</strong>
                  <span style={{ fontSize: '1rem', color: '#ddd' }}>
                    {currentWorkout.hillRequirement.distance}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Terrain Instructions */}
        {currentWorkout.terrainInstructions && (
          <div style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}12 0%, rgba(255, 255, 255, 0.05) 100%)`,
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}35`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}15, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}12`,
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              color: 'white',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              Terrain Instructions
            </h3>
            {typeof currentWorkout.terrainInstructions === 'string' ? (
              <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
                {currentWorkout.terrainInstructions}
              </p>
            ) : typeof currentWorkout.terrainInstructions === 'object' ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(currentWorkout.terrainInstructions).map(([key, value]) => (
                  <div key={key}>
                    <strong style={{ color: '#999', textTransform: 'capitalize', display: 'block', marginBottom: '6px', fontSize: '1.1rem' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </strong>
                    {typeof value === 'string' ? (
                      <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>{value}</p>
                    ) : Array.isArray(value) ? (
                      <div style={{ paddingLeft: '12px' }}>
                        {value.map((item, idx) => (
                          <p key={idx} style={{ margin: '4px 0', fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                            • {item}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>{JSON.stringify(value)}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Progression Guidance */}
        {currentWorkout.progression && (
          <div style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}12 0%, rgba(255, 255, 255, 0.05) 100%)`,
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}35`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}15, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}12`,
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: 'white',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              Progression
            </h3>
            {typeof currentWorkout.progression === 'string' ? (
              <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
                {currentWorkout.progression}
              </p>
            ) : typeof currentWorkout.progression === 'object' ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(currentWorkout.progression).map(([key, value]) => (
                  <div key={key}>
                    <strong style={{ color: '#999', textTransform: 'capitalize', display: 'block', marginBottom: '6px', fontSize: '1.1rem' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </strong>
                    <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>{value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Variations */}
        {currentWorkout.variations && Array.isArray(currentWorkout.variations) && currentWorkout.variations.length > 0 && (
          <div style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}12 0%, rgba(255, 255, 255, 0.05) 100%)`,
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}35`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}15, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}12`,
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: 'white',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              Variations
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {currentWorkout.variations.map((variation, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '8px 0' }}>
                  <span style={{ color: '#666', fontSize: '1.5rem', minWidth: '24px' }}>•</span>
                  <span style={{ fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>{variation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Examples */}
        {currentWorkout.examples && Array.isArray(currentWorkout.examples) && currentWorkout.examples.length > 0 && (
          <div style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}12 0%, rgba(255, 255, 255, 0.05) 100%)`,
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}35`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}15, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}12`,
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: 'white',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              Examples
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {currentWorkout.examples.map((example, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '8px 0' }}>
                  <span style={{ color: '#666', fontSize: '1.5rem', minWidth: '24px' }}>•</span>
                  <span style={{ fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>{example}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Track Intervals - for interval workouts */}
        {currentWorkout.trackIntervals && (
          <div style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}12 0%, rgba(255, 255, 255, 0.05) 100%)`,
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}35`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}15, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}12`,
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: 'white',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              Track Intervals
            </h3>
            {typeof currentWorkout.trackIntervals === 'string' ? (
              <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
                {currentWorkout.trackIntervals}
              </p>
            ) : typeof currentWorkout.trackIntervals === 'object' ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(currentWorkout.trackIntervals).map(([key, value]) => (
                  <div key={key}>
                    <strong style={{ color: '#999', textTransform: 'capitalize', display: 'block', marginBottom: '6px', fontSize: '1.1rem' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </strong>
                    {typeof value === 'object' ? (
                      <div style={{ paddingLeft: '12px' }}>
                        {Object.entries(value).map(([subKey, subValue]) => (
                          <p key={subKey} style={{ margin: '4px 0', fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                            <strong style={{ color: '#999' }}>{subKey}:</strong> {typeof subValue === 'string' ? subValue : JSON.stringify(subValue)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Fueling - for long runs */}
        {currentWorkout.fueling && (
          <div style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}12 0%, rgba(255, 255, 255, 0.05) 100%)`,
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}35`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}15, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}12`,
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: 'white',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              Fueling
            </h3>
            {typeof currentWorkout.fueling === 'string' ? (
              <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
                {currentWorkout.fueling}
              </p>
            ) : typeof currentWorkout.fueling === 'object' ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(currentWorkout.fueling).map(([key, value]) => (
                  <div key={key}>
                    <strong style={{ color: '#999', textTransform: 'capitalize', display: 'block', marginBottom: '6px', fontSize: '1.1rem' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </strong>
                    <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>{value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* RunEQ Options */}
        {currentWorkout.runEqOptions && (
          <div style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}12 0%, rgba(255, 255, 255, 0.05) 100%)`,
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}40`,
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}20, 0 0 25px ${getWorkoutTypeColor(currentWorkout.type)}15`,
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              color: 'white',
              fontSize: '1.6rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              RunEQ Options - 4 Ways to Complete This Workout
            </h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              {currentWorkout.runEqOptions.optionA && (
                <div style={{
                  background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}08 0%, rgba(0, 0, 0, 0.3) 100%)`,
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}25`,
                  boxShadow: `0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}10, 0 0 10px ${getWorkoutTypeColor(currentWorkout.type)}08`
                }}>
                  <strong style={{ color: '#999', fontSize: '1.1rem', display: 'block', marginBottom: '8px' }}>
                    Option A:
                  </strong>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                    {currentWorkout.runEqOptions.optionA}
                  </p>
                </div>
              )}
              {currentWorkout.runEqOptions.optionB && (
                <div style={{
                  background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}08 0%, rgba(0, 0, 0, 0.3) 100%)`,
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}25`,
                  boxShadow: `0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}10, 0 0 10px ${getWorkoutTypeColor(currentWorkout.type)}08`
                }}>
                  <strong style={{ color: '#999', fontSize: '1.1rem', display: 'block', marginBottom: '8px' }}>
                    Option B:
                  </strong>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                    {currentWorkout.runEqOptions.optionB}
                  </p>
                </div>
              )}
              {currentWorkout.runEqOptions.optionC && (
                <div style={{
                  background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}08 0%, rgba(0, 0, 0, 0.3) 100%)`,
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}25`,
                  boxShadow: `0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}10, 0 0 10px ${getWorkoutTypeColor(currentWorkout.type)}08`
                }}>
                  <strong style={{ color: '#999', fontSize: '1.1rem', display: 'block', marginBottom: '8px' }}>
                    Option C:
                  </strong>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                    {currentWorkout.runEqOptions.optionC}
                  </p>
                </div>
              )}
              {currentWorkout.runEqOptions.optionD && (
                <div style={{
                  background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}08 0%, rgba(0, 0, 0, 0.3) 100%)`,
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}25`,
                  boxShadow: `0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}10, 0 0 10px ${getWorkoutTypeColor(currentWorkout.type)}08`
                }}>
                  <strong style={{ color: '#999', fontSize: '1.1rem', display: 'block', marginBottom: '8px' }}>
                    Option D:
                  </strong>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                    {currentWorkout.runEqOptions.optionD}
                  </p>
                </div>
              )}
              {currentWorkout.runEqOptions.recommendation && (
                <div style={{
                  background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}20 0%, ${getWorkoutTypeColor(currentWorkout.type)}10 100%)`,
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}50`,
                  boxShadow: `0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}30, 0 0 15px ${getWorkoutTypeColor(currentWorkout.type)}20`
                }}>
                  <strong style={{ color: 'white', fontSize: '1.2rem', display: 'block', marginBottom: '8px' }}>
                    Recommended for you:
                  </strong>
                  <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: '1.6', color: 'white', fontWeight: '500' }}>
                    {currentWorkout.runEqOptions.recommendation}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coaching Guidance */}
        {currentWorkout.coachingGuidance && (
          <div style={{
            background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}12 0%, rgba(255, 255, 255, 0.05) 100%)`,
            border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}35`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}15, 0 0 20px ${getWorkoutTypeColor(currentWorkout.type)}12`,
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              Coaching Guidance
            </h3>
            {typeof currentWorkout.coachingGuidance === 'string' ? (
              <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
                {currentWorkout.coachingGuidance}
              </p>
            ) : typeof currentWorkout.coachingGuidance === 'object' ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(currentWorkout.coachingGuidance).map(([key, value]) => (
                  <div key={key}>
                    <strong style={{ color: '#999', textTransform: 'capitalize', display: 'block', marginBottom: '6px', fontSize: '1.1rem' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </strong>
                    <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>{value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          background: `linear-gradient(135deg, ${getWorkoutTypeColor(currentWorkout.type)}12 0%, rgba(255, 255, 255, 0.05) 100%)`,
          border: `2px solid ${getWorkoutTypeColor(currentWorkout.type)}30`,
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(currentWorkout.type)}15, 0 0 25px ${getWorkoutTypeColor(currentWorkout.type)}10`,
          transition: 'all 0.3s ease'
        }}>
          <button
            onClick={handleSomethingElse}
            className="workout-button"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: '700',
              padding: '18px 24px',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 30px rgba(236, 72, 153, 0.3)',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #fbbf24 100%)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(139, 92, 246, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.2), 0 0 40px rgba(236, 72, 153, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 30px rgba(236, 72, 153, 0.3)';
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>✨</span>
            Something Else (Show Alternatives)
          </button>

          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            padding: '16px',
            background: '#0a0a0a',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#666', lineHeight: '1.6' }}>
              <strong style={{ color: '#999' }}>Need something different?</strong><br/>
              Click above for all alternatives including contextual adaptations (too hot, too tired, time constraints, etc.)
            </p>
          </div>
        </div>
      </div>

      <SomethingElseModal
        isOpen={somethingElseModal.isOpen}
        onClose={handleCloseSomethingElse}
        currentWorkout={somethingElseModal.workout}
        userProfile={userProfile}
        trainingPlan={trainingPlan}
        onWorkoutSelect={handleWorkoutReplacement}
      />
    </div>
  );
}

export default WorkoutDetail;