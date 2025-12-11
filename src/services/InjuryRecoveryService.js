/**
 * InjuryRecoveryService - Handles injury recovery protocol
 *
 * Single responsibility: Modify training plans for injured runners
 * - Replace running workouts with cross-training
 * - Create return-to-running transition weeks
 * - Cancel/restore original plan
 */

import logger from '../utils/logger';

// Import cross-training workout libraries
import AquaRunningWorkoutLibrary from '../lib/aqua-running-workout-library.js';
import EllipticalWorkoutLibrary from '../lib/elliptical-workout-library.js';
import StationaryBikeWorkoutLibrary from '../lib/stationary-bike-workout-library.js';
import SwimmingWorkoutLibrary from '../lib/swimming-workout-library.js';
import RowingWorkoutLibrary from '../lib/rowing-workout-library.js';
import { StandUpBikeWorkoutLibrary } from '../lib/standup-bike-workout-library.js';

class InjuryRecoveryService {
    constructor() {
        // Initialize cross-training workout libraries
        this.aquaRunningLibrary = new AquaRunningWorkoutLibrary();
        this.ellipticalLibrary = new EllipticalWorkoutLibrary();
        this.stationaryBikeLibrary = new StationaryBikeWorkoutLibrary();
        this.swimmingLibrary = new SwimmingWorkoutLibrary();
        this.rowingLibrary = new RowingWorkoutLibrary();
        this.standUpBikeLibrary = new StandUpBikeWorkoutLibrary();
    }

