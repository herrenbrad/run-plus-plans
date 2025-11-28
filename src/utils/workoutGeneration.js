import { TempoWorkoutLibrary } from '../lib/tempo-workout-library.js';
import { IntervalWorkoutLibrary } from '../lib/interval-workout-library.js';
import { LongRunWorkoutLibrary } from '../lib/long-run-workout-library.js';
import { HillWorkoutLibrary } from '../lib/hill-workout-library.js';
import { formatEquipmentName } from './typography';
import logger from './logger';

// Initialize workout libraries
const tempoLibrary = new TempoWorkoutLibrary();
const intervalLibrary = new IntervalWorkoutLibrary();
const longRunLibrary = new LongRunWorkoutLibrary();
const hillLibrary = new HillWorkoutLibrary();

/**
 * Generate Cyclete workout for a given day and intensity
 * CRITICAL: Uses RunEQ miles (3-5 miles), NOT actual bike miles
 */
export const generateCycleteWorkout = (day, intensity, standUpBikeType) => {
  // RunEQ miles are typically 3-5 miles (equivalent to running effort)
  // NOT actual bike miles which would be 12-20+
  const runeqMiles = { 'Easy': 3, 'Moderate': 4, 'Hard': 5, 'Very Hard': 5 };
  const miles = runeqMiles[intensity] || 4;

  return {
    name: `${miles} RunEQ Miles on ${formatEquipmentName(standUpBikeType)}`,
    description: `Ride ${miles} RunEQ miles on your ${formatEquipmentName(standUpBikeType)} @ steady aerobic effort`
  };
};

/**
 * Generate a full week of workouts based on profile and week number
 * This is a fallback when trainingPlan.weeks is empty
 */
