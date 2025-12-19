/**
 * PlanFixer - Post-processing fixes for AI-generated plans
 * 
 * Single Responsibility: Fix violations in generated plans (hard days, etc.)
 */

class PlanFixer {
    /**
     * Auto-fix hard days violations - swaps easy runs on hard days with hard workouts
     * This is a pragmatic fix to prevent regressions when AI doesn't follow instructions
     * 
     * @param {Object} plan - The training plan object with weeks array
     * @param {Object} profile - User profile with qualityDays or hardSessionDays
     */
    fixHardDaysViolations(plan, profile) {
        const qualityDays = profile.qualityDays || profile.hardSessionDays || [];
        if (qualityDays.length === 0) return;

        const hardWorkoutTypes = ['tempo', 'intervals', 'hills'];
        
        plan.weeks.forEach(week => {
            week.workouts.forEach(workout => {
                const dayName = workout.day;
                const isHardDay = qualityDays.includes(dayName);
                
                if (isHardDay) {
                    const descLower = (workout.description || '').toLowerCase();
                    const nameLower = (workout.name || '').toLowerCase();
                    const isEasy = (descLower.includes('easy') || nameLower.includes('easy')) && 
                                   !descLower.includes('tempo') && 
                                   !descLower.includes('interval') && 
                                   !descLower.includes('hill');
                    const isRest = workout.type === 'rest' || descLower.includes('rest');
                    const isHard = hardWorkoutTypes.includes(workout.type) || 
                                  descLower.includes('tempo') || 
                                  descLower.includes('interval') || 
                                  descLower.includes('hill');
                    
                    if ((isEasy || isRest) && !isHard) {
                        // Find a hard workout from another day in the same week to swap with
                        const swapCandidate = week.workouts.find(w => 
                            w.day !== dayName && 
                            hardWorkoutTypes.includes(w.type) &&
                            !qualityDays.includes(w.day)
                        );
                        
                        if (swapCandidate) {
                            // Swap the workouts
                            const temp = { ...workout };
                            workout.type = swapCandidate.type;
                            workout.name = swapCandidate.name;
                            workout.description = swapCandidate.description;
                            workout.workout = swapCandidate.workout;
                            workout.focus = swapCandidate.focus;
                            workout.distance = swapCandidate.distance;
                            
                            swapCandidate.type = temp.type;
                            swapCandidate.name = temp.name;
                            swapCandidate.description = temp.description;
                            swapCandidate.workout = temp.workout;
                            swapCandidate.focus = temp.focus;
                            swapCandidate.distance = temp.distance;
                            
                            console.log(`✅ Auto-fixed: Swapped ${dayName} workout (was: ${temp.name}) with ${swapCandidate.day} (now: ${workout.name})`);
                        } else {
                            // No swap candidate - generate a default hard workout
                            const defaultHardWorkout = this.generateDefaultHardWorkout(dayName, workout.distance || 5);
                            workout.type = defaultHardWorkout.type;
                            workout.name = defaultHardWorkout.name;
                            workout.description = defaultHardWorkout.description;
                            workout.workout = defaultHardWorkout.workout;
                            workout.focus = defaultHardWorkout.focus;
                            console.log(`✅ Auto-fixed: Replaced ${dayName} easy run with default ${defaultHardWorkout.type} workout`);
                        }
                    }
                }
            });
        });
    }