    /**
     * Regenerate training plan with injury recovery modifications
     * Replaces running workouts with cross-training during injury weeks
     * @param {object} existingPlan - Current training plan
     * @param {object} updatedProfile - User profile with injury settings
     * @param {number} currentWeek - Current week number (injury start week)
     * @param {number} weeksOffRunning - Number of weeks to replace running with cross-training
     * @param {object} selectedEquipment - Object with equipment selections (pool, elliptical, etc.)
     * @param {number} reduceTrainingDays - Number of days to reduce (0, 1, or 2)
     * @returns {object} - Updated training plan with injury recovery
     */
    async regeneratePlanWithInjury(existingPlan, updatedProfile, currentWeek, weeksOffRunning, selectedEquipment, reduceTrainingDays) {
        logger.log('🏥 Generating injury recovery plan...');
        logger.log('  Current week:', currentWeek);
        logger.log('  Weeks off running:', weeksOffRunning);
        logger.log('  Selected equipment:', selectedEquipment);
        logger.log('  Reduce training days:', reduceTrainingDays);

        // Get existing weekly plans
        const weeklyPlans = existingPlan?.weeklyPlans || existingPlan?.weeks;
        if (!weeklyPlans || weeklyPlans.length === 0) {
            logger.error('  ❌ Training plan structure is invalid - missing or empty weeklyPlans/weeks array');
            logger.error('    Plan keys:', Object.keys(existingPlan || {}));
            logger.error('    Has weeklyPlans:', !!existingPlan?.weeklyPlans);
            logger.error('    Has weeks:', !!existingPlan?.weeks);
            logger.error('    weeklyPlans length:', existingPlan?.weeklyPlans?.length || 0);
            logger.error('    weeks length:', existingPlan?.weeks?.length || 0);
            throw new Error('Training plan structure is invalid - missing or empty weeklyPlans/weeks array. Cannot create injury recovery plan without existing plan structure.');
        }

        logger.log('  📋 Plan structure validated:', {
            totalWeeks: weeklyPlans.length,
            currentWeek: currentWeek,
            weeksToModify: weeklyPlans.length - (currentWeek - 1)
        });

        // Preserve completed weeks (everything before current week)
        const completedWeeks = weeklyPlans.slice(0, currentWeek - 1);
        logger.log('  Preserved', completedWeeks.length, 'completed weeks');
        logger.log('  📋 Original plan structure from Firestore:', {
            totalWeeks: weeklyPlans.length,
            weeksWithWorkouts: weeklyPlans.filter(w => w && w.workouts && w.workouts.length > 0).length,
            week1HasWorkouts: !!weeklyPlans[0]?.workouts?.length,
            week2HasWorkouts: !!weeklyPlans[1]?.workouts?.length,
            week3HasWorkouts: !!weeklyPlans[2]?.workouts?.length,
            week1WorkoutCount: weeklyPlans[0]?.workouts?.length || 0,
            week2WorkoutCount: weeklyPlans[1]?.workouts?.length || 0,
            week3WorkoutCount: weeklyPlans[2]?.workouts?.length || 0,
            week1IsNull: weeklyPlans[0] === null || weeklyPlans[0] === undefined
        });

        // Get available cross-training libraries based on selected equipment
        const availableLibraries = [];
        if (selectedEquipment.pool) availableLibraries.push({ type: 'pool', library: this.aquaRunningLibrary });
        if (selectedEquipment.elliptical) availableLibraries.push({ type: 'elliptical', library: this.ellipticalLibrary });
        if (selectedEquipment.stationaryBike) availableLibraries.push({ type: 'stationaryBike', library: this.stationaryBikeLibrary });
        if (selectedEquipment.swimming) availableLibraries.push({ type: 'swimming', library: this.swimmingLibrary });
        if (selectedEquipment.rowing) availableLibraries.push({ type: 'rowing', library: this.rowingLibrary });
        if (selectedEquipment.standUpBike) {
            // Use specific bike type (cyclete/elliptigo) from user profile, fallback to generic
            const bikeType = updatedProfile.standUpBikeType || 'standUpBike';
            logger.log('  🚴 Stand-up bike type from profile:', updatedProfile.standUpBikeType, '→ using:', bikeType);
            availableLibraries.push({ type: bikeType, library: this.standUpBikeLibrary });
        }

        logger.log('  Available cross-training options:', availableLibraries.length);

        // Calculate which weeks are injury weeks
        const injuryStartWeek = currentWeek;
        const injuryEndWeek = currentWeek + weeksOffRunning - 1;
        const returnToRunningWeek = currentWeek + weeksOffRunning;

        logger.log('  Injury weeks:', injuryStartWeek, '-', injuryEndWeek);
        logger.log('  Return to running week:', returnToRunningWeek);

        // Process each week - skip null/invalid weeks
        const modifiedWeeks = [];
        const weeksToProcess = weeklyPlans.slice(currentWeek - 1);

        logger.log('  📋 Weeks to process:', {
            startIndex: currentWeek - 1,
            count: weeksToProcess.length,
            firstWeekHasWorkouts: !!weeksToProcess[0]?.workouts?.length,
            firstWeekWorkoutCount: weeksToProcess[0]?.workouts?.length || 0,
            firstWeekIsNull: weeksToProcess[0] === null || weeksToProcess[0] === undefined
        });

        for (let index = 0; index < weeksToProcess.length; index++) {
            let week = weeksToProcess[index];
            const weekNumber = currentWeek + index;

            logger.log(`  🔍 Processing week ${weekNumber}:`, {
                isNull: week === null || week === undefined,
                hasWorkouts: !!week?.workouts?.length,
                workoutCount: week?.workouts?.length || 0,
                weekKeys: week ? Object.keys(week) : []
            });

            const isInjuryWeek = weekNumber >= injuryStartWeek && weekNumber <= injuryEndWeek;
            const isReturnWeek = weekNumber === returnToRunningWeek;

            // CRITICAL: Only generate workouts on the fly for injury weeks and return week
            // For post-recovery weeks, preserve the original structure (even if null) to avoid overwriting progressive distances
            if ((isInjuryWeek || isReturnWeek) && (!week || !week.workouts || week.workouts.length === 0)) {
                logger.warn(`  ⚠️ Week ${weekNumber} (injury/return week) is null or has no workouts - generating workouts on the fly`);

                // Import generateWeekWorkouts dynamically to avoid circular dependencies
                const { generateWeekWorkouts } = await import('../utils/workoutGeneration.js');
                const generatedWorkouts = generateWeekWorkouts(weekNumber, updatedProfile);

                // Create a week structure from generated workouts
                week = {
                    week: weekNumber,
                    weekDates: { displayText: `Week ${weekNumber}` },
                    phase: 'base',
                    totalMileage: generatedWorkouts.reduce((sum, w) => {
                        const dist = w.workout?.distance || parseFloat(w.workout?.name?.match(/(\d+(?:\.\d+)?)\s*(?:mile|miles|mi)/i)?.[1]) || 0;
                        return sum + dist;
                    }, 0),
                    workouts: generatedWorkouts
                };
                logger.log(`  ✅ Generated ${generatedWorkouts.length} workouts for week ${weekNumber}`);
            } else if (!week || !week.workouts || week.workouts.length === 0) {
                // For post-recovery weeks, preserve null structure - don't generate workouts
                // This prevents overwriting the plan with static distances
                logger.warn(`  ⚠️ Week ${weekNumber} (post-recovery) is null - preserving null structure to avoid overwriting plan`);
                modifiedWeeks.push(week); // Push null or invalid week as-is
                continue;
            }

            if (isInjuryWeek) {
                // Replace running workouts with cross-training
                logger.log(`  Week ${weekNumber}: Cross-training only (${week.workouts.length} workouts to replace)`);
                modifiedWeeks.push(this.createCrossTrainingWeek(week, availableLibraries, reduceTrainingDays));
            } else if (isReturnWeek) {
                // Gradual return to running week
                logger.log(`  Week ${weekNumber}: Return to running transition (${week.workouts.length} workouts)`);
                modifiedWeeks.push(this.createReturnToRunningWeek(week, availableLibraries, reduceTrainingDays));
            } else {
                // Post-recovery weeks: return to full training volume (no reduction)
                logger.log(`  Week ${weekNumber}: Regular training (full volume restored)`);
                modifiedWeeks.push(week);
            }
        }

        // Verify that all modified weeks are valid (they should be, since we generate for null weeks)
        const invalidWeeks = modifiedWeeks.filter((w, idx) => {
            const weekNum = currentWeek + idx;
            const isRequired = (weekNum >= injuryStartWeek && weekNum <= returnToRunningWeek);
            return isRequired && (!w || !w.workouts || w.workouts.length === 0);
        });

        if (invalidWeeks.length > 0) {
            logger.error('  ❌ Some required injury weeks are still invalid after generation');
            throw new Error('Failed to generate workouts for required injury weeks. Please try again or contact support.');
        }

        const validModifiedWeeks = modifiedWeeks.filter(w => w && w.workouts && w.workouts.length > 0);
        logger.log(`  ✅ Successfully processed ${validModifiedWeeks.length} weeks`);

        // CRITICAL: Validate that we're not saving null weeks
        // If post-recovery weeks are null, we need to regenerate them, not preserve null
        const validatedWeeks = modifiedWeeks.map((week, index) => {
            const weekNumber = currentWeek + index;
            const isPostRecovery = weekNumber > returnToRunningWeek;

            // If it's a post-recovery week and it's null, try to restore from original plan
            if (isPostRecovery && (!week || !week.workouts || week.workouts.length === 0)) {
                const originalWeekIndex = currentWeek - 1 + index;
                const originalWeek = weeklyPlans[originalWeekIndex];
                if (originalWeek && originalWeek.workouts && originalWeek.workouts.length > 0) {
                    logger.log(`  🔄 Restoring week ${weekNumber} from original plan to preserve progressive distances`);
                    return originalWeek;
                } else {
                    // Original plan also has null - this is a corrupted plan
                    // We cannot proceed with null weeks - they will cause fallback generation
                    logger.error(`  ❌ Week ${weekNumber} is null in both modified and original plan - plan is corrupted`);
                    throw new Error(`Cannot create injury recovery plan: Week ${weekNumber} is null in your training plan. Please regenerate your plan first using "Manage Plan" before creating an injury recovery protocol.`);
                }
            }
            return week;
        });

        // Merge: completed weeks + validated weeks
        const mergedWeeklyPlans = [...completedWeeks, ...validatedWeeks];

        // Final validation: ensure no null weeks in the final plan
        const nullWeeksInFinal = mergedWeeklyPlans.filter(w => w === null || w === undefined || !w.workouts || w.workouts.length === 0);
        if (nullWeeksInFinal.length > 0) {
            logger.error(`  ❌ CRITICAL: Final plan has ${nullWeeksInFinal.length} null/invalid weeks!`);
            throw new Error(`Cannot save injury recovery plan: ${nullWeeksInFinal.length} weeks are null or invalid. Please regenerate your plan first.`);
        }

        logger.log('  ✅ Injury recovery plan generated successfully');
        logger.log('    Total weeks:', mergedWeeklyPlans.length);
        logger.log('    Completed weeks:', completedWeeks.length);
        logger.log('    Modified weeks:', modifiedWeeks.length);
        logger.log('  📋 Merged plan structure:', {
            totalWeeks: mergedWeeklyPlans.length,
            weeksWithWorkouts: mergedWeeklyPlans.filter(w => w && w.workouts && w.workouts.length > 0).length,
            week1HasWorkouts: !!mergedWeeklyPlans[0]?.workouts?.length,
            week2HasWorkouts: !!mergedWeeklyPlans[1]?.workouts?.length,
            week3HasWorkouts: !!mergedWeeklyPlans[2]?.workouts?.length,
            week1WorkoutCount: mergedWeeklyPlans[0]?.workouts?.length || 0,
            week2WorkoutCount: mergedWeeklyPlans[1]?.workouts?.length || 0,
            week3WorkoutCount: mergedWeeklyPlans[2]?.workouts?.length || 0,
            nullWeeks: mergedWeeklyPlans.filter(w => w === null || w === undefined).length
        });

        // Store original plan before modifications so user can revert
        const originalPlanBackup = {
            weeks: weeklyPlans,
            planOverview: existingPlan.planOverview
        };

        // Return updated plan with merged weeks
        return {
            ...existingPlan,
            weeks: mergedWeeklyPlans,
            injuryRecoveryActive: true,
            injuryRecoveryInfo: {
                startWeek: injuryStartWeek,
                endWeek: injuryEndWeek,
                returnWeek: returnToRunningWeek,
                selectedEquipment,
                weeksOffRunning,
                reduceTrainingDays
            },
            originalPlanBeforeInjury: originalPlanBackup
        };
    }

