import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import SomethingElseModal from './SomethingElseModal';
import { formatEquipmentName, formatHeartRate, formatIntensity } from '../utils/typography';
import { auth } from '../firebase/config';
import FirestoreService from '../services/FirestoreService';

function WorkoutDetail({ userProfile, trainingPlan }) {
  const navigate = useNavigate();
  const { day } = useParams();
  const location = useLocation();
  const [somethingElseModal, setSomethingElseModal] = useState({
    isOpen: false,
    workout: null
  });
  const [modifiedWorkout, setModifiedWorkout] = useState(null);
  
  // Get workout data from navigation state (passed from Dashboard) or fall back to training plan
  const workoutFromState = location.state?.workout;
  const userProfileFromState = location.state?.userProfile || userProfile;
  const currentWeekNumber = location.state?.currentWeek || 1;
  const weekDataFromState = location.state?.weekData;
  
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
  // Helper function to generate benefits fallback based on workout type and name
  const generateBenefitsFallback = (workoutType, workoutName = '') => {
    const name = workoutName.toLowerCase();

    if (name.includes('fartlek')) {
      return 'Develops speed, mental toughness, and ability to surge during races. Improves VO2 max and teaches body to handle varied paces.';
    } else if (name.includes('progressive')) {
      return 'Builds mental strength and pacing skills. Teaches body to run strong when tired. Improves lactate clearance and finishing speed.';
    } else if (name.includes('tempo') || workoutType === 'tempo') {
      return 'Raises lactate threshold, improves race pace endurance, and builds mental toughness. Key workout for half marathon and marathon training.';
    } else if (name.includes('interval') || name.includes('speed') || workoutType === 'intervals') {
      return 'Increases VO2 max, running economy, and speed. Develops neuromuscular power and teaches body to handle high-intensity efforts.';
    } else if (name.includes('hill') || workoutType === 'hills') {
      return 'Builds leg strength, power, and running economy. Improves form and reduces injury risk through strength development.';
    } else if (name.includes('long') || workoutType === 'longRun') {
      return 'Builds aerobic endurance, fat adaptation, and mental toughness. Strengthens bones, tendons, and cardiovascular system.';
    } else if (name.includes('easy') || name.includes('recovery') || workoutType === 'easy') {
      return 'Promotes recovery, builds aerobic base, and strengthens cardiovascular system without stress. Allows body to adapt to training.';
    }

    return 'Develops overall fitness and running ability';
  };

  // Transform workout library data to WorkoutDetail format
  const transformWorkoutData = (workoutData) => {
    if (!workoutData) return null;

    // FIX: Use workoutData.workout if workoutDetails doesn't exist (intervals store data in workout)
    const workoutLib = workoutData.workoutDetails || workoutData.workout;
    const workoutType = workoutData.type;

    // DEBUG: Log what we're working with
    console.log('🔍 WorkoutDetail - transformWorkoutData:');
    console.log('  workoutType:', workoutType);
    console.log('  workoutData:', workoutData);
    console.log('  workoutData.workout:', workoutData.workout);
    console.log('  workoutData.workout.structure:', workoutData.workout?.structure);
    console.log('  workoutLib:', workoutLib);
    console.log('  workoutLib.structure:', workoutLib?.structure);
    console.log('  workoutLib.totalWorkout:', workoutLib?.totalWorkout);
    console.log('  workoutLib.totalWorkout.structure:', workoutLib?.totalWorkout?.structure);
    console.log('  workoutLib.repetitions:', workoutLib?.repetitions);

    // Map workout type to intensity and heart rate (fallback if not in library)
    const getIntensityInfo = (type) => {
      switch(type) {
        case 'intervals':
          return {
            intensity: 'High intensity - 5K to 1-mile race pace',
            heartRate: '90-100% Max HR'
          };
        case 'tempo':
          return {
            intensity: 'Medium-hard effort, sustainable for 20-60 minutes',
            heartRate: '86-90% Max HR'
          };
        case 'hills':
          return {
            intensity: 'Hard effort on hills, easy on recovery',
            heartRate: '85-95% Max HR'
          };
        case 'longRun':
          return {
            intensity: 'Easy conversational pace',
            heartRate: '70-80% Max HR'
          };
        default:
          return {
            intensity: 'Moderate effort',
            heartRate: '70-85% Max HR'
          };
      }
    };

    const intensityInfo = getIntensityInfo(workoutType);

    // Extract structure from workout library - handle different formats
    let structure = null;

    // Check for bike workout structure first (from new TEMPO_BIKE, INTERVAL_BIKE, etc. categories)
    if (workoutData.workout?.structure) {
      structure = workoutData.workout.structure;
    } else if (workoutLib?.workout) {
      // Hill workouts have workout.warmup/main/recovery/cooldown
      structure = workoutLib.workout;
    } else if (workoutLib?.totalWorkout?.structure) {
      // Interval workouts have totalWorkout.structure
      structure = workoutLib.totalWorkout.structure;

      // FIX: Replace range in structure with specific reps from workoutLib.repetitions
      // The structure might have "3-5 x 1200m" but workoutLib.repetitions has "4 x 1200m"
      if (workoutType === 'intervals' && workoutLib.repetitions) {
        // Extract the range pattern from structure (e.g., "3-5 x 1200m")
        const rangePattern = /(\d+)-(\d+)\s*x\s*(\S+)/g;

        // Replace ALL range patterns with the specific repetitions
        structure = structure.replace(rangePattern, (match, min, max, distance) => {
          // Check if workoutLib.repetitions contains this distance
          if (workoutLib.repetitions.includes(distance)) {
            // Extract just the count + distance from workoutLib.repetitions
            // e.g., "4 x 1200m (6:32 each)" -> extract "4 x 1200m"
            const specificMatch = workoutLib.repetitions.match(/(\d+\s*x\s*\S+)/);
            if (specificMatch) {
              return specificMatch[1];
            }
          }
          return match; // If no match, return original
        });
      }
    } else if (workoutLib?.structure) {
      // Tempo workouts have structure field
      structure = workoutLib.structure;
    } else if (workoutLib?.repetitions && workoutLib?.recovery) {
      // Some interval workouts have repetitions + recovery
      structure = `${workoutLib.repetitions} with ${workoutLib.recovery}`;
    } else if (workoutLib?.repetitions) {
      // Minimal interval data - just show reps
      structure = `${workoutLib.repetitions}`;
    } else if (workoutData.workout?.structure) {
      structure = workoutData.workout.structure;
    }

    // FALLBACK: Generate structure from workout name and description if none found
    if (!structure || structure === 'Complete the workout as prescribed') {
      const workoutName = workoutData.workout?.name || workoutLib?.name || 'Workout';
      const workoutDesc = workoutData.workout?.description || workoutLib?.description || '';
      const duration = workoutData.workout?.duration || workoutLib?.duration || '30-45 minutes';

      // Try to create a sensible structure based on the workout name
      if (workoutName.toLowerCase().includes('fartlek')) {
        structure = '10 min warmup + 20-30 min fartlek (surge when you feel strong, recover as needed) + 10 min cooldown';
      } else if (workoutName.toLowerCase().includes('progressive')) {
        structure = '10 min easy + gradually build pace to moderate-hard finish + 5 min cooldown';
      } else if (workoutName.toLowerCase().includes('tempo')) {
        structure = '10-15 min easy warmup + 20-30 min @ comfortably hard pace + 5-10 min cooldown';
      } else if (workoutName.toLowerCase().includes('interval') || workoutName.toLowerCase().includes('speed')) {
        structure = '15 min warmup + intervals at high intensity with recovery + 10 min cooldown';
      } else if (workoutName.toLowerCase().includes('easy') || workoutName.toLowerCase().includes('recovery')) {
        structure = `${duration} at conversational pace throughout`;
      } else if (workoutName.toLowerCase().includes('long')) {
        structure = `${duration} at steady, easy pace - focus on time on feet`;
      } else {
        // Generic fallback with description
        structure = workoutDesc || 'Complete the workout as prescribed';
      }
    }

    // Extract intensity from library if available
    // Check bike workout effort object first
    const actualIntensity = workoutData.workout?.effort?.perceived ||
                           workoutLib?.intensity ||
                           intensityInfo.intensity;

    // Extract heart rate from library if available
    // Check bike workout effort object first
    const actualHeartRate = workoutData.workout?.effort?.heartRate ||
                           workoutLib?.heartRate ||
                           intensityInfo.heartRate;

    // Extract pace guidance - check multiple possible locations
    let paceGuidance = 'Maintain steady effort throughout';

    // Priority 0: Bike workout equipment-specific notes
    if (workoutData.equipmentSpecific && userProfileFromState?.standUpBikeType) {
      if (userProfileFromState.standUpBikeType === 'cyclete' && workoutData.workout?.cycleteNotes) {
        paceGuidance = workoutData.workout.cycleteNotes;
      } else if (userProfileFromState.standUpBikeType === 'elliptigo' && workoutData.workout?.elliptigoNotes) {
        paceGuidance = workoutData.workout.elliptigoNotes;
      } else {
        paceGuidance = `${formatEquipmentName(userProfileFromState.standUpBikeType)} specific: Focus on smooth motion and consistent effort`;
      }
    }
    // Priority 1: Use actual pace if available - match pace to workout intensity
    else if (workoutLib?.paces) {
      // Check workout intensity to determine which pace to show
      const intensity = workoutLib.intensity || workoutType;

      if (intensity === 'easy' || intensity === 'recovery' && workoutLib.paces.easy) {
        // EASY/RECOVERY workouts - show easy pace
        paceGuidance = `${workoutLib.paces.easy.min}-${workoutLib.paces.easy.max}/mile`;
      } else if ((workoutType === 'intervals' || intensity === 'interval') && workoutLib.paces.interval) {
        // INTERVAL workouts - show interval pace
        paceGuidance = `${workoutLib.paces.interval.pace}/mile`;
      } else if ((workoutType === 'tempo' || intensity === 'threshold') && workoutLib.paces.threshold) {
        // TEMPO workouts - show threshold pace
        paceGuidance = `${workoutLib.paces.threshold.pace}/mile`;
      } else if (intensity === 'marathonPace' && workoutLib.paces.marathon) {
        // MARATHON PACE workouts - show marathon pace
        paceGuidance = `${workoutLib.paces.marathon.pace}/mile`;
      } else if (workoutLib.paces.easy) {
        // FALLBACK - default to easy pace if nothing else matches
        paceGuidance = `${workoutLib.paces.easy.min}-${workoutLib.paces.easy.max}/mile`;
      }
    }
    // Priority 2: Use paceGuidance object/string from library
    else if (workoutLib?.paceGuidance) {
      if (typeof workoutLib.paceGuidance === 'object') {
        // Extract description field from paceGuidance object
        paceGuidance = workoutLib.paceGuidance.description || 'Maintain steady effort throughout';
      } else {
        paceGuidance = workoutLib.paceGuidance;
      }
    }

    // Extract safety notes from library - prefer safetyNotes over generic fallback
    let safetyNotes = workoutLib?.safetyNotes && Array.isArray(workoutLib.safetyNotes) && workoutLib.safetyNotes.length > 0
      ? workoutLib.safetyNotes
      : [
          'Listen to your body and adjust as needed',
          'Stay hydrated throughout the workout',
          'Stop if you feel pain or excessive fatigue'
        ];

    // Add road considerations for bike workouts
    if (workoutData.workout?.roadConsiderations) {
      safetyNotes = [...safetyNotes, `Road planning: ${workoutData.workout.roadConsiderations}`];
    }

    // Calculate total duration based on distance and pace (if available)
    let calculatedDuration = workoutData.workout?.duration || workoutLib?.duration || '30-45 minutes';

    // For running workouts with distance and easy pace, calculate specific duration
    if (workoutType === 'longRun' || workoutType === 'easy') {
      // Extract distance from workout name
      const distanceMatch = workoutData.workout?.name?.match(/(\d+)-Mile/i);
      if (distanceMatch && workoutLib?.paces?.easy) {
        const miles = parseFloat(distanceMatch[1]);
        const easyPaceMin = workoutLib.paces.easy.min; // e.g., "11:07"
        const easyPaceMax = workoutLib.paces.easy.max; // e.g., "12:12"

        // Convert pace strings to minutes
        const parseMinutes = (paceStr) => {
          const [min, sec] = paceStr.split(':').map(Number);
          return min + sec / 60;
        };

        const minDuration = Math.round(miles * parseMinutes(easyPaceMin));
        const maxDuration = Math.round(miles * parseMinutes(easyPaceMax));

        calculatedDuration = `${minDuration}-${maxDuration} minutes`;
      }
    }

    // If structure mentions "total", use that instead
    if (structure && typeof structure === 'string') {
      const totalMatch = structure.match(/(\d+-\d+)\s*minutes?\s*total/i);
      if (totalMatch) {
        calculatedDuration = `${totalMatch[1]} minutes total`;
      }
      // If we see warmup + main + cooldown pattern, note it's the full session
      else if (structure.includes('warmup') && structure.includes('cooldown')) {
        // Don't override - the library duration might just be the main set
        // Add a note that structure includes warmup/cooldown
        calculatedDuration = `${calculatedDuration} (main set)`;
      }
    }

    // Build comprehensive workout object
    const transformedWorkout = {
      name: workoutData.workout?.name || workoutLib?.name || 'Workout',
      type: workoutData.type || 'easy',
      focus: workoutData.focus || workoutLib?.focus || 'Recovery',
      duration: calculatedDuration,
      description: workoutData.workout?.description || workoutLib?.description || 'Standard workout',
      structure: structure,
      equipmentSpecific: workoutData.equipmentSpecific || false,
      intensity: actualIntensity,
      heartRate: actualHeartRate,
      paceGuidance: paceGuidance,
      safetyNotes: safetyNotes,
      alternatives: workoutData.workout?.alternatives || workoutLib?.alternatives || {
        tooHot: 'Move indoors or adjust timing',
        tooTired: 'Easy recovery pace instead',
        timeConstraint: 'Reduce duration but maintain intensity',
        noEquipment: 'Bodyweight alternative available'
      },
      // Include additional library data
      hillRequirement: workoutLib?.hillRequirement,
      terrainInstructions: workoutLib?.terrainInstructions,
      progression: workoutLib?.progression,
      benefits: workoutData.workout?.benefits || workoutLib?.benefits || generateBenefitsFallback(workoutType, workoutData.workout?.name || workoutLib?.name),
      variations: workoutLib?.variations,
      examples: workoutLib?.examples,
      trackIntervals: workoutLib?.trackIntervals,
      fueling: workoutLib?.fueling,
      runEqOptions: workoutData.runEqOptions,
      coachingGuidance: workoutData.coachingGuidance
    };

    return transformedWorkout;
  };

  // Use workoutData if available, otherwise fall back to hardcoded data
  const baseWorkout = workoutData ? transformWorkoutData(workoutData) : workoutDetails[day] || workoutDetails.tuesday;
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
    // IMPORTANT: Keep workout data nested under 'workout' property for transformWorkoutData to extract properly
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



  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Hero Header with Gradient */}
      <div style={{
        background: getWorkoutTypeGradient(currentWorkout.type),
        padding: '32px 0 48px 0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)'
        }}></div>

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'rgba(34, 197, 94, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                color: '#22c55e',
                fontSize: '0.9rem',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                gap: '6px'
              }}
              title="Reload workout data from libraries (useful after code changes)"
            >
              🔄 Refresh
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              fontSize: '4rem',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
            }}>
              {getWorkoutTypeEmoji(currentWorkout.type)}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{
                margin: 0,
                color: 'white',
                fontSize: '2.5rem',
                fontWeight: '800',
                textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                letterSpacing: '-0.5px'
              }}>
                {typeof currentWorkout.name === 'string' ? currentWorkout.name :
                 typeof currentWorkout.name === 'object' ? JSON.stringify(currentWorkout.name) :
                 'Workout'}
              </h1>
              <p style={{
                margin: '8px 0 0 0',
                color: 'rgba(255,255,255,0.95)',
                fontSize: '1.1rem',
                fontWeight: '500'
              }}>
                {day.charAt(0).toUpperCase() + day.slice(1)} • {typeof currentWorkout.duration === 'string' ? currentWorkout.duration :
                 typeof currentWorkout.duration === 'object' ? JSON.stringify(currentWorkout.duration) :
                 '30-45 minutes'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              🎯 {currentWorkout.focus}
            </span>
            {currentWorkout.equipmentSpecific && userProfile?.standUpBikeType && (
              <span style={{
                background: 'rgba(255, 184, 0, 0.3)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}>
                ⚡ {formatEquipmentName(userProfile.standUpBikeType)}
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
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏃</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              Target Pace
            </div>
            <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800', lineHeight: '1.2' }}>
              {formatPaceGuidance(currentWorkout.paceGuidance)}
            </div>
          </div>

          {/* Intensity Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(240, 147, 251, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💪</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              Intensity
            </div>
            <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: '700', lineHeight: '1.3' }}>
              {typeof currentWorkout.intensity === 'string' ? formatIntensity(currentWorkout.intensity) :
               typeof currentWorkout.intensity === 'object' ? JSON.stringify(currentWorkout.intensity) :
               'Medium Effort'}
            </div>
          </div>

          {/* Heart Rate Card */}
          <div style={{
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(250, 112, 154, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>❤️</div>
            <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              Heart Rate Zone
            </div>
            <div style={{ color: '#1a1a1a', fontSize: '1.5rem', fontWeight: '800', lineHeight: '1.2' }}>
              {typeof currentWorkout.heartRate === 'string' ? formatHeartRate(currentWorkout.heartRate) :
               typeof currentWorkout.heartRate === 'object' ? JSON.stringify(currentWorkout.heartRate) :
               '70-85% Max HR'}
            </div>
          </div>
        </div>

        {/* WORKOUT STRUCTURE - VISUAL BREAKDOWN */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          border: '2px solid rgba(102, 126, 234, 0.3)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
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
            <span style={{ fontSize: '2rem' }}>📋</span>
            Workout Structure
          </h2>

          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '1.1rem',
            lineHeight: '2',
            color: 'white',
            fontWeight: '500',
            whiteSpace: 'pre-line'
          }}>
            {formatStructure(currentWorkout.structure)}
          </div>
        </div>

        {/* DESCRIPTION */}
        {currentWorkout.description && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              color: '#00FF88',
              fontSize: '1.3rem',
              fontWeight: '700'
            }}>
              About This Workout
            </h3>
            <p style={{ fontSize: '1rem', margin: 0, lineHeight: '1.7', color: '#ddd' }}>
              {typeof currentWorkout.description === 'string' ? currentWorkout.description :
               typeof currentWorkout.description === 'object' ? JSON.stringify(currentWorkout.description) :
               'Standard workout description'}
            </p>
          </div>
        )}


        {/* Climate Adaptation */}
        {userProfile?.climate === 'hot_humid' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.15) 0%, rgba(255, 120, 0, 0.15) 100%)',
            border: '2px solid rgba(255, 184, 0, 0.4)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(255, 184, 0, 0.2)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#FFB800',
              fontSize: '1.5rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.8rem' }}>🌡️</span>
              Climate Adjustments
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                <div>
                  <strong style={{ color: '#FFB800', display: 'block', marginBottom: '4px' }}>Pace:</strong>
                  <span style={{ color: '#ddd' }}>Add 30-60 seconds per mile in high humidity</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>💧</span>
                <div>
                  <strong style={{ color: '#FFB800', display: 'block', marginBottom: '4px' }}>Hydration:</strong>
                  <span style={{ color: '#ddd' }}>Drink before feeling thirsty</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>🌅</span>
                <div>
                  <strong style={{ color: '#FFB800', display: 'block', marginBottom: '4px' }}>Timing:</strong>
                  <span style={{ color: '#ddd' }}>Early morning (before 7am) or late evening recommended</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>💪</span>
                <div>
                  <strong style={{ color: '#FFB800', display: 'block', marginBottom: '4px' }}>Effort:</strong>
                  <span style={{ color: '#ddd' }}>Focus on effort level rather than exact pace</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Safety Notes */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 200, 100, 0.1) 100%)',
          border: '2px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(0, 255, 136, 0.15)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            color: '#00FF88',
            fontSize: '1.5rem',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.8rem' }}>✅</span>
            Safety & Execution Notes
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {(Array.isArray(currentWorkout.safetyNotes) ? currentWorkout.safetyNotes : [
              'Listen to your body and adjust as needed',
              'Stay hydrated throughout the workout',
              'Stop if you feel pain or excessive fatigue'
            ]).map((note, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '8px 0' }}>
                <span style={{ color: '#00FF88', fontSize: '1.5rem', minWidth: '24px' }}>•</span>
                <span style={{ fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                  {typeof note === 'string' ? note : JSON.stringify(note)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Hill Requirements - only for hill workouts */}
        {currentWorkout.hillRequirement && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(79, 172, 254, 0.15) 0%, rgba(0, 242, 254, 0.15) 100%)',
            border: '2px solid rgba(79, 172, 254, 0.4)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(79, 172, 254, 0.2)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#4facfe',
              fontSize: '1.5rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.8rem' }}>⛰️</span>
              Hill Requirements
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {currentWorkout.hillRequirement.description && (
                <div>
                  <strong style={{ color: '#4facfe', display: 'block', marginBottom: '8px', fontSize: '1.1rem' }}>
                    📍 Description:
                  </strong>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                    {currentWorkout.hillRequirement.description}
                  </p>
                </div>
              )}
              {currentWorkout.hillRequirement.grade && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ color: '#4facfe', fontSize: '1.1rem' }}>📈 Grade:</strong>
                  <span style={{ fontSize: '1rem', color: '#ddd' }}>
                    {currentWorkout.hillRequirement.grade}
                  </span>
                </div>
              )}
              {currentWorkout.hillRequirement.distance && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ color: '#4facfe', fontSize: '1.1rem' }}>📏 Distance:</strong>
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
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              color: '#00FF88',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              🏞️ Terrain Instructions
            </h3>
            {typeof currentWorkout.terrainInstructions === 'string' ? (
              <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
                {currentWorkout.terrainInstructions}
              </p>
            ) : typeof currentWorkout.terrainInstructions === 'object' ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(currentWorkout.terrainInstructions).map(([key, value]) => (
                  <div key={key}>
                    <strong style={{ color: '#00FF88', textTransform: 'capitalize', display: 'block', marginBottom: '6px', fontSize: '1.1rem' }}>
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

        {/* Benefits */}
        {currentWorkout.benefits && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              color: '#00FF88',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              💪 Benefits
            </h3>
            <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
              {currentWorkout.benefits}
            </p>
          </div>
        )}

        {/* Progression Guidance */}
        {currentWorkout.progression && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#00FF88',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              📈 Progression
            </h3>
            {typeof currentWorkout.progression === 'string' ? (
              <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
                {currentWorkout.progression}
              </p>
            ) : typeof currentWorkout.progression === 'object' ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(currentWorkout.progression).map(([key, value]) => (
                  <div key={key}>
                    <strong style={{ color: '#00FF88', textTransform: 'capitalize', display: 'block', marginBottom: '6px', fontSize: '1.1rem' }}>
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
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#00FF88',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              🔄 Variations
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {currentWorkout.variations.map((variation, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '8px 0' }}>
                  <span style={{ color: '#00FF88', fontSize: '1.5rem', minWidth: '24px' }}>•</span>
                  <span style={{ fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>{variation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Examples */}
        {currentWorkout.examples && Array.isArray(currentWorkout.examples) && currentWorkout.examples.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#00FF88',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              📝 Examples
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {currentWorkout.examples.map((example, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '8px 0' }}>
                  <span style={{ color: '#00FF88', fontSize: '1.5rem', minWidth: '24px' }}>•</span>
                  <span style={{ fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>{example}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Track Intervals - for interval workouts */}
        {currentWorkout.trackIntervals && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#00FF88',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              🏃 Track Intervals
            </h3>
            {typeof currentWorkout.trackIntervals === 'string' ? (
              <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
                {currentWorkout.trackIntervals}
              </p>
            ) : typeof currentWorkout.trackIntervals === 'object' ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(currentWorkout.trackIntervals).map(([key, value]) => (
                  <div key={key}>
                    <strong style={{ color: '#00FF88', textTransform: 'capitalize', display: 'block', marginBottom: '6px', fontSize: '1.1rem' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </strong>
                    {typeof value === 'object' ? (
                      <div style={{ paddingLeft: '12px' }}>
                        {Object.entries(value).map(([subKey, subValue]) => (
                          <p key={subKey} style={{ margin: '4px 0', fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                            <strong style={{ color: '#00D4FF' }}>{subKey}:</strong> {typeof subValue === 'string' ? subValue : JSON.stringify(subValue)}
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
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#00FF88',
              fontSize: '1.3rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              🍎 Fueling
            </h3>
            {typeof currentWorkout.fueling === 'string' ? (
              <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.7', color: '#ddd' }}>
                {currentWorkout.fueling}
              </p>
            ) : typeof currentWorkout.fueling === 'object' ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(currentWorkout.fueling).map(([key, value]) => (
                  <div key={key}>
                    <strong style={{ color: '#00FF88', textTransform: 'capitalize', display: 'block', marginBottom: '6px', fontSize: '1.1rem' }}>
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
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
            border: '2px solid rgba(102, 126, 234, 0.4)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
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
              <span style={{ fontSize: '2rem' }}>🔄</span>
              RunEQ Options - 4 Ways to Complete This Workout
            </h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              {currentWorkout.runEqOptions.optionA && (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(10px)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <strong style={{ color: '#00FF88', fontSize: '1.1rem', display: 'block', marginBottom: '8px' }}>
                    Option A:
                  </strong>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                    {currentWorkout.runEqOptions.optionA}
                  </p>
                </div>
              )}
              {currentWorkout.runEqOptions.optionB && (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(10px)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <strong style={{ color: '#00FF88', fontSize: '1.1rem', display: 'block', marginBottom: '8px' }}>
                    Option B:
                  </strong>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                    {currentWorkout.runEqOptions.optionB}
                  </p>
                </div>
              )}
              {currentWorkout.runEqOptions.optionC && (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(10px)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <strong style={{ color: '#00FF88', fontSize: '1.1rem', display: 'block', marginBottom: '8px' }}>
                    Option C:
                  </strong>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                    {currentWorkout.runEqOptions.optionC}
                  </p>
                </div>
              )}
              {currentWorkout.runEqOptions.optionD && (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(10px)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <strong style={{ color: '#00FF88', fontSize: '1.1rem', display: 'block', marginBottom: '8px' }}>
                    Option D:
                  </strong>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}>
                    {currentWorkout.runEqOptions.optionD}
                  </p>
                </div>
              )}
              {currentWorkout.runEqOptions.recommendation && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2) 0%, rgba(0, 200, 100, 0.2) 100%)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(0, 255, 136, 0.4)',
                  boxShadow: '0 4px 16px rgba(0, 255, 136, 0.2)'
                }}>
                  <strong style={{ color: '#00FF88', fontSize: '1.2rem', display: 'block', marginBottom: '8px' }}>
                    💡 Recommended for you:
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
            background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 200, 100, 0.1) 100%)',
            border: '2px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(0, 255, 136, 0.15)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#00FF88',
              fontSize: '1.5rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.8rem' }}>🎯</span>
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
                    <strong style={{ color: '#00FF88', textTransform: 'capitalize', display: 'block', marginBottom: '6px', fontSize: '1.1rem' }}>
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
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <button
            onClick={handleSomethingElse}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: '700',
              padding: '18px 24px',
              borderRadius: '16px',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.4)';
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>🔄</span>
            Something Else (Show Alternatives)
          </button>

          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#bbb', lineHeight: '1.6' }}>
              💡 <strong style={{ color: 'white' }}>Need something different?</strong><br/>
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