/**
 * WorkoutEnricher - Enriches parsed plan with full workout details from library
 * 
 * Single Responsibility: Hydrate workout IDs with full workout details and user-specific paces
 */

import { HillWorkoutLibrary } from '../../lib/hill-workout-library';
import { IntervalWorkoutLibrary } from '../../lib/interval-workout-library';
import { TempoWorkoutLibrary } from '../../lib/tempo-workout-library';
import { LongRunWorkoutLibrary } from '../../lib/long-run-workout-library';
import { PaceCalculator } from '../../lib/pace-calculator';

class WorkoutEnricher {
    constructor() {
        // Instantiate workout libraries
        this.hillLibrary = new HillWorkoutLibrary();
        this.intervalLibrary = new IntervalWorkoutLibrary();
        this.tempoLibrary = new TempoWorkoutLibrary();
        this.longRunLibrary = new LongRunWorkoutLibrary();
        this.paceCalculator = new PaceCalculator();
    }

    /**
     * Enrich plan with full workout details from library
     * @param {object} structuredPlan - Parsed plan with workout IDs
     * @returns {object} Enriched plan with full workout details
     */
    enrichPlanWithWorkouts(structuredPlan) {
        console.log('\n🔍 ENRICHING WORKOUTS WITH LIBRARY DETAILS');
        const totalWeeks = structuredPlan.weeks.length;
        
        // Get progressive pacing data if available
        const progressiveData = structuredPlan.paces?._progressive;
        const hasProgressivePacing = progressiveData && progressiveData.current && progressiveData.goal;
        
        const enrichedWeeks = structuredPlan.weeks.map(week => {
            const weekNumber = week.weekNumber || 1;
            
            // Calculate week-specific paces using progressive blending
            let weekPaces = structuredPlan.paces;
            if (hasProgressivePacing) {
                const blendedPaces = this.paceCalculator.blendPaces(
                    progressiveData.current,
                    progressiveData.goal,
                    weekNumber,
                    totalWeeks
                );
                weekPaces = blendedPaces.paces;
                console.log(`\n📊 Week ${weekNumber} Progressive Paces:`, {
                    easy: `${weekPaces.easy.min}-${weekPaces.easy.max}/mi`,
                    threshold: `${weekPaces.threshold.pace}/mi`,
                    interval: `${weekPaces.interval.pace}/mi`
                });
            }
            
            const enrichedWorkouts = week.workouts.map(workout => {
                if (!workout.workoutId) {
                    return { ...workout, hasStructuredWorkout: false };
                }

                console.log(`\n  Enriching: ${workout.workoutId}`, {
                    type: workout.workoutType,
                    category: workout.workoutCategory,
                    index: workout.workoutIndex
                });

                let fullWorkout = null;

                // Extract distance from description (e.g., "800m Track Intervals 6 miles" -> 6)
                const distanceMatch = workout.description?.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b/i);
                const totalDistance = distanceMatch ? parseFloat(distanceMatch[1]) : null;
                if (totalDistance) {
                    console.log(`    📏 Extracted distance: ${totalDistance} miles from "${workout.description}"`);
                }

                try {
                    // Retrieve from appropriate library
                    if (workout.workoutType === 'hill') {
                        // Use prescribeHillWorkout to inject paces
                        const workouts = this.hillLibrary.getWorkoutsByCategory(workout.workoutCategory);
                        console.log(`    Hill library returned ${workouts?.length || 0} workouts for category "${workout.workoutCategory}"`);
                        const rawWorkout = workouts[workout.workoutIndex];
                        if (rawWorkout) {
                            fullWorkout = this.hillLibrary.prescribeHillWorkout(rawWorkout.name, {
                                paces: weekPaces
                            });
                        }
                    } else if (workout.workoutType === 'interval') {
                        // Use prescribeIntervalWorkout to calculate specific reps from distance
                        const workouts = this.intervalLibrary.getWorkoutsByCategory(workout.workoutCategory);
                        console.log(`    Interval library returned ${workouts?.length || 0} workouts for category "${workout.workoutCategory}"`);
                        const rawWorkout = workouts[workout.workoutIndex];
                        if (rawWorkout) {
                            // Prescribe with distance to get specific rep count
                            fullWorkout = this.intervalLibrary.prescribeIntervalWorkout(rawWorkout.name, {
                                paces: weekPaces,
                                trackIntervals: structuredPlan.trackIntervals,
                                totalDistance: totalDistance,
                                weekNumber: weekNumber,
                                totalWeeks: totalWeeks
                            });
                        }
                    } else if (workout.workoutType === 'tempo') {
                        // Use prescribeTempoWorkout to inject paces and convert vague structures
                        const workouts = this.tempoLibrary.getWorkoutsByCategory(workout.workoutCategory);
                        console.log(`    Tempo library returned ${workouts?.length || 0} workouts for category "${workout.workoutCategory}"`);
                        const rawWorkout = workouts[workout.workoutIndex];
                        if (rawWorkout) {
                            fullWorkout = this.tempoLibrary.prescribeTempoWorkout(rawWorkout.name, {
                                paces: weekPaces,
                                totalDistance: totalDistance,
                                weekNumber: weekNumber,
                                totalWeeks: totalWeeks
                            });
                        }
                    } else if (workout.workoutType === 'longrun') {
                        // Use prescribeLongRunWorkout to calculate duration from distance and inject paces
                        const workouts = this.longRunLibrary.getWorkoutsByCategory(workout.workoutCategory);
                        console.log(`    LongRun library returned ${workouts?.length || 0} workouts for category "${workout.workoutCategory}"`);
                        const rawWorkout = workouts[workout.workoutIndex];
                        if (rawWorkout) {
                            // Prescribe with distance and paces to get personalized workout
                            fullWorkout = this.longRunLibrary.prescribeLongRunWorkout(rawWorkout.name, {
                                paces: weekPaces,
                                distance: totalDistance
                            });
                        }
                    }

                    if (fullWorkout) {
                        console.log(`    ✅ Found workout: ${fullWorkout.name}`);
                        const enriched = this.injectUserPaces(fullWorkout, weekPaces);
                        
                        // CRITICAL: Ensure distance is preserved from AI's description
                        if (totalDistance && !enriched.distance) {
                            enriched.distance = totalDistance;
                            console.log(`    📏 Added distance ${totalDistance} miles to enriched workout`);
                        }

                        return {
                            ...workout,
                            fullWorkoutDetails: enriched,
                            hasStructuredWorkout: true,
                            extractedDistance: totalDistance // Store for later use
                        };
                    } else {
                        console.log(`    ❌ No workout found at index ${workout.workoutIndex}`);
                    }
                } catch (error) {
                    console.warn(`    ⚠️ Error enriching workout: ${workout.workoutId}`, error);
                }

                return { ...workout, hasStructuredWorkout: false };
            });

            return { ...week, workouts: enrichedWorkouts };
        });