    /**
     * Create a cross-training only week (no running)
     */
    createCrossTrainingWeek(originalWeek, availableLibraries, reduceTrainingDays) {
        // CRITICAL: Validate week structure
        if (!originalWeek) {
            logger.error('  ❌ createCrossTrainingWeek: originalWeek is null');
            throw new Error('Cannot create cross-training week - original week is null');
        }

        if (!originalWeek.workouts) {
            logger.error('  ❌ createCrossTrainingWeek: originalWeek.workouts is null/undefined');
            logger.error('    Week structure:', Object.keys(originalWeek));
            throw new Error('Cannot create cross-training week - original week has no workouts array');
        }

        const allDays = originalWeek.workouts || [];

        // Filter out rest days - only count actual workouts
        const actualWorkouts = allDays.filter(day => day.type !== 'rest' && day.type !== 'REST');

        logger.log(`  createCrossTrainingWeek: Total days: ${allDays.length}, Actual workouts: ${actualWorkouts.length}, Reduce by: ${reduceTrainingDays}`);

        // Determine how many workouts to keep
        const targetWorkoutCount = Math.max(1, actualWorkouts.length - reduceTrainingDays);
        logger.log(`  Target workout count: ${targetWorkoutCount}`);

        // Keep the most important workouts (long run, tempo, intervals) - remove easy/recovery first
        const priorityOrder = ['long', 'LONG', 'longRun', 'tempo', 'TEMPO', 'intervals', 'INTERVALS', 'hills', 'HILLS', 'easy', 'EASY', 'recovery', 'RECOVERY'];
        const sortedWorkouts = [...actualWorkouts].sort((a, b) => {
            const aPriority = priorityOrder.indexOf(a.type);
            const bPriority = priorityOrder.indexOf(b.type);
            return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
        });
        const workoutsToUse = sortedWorkouts.slice(0, targetWorkoutCount);

        logger.log(`  Workouts to use:`, workoutsToUse.map(w => `${w.day} ${w.type}`));

        // Create cross-training replacements for selected workouts
        const workoutsByDay = new Map();
        workoutsToUse.forEach((workout, index) => {
            workoutsByDay.set(workout.day, { originalWorkout: workout, index });
        });

        // BETTER DISTRIBUTION: Calculate how many workouts each equipment type should get
        const totalWorkouts = workoutsToUse.length;
        const numEquipmentTypes = availableLibraries.length;
        const baseWorkoutsPerEquipment = Math.floor(totalWorkouts / numEquipmentTypes);
        const extraWorkouts = totalWorkouts % numEquipmentTypes;

        logger.log(`  Equipment distribution: ${totalWorkouts} workouts across ${numEquipmentTypes} types`);
        logger.log(`    Base per equipment: ${baseWorkoutsPerEquipment}, Extra workouts to distribute: ${extraWorkouts}`);

        // Build assignment array: [0, 0, 1, 1, 2] for fair distribution
        const equipmentAssignments = [];
        for (let i = 0; i < numEquipmentTypes; i++) {
            const count = baseWorkoutsPerEquipment + (i < extraWorkouts ? 1 : 0);
            for (let j = 0; j < count; j++) {
                equipmentAssignments.push(i);
            }
        }
        logger.log(`    Equipment assignments:`, equipmentAssignments);

        // Build full 7-day week with cross-training and rest days
        const fullWeekWorkouts = allDays.map((dayWorkout) => {
            // If this day is a rest day, keep it as rest
            if (dayWorkout.type === 'rest' || dayWorkout.type === 'REST') {
                return {
                    day: dayWorkout.day,
                    date: dayWorkout.date,
                    fullDate: dayWorkout.fullDate,
                    dateString: dayWorkout.dateString,
                    type: 'rest',
                    name: 'Rest Day',
                    description: 'Recovery day - focus on healing'
                };
            }

            // If this workout day was NOT selected for cross-training, make it a rest day
            if (!workoutsByDay.has(dayWorkout.day)) {
                return {
                    day: dayWorkout.day,
                    date: dayWorkout.date,
                    fullDate: dayWorkout.fullDate,
                    dateString: dayWorkout.dateString,
                    type: 'rest',
                    name: 'Rest Day',
                    description: 'Recovery day - focus on healing'
                };
            }

            // This workout day IS selected for cross-training - replace it
            const { originalWorkout: workout, index } = workoutsByDay.get(dayWorkout.day);

            // Use fair distribution instead of simple modulo
            const equipmentIndex = equipmentAssignments[index];
            const { type, library } = availableLibraries[equipmentIndex];

            // Determine workout type based on original workout
            let workoutType = 'EASY';
            if (workout.type === 'tempo' || workout.type === 'TEMPO') workoutType = 'TEMPO';
            else if (workout.type === 'intervals' || workout.type === 'INTERVALS') workoutType = 'INTERVALS';
            else if (workout.type === 'long' || workout.type === 'LONG' || workout.type === 'longRun') workoutType = 'LONG';
            else if (workout.type === 'hills' || workout.type === 'HILLS') workoutType = 'HILLS';
            else if (workout.type === 'recovery' || workout.type === 'RECOVERY') workoutType = 'RECOVERY';

            // Equipment-specific workout type mapping
            // Some equipment doesn't have HILLS workouts - map to appropriate alternative
            const equipmentMappings = {
                'rowing': {
                    'HILLS': 'INTERVALS' // Rowing doesn't have hills - use power intervals instead
                },
                'swimming': {
                    'HILLS': 'INTERVALS' // Swimming doesn't have hills - use intervals instead
                },
                'pool': {
                    'HILLS': 'INTERVALS' // Aqua running can do resistance, but map to intervals for variety
                }
                // elliptical, stationaryBike, standUpBike have HILLS or POWER_RESISTANCE categories
            };

            // Apply equipment-specific mapping if needed
            if (equipmentMappings[type] && equipmentMappings[type][workoutType]) {
                const originalType = workoutType;
                workoutType = equipmentMappings[type][workoutType];
                logger.log(`    Equipment '${type}' doesn't support '${originalType}', mapping to '${workoutType}'`);
            }

            // Get approximate duration in minutes
            let durationMinutes = 45; // default
            if (workout.distance) {
                // Estimate: 10 min/mile average pace
                durationMinutes = Math.round(workout.distance * 10);
            } else if (workout.duration) {
                // Parse duration like "45 min" or "1:15:00"
                const match = workout.duration.match(/(\d+)/);
                if (match) durationMinutes = parseInt(match[1]);
            }

            logger.log(`    ${workout.day}: Original type=${workout.type}, Mapped to=${workoutType}, Duration=${durationMinutes}min, Equipment=${type}`);

            // Get matching workout from library
            const crossTrainingWorkout = library.getWorkoutByDuration(workoutType, durationMinutes);
            logger.log(`      Returned workout:`, crossTrainingWorkout ? crossTrainingWorkout.name : 'null/undefined');

            // Build new cross-training workout
            return {
                day: workout.day,
                date: workout.date,
                fullDate: workout.fullDate,
                dateString: workout.dateString,
                type: 'cross-training',
                crossTrainingType: type,
                name: crossTrainingWorkout ? crossTrainingWorkout.name : `${type} - ${workoutType}`,
                description: crossTrainingWorkout ? crossTrainingWorkout.description : `Cross-training on ${type}`,
                structure: crossTrainingWorkout ? crossTrainingWorkout.structure : null,
                duration: crossTrainingWorkout ? crossTrainingWorkout.duration : `${durationMinutes} minutes`,
                intensity: crossTrainingWorkout ? crossTrainingWorkout.intensity : workoutType.toLowerCase(),
                benefits: crossTrainingWorkout ? crossTrainingWorkout.benefits : null,
                technique: crossTrainingWorkout ? crossTrainingWorkout.technique : null,
                effort: crossTrainingWorkout ? crossTrainingWorkout.effort : null,
                coachingTips: crossTrainingWorkout ? crossTrainingWorkout.coachingTips : null,
                distance: null, // No running distance during injury
                pace: null, // No running pace during injury
                originalWorkout: {
                    type: workout.type,
                    name: workout.name,
                    distance: workout.distance,
                    duration: workout.duration
                }
            };
        });

        logger.log(`  Full week: ${fullWeekWorkouts.length} days total`);

        return {
            ...originalWeek,
            workouts: fullWeekWorkouts,
            weekType: 'injury-recovery',
            note: 'Cross-training only - No running during injury recovery'
        };
    }

