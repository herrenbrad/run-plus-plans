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
        // CRITICAL: Check workoutType FIRST - it's more reliable than description text
        const isHardWorkout = workout.workoutType === 'tempo' ||
                             workout.workoutType === 'interval' ||
                             workout.workoutType === 'hill' ||
                             workout.type === 'tempo' ||
                             workout.type === 'interval' ||
                             workout.type === 'hill' ||
                             descLower.includes('tempo') || 
                             descLower.includes('interval') || 
                             descLower.includes('hill') ||
                             descLower.includes('speed');
        const isRest = descLower.includes('rest') || workout.type === 'rest';
        // Only flag as "easy" if it's explicitly an easy run AND not a hard workout
        // Note: Some hard workouts (like "Sandwich Tempo") have "easy" in their description
        // but are still hard workouts, so we check workoutType first
        const isEasy = descLower.includes('easy') && !isHardWorkout && 
                      !descLower.includes('tempo') && 
                      !descLower.includes('interval') && 
                      !descLower.includes('hill');
        
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
 * Validate that every week has a long run (except race week which has race day)
 */
export function validateLongRunsPresent(weeks, longRunDay = 'Sunday', isRaceWeek = null) {
  const errors = [];
  
  weeks.forEach((week, index) => {
    // Skip race week (final week) - it should have race day instead
    const isFinalWeek = index === weeks.length - 1;
    const shouldHaveRaceDay = isRaceWeek !== null ? isRaceWeek : isFinalWeek;
    
    if (shouldHaveRaceDay) {
      // Check for race day instead
      const hasRaceDay = week.workouts.some(w =>
        w.type === 'race' ||
        (w.name && w.name.toLowerCase().includes('race')) ||
        (w.description && w.description.toLowerCase().includes('race day'))
      );
      if (!hasRaceDay) {
        errors.push(`Week ${week.weekNumber}: Final week missing race day workout`);
      }
      return; // Skip long run check for race week
    }
    
    // Check for long run on specified day
    const hasLongRun = week.workouts.some(w =>
      w.type === 'longRun' ||
      (w.day === longRunDay && (
        (w.description || '').toLowerCase().includes('long run') ||
        (w.name || '').toLowerCase().includes('long run')
      ))
    );
    
    if (!hasLongRun) {
      errors.push(`Week ${week.weekNumber}: Missing long run on ${longRunDay}`);
    }
  });
  
  if (errors.length > 0) {
    console.error('❌ LONG RUN PRESENCE VALIDATION FAILED:', errors);
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
  
  // Validate long runs present
  // CRITICAL: Pass null for isRaceWeek so function determines final week itself
  // Don't pass true for all weeks just because raceDate exists!
  const longRunDay = userProfile?.longRunDay || 'Sunday';
  const longRunsResult = validateLongRunsPresent(plan.weeks, longRunDay, null);
  if (!longRunsResult.valid) {
    results.valid = false;
    results.errors.push(...longRunsResult.errors);
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