        return { ...structuredPlan, weeks: enrichedWeeks };
    }

    /**
     * Inject user-specific paces into workout details
     * @param {object} workout - Workout object from library
     * @param {object} userPaces - User's calculated paces
     * @returns {object} Workout with paces injected
     */
    injectUserPaces(workout, userPaces) {
        if (!userPaces) return workout;

        const enriched = JSON.parse(JSON.stringify(workout));

        if (enriched.workout) {
            ['warmup', 'main', 'recovery', 'cooldown'].forEach(phase => {
                if (enriched.workout[phase]) {
                    enriched.workout[phase] = this.replaceGenericPaces(enriched.workout[phase], userPaces);
                }
            });
        }

        if (enriched.repetitions && Array.isArray(enriched.repetitions)) {
            enriched.repetitions = enriched.repetitions.map(rep =>
                this.replaceGenericPaces(rep, userPaces)
            );
        }

        return enriched;
    }

    /**
     * Replace generic pace descriptions with actual paces
     * Handles both structured VDOT paces (paces.threshold.pace) and legacy flat paces (paces.tempo)
     * @param {string} text - Text with generic pace placeholders
     * @param {object} paces - User's calculated paces
     * @returns {string} Text with actual paces injected
     */
    replaceGenericPaces(text, paces) {
        if (!text || typeof text !== 'string') return text;

        let updated = text;

        // CRITICAL: Use structured VDOT paces only - no fallbacks to legacy field names
        // If pace is missing, it means VDOT calculation failed - don't guess
        const thresholdPace = paces.threshold?.pace;
        if (thresholdPace) {
            updated = updated.replace(/threshold effort|tempo effort|tempo pace/gi, `@ ${thresholdPace}/mi`);
        }

        // Handle interval paces - use structured format only
        const intervalPace = paces.interval?.pace;
        if (intervalPace && typeof intervalPace === 'string') {
            updated = updated.replace(/VO2 max effort|interval pace/gi, `@ ${intervalPace}/mi`);
        }

        // Handle marathon pace - use structured format only
        const marathonPace = paces.marathon?.pace;
        if (marathonPace) {
            updated = updated.replace(/marathon pace|MP/gi, `@ ${marathonPace}/mi`);
        }

        // Handle easy pace - check both structured and legacy format
        const easyPace = (paces.easy?.min && paces.easy?.max)
            ? `${paces.easy.min}-${paces.easy.max}`
            : paces.easy;
        if (easyPace && typeof easyPace === 'string') {
            updated = updated.replace(/easy pace|easy effort/gi, `@ ${easyPace}/mi`);
        }

        return updated;
    }
}

// Export singleton instance
export default new WorkoutEnricher();

