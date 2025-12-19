import { LibraryCatalog } from '../lib/LibraryCatalog';
import { formatEquipmentName } from './typography';

/**
 * Safely extract easy pace from paces object regardless of format
 * Handles: { min: "9:20", max: "9:50" }, { pace: "9:30" }, or string "9:30-9:50"
 * Always strips any existing "/mile" suffix to prevent doubling
 */
const getEasyPace = (paces, preferMax = true) => {
  if (!paces?.easy) return null;

  // Helper to strip /mile suffix if present
  const stripMileSuffix = (pace) => pace ? pace.replace(/\/mile$/i, '').trim() : null;

  // If it's an object with min/max
  if (paces.easy.max) return stripMileSuffix(preferMax ? paces.easy.max : paces.easy.min);
  if (paces.easy.min) return stripMileSuffix(paces.easy.min);

  // If it has a single pace property
  if (paces.easy.pace) {
    // Strip /mile first, then split on dash
    const cleanPace = stripMileSuffix(paces.easy.pace);
    const parts = cleanPace.split('-');
    if (parts.length === 2) {
      return preferMax ? parts[1].trim() : parts[0].trim();
    }
    return cleanPace;
  }

  // If it's a string like "9:30" or "9:30-9:50" or "9:30-9:50/mile"
  if (typeof paces.easy === 'string') {
    const cleanPace = stripMileSuffix(paces.easy);
    const parts = cleanPace.split('-');
    return preferMax ? parts[parts.length - 1].trim() : parts[0].trim();
  }

  return null;
};

// Use LibraryCatalog for all library access
const intervalLibrary = LibraryCatalog.running.intervals;
const tempoLibrary = LibraryCatalog.running.tempo;
const hillLibrary = LibraryCatalog.running.hills;
const longRunLibrary = LibraryCatalog.running.longRun;

const structuredWorkoutTypes = ['longRun', 'long-run', 'tempo', 'interval', 'intervals', 'hill', 'hills', 'cross-training', 'bike'];

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

const fetchFromLibrary = (workoutName, workoutType, options, crossTrainingType = null) => {
  if (!workoutName) return null;

  // Strip pace suffix like "(9:17/mi)", distance prefix like "8-Mile", and emoji prefixes from workout name
  // This allows matching "🚣 Sustained Tempo Row" or "8-Mile Half Marathon Simulation" to library workouts
  const cleanName = workoutName
    .replace(/\s*\([^)]*\/mi\)\s*$/i, '')  // Remove pace suffix
    .replace(/^\d+(?:\.\d+)?[- ]?(?:mile|mi)\s+/i, '')  // Remove distance prefix like "8-Mile "
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '')  // Remove emoji prefix like "🚣 "
    .trim();

  try {
    // Handle cross-training workouts
    if (workoutType === 'cross-training' || workoutType === 'bike' || crossTrainingType) {
      const equipmentType = crossTrainingType || 'standUpBike';
      return LibraryCatalog.getCrossTrainingWorkout(equipmentType, cleanName, options);
    }

    // Handle running workouts
    switch (workoutType) {
      case 'interval':
      case 'intervals':
        return intervalLibrary.prescribeIntervalWorkout(cleanName, options);
      case 'tempo':
        return tempoLibrary.prescribeTempoWorkout(cleanName, options);
      case 'hill':
      case 'hills':
        return hillLibrary.prescribeHillWorkout(cleanName, options);
      case 'longRun':
      case 'long-run':
        return longRunLibrary.prescribeLongRunWorkout(cleanName, options);
      default:
        return null;
    }
  } catch (e) {
    console.warn(`Could not fetch workout "${workoutName}" from library:`, e.message);
    return null;
  }
};