    /**
     * Fix weekly mileage mismatches by proportionally adjusting workout distances
     * This corrects cases where AI generates too many/few miles compared to target
     *
     * CRITICAL: Now uses _planMathTargets from deterministic calculator when available
     * Falls back to heuristics only if planMath targets are missing
     *
     * @param {Object} plan - The training plan object with weeks array
     * @param {Object} profile - User profile with currentWeeklyMileage
     */
    fixMileageMismatches(plan, profile) {
        if (!plan.weeks || plan.weeks.length === 0) return;

        const currentWeeklyMileage = parseInt(profile.currentWeeklyMileage) || 16;

        plan.weeks.forEach((week, weekIndex) => {
            // CRITICAL: Use pre-calculated plan-math targets if available
            // These are deterministic and physiologically correct
            let targetMileage;
            if (week._planMathTargets && week._planMathTargets.weeklyMileage) {
                targetMileage = week._planMathTargets.weeklyMileage;
                console.log(`  📊 Week ${week.weekNumber}: Using planMath target ${targetMileage}mi`);
            } else if (weekIndex === 0) {
                // FALLBACK: Week 1 - Check if it's a partial week (any start day except Monday)
                // Count non-rest workouts to determine if partial
                const week1Workouts = week.workouts || [];
                const nonRestWorkouts = week1Workouts.filter(w => {
                    const desc = (w.description || '').toLowerCase();
                    const workoutType = w.type || w.workoutType || '';
                    return !desc.includes('rest') && workoutType !== 'rest';
                });

                // If Week 1 has fewer than 5 non-rest workouts, it's likely partial
                // Full week would typically have 5-6 workouts (Mon-Sat with rest days)
                const week1IsPartial = nonRestWorkouts.length < 5;

                if (week1IsPartial) {
                    // Week 1 is partial - calculate proportional target
                    // Count actual days (including rest days) from workouts
                    const uniqueDays = new Set(week1Workouts.map(w => w.day));
                    const daysInWeek1 = uniqueDays.size || nonRestWorkouts.length + 1; // +1 for rest days

                    // Proportional target: (daysInWeek1 / 7) * currentWeeklyMileage
                    const proportionalTarget = Math.round((daysInWeek1 / 7) * currentWeeklyMileage);
                    const minWeek1Target = Math.min(parseInt(profile.currentLongRun) || 6, currentWeeklyMileage);
                    targetMileage = Math.max(proportionalTarget, minWeek1Target);
                } else {
                    // Week 1 is full week: exactly current weekly mileage
                    targetMileage = currentWeeklyMileage;
                }
            } else if (weekIndex === 1) {
                // FALLBACK: Week 2 - Check if Week 1 was partial
                const week1Workouts = plan.weeks[0]?.workouts || [];
                const nonRestWorkouts = week1Workouts.filter(w => {
                    const desc = (w.description || '').toLowerCase();
                    const workoutType = w.type || w.workoutType || '';
                    return !desc.includes('rest') && workoutType !== 'rest';
                });
                const week1IsPartial = nonRestWorkouts.length < 5;

                if (week1IsPartial) {
                    // Week 1 was partial - Week 2 is the FIRST FULL WEEK, so it should be currentWeeklyMileage (not +1)
                    targetMileage = currentWeeklyMileage;
                } else {
                    // Week 1 was full - Week 2: +1-2 from Week 1
                    targetMileage = currentWeeklyMileage + 1;
                }
            } else {
                // FALLBACK: Week 3+ - progressive increase (use week.totalMileage if reasonable, otherwise calculate)
                const week1Mileage = plan.weeks[0]?.totalMileage || currentWeeklyMileage;
                const week2Mileage = plan.weeks[1]?.totalMileage || (currentWeeklyMileage + 1);
                // Progressive: +2-3 miles per week after Week 2
                targetMileage = week2Mileage + Math.min((weekIndex - 1) * 2, 12); // Cap at +12 from Week 2
            }
            
            // Calculate actual total from workouts
            let actualTotal = 0;
            const workoutsWithDistance = [];
            
            week.workouts.forEach(workout => {
                // Check for rest days - handle both enrichedPlan structure (workoutType) and dashboardPlan structure (type)
                const workoutType = workout.type || workout.workoutType;
                if (workoutType === 'rest' || (workout.description || '').toLowerCase().includes('rest')) {
                    return; // Skip rest days
                }
                
                // Extract distance from workout
                // enrichedPlan has extractedDistance, dashboardPlan has distance
                let distance = 0;
                if (workout.distance) {
                    distance = parseFloat(workout.distance);
                } else if (workout.extractedDistance) {
                    distance = parseFloat(workout.extractedDistance);
                } else if (workout.fullWorkoutDetails?.distance) {
                    distance = parseFloat(workout.fullWorkoutDetails.distance);
                } else {
                    // Try to extract from description
                    const desc = workout.description || workout.name || '';
                    const runEqMatch = desc.match(/(\d+(?:\.\d+)?)\s*RunEQ/i);
                    if (runEqMatch) {
                        distance = parseFloat(runEqMatch[1]);
                    } else {
                        const runMatch = desc.match(/(\d+(?:\.\d+)?)\s*(?:mile|miles|mi)\b/i);
                        if (runMatch) {
                            distance = parseFloat(runMatch[1]);
                        }
                    }
                }
                
                if (distance > 0) {
                    actualTotal += distance;
                    workoutsWithDistance.push({ workout, distance });
                }
            });
            
            // If actual total is significantly different from target, adjust
            const difference = Math.abs(actualTotal - targetMileage);
            if (difference > 2 && actualTotal > 0 && workoutsWithDistance.length > 0) {
                const adjustmentRatio = targetMileage / actualTotal;
                
                // Only adjust if ratio is reasonable (0.7 to 1.3) - don't make drastic changes
                if (adjustmentRatio >= 0.7 && adjustmentRatio <= 1.3) {
                    console.log(`  🔧 Week ${week.weekNumber}: Adjusting from ${actualTotal.toFixed(1)}mi to ${targetMileage}mi (ratio: ${adjustmentRatio.toFixed(2)})`);
                    
                    workoutsWithDistance.forEach(({ workout, distance }) => {
                        const newDistance = Math.max(2, Math.round(distance * adjustmentRatio)); // Minimum 2 miles
                        
                        // Update distance in workout object (handle both enrichedPlan and dashboardPlan structures)
                        workout.distance = newDistance;
                        workout.extractedDistance = newDistance; // Also update extractedDistance for enrichedPlan
                        
                        // Update distance in description/name if present
                        if (workout.description) {
                            workout.description = workout.description.replace(
                                /(\d+(?:\.\d+)?)\s*(?:RunEQ\s*)?(?:mile|miles|mi)/i,
                                `${newDistance} ${workout.description.match(/RunEQ/i) ? 'RunEQ ' : ''}mile${newDistance !== 1 ? 's' : ''}`
                            );
                        }
                        if (workout.name) {
                            workout.name = workout.name.replace(
                                /(\d+(?:\.\d+)?)\s*(?:RunEQ\s*)?(?:mile|miles|mi)/i,
                                `${newDistance} ${workout.name.match(/RunEQ/i) ? 'RunEQ ' : ''}mile${newDistance !== 1 ? 's' : ''}`
                            );
                        }
                        if (workout.workout?.name) {
                            workout.workout.name = workout.workout.name.replace(
                                /(\d+(?:\.\d+)?)\s*(?:RunEQ\s*)?(?:mile|miles|mi)/i,
                                `${newDistance} ${workout.workout.name.match(/RunEQ/i) ? 'RunEQ ' : ''}mile${newDistance !== 1 ? 's' : ''}`
                            );
                        }
                        // Also update fullWorkoutDetails if present (enrichedPlan structure)
                        if (workout.fullWorkoutDetails) {
                            if (workout.fullWorkoutDetails.distance) {
                                workout.fullWorkoutDetails.distance = newDistance;
                            }
                            if (workout.fullWorkoutDetails.name) {
                                workout.fullWorkoutDetails.name = workout.fullWorkoutDetails.name.replace(
                                    /(\d+(?:\.\d+)?)\s*(?:RunEQ\s*)?(?:mile|miles|mi)/i,
                                    `${newDistance} ${workout.fullWorkoutDetails.name.match(/RunEQ/i) ? 'RunEQ ' : ''}mile${newDistance !== 1 ? 's' : ''}`
                                );
                            }
                        }
                    });
                    
                    // Update week total mileage
                    week.totalMileage = targetMileage;
                    console.log(`  ✅ Week ${week.weekNumber}: Adjusted to ${targetMileage}mi total`);
                } else {
                    console.log(`  ⚠️ Week ${week.weekNumber}: Adjustment ratio ${adjustmentRatio.toFixed(2)} too extreme, skipping (target: ${targetMileage}mi, actual: ${actualTotal.toFixed(1)}mi)`);
                }
            }
        });
    }

