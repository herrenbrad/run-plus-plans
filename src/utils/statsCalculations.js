/**
 * Stats Calculation Utilities
 * Pure functions for calculating mileage breakdowns and rolling distances
 * Extracted from Dashboard.js for reusability and testability
 */

/**
 * Get all workouts for a day (handles two-a-days)
 * @param {object} workout - Workout object that may contain multiple workouts
 * @returns {array} Array of workout objects
 */
function getWorkouts(workout) {
  if (Array.isArray(workout.workouts)) {
    return workout.workouts;
  }
  return [workout];
}

/**
 * Calculate mileage breakdown between running and equivalent activities
 * @param {object} weekData - Week data with workouts array
 * @param {function} getWorkoutsFn - Optional function to get workouts for a day (handles two-a-days)
 * @returns {object} Breakdown object with runMiles, bikeMiles, ellipticalMiles, runEqMiles, equivalentMiles, totalMiles
 */
export function calculateMileageBreakdown(weekData, getWorkoutsFn = getWorkouts) {
  if (!weekData?.workouts) {
    return { runMiles: 0, bikeMiles: 0, ellipticalMiles: 0, runEqMiles: 0, totalMiles: 0, equivalentMiles: 0 };
  }

  // CRITICAL: If backend provided totalMileage, use it as the authoritative source
  const hasBackendMileage = weekData.totalMileage !== undefined && weekData.totalMileage !== null;

  let runMiles = 0;
  let bikeMiles = 0;
  let ellipticalMiles = 0;
  let runEqMiles = 0;

  weekData.workouts.forEach(workout => {
    const allWorkoutsForDay = getWorkoutsFn(workout);

    allWorkoutsForDay.forEach((currentWorkout) => {
      // CRITICAL: Use the distance field directly - NO defaults, NO name parsing
      // If distance field exists, use it. If not, the workout has 0 distance.
      if (currentWorkout.type === 'brick') {
        // Brick workouts: parse from description if distance field not available
        if (currentWorkout.distance !== undefined && currentWorkout.distance !== null) {
          // If distance field exists, use it (assume it's total distance)
          runMiles += parseFloat(currentWorkout.distance);
        } else {
          // Only parse description if distance field is missing
          const runMatch = currentWorkout.workout?.description?.match(/(\d+(?:\.\d+)?)\s*mi.*run/i);
          const bikeMatch = currentWorkout.workout?.description?.match(/(\d+(?:\.\d+)?)\s*mi.*bike/i);
          if (runMatch) runMiles += parseFloat(runMatch[1]);
          if (bikeMatch) bikeMiles += parseFloat(bikeMatch[1]);
        }
      } else if (currentWorkout.type === 'bike') {
        // Bike workouts = RunEQ miles
        if (currentWorkout.distance !== undefined && currentWorkout.distance !== null) {
          const runEqValue = parseFloat(currentWorkout.distance);
          runEqMiles += runEqValue;
        }
        // NO fallback - if no distance field, it's 0
      } else if (currentWorkout.type === 'rest') {
        // Rest days = 0 miles, do nothing
      } else {
        // All other workouts (running workouts): use distance field directly
        if (currentWorkout.distance !== undefined && currentWorkout.distance !== null) {
          runMiles += parseFloat(currentWorkout.distance);
        }
        // NO fallback - if no distance field, it's 0
      }
    });
  });

  // RunEQ miles ARE equivalent miles - they're already in "running equivalent" format
  // Total miles = runMiles (actual running) + runEqMiles (RunEQ = running equivalent)
  // Other cross-training (bike/elliptical) gets converted to equivalent miles separately
  const bikeEquivalentMiles = bikeMiles / 3;
  const ellipticalEquivalentMiles = ellipticalMiles / 2;
  const equivalentMiles = bikeEquivalentMiles + ellipticalEquivalentMiles;
  // RunEQ miles are already equivalent, so total = runMiles + runEqMiles
  const calculatedTotal = runMiles + runEqMiles;

  // Use backend totalMileage as authoritative (deterministic service knows the intended weekly total)
  // The calculated total should match, but if it doesn't, trust the backend number
  const totalMiles = hasBackendMileage ? weekData.totalMileage : calculatedTotal;

  return {
    runMiles: Math.round(runMiles * 10) / 10,
    bikeMiles: Math.round(bikeMiles * 10) / 10,
    ellipticalMiles: Math.round(ellipticalMiles * 10) / 10,
    runEqMiles: Math.round(runEqMiles * 10) / 10,
    equivalentMiles: Math.round(equivalentMiles * 10) / 10,
    totalMiles: Math.round(totalMiles * 10) / 10
  };
}

/**
 * Calculate rolling distance totals from completed workouts
 * @param {object} trainingPlan - Training plan with weeks array
 * @param {object} workoutCompletions - Object mapping workout keys to completion data
 * @param {function} getWorkoutsFn - Optional function to get workouts for a day (handles two-a-days)
 * @returns {object} Object with last7Days, last30Days, and allTime distances
 */
export function calculateRollingDistance(trainingPlan, workoutCompletions, getWorkoutsFn = getWorkouts) {
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
    if (!week || !week.workouts) return;

    week.workouts.forEach(workout => {
      // Get all workouts for this day (including two-a-days)
      const allWorkoutsForDay = getWorkoutsFn(workout);

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
}

