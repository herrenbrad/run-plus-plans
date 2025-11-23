/**
 * Typography Constants and Formatting Utilities
 * Ensures consistent text display throughout the Run+ app
 */

/**
 * Display name mappings for technical terms
 */
export const TYPOGRAPHY = {
  TRAINING_SYSTEMS: {
    'practical_periodization': 'Practical Periodization',
    'high_volume': 'High Volume Training',
    'polarized': 'Polarized Training',
    'base_building': 'Base Building',
    'competitive': 'Competitive Training'
  },

  EQUIPMENT: {
    'cyclete': 'Cyclete',
    'elliptigo': 'ElliptiGO',
    'runeq': 'RunEQ',
    'running': 'Running',
    'bike': 'Bike',
    'standup_bike': 'Stand-up Bike'
  },

  PHASES: {
    'base': 'Base Phase',
    'build': 'Build Phase',
    'peak': 'Peak Phase',
    'taper': 'Taper Phase',
    'recovery': 'Recovery Phase'
  },

  WORKOUT_TYPES: {
    'easy': 'Easy Run',
    'tempo': 'Tempo Run',
    'intervals': 'Intervals',
    'long_run': 'Long Run',
    'hills': 'Hill Workout',
    'recovery': 'Recovery',
    'brick': 'Brick Workout',
    'bike': 'Bike Workout'
  },

  INTENSITY_LABELS: {
    'easy': 'Easy',
    'moderate': 'Moderate',
    'comfortablyHard': 'Comfortably Hard',
    'comfortably_hard': 'Comfortably Hard',
    'thresholdPace': 'Threshold Pace',
    'threshold_pace': 'Threshold Pace',
    'tempoPlus': 'Tempo Plus',
    'tempo_plus': 'Tempo Plus',
    'hard': 'Hard',
    'very_hard': 'Very Hard',
    'veryHard': 'Very Hard',
    'max_effort': 'Maximum Effort',
    'maxEffort': 'Maximum Effort'
  }
};

/**
 * Format training system name for display
 * @param {string} systemKey - Database/code name (e.g., "practical_periodization")
 * @returns {string} Display name (e.g., "Practical Periodization")
 */
export function formatTrainingSystem(systemKey) {
  if (!systemKey) return '';
  return TYPOGRAPHY.TRAINING_SYSTEMS[systemKey] || titleCase(systemKey.replace(/_/g, ' '));
}

/**
 * Format equipment name for display
 * @param {string} equipment - Equipment key (e.g., "cyclete", "CYCLETE", "Cyclete")
 * @returns {string} Display name (e.g., "Cyclete")
 */
export function formatEquipmentName(equipment) {
  if (!equipment) return '';
  const normalized = equipment.toLowerCase();
  return TYPOGRAPHY.EQUIPMENT[normalized] || titleCase(equipment);
}

/**
 * Format training phase for display
 * @param {string} phase - Phase key (e.g., "base", "build")
 * @returns {string} Display name (e.g., "Base Phase")
 */
export function formatPhase(phase) {
  if (!phase) return '';
  return TYPOGRAPHY.PHASES[phase.toLowerCase()] || titleCase(phase);
}

/**
 * Format workout type for display
 * @param {string} type - Workout type key
 * @returns {string} Display name
 */
export function formatWorkoutType(type) {
  if (!type) return '';
  return TYPOGRAPHY.WORKOUT_TYPES[type.toLowerCase()] || titleCase(type.replace(/_/g, ' '));
}

/**
 * Format intensity label for display
 * @param {string} intensity - Intensity key or full intensity description
 * @returns {string} Display name
 */
export function formatIntensity(intensity) {
  if (!intensity) return '';

  // Check if it's a known intensity key
  if (TYPOGRAPHY.INTENSITY_LABELS[intensity]) {
    return TYPOGRAPHY.INTENSITY_LABELS[intensity];
  }

  // Handle camelCase terms like "marathonPace" or "easy to marathonPace"
  // Convert camelCase to spaces: "marathonPace" -> "marathon Pace"
  let formatted = intensity.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Replace underscores with spaces
  formatted = formatted.replace(/_/g, ' ');

  // If it's already a well-formatted sentence (starts uppercase, has spaces, no technical patterns), return as-is
  if (formatted === intensity &&
      intensity.includes(' ') &&
      intensity.charAt(0) === intensity.charAt(0).toUpperCase()) {
    return intensity;
  }

  // Apply title case to the formatted string
  return titleCase(formatted);
}

/**
 * Convert string to Title Case
 * @param {string} str - Input string
 * @returns {string} Title cased string
 */
export function titleCase(str) {
  if (!str) return '';

  // Words that should remain lowercase in titles (unless first word)
  const lowercaseWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'];

  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize first word
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Keep articles/prepositions lowercase unless they're the first word
      if (lowercaseWords.includes(word)) {
        return word;
      }
      // Capitalize all other words
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Format heart rate display consistently
 * @param {string} hrText - Heart rate text (e.g., "70-85% max HR")
 * @returns {string} Formatted text (e.g., "70-85% Max HR")
 */
export function formatHeartRate(hrText) {
  if (!hrText) return '';
  return hrText
    .replace(/max hr/gi, 'Max HR')
    .replace(/max heart rate/gi, 'Max Heart Rate')
    .replace(/hr/gi, 'HR');
}

/**
 * Clean technical field names for display
 * Removes underscores and converts to title case
 * @param {string} fieldName - Technical field name (e.g., "practical_periodization")
 * @returns {string} Display name (e.g., "Practical Periodization")
 */
export function cleanFieldName(fieldName) {
  if (!fieldName) return '';
  return titleCase(fieldName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim());
}

/**
 * Format button label consistently (Title Case)
 * @param {string} label - Button label
 * @returns {string} Formatted label
 */
export function formatButtonLabel(label) {
  if (!label) return '';
  return titleCase(label);
}

/**
 * Check if a string contains technical jargon that should be cleaned
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains technical patterns
 */
export function containsTechnicalJargon(text) {
  if (!text) return false;
  // Check for common technical patterns
  return /[_]/.test(text) || // Contains underscores
         /^[a-z]+[A-Z]/.test(text) || // camelCase
         /^[A-Z_]+$/.test(text); // SCREAMING_SNAKE_CASE
}

/**
 * Auto-format any text that might contain technical jargon
 * @param {string} text - Text to format
 * @returns {string} Cleaned and formatted text
 */
export function autoFormat(text) {
  if (!text) return '';

  if (containsTechnicalJargon(text)) {
    return cleanFieldName(text);
  }

  return text;
}