    /**
     * Fix long run distances using plan-math targets
     * CRITICAL: This ensures long runs are properly progressive, not flat
     *
     * @param {Object} plan - The training plan object with weeks array
     * @param {Object} profile - User profile with longRunDay
     */
    fixLongRunDistances(plan, profile) {
        if (!plan.weeks || plan.weeks.length === 0) return;

        const longRunDay = profile.longRunDay || 'Sunday';

        plan.weeks.forEach((week, weekIndex) => {
            // Get the plan-math long run target for this week
            const targetLongRun = week._planMathTargets?.longRun || week.longRunTarget;
            if (!targetLongRun) return; // No target available

            // Find the long run workout
            const longRunWorkout = week.workouts.find(w =>
                w.type === 'longRun' ||
                w.day === longRunDay ||
                (w.description || '').toLowerCase().includes('long run') ||
                (w.name || '').toLowerCase().includes('long run')
            );

            if (longRunWorkout) {
                const oldDistance = longRunWorkout.distance || 0;

                // Only fix if significantly different (more than 1 mile off)
                if (Math.abs(oldDistance - targetLongRun) > 1) {
                    console.log(`  🏃 Week ${week.weekNumber}: Long run ${oldDistance}mi → ${targetLongRun}mi (from plan-math)`);

                    // Update distance in workout object
                    longRunWorkout.distance = targetLongRun;
                    longRunWorkout.extractedDistance = targetLongRun;

                    // Update distance in description/name
                    if (longRunWorkout.description) {
                        longRunWorkout.description = longRunWorkout.description.replace(
                            /(\d+(?:\.\d+)?)\s*(?:mile|miles|mi)/i,
                            `${targetLongRun} mile${targetLongRun !== 1 ? 's' : ''}`
                        );
                    }
                    if (longRunWorkout.name) {
                        longRunWorkout.name = longRunWorkout.name.replace(
                            /(\d+(?:\.\d+)?)\s*(?:mile|miles|mi)/i,
                            `${targetLongRun} mile${targetLongRun !== 1 ? 's' : ''}`
                        );
                    }
                    if (longRunWorkout.workout?.name) {
                        longRunWorkout.workout.name = longRunWorkout.workout.name.replace(
                            /(\d+(?:\.\d+)?)\s*(?:mile|miles|mi)/i,
                            `${targetLongRun} mile${targetLongRun !== 1 ? 's' : ''}`
                        );
                    }
                    if (longRunWorkout.fullWorkoutDetails?.name) {
                        longRunWorkout.fullWorkoutDetails.name = longRunWorkout.fullWorkoutDetails.name.replace(
                            /(\d+(?:\.\d+)?)\s*(?:mile|miles|mi)/i,
                            `${targetLongRun} mile${targetLongRun !== 1 ? 's' : ''}`
                        );
                    }
                    if (longRunWorkout.fullWorkoutDetails) {
                        longRunWorkout.fullWorkoutDetails.distance = targetLongRun;
                    }
                }
            }
        });
    }

