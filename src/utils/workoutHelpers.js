/**
 * Workout Helper Utilities
 * 
 * Extracted from Dashboard.js to reduce complexity and improve reusability.
 */

/**
 * Clean WORKOUT_ID tags from workout names/descriptions
 */
export const cleanWorkoutText = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\[WORKOUT_ID:\s*[^\]]+\]\s*/gi, '').trim();
};

/**
 * Normalize workout type for backward compatibility with existing plans
 * Converts library categories (VO2_MAX, SHORT_SPEED, etc.) to standard types (intervals, hills, etc.)
 */
export const getNormalizedWorkoutType = (workout) => {
  const type = (workout?.type || '').toLowerCase();
  const name = (workout?.name || '').toLowerCase();
  const focus = (workout?.focus || '').toLowerCase();

  // Already normalized
  if (['intervals', 'hills', 'tempo', 'longrun', 'easy', 'rest', 'rest_or_xt', 'bike'].includes(type)) {
    return type === 'longrun' ? 'longRun' : type;
  }

  // Detect interval workouts
  if (type.includes('vo2') || type.includes('speed') || type.includes('interval') ||
      name.includes('interval') || name.includes('800m') || name.includes('400m') ||
      name.includes('repeat') || focus.includes('vo2')) {
    return 'intervals';
  }

  // Detect hill workouts
  if (type.includes('hill') || type.includes('power') || type.includes('strength') ||
      name.includes('hill') || focus.includes('strength')) {
    return 'hills';
  }

  // Detect tempo workouts
  if (type.includes('tempo') || type.includes('threshold') ||
      name.includes('tempo') || name.includes('threshold') || name.includes('cruise') ||
      focus.includes('threshold')) {
    return 'tempo';
  }

  // Detect long runs
  if (type.includes('long') || type.includes('progressive') || type.includes('mixed') ||
      name.includes('long run') || focus.includes('endurance')) {
    return 'longRun';
  }

  return type || 'easy';
};

/**
 * Check if a workout is a long run (handles both old and AI-generated workouts)
 */
export const isLongRun = (workout) => {
  // Check explicit type
  if (workout.type === 'longRun' || workout.type === 'brickLongRun') {
    return true;
  }
  // Check metadata from AI-generated workouts
  if (workout.metadata?.workoutId && workout.metadata.workoutId.includes('longrun_')) {
    return true;
  }
  // Check workout ID field directly
  if (workout.workoutId && workout.workoutId.includes('longrun_')) {
    return true;
  }
  // Check if workout name contains "long run"
  if (workout.name?.toLowerCase().includes('long run') || workout.workout?.name?.toLowerCase().includes('long run')) {
    return true;
  }
  return false;
};

/**
 * Format workout type names for display
 */
export const formatWorkoutTypeName = (type) => {
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

/**
 * Get workout type color for styling
 */
export const getWorkoutTypeColor = (type) => {
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

/**
 * Intensity-based color system for workout cards
 */
export const getIntensityColors = (intensity, difficulty) => {
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

/**
 * Extract distance/duration info for quick glance
 */
export const getWorkoutDistance = (workout) => {
  // Don't show distance badge for rest days
  const workoutName = (workout.workout?.name || workout.name || '').toLowerCase();
  const workoutType = (workout.type || '').toLowerCase();
  if (workoutType === 'rest' || 
      workoutName.includes('rest day') || 
      workoutName === 'rest' ||
      workout.focus === 'Recovery' && workoutType === 'rest') {
    return null;
  }

  // Priority 1: Check workout.distance field
  if (workout.distance && workout.distance > 0) {
    if (workout.type === 'bike' && (workout.name?.includes('RunEQ') || workout.workout?.name?.includes('RunEQ'))) {
      return `📏 ${workout.distance} RunEQ`;
    }
    return `📏 ${workout.distance} ${workout.distance === 1 ? 'mile' : 'miles'}`;
  }

  // Priority 2: Extract from workout name
  const nameMatch = workout.workout?.name?.match(/(\d+(?:\.\d+)?)\s*-?\s*(mile|miles|mi|RunEQ|km)/i) ||
                   workout.name?.match(/(\d+(?:\.\d+)?)\s*-?\s*(mile|miles|mi|RunEQ|km)/i);
  if (nameMatch) {
    return `📏 ${nameMatch[1]} ${nameMatch[2]}`;
  }

  // Priority 3: Check workoutDetails.repetitions for intervals
  if (workout.workoutDetails?.repetitions) {
    return `🔁 ${workout.workoutDetails.repetitions}`;
  }

  // Priority 4: Check workoutDetails.duration ONLY if no distance was found
  if (workout.workoutDetails?.duration && !workout.distance) {
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

