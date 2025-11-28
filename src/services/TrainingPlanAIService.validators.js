/**
 * Validation Functions for TrainingPlanAIService
 * 
 * These validators can be called at key points to catch regressions:
 * - After parsing AI plan
 * - After transforming to dashboard format
 * - Before saving to Firestore
 */

/**
 * Validate that workouts were parsed correctly
 */
export function validateWorkoutsParsed(weeks) {
  const errors = [];
  
  weeks.forEach((week, index) => {
    if (!week.workouts || week.workouts.length === 0) {
      errors.push(`Week ${week.weekNumber || index + 1} has 0 workouts - parsing may have failed`);
    }
  });
  
  if (errors.length > 0) {
    console.error('❌ WORKOUT PARSING VALIDATION FAILED:', errors);
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Validate that hard days have hard workouts
 */
export function validateHardDays(weeks, qualityDays) {
  if (!qualityDays || qualityDays.length === 0) return { valid: true };
  
  const errors = [];
  
  weeks.forEach(week => {
    week.workouts.forEach(workout => {
      if (qualityDays.includes(workout.day)) {
        const descLower = (workout.description || '').toLowerCase();
        const isHardWorkout = descLower.includes('tempo') || 
                             descLower.includes('interval') || 
                             descLower.includes('hill') ||
                             descLower.includes('speed') ||
                             workout.workoutType === 'tempo' ||
                             workout.workoutType === 'interval' ||
                             workout.workoutType === 'hill';
        const isRest = descLower.includes('rest') || workout.type === 'rest';
        const isEasy = descLower.includes('easy') && !isHardWorkout;
        
        if (isRest || (isEasy && !isHardWorkout)) {
          errors.push(`Week ${week.weekNumber}: ${workout.day} is a hard day but has ${workout.description}`);
        }
      }
    });
  });
  
  if (errors.length > 0) {
    console.error('❌ HARD DAYS VALIDATION FAILED:', errors);
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Validate that rest days are actually rest
 */
export function validateRestDays(weeks, restDays) {
  if (!restDays || restDays.length === 0) return { valid: true };
  
  const errors = [];
  
  weeks.forEach(week => {
    week.workouts.forEach(workout => {
      if (restDays.includes(workout.day)) {
        const descLower = (workout.description || '').toLowerCase();
        const isHardWorkout = descLower.includes('tempo') || 
                             descLower.includes('interval') || 
                             descLower.includes('hill') ||
                             descLower.includes('speed');
        const isRest = descLower.includes('rest') || workout.type === 'rest';
        
        if (isHardWorkout && !isRest) {
          errors.push(`Week ${week.weekNumber}: ${workout.day} is a rest day but has hard workout: ${workout.description}`);
        }
      }
    });
  });
  
  if (errors.length > 0) {
    console.error('❌ REST DAYS VALIDATION FAILED:', errors);
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Validate that RunEQ miles are preserved (not converted to actual bike miles)
 */
export function validateRunEQMiles(weeks) {
  const errors = [];
  
  weeks.forEach(week => {
    week.workouts.forEach(workout => {
      if (workout.type === 'bike' || (workout.description || '').toLowerCase().includes('runeq')) {
        const desc = workout.description || '';
        const hasRunEQ = desc.match(/runeq/i);
        const hasActualMiles = desc.match(/\d+\s*(?:mile|miles).*cyclete/i) && !hasRunEQ;
        
        if (hasActualMiles) {
          errors.push(`Week ${week.weekNumber}: ${workout.day} bike workout shows actual miles instead of RunEQ: ${desc}`);
        }
      }
    });
  });
  
  if (errors.length > 0) {
    console.error('❌ RUNEQ MILES VALIDATION FAILED:', errors);
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Validate that long runs show distance, not duration
 */
export function validateLongRunDistance(weeks) {
  const errors = [];
  
  weeks.forEach(week => {
    week.workouts.forEach(workout => {
      if (workout.type === 'longRun' || (workout.description || '').toLowerCase().includes('long run')) {
        const desc = workout.description || '';
        const hasDuration = desc.match(/\d+-\d+\s*(?:minutes?|min)/i);
        const hasDistance = desc.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b/i);
        
        if (hasDuration && !hasDistance) {
          errors.push(`Week ${week.weekNumber}: ${workout.day} long run shows duration instead of distance: ${desc}`);
        }
        
        // Also check the distance property
        if (!workout.distance || workout.distance === 0) {
          errors.push(`Week ${week.weekNumber}: ${workout.day} long run missing distance property`);
        }
      }
    });
  });
  
  if (errors.length > 0) {
    console.error('❌ LONG RUN DISTANCE VALIDATION FAILED:', errors);
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Validate that Week 1 starts on the correct date
 */
export function validateWeek1StartDate(planOverview, expectedStartDate) {
  if (!planOverview || !planOverview.startDate) {
    return { valid: false, errors: ['Plan overview missing startDate'] };
  }
  
  if (expectedStartDate && planOverview.startDate !== expectedStartDate) {
    return { 
      valid: false, 
      errors: [`Week 1 start date mismatch: expected ${expectedStartDate}, got ${planOverview.startDate}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate that total weeks matches expected
 */
export function validateTotalWeeks(planOverview, expectedWeeks) {
  if (!planOverview || !planOverview.totalWeeks) {
    return { valid: false, errors: ['Plan overview missing totalWeeks'] };
  }
  
  if (expectedWeeks && planOverview.totalWeeks !== expectedWeeks) {
    return { 
      valid: false, 
      errors: [`Total weeks mismatch: expected ${expectedWeeks}, got ${planOverview.totalWeeks}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Run all validations
 */
export function validateTrainingPlan(plan, userProfile) {
  const results = {
    valid: true,
    errors: []
  };
  
  if (!plan || !plan.weeks) {
    return { valid: false, errors: ['Plan or weeks missing'] };
  }
  
  // Validate workouts parsed
  const workoutsResult = validateWorkoutsParsed(plan.weeks);
  if (!workoutsResult.valid) {
    results.valid = false;
    results.errors.push(...workoutsResult.errors);
  }
  
  // Validate hard days - check both qualityDays and hardSessionDays for backward compatibility
  const qualityDays = userProfile?.qualityDays || userProfile?.hardSessionDays || [];
  if (qualityDays.length > 0) {
    const hardDaysResult = validateHardDays(plan.weeks, qualityDays);
    if (!hardDaysResult.valid) {
      results.valid = false;
      results.errors.push(...hardDaysResult.errors);
    }
  }
  
  // Validate rest days
  if (userProfile?.restDays) {
    const restDaysResult = validateRestDays(plan.weeks, userProfile.restDays);
    if (!restDaysResult.valid) {
      results.valid = false;
      results.errors.push(...restDaysResult.errors);
    }
  }
  
  // Validate RunEQ miles
  const runEQResult = validateRunEQMiles(plan.weeks);
  if (!runEQResult.valid) {
    results.valid = false;
    results.errors.push(...runEQResult.errors);
  }
  
  // Validate long run distance
  const longRunResult = validateLongRunDistance(plan.weeks);
  if (!longRunResult.valid) {
    results.valid = false;
    results.errors.push(...longRunResult.errors);
  }
  
  // Validate Week 1 start date
  if (plan.planOverview && userProfile?.startDate) {
    const startDateResult = validateWeek1StartDate(plan.planOverview, userProfile.startDate);
    if (!startDateResult.valid) {
      results.valid = false;
      results.errors.push(...startDateResult.errors);
    }
  }
  
  // Validate total weeks
  if (plan.planOverview && userProfile?.raceDate) {
    const raceDate = new Date(userProfile.raceDate);
    const startDate = new Date(userProfile.startDate || new Date());
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const expectedWeeks = Math.ceil((raceDate.getTime() - startDate.getTime()) / msPerWeek);
    
    const weeksResult = validateTotalWeeks(plan.planOverview, expectedWeeks);
    if (!weeksResult.valid) {
      results.valid = false;
      results.errors.push(...weeksResult.errors);
    }
  }
  
  if (results.valid) {
    console.log('✅ All training plan validations passed');
  } else {
    console.error('❌ Training plan validation failed:', results.errors);
  }
  
  return results;
}