export const generateWeekWorkouts = (week, profile) => {
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

  // Get user's actual schedule preferences
  // Normalize day names to match format (capitalize first letter)
  const normalizeDay = (day) => day ? day.charAt(0).toUpperCase() + day.slice(1).toLowerCase() : '';
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  let restDays = (profile?.restDays || []).map(normalizeDay);
  const hardDays = (profile?.hardSessionDays || profile?.qualityDays || []).map(normalizeDay);
  const longRunDay = normalizeDay(profile?.longRunDay || 'Sunday');
  const bikeDays = (profile?.preferredBikeDays || []).map(normalizeDay);
  const availableDays = (profile?.availableDays || []).map(normalizeDay);
  
  // If restDays is empty but availableDays exists, calculate rest days
  if (restDays.length === 0 && availableDays.length > 0) {
    restDays = allDays.filter(day => 
      !availableDays.includes(day) && 
      !bikeDays.includes(day) &&
      day !== longRunDay &&
      !hardDays.includes(day)
    );
    logger.log('📅 Calculated rest days from availableDays:', restDays);
  }

  logger.log('📅 User schedule preferences:', { 
    restDays, 
    hardDays, 
    longRunDay, 
    bikeDays,
    availableDays,
    rawRestDays: profile?.restDays,
    rawHardDays: profile?.hardSessionDays || profile?.qualityDays,
    rawAvailableDays: profile?.availableDays
  });

  // Helper to extract distance from workout library object
  const extractWorkoutDistance = (workout) => {
    // Check workout.distance first
    if (workout?.distance) return workout.distance;
    // Check workoutDetails.distance
    if (workout?.workoutDetails?.distance) return workout.workoutDetails.distance;
    // Try to extract from description
    const desc = workout?.description || '';
    const match = desc.match(/(\d+(?:\.\d+)?)\s*(?:mile|miles|mi)/i);
    if (match) return parseFloat(match[1]);
    return null;
  };

  // Helper to determine workout for a day
  const getWorkoutForDay = (dayName) => {
    logger.log(`  Checking ${dayName}: restDays=${restDays.includes(dayName)}, hardDays=${hardDays.includes(dayName)}, bikeDays=${bikeDays.includes(dayName)}, longRunDay=${dayName === longRunDay}`);
    
    // Check if it's a rest day first (case-insensitive)
    if (restDays.includes(dayName)) {
      logger.log(`    ✅ ${dayName} is a REST DAY`);
      return {
        day: dayName,
        type: 'rest',
        workout: { name: 'Rest Day', description: 'Complete rest or light cross-training' },
        focus: 'Recovery',
        completed: false
      };
    }

    // Check if it's a bike day
    if (bikeDays.includes(dayName)) {
      const intensity = hardDays.includes(dayName) ? 'Hard' : 'Moderate';
      return {
        day: dayName,
        type: 'bike',
        workout: generateCycleteWorkout(dayName, intensity, profile.standUpBikeType),
        focus: hardDays.includes(dayName) ? 'Aerobic Power' : 'Aerobic Base',
        completed: false,
        equipmentSpecific: true
      };
    }

    // Check if it's the long run day
    if (dayName === longRunDay) {
      // Extract distance from workout library - check multiple sources
      let distance = extractWorkoutDistance(sundayWorkout);
      
      // If no distance found, try to extract from description
      if (!distance && sundayWorkout.description) {
        const descMatch = sundayWorkout.description.match(/(\d+(?:\.\d+)?)\s*(?:mile|miles|mi)/i);
        if (descMatch) {
          distance = parseFloat(descMatch[1]);
          logger.log(`  📏 Extracted long run distance from description: ${distance} miles`);
        }
      }
      
      // If still no distance, check user's current long run distance from profile
      if (!distance && (profile?.currentLongRunDistance || profile?.currentLongRun)) {
        distance = parseFloat(profile.currentLongRunDistance || profile.currentLongRun);
        logger.log(`  📏 Using user's current long run distance from profile: ${distance} miles`);
      }
      
      // If still no distance, use a default based on weekly mileage
      if (!distance) {
        const weeklyMileage = profile?.currentWeeklyMileage || 20;
        distance = Math.round(weeklyMileage * 0.25); // ~25% of weekly mileage
        logger.log(`  ⚠️ No distance found for long run, using default: ${distance} miles (25% of ${weeklyMileage} weekly miles)`);
      }
      
      const workoutObj = {
        name: sundayWorkout.name,
        description: sundayWorkout.description
      };
      if (distance) {
        workoutObj.distance = distance;
        // Update description to include distance if it only has time
        if (sundayWorkout.description && !sundayWorkout.description.match(/\d+\s*(?:mile|miles|mi)/i)) {
          workoutObj.description = `${distance} miles - ${sundayWorkout.description}`;
        }
      }
      return {
        day: dayName,
        type: sundayTypeInfo.type,
        workout: workoutObj,
        focus: sundayTypeInfo.focus,
        completed: false,
        workoutDetails: sundayWorkout,
        distance: distance
      };
    }

    // Check if it's a hard day (quality workout)
    if (hardDays.includes(dayName)) {
      // Use Tuesday workout pattern for first hard day, Saturday for second
      const workout = hardDays.indexOf(dayName) === 0 ? tuesdayWorkout : saturdayWorkout;
      const typeInfo = hardDays.indexOf(dayName) === 0 ? tuesdayTypeInfo : saturdayTypeInfo;
      const distance = extractWorkoutDistance(workout);
      const workoutObj = {
        name: workout.name,
        description: workout.description
      };
      if (distance) workoutObj.distance = distance;
      return {
        day: dayName,
        type: typeInfo.type,
        workout: workoutObj,
        focus: typeInfo.focus,
        completed: false,
        workoutDetails: workout,
        distance: distance
      };
    }

    // Default to easy run
    return {
      day: dayName,
      type: 'easy',
      workout: { name: 'Easy Run', description: 'Conversational pace, aerobic base building', distance: 4 },
      focus: 'Recovery',
      completed: false,
      distance: 4
    };
  };

  // Generate workouts for each day
  return [
    getWorkoutForDay('Monday'),
    getWorkoutForDay('Tuesday'),
    getWorkoutForDay('Wednesday'),
    getWorkoutForDay('Thursday'),
    getWorkoutForDay('Friday'),
    getWorkoutForDay('Saturday'),
    getWorkoutForDay('Sunday')
  ];
};