    /**
     * Fix missing long runs by adding them to weeks that are missing them
     *
     * @param {Object} plan - The training plan object with weeks array
     * @param {Object} profile - User profile with longRunDay
     */
    fixMissingLongRuns(plan, profile) {
        if (!plan.weeks || plan.weeks.length === 0) return;
        
        const longRunDay = profile.longRunDay || 'Sunday';
        const isFinalWeek = (weekIndex) => weekIndex === plan.weeks.length - 1;
        
        plan.weeks.forEach((week, weekIndex) => {
            // Skip final week - it should have race day, not long run
            if (isFinalWeek(weekIndex)) return;
            
            // Check if week has a long run
            const hasLongRun = week.workouts.some(w =>
                w.type === 'longRun' ||
                (w.day === longRunDay && (
                    (w.description || '').toLowerCase().includes('long run') ||
                    (w.name || '').toLowerCase().includes('long run')
                ))
            );
            
            if (!hasLongRun) {
                // Calculate appropriate long run distance based on week progression
                // Use previous week's long run + 1, or default to 6 miles for early weeks
                let longRunDistance = 6;
                if (weekIndex > 0) {
                    const prevWeek = plan.weeks[weekIndex - 1];
                    const prevLongRun = prevWeek.workouts.find(w =>
                        w.type === 'longRun' ||
                        (w.description || '').toLowerCase().includes('long run')
                    );
                    if (prevLongRun && prevLongRun.distance) {
                        longRunDistance = Math.min(prevLongRun.distance + 1, 20); // Cap at 20 miles
                    }
                }
                
                // Remove any existing workout on long run day (if it's not a rest day)
                const existingWorkoutIndex = week.workouts.findIndex(w => w.day === longRunDay && w.type !== 'rest');
                if (existingWorkoutIndex >= 0) {
                    week.workouts.splice(existingWorkoutIndex, 1);
                }
                
                // Add long run workout
                const longRunWorkout = {
                    day: longRunDay,
                    type: 'longRun',
                    name: `Long Run ${longRunDistance} miles`,
                    description: `Long Run ${longRunDistance} miles`,
                    distance: longRunDistance,
                    focus: 'Endurance',
                    workout: {
                        name: `Long Run ${longRunDistance} miles`,
                        description: `Long Run ${longRunDistance} miles`
                    },
                    metadata: {
                        aiGenerated: true,
                        fallback: true,
                        autoAdded: true
                    }
                };
                
                week.workouts.push(longRunWorkout);
                console.log(`✅ Auto-fixed: Added missing long run (${longRunDistance} miles) to Week ${week.weekNumber} on ${longRunDay}`);
            }
        });
    }

