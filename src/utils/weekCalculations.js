/**
 * Week Calculation Utilities
 * Pure functions for calculating weeks, dates, and date ranges
 * Extracted from Dashboard.js for reusability and testability
 */

/**
 * Calculate the actual current week based on training plan start date
 * @param {object} trainingPlan - Training plan with planOverview.startDate
 * @returns {number} Current week number (1-based)
 */
export function calculateCurrentWeek(trainingPlan) {
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
}

/**
 * Calculate week date range for display
 * @param {number} weekNumber - Week number (1-based)
 * @param {object} trainingPlan - Training plan with planOverview.startDate
 * @returns {string|null} Date range string (e.g., "Nov 25 - Dec 1") or null
 */
export function getWeekDateRange(weekNumber, trainingPlan) {
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
}

/**
 * Calculate the actual date for a specific workout
 * @param {number} weekNumber - Week number (1-based)
 * @param {string} dayName - Day name (e.g., "Monday", "Tuesday")
 * @param {object} trainingPlan - Training plan with planOverview.startDate
 * @returns {Date|null} Date object for the workout or null
 */
export function getWorkoutDate(weekNumber, dayName, trainingPlan) {
  if (!trainingPlan?.planOverview?.startDate) {
    return null;
  }

  const planStartDate = new Date(trainingPlan.planOverview.startDate + 'T00:00:00');
  const msPerDay = 24 * 60 * 60 * 1000;

  // FIXED: Calculate the Monday of the week containing the start date (same as getWeekDateRange)
  const dayOfWeek = planStartDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days from Monday
  const mondayOfStartWeek = new Date(planStartDate.getTime() - (daysFromMonday * msPerDay));

  // Calculate the Monday of the requested week
  const weekStartDate = new Date(mondayOfStartWeek.getTime() + ((weekNumber - 1) * 7 * msPerDay));

  // Map day names to day offsets (Monday = 0, Tuesday = 1, etc.)
  const dayMap = {
    'monday': 0,
    'tuesday': 1,
    'wednesday': 2,
    'thursday': 3,
    'friday': 4,
    'saturday': 5,
    'sunday': 6
  };

  const dayOffset = dayMap[dayName.toLowerCase()];
  if (dayOffset === undefined) {
    return null;
  }

  return new Date(weekStartDate.getTime() + (dayOffset * msPerDay));
}

/**
 * Format workout date for display
 * @param {Date} date - Date object
 * @returns {string} Formatted date string (e.g., "Nov 27")
 */
export function formatWorkoutDate(date) {
  if (!date) return '';
  const options = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Check if a workout date is in the past
 * @param {number} weekNumber - Week number (1-based)
 * @param {string} dayName - Day name (e.g., "Monday", "Tuesday")
 * @param {object} trainingPlan - Training plan with planOverview.startDate
 * @returns {boolean} True if workout date is in the past
 */
export function isWorkoutInPast(weekNumber, dayName, trainingPlan) {
  if (!trainingPlan?.planOverview?.startDate) {
    return false;
  }

  const planStartDate = new Date(trainingPlan.planOverview.startDate + 'T00:00:00');
  const msPerDay = 24 * 60 * 60 * 1000;

  // Calculate the Monday of the week containing the start date (same as getWeekDateRange)
  const dayOfWeek = planStartDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days from Monday
  const mondayOfStartWeek = new Date(planStartDate.getTime() - (daysFromMonday * msPerDay));

  // Calculate the Monday of the requested week
  const weekStartDate = new Date(mondayOfStartWeek.getTime() + ((weekNumber - 1) * 7 * msPerDay));

  // Map day names to offset from Monday
  const dayOffsets = {
    'Monday': 0, 'Mon': 0,
    'Tuesday': 1, 'Tue': 1,
    'Wednesday': 2, 'Wed': 2,
    'Thursday': 3, 'Thu': 3,
    'Friday': 4, 'Fri': 4,
    'Saturday': 5, 'Sat': 5,
    'Sunday': 6, 'Sun': 6
  };

  const daysToAdd = dayOffsets[dayName];
  if (daysToAdd === undefined) {
    return false; // Unknown day name, can't determine if past
  }

  const workoutDate = new Date(weekStartDate.getTime() + (daysToAdd * msPerDay));

  // Set both dates to midnight for fair comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  workoutDate.setHours(0, 0, 0, 0);

  return workoutDate < today;
}

/**
 * Check if a workout is before the plan's start date (for filtering Week 1 partial weeks)
 * @param {number} weekNumber - Week number (1-based)
 * @param {string} dayName - Day name (e.g., "Monday", "Tuesday")
 * @param {object} trainingPlan - Training plan with planOverview.startDate
 * @returns {boolean} True if workout is before plan start date
 */
export function isWorkoutBeforePlanStart(weekNumber, dayName, trainingPlan) {
  // Only applies to Week 1
  if (weekNumber !== 1) return false;

  if (!trainingPlan?.planOverview?.startDate) {
    return false;
  }

  const planStartDate = new Date(trainingPlan.planOverview.startDate + 'T00:00:00');
  const planStartDayOfWeek = planStartDate.getDay(); // 0 = Sunday, 6 = Saturday

  // Map day names to day of week numbers (includes abbreviations)
  const dayOfWeekNumbers = {
    'Sunday': 0, 'Sun': 0,
    'Monday': 1, 'Mon': 1,
    'Tuesday': 2, 'Tue': 2,
    'Wednesday': 3, 'Wed': 3,
    'Thursday': 4, 'Thu': 4,
    'Friday': 5, 'Fri': 5,
    'Saturday': 6, 'Sat': 6
  };

  const workoutDayOfWeek = dayOfWeekNumbers[dayName];
  if (workoutDayOfWeek === undefined) {
    return false;
  }

  // For Week 1, we need to filter days that come before the start day
  // Week structure: Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6), Sun(0)
  // If plan starts Saturday (6), we want to keep Sat(6) and Sun(0), filter Mon-Fri(1-5)
  // If plan starts Wednesday (3), we want to keep Wed-Sun, filter Mon-Tue(1-2)

  // Sunday (0) is special - it's always the END of the week, so never filter it
  if (workoutDayOfWeek === 0) {
    return false; // Sunday is always included
  }

  // For all other days, filter if the workout day is before the start day
  // (but only if start day isn't Sunday, which would mean full week)
  if (planStartDayOfWeek !== 0 && workoutDayOfWeek < planStartDayOfWeek) {
    return true; // Day is before plan started this week
  }

  return false;
}