const getIntensityInfo = (type) => {
  switch(type) {
    case 'interval':
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
    case 'hill':
    case 'hills':
      return {
        intensity: 'Hard effort on hills, easy on recovery',
        heartRate: '85-95% Max HR'
      };
    case 'longRun':
    case 'long-run':
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

const getFocusFallback = (type) => {
  const focusMap = {
    hills: 'Power & Strength',
    tempo: 'Lactate Threshold',
    intervals: 'VO2 Max & Speed',
    easy: 'Aerobic Base',
    longRun: 'Endurance',
    'cross-training': 'Active Recovery'
  };
  return focusMap[type] || 'General Fitness';
};

export function transformWorkoutForDisplay({
  workoutData,
  userProfile,
  trainingPlan,
  vdotPaces,
  experienceLevel
}) {
  if (!workoutData) return null;

  const normalizedProfile = userProfile || {};

  const isCrossTraining = workoutData.type === 'cross-training';
  // Check nested workout objects first, then fall back to workoutData itself
  // (TrainingPlanService spreads workout properties at top level)
  let workoutLib = isCrossTraining ? workoutData : (workoutData.fullWorkoutDetails || workoutData.workoutDetails || workoutData.workout || workoutData);
  const workoutType = workoutData.type;

  const workoutNameLower = (workoutLib?.name || workoutData.name || '').toLowerCase();
  const isLongRunByName = workoutNameLower.includes('long run') ||
                          workoutNameLower.includes('progression') ||
                          workoutNameLower.includes('dropdown') ||
                          workoutNameLower.includes('thirds') ||
                          workoutNameLower.includes('marathon pace') ||
                          workoutNameLower.includes('steady state') ||
                          workoutNameLower.includes('sandwich') ||
                          workoutNameLower.includes('simulation') ||
                          workoutNameLower.includes('dress rehearsal') ||
                          workoutNameLower.includes('goal pace');
  const effectiveWorkoutType = isLongRunByName ? 'longRun' : workoutType;

  const weekNumber = trainingPlan?.currentWeek || trainingPlan?.planOverview?.currentWeek || null;
  const totalWeeks = trainingPlan?.planOverview?.totalWeeks || null;
  const runEqPreference = normalizedProfile.runEqPreference || 0;

  const needsLibraryRefresh = !workoutLib?.intensityGuidance ||
    structuredWorkoutTypes.includes(effectiveWorkoutType);

  // Handle cross-training workouts - fetch from cross-training libraries
  if (isCrossTraining || workoutData.crossTrainingType || workoutType === 'bike') {
    const workoutName = workoutLib?.name || workoutData.name;
    const crossTrainingType = workoutData.crossTrainingType || workoutData.equipmentType || 'standUpBike';

    const libraryData = fetchFromLibrary(workoutName, workoutType, {
      equipment: normalizedProfile.standUpBikeType,
      runEqPreference,
    }, crossTrainingType);

    if (libraryData) {
      workoutLib = { ...workoutLib, ...libraryData };
    }
  }
  // Handle running workouts
  else if (workoutLib && needsLibraryRefresh && effectiveWorkoutType !== 'easy') {
    const workoutName = workoutLib.name || workoutData.name;
    const trackIntervals = workoutLib.trackIntervals || trainingPlan?.trackIntervals || normalizedProfile.trackIntervals;
    let workoutDistance = workoutData.distance ||
      workoutLib?.distance ||
      workoutData.workout?.distance;

    if (!workoutDistance) {
      const nameMatch = (workoutName || '').match(/(\d+(?:\.\d+)?)[- ]?Mile/i);
      if (nameMatch) {
        workoutDistance = parseFloat(nameMatch[1]);
      }
    }

    if (!workoutDistance) {
      const descMatch = (workoutData.description || workoutLib?.description || '').match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b/i);
      if (descMatch) {
        workoutDistance = parseFloat(descMatch[1]);
      }
    }

    if (!workoutDistance) {
      const dataNameMatch = (workoutData.name || '').match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi|-Mile)\b/i);
      if (dataNameMatch) {
        workoutDistance = parseFloat(dataNameMatch[1]);
      }
    }

    if (!workoutDistance && effectiveWorkoutType === 'longRun') {
      console.warn(`⚠️ NO DISTANCE FOUND for long run "${workoutName}" - AI coach should include distance in description`);
    }

    const libraryData = fetchFromLibrary(workoutName, effectiveWorkoutType, {
      runEqPreference,
      paces: vdotPaces,
      trackIntervals,
      totalDistance: workoutDistance,
      weekNumber,
      totalWeeks,
      distance: workoutDistance
    });

    if (libraryData) {
      workoutLib = libraryData;
    }
  }

  const intensityInfo = getIntensityInfo(workoutType);

  let structure = null;
  if (isCrossTraining && workoutLib?.structure) {
    structure = workoutLib.structure;
  } else if (workoutLib?.warmupCooldown && workoutLib?.repetitions) {
    const wc = workoutLib.warmupCooldown;
    const parts = [];
    if (wc.warmup) parts.push(`**Warmup:** ${wc.warmup}`);
    parts.push(`**Main Set:** ${workoutLib.repetitions}${workoutLib.recovery ? ` with ${workoutLib.recovery}` : ''}`);
    if (wc.cooldown) parts.push(`**Cooldown:** ${wc.cooldown}`);
    structure = parts.join('\n\n');
  } else if (workoutLib?.mileByMilePacing) {
    structure = workoutLib.mileByMilePacing;
  } else if (workoutLib?.structure && (workoutType === 'longRun' || workoutType === 'long-run' || workoutType === 'tempo')) {
    structure = workoutLib.structure;
  } else if (workoutData.workout?.structure) {
    structure = workoutData.workout.structure;
  } else if (workoutLib?.workout?.warmup || workoutLib?.workout?.main) {
    // Nested workout object structure (original library format)
    const parts = [];
    if (workoutLib.workout.warmup) parts.push(`**Warmup:** ${workoutLib.workout.warmup}`);
    if (workoutLib.workout.main) parts.push(`**Main Set:** ${workoutLib.workout.main}`);
    if (workoutLib.workout.recovery) parts.push(`**Recovery:** ${workoutLib.workout.recovery}`);
    if (workoutLib.workout.cooldown) parts.push(`**Cooldown:** ${workoutLib.workout.cooldown}`);
    structure = parts.length ? parts.join('\n\n') : workoutLib.workout;
  } else if (workoutLib?.warmup || workoutLib?.main) {
    // Flattened structure (after PlanTransformer processing)
    const parts = [];
    if (workoutLib.warmup) parts.push(`**Warmup:** ${workoutLib.warmup}`);
    if (workoutLib.main) parts.push(`**Main Set:** ${workoutLib.main}`);
    if (workoutLib.recovery) parts.push(`**Recovery:** ${workoutLib.recovery}`);
    if (workoutLib.cooldown) parts.push(`**Cooldown:** ${workoutLib.cooldown}`);
    structure = parts.length ? parts.join('\n\n') : null;
  } else if (workoutLib?.totalWorkout?.structure) {
    structure = workoutLib.totalWorkout.structure;
  } else if (workoutLib?.structure) {
    structure = workoutLib.structure;
  } else if (workoutLib?.repetitions && workoutLib?.recovery) {
    structure = `${workoutLib.repetitions} with ${workoutLib.recovery}`;
  } else if (workoutLib?.repetitions) {
    structure = `${workoutLib.repetitions}`;
  }

  if (!structure || structure === 'Complete the workout as prescribed') {
    const workoutName = workoutData.workout?.name || workoutLib?.name || 'Workout';
    const workoutDesc = workoutData.workout?.description || workoutLib?.description || '';

    if (workoutName.toLowerCase().includes('fartlek')) {
      structure = '10 min warmup + 20-30 min fartlek (surge when you feel strong, recover as needed) + 10 min cooldown';
    } else if (workoutName.toLowerCase().includes('progressive')) {
      structure = '10 min easy + gradually build pace to moderate-hard finish + 5 min cooldown';
    } else if (workoutName.toLowerCase().includes('tempo')) {
      structure = '10-15 min easy warmup + 20-30 min @ comfortably hard pace + 5-10 min cooldown';
    } else if (workoutName.toLowerCase().includes('interval') || workoutName.toLowerCase().includes('speed')) {
      structure = '15 min warmup + intervals at high intensity with recovery + 10 min cooldown';
    } else if (workoutName.toLowerCase().includes('easy') || workoutName.toLowerCase().includes('recovery')) {
      structure = 'Conversational pace throughout';
    } else if (workoutName.toLowerCase().includes('long')) {
      structure = 'Steady, easy pace - focus on time on feet';
    } else {
      structure = workoutDesc || 'Complete the workout as prescribed';
    }
  }

  const actualIntensity = (isCrossTraining && workoutLib?.effort?.perceived) ||
    workoutData.workout?.effort?.perceived ||
    workoutLib?.intensityGuidance?.effort ||
    workoutLib?.intensityGuidance?.description ||
    (typeof workoutLib?.intensity === 'string' && !['shortSpeed', 'vo2Max', 'longIntervals', 'threshold', 'tempoPlus'].includes(workoutLib.intensity) ? workoutLib.intensity : null) ||
    intensityInfo.intensity;

  const actualHeartRate = (isCrossTraining && workoutLib?.effort?.heartRate) ||
    workoutData.workout?.effort?.heartRate ||
    workoutLib?.intensityGuidance?.heartRate ||
    workoutLib?.heartRate ||
    intensityInfo.heartRate;

  let paceGuidance = 'Maintain steady effort throughout';
  const availablePaces = workoutLib?.paces || vdotPaces;
  const workoutNameForPace = (workoutLib?.name || workoutData.name || '').toLowerCase();
  const isProgressionRun = workoutNameForPace.includes('dropdown') ||
                            workoutNameForPace.includes('10-second') ||
                            workoutNameForPace.includes('thirds') ||
                            workoutNameForPace.includes('dusa') ||
                            workoutNameForPace.includes('fast finish') ||
                            workoutNameForPace.includes('progressive');
  const isSandwichWorkout = workoutNameForPace.includes('sandwich') ||
                             workoutNameForPace.includes('simulation') ||
                             workoutNameForPace.includes('dress rehearsal') ||
                             workoutNameForPace.includes('marathon pace long') ||
                             workoutNameForPace.includes('goal pace');
  const isFastFinish = workoutNameForPace.includes('fast finish') || workoutNameForPace.includes('super fast');

  if (workoutData.equipmentSpecific && normalizedProfile.standUpBikeType) {
    if (normalizedProfile.standUpBikeType === 'cyclete' && workoutData.workout?.cycleteNotes) {
      paceGuidance = workoutData.workout.cycleteNotes;
    } else if (normalizedProfile.standUpBikeType === 'elliptigo' && workoutData.workout?.elliptigoNotes) {
      paceGuidance = workoutData.workout.elliptigoNotes;
    } else {
      paceGuidance = `${formatEquipmentName(normalizedProfile.standUpBikeType)} specific: Focus on smooth motion and consistent effort`;
    }
  } else if (availablePaces) {
    // Use helper to safely extract easy paces
    const easyPaceMin = getEasyPace(availablePaces, false);
    const easyPaceMax = getEasyPace(availablePaces, true);

    if (isSandwichWorkout && (availablePaces.racePace || availablePaces.marathon)) {
      const goalPace = availablePaces.racePace?.pace || availablePaces.marathon?.pace;
      paceGuidance = `${goalPace}/mile (goal pace)`;
    } else if (isFastFinish && easyPaceMin && easyPaceMax && availablePaces.interval) {
      const easyPace = `${easyPaceMin}-${easyPaceMax}/mile`;
      const fastFinishPace = availablePaces.interval.pace;
      paceGuidance = `${easyPace} → ${fastFinishPace}/mile (fast finish)`;
    } else if (isProgressionRun && easyPaceMin && easyPaceMax) {
      paceGuidance = `${easyPaceMin}-${easyPaceMax}/mile (starting pace)`;
    } else if ((workoutType === 'intervals' || workoutType === 'interval') && availablePaces.interval) {
      paceGuidance = `${availablePaces.interval.pace}/mile`;
    } else if ((workoutType === 'tempo' || workoutType === 'threshold' || workoutNameForPace.includes('tempo')) && availablePaces.threshold) {
      paceGuidance = `${availablePaces.threshold.pace}/mile`;
    } else if (workoutType === 'longRun' && easyPaceMin && easyPaceMax) {
      paceGuidance = `${easyPaceMin}-${easyPaceMax}/mile`;
    } else if (easyPaceMin && easyPaceMax && (workoutType === 'easy' || workoutType === 'recovery')) {
      paceGuidance = `${easyPaceMin}-${easyPaceMax}/mile`;
    } else if (workoutLib?.intensityGuidance?.pace) {
      paceGuidance = workoutLib.intensityGuidance.pace;
    }
  } else if (workoutLib?.intensityGuidance?.pace) {
    paceGuidance = workoutLib.intensityGuidance.pace;
  }

  let safetyNotes = workoutLib?.safetyNotes && Array.isArray(workoutLib.safetyNotes) && workoutLib.safetyNotes.length > 0
    ? workoutLib.safetyNotes
    : [
        'Listen to your body and adjust as needed',
        'Stay hydrated throughout the workout',
        'Stop if you feel pain or excessive fatigue'
      ];

  if (workoutData.workout?.roadConsiderations) {
    safetyNotes = [...safetyNotes, `Road planning: ${workoutData.workout.roadConsiderations}`];
  }

  let calculatedDuration = '30-45 minutes';
  if (isCrossTraining && workoutLib?.duration) {
    calculatedDuration = workoutLib.duration;
  } else if (workoutLib?.duration && structuredWorkoutTypes.includes(effectiveWorkoutType)) {
    calculatedDuration = workoutLib.duration;
  } else if (workoutData.workout?.duration) {
    calculatedDuration = workoutData.workout.duration;
  } else if (workoutLib?.duration) {
    calculatedDuration = workoutLib.duration;
  }

  if ((effectiveWorkoutType === 'longRun' || workoutType === 'easy') &&
      calculatedDuration.includes('45-') && workoutLib?.paces?.easy) {
    const workoutNameCalc = workoutLib?.name || workoutData.workout?.name || '';
    const distanceMatch = workoutNameCalc.match(/(\d+(?:\.\d+)?)[- ]?Mile/i);
    if (distanceMatch) {
      const miles = parseFloat(distanceMatch[1]);
      const easyPaceMin = workoutLib.paces.easy.min;
      const easyPaceMax = workoutLib.paces.easy.max;

      if (easyPaceMin && easyPaceMax) {
        const parseMinutes = (paceStr) => {
          const [min, sec] = paceStr.split(':').map(Number);
          return min + sec / 60;
        };

        const minDuration = Math.round(miles * parseMinutes(easyPaceMin));
        const maxDuration = Math.round(miles * parseMinutes(easyPaceMax));
        calculatedDuration = `${minDuration}-${maxDuration} minutes`;
      }
    }
  }

  if (structure && typeof structure === 'string') {
    const totalMatch = structure.match(/(\d+-\d+)\s*minutes?\s*total/i);
    if (totalMatch) {
      calculatedDuration = `${totalMatch[1]} minutes total`;
    } else if (structure.includes('warmup') && structure.includes('cooldown')) {
      calculatedDuration = `${calculatedDuration} (main set)`;
    }
  }

  let progression = workoutLib?.progression;
  if (progression && typeof progression === 'object' && !Array.isArray(progression)) {
    const levelKey = experienceLevel
      ? Object.keys(progression).find(key => key.toLowerCase() === experienceLevel.toLowerCase())
      : null;
    if (levelKey) {
      progression = progression[levelKey];
    } else {
      const values = Object.values(progression);
      progression = values.length > 0 ? values[0] : null;
    }
  }

  return {
    name: workoutLib?.name || 'Workout',
    type: workoutData.type || 'easy',
    focus: workoutData.focus || workoutLib?.focus || getFocusFallback(workoutType),
    duration: calculatedDuration,
    description: workoutLib?.description || 'Standard workout',
    structure,
    equipmentSpecific: workoutData.equipmentSpecific || false,
    intensity: actualIntensity,
    heartRate: actualHeartRate,
    paceGuidance,
    safetyNotes,
    alternatives: workoutLib?.alternatives || {
      tooHot: 'Move indoors or adjust timing',
      tooTired: 'Easy recovery pace instead',
      timeConstraint: 'Reduce duration but maintain intensity',
      noEquipment: 'Bodyweight alternative available'
    },
    hillRequirement: workoutLib?.hillRequirement,
    terrainInstructions: workoutLib?.terrainInstructions,
    progression,
    benefits: workoutLib?.benefits || generateBenefitsFallback(workoutType, workoutLib?.name),
    variations: workoutLib?.variations,
    examples: workoutLib?.examples,
    trackIntervals: workoutLib?.trackIntervals,
    fueling: workoutLib?.fueling,
    runEqOptions: workoutData.runEqOptions,
    coachingGuidance: workoutData.coachingGuidance,
    technique: workoutLib?.technique,
    effort: workoutLib?.effort,
    coachingTips: workoutLib?.coachingTips,
    settings: workoutLib?.settings,
    runningEquivalent: workoutLib?.runningEquivalent,
    crossTrainingType: workoutData.crossTrainingType || workoutData.equipmentType,
    equipmentType: workoutData.equipmentType || workoutData.crossTrainingType
  };
}