    /**
     * Generate a default hard workout when AI assigns easy run to hard day
     * 
     * @param {string} dayName - Day of week
     * @param {number} distance - Distance in miles
     * @returns {Object} Default hard workout object
     */
    generateDefaultHardWorkout(dayName, distance = 5) {
        // Alternate between tempo and intervals for variety
        const weekNumber = Math.floor(Math.random() * 2); // Simple alternation
        const isTempo = weekNumber % 2 === 0;
        
        if (isTempo) {
            return {
                type: 'tempo',
                name: `Tempo Run ${distance} miles`,
                description: `Tempo Run ${distance} miles (2 mi warmup, ${Math.max(2, Math.floor(distance * 0.4))} mi @ tempo pace, 1 mi cooldown)`,
                workout: {
                    name: `Tempo Run ${distance} miles`,
                    description: `Tempo Run ${distance} miles (2 mi warmup, ${Math.max(2, Math.floor(distance * 0.4))} mi @ tempo pace, 1 mi cooldown)`
                },
                focus: 'Lactate Threshold',
                distance: distance
            };
        } else {
            return {
                type: 'intervals',
                name: `Interval Run ${distance} miles`,
                description: `Interval Run ${distance} miles (2 mi warmup, 4x800m @ VO2 pace, 2 mi cooldown)`,
                workout: {
                    name: `Interval Run ${distance} miles`,
                    description: `Interval Run ${distance} miles (2 mi warmup, 4x800m @ VO2 pace, 2 mi cooldown)`
                },
                focus: 'Speed & VO2 Max',
                distance: distance
            };
        }
    }
}

// Export singleton instance
export default new PlanFixer();



