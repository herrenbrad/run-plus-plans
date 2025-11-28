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