    /**
     * Create a return to running transition week
     * Mix of easy running and cross-training
     */
    createReturnToRunningWeek(originalWeek, availableLibraries, reduceTrainingDays) {
        const allDays = originalWeek.workouts || [];

        // Filter out rest days - only count actual workouts
        const actualWorkouts = allDays.filter(day => day.type !== 'rest' && day.type !== 'REST');

        // Determine how many workouts to keep
        const targetWorkoutCount = Math.max(1, actualWorkouts.length - reduceTrainingDays);

        // Keep the most important workouts (long run, tempo, intervals) - remove easy/recovery first
        const priorityOrder = ['long', 'LONG', 'longRun', 'tempo', 'TEMPO', 'intervals', 'INTERVALS', 'hills', 'HILLS', 'easy', 'EASY', 'recovery', 'RECOVERY'];
        const sortedWorkouts = [...actualWorkouts].sort((a, b) => {
            const aPriority = priorityOrder.indexOf(a.type);
            const bPriority = priorityOrder.indexOf(b.type);
            return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
        });
        const workoutsToUse = sortedWorkouts.slice(0, targetWorkoutCount);

        // Return to running: 50% running (easy only), 50% cross-training
        const runningCount = Math.ceil(targetWorkoutCount / 2);

        // Create map of selected workout days
        const workoutsByDay = new Map();
        workoutsToUse.forEach((workout, index) => {
            workoutsByDay.set(workout.day, { originalWorkout: workout, index });
        });

        // Build full 7-day week
        const fullWeekWorkouts = allDays.map((dayWorkout) => {
            // If this day is a rest day, keep it as rest
            if (dayWorkout.type === 'rest' || dayWorkout.type === 'REST') {
                return {
                    day: dayWorkout.day,
                    date: dayWorkout.date,
                    fullDate: dayWorkout.fullDate,
                    dateString: dayWorkout.dateString,
                    type: 'rest',
                    name: 'Rest Day',
                    description: 'Recovery day'
                };
            }

            // If this workout day was NOT selected, make it a rest day
            if (!workoutsByDay.has(dayWorkout.day)) {
                return {
                    day: dayWorkout.day,
                    date: dayWorkout.date,
                    fullDate: dayWorkout.fullDate,
                    dateString: dayWorkout.dateString,
                    type: 'rest',
                    name: 'Rest Day',
                    description: 'Recovery day'
                };
            }

            const { originalWorkout: workout, index } = workoutsByDay.get(dayWorkout.day);

            if (index < runningCount) {
                // Convert to easy running at reduced distance
                return {
                    day: workout.day,
                    date: workout.date,
                    fullDate: workout.fullDate,
                    dateString: workout.dateString,
                    type: 'easy',
                    name: 'Easy Return Run',
                    description: 'Easy-paced running to gradually return from injury',
                    distance: workout.distance ? Math.round(workout.distance * 0.5 * 10) / 10 : 3, // 50% of original distance or 3 miles
                    pace: workout.pace || 'easy',
                    note: '⚠️ Return to running: Start slow, listen to your body'
                };
            } else {
                // Cross-training workout
                const equipmentIndex = (index - runningCount) % availableLibraries.length;
                const { type, library } = availableLibraries[equipmentIndex];

                const crossTrainingWorkout = library.getWorkoutByDuration('EASY', 45);

                return {
                    day: workout.day,
                    date: workout.date,
                    fullDate: workout.fullDate,
                    dateString: workout.dateString,
                    type: 'cross-training',
                    crossTrainingType: type,
                    name: crossTrainingWorkout ? crossTrainingWorkout.name : `${type} workout`,
                    description: crossTrainingWorkout ? crossTrainingWorkout.description : `Cross-training on ${type}`,
                    structure: crossTrainingWorkout ? crossTrainingWorkout.structure : null,
                    distance: null,
                    benefits: crossTrainingWorkout ? crossTrainingWorkout.benefits : null,
                    technique: crossTrainingWorkout ? crossTrainingWorkout.technique : null,
                    effort: crossTrainingWorkout ? crossTrainingWorkout.effort : null,
                    coachingTips: crossTrainingWorkout ? crossTrainingWorkout.coachingTips : null
                };
            }
        });

        return {
            ...originalWeek,
            workouts: fullWeekWorkouts,
            weekType: 'return-to-running',
            note: '⚠️ Gradual return to running - Mix of easy runs and cross-training'
        };
    }

    /**
     * Cancel injury recovery protocol and restore original plan
     * @param {object} currentPlan - Training plan with injury recovery active
     * @returns {object} - Original plan before injury modifications
     */
    cancelInjuryRecovery(currentPlan) {
        logger.log('🏥 Canceling injury recovery protocol...');

        if (!currentPlan.injuryRecoveryActive) {
            logger.warn('  ⚠️ No active injury recovery to cancel');
            return currentPlan;
        }

        if (!currentPlan.originalPlanBeforeInjury) {
            logger.error('  ❌ Original plan backup not found');
            throw new Error('Cannot restore original plan - backup not found');
        }

        logger.log('  ✅ Restoring original plan');

        // Restore original plan and remove injury recovery metadata
        return {
            ...currentPlan,
            weeks: currentPlan.originalPlanBeforeInjury.weeks,
            injuryRecoveryActive: false,
            injuryRecoveryInfo: null,
            originalPlanBeforeInjury: null
        };
    }
}

export default InjuryRecoveryService;
