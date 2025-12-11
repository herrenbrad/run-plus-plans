/**
 * WorkoutEnricher - Enriches parsed plan with full workout details from library
 * 
 * Single Responsibility: Hydrate workout IDs with full workout details and user-specific paces
 */

import { HillWorkoutLibrary } from '../../lib/hill-workout-library';
import { IntervalWorkoutLibrary } from '../../lib/interval-workout-library';
import { TempoWorkoutLibrary } from '../../lib/tempo-workout-library';
import { LongRunWorkoutLibrary } from '../../lib/long-run-workout-library';
import { StandUpBikeWorkoutLibrary } from '../../lib/standup-bike-workout-library';
import { PaceCalculator } from '../../lib/pace-calculator';

class WorkoutEnricher {
    constructor() {
        // Instantiate workout libraries
        this.hillLibrary = new HillWorkoutLibrary();
        this.intervalLibrary = new IntervalWorkoutLibrary();
        this.tempoLibrary = new TempoWorkoutLibrary();
        this.longRunLibrary = new LongRunWorkoutLibrary();
        this.bikeLibrary = new StandUpBikeWorkoutLibrary();
        this.paceCalculator = new PaceCalculator();
    }

    /**
     * Fix common AI typos in text (e.g., "miless" -> "miles")
     * @param {string} text - Raw text that may contain typos
     * @returns {string} Cleaned text with typos fixed
     */
    fixCommonTypos(text) {
        if (!text || typeof text !== 'string') return text;
        return text
            // Fix "miles" typos (most critical - appears in structure field)
            .replace(/miless/gi, 'miles')
            .replace(/milees/gi, 'miles')
            .replace(/milles/gi, 'miles')
            .replace(/milse/gi, 'miles')
            .replace(/mile\s+s/gi, 'miles')  // "mile s" with space
            // Fix "minutes" typos
            .replace(/minuites/gi, 'minutes')
            .replace(/minuetes/gi, 'minutes')
            .replace(/minuts/gi, 'minutes')
            .replace(/minute\s+s/gi, 'minutes')  // "minute s" with space
            // Fix other common typos
            .replace(/recovry/gi, 'recovery')
            .replace(/warmup/gi, 'warmup')  // Keep as-is, but ensure consistency
            .replace(/cooldown/gi, 'cooldown');  // Keep as-is, but ensure consistency
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
                // Fix any AI typos in the workout description before processing
                if (workout.description) {
                    workout.description = this.fixCommonTypos(workout.description);
                }
                if (workout.originalDescription) {
                    workout.originalDescription = this.fixCommonTypos(workout.originalDescription);
                }

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
                // For bike workouts, also check for RunEQ distance
                let totalDistance = null;
                let runEqDistance = null;
                
                if (workout.workoutType === 'bike') {
                    // For bike workouts, extract RunEQ distance from original description
                    const runEqMatch = workout.originalDescription?.match(/(\d+(?:\.\d+)?)\s*RunEQ/i);
                    runEqDistance = runEqMatch ? parseFloat(runEqMatch[1]) : null;
                    totalDistance = runEqDistance; // Use RunEQ distance as total distance for bike workouts
                    if (runEqDistance) {
                        console.log(`    📏 Extracted RunEQ distance: ${runEqDistance} miles from "${workout.originalDescription}"`);
                    }
                } else {
                    // For other workouts, extract regular distance
                    const distanceMatch = workout.description?.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b/i);
                    totalDistance = distanceMatch ? parseFloat(distanceMatch[1]) : null;
                    if (totalDistance) {
                        console.log(`    📏 Extracted distance: ${totalDistance} miles from "${workout.description}"`);
                    }
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
                    } else if (workout.workoutType === 'bike' && workout.workoutCategory && workout.bikeWorkoutName) {
                        // Extract bike type and RunEQ distance from description
                        // Format: "Ride X RunEQ miles - [WORKOUT: CATEGORY - Name] on your Cyclete/ElliptiGO"
                        const bikeTypeMatch = workout.originalDescription?.match(/on your (Cyclete|ElliptiGO)/i);
                        const bikeType = bikeTypeMatch ? bikeTypeMatch[1].toLowerCase() : 'cyclete';
                        
                        // Extract RunEQ distance from original description
                        const runEqMatch = workout.originalDescription?.match(/(\d+(?:\.\d+)?)\s*RunEQ/i);
                        const runEqDistance = runEqMatch ? parseFloat(runEqMatch[1]) : (totalDistance || 3);
                        
                        console.log(`    Bike workout: category="${workout.workoutCategory}", name="${workout.bikeWorkoutName}", bikeType="${bikeType}", distance=${runEqDistance}`);
                        
                        try {
                            // Try to find workout by exact name first
                            let foundWorkout = null;
                            try {
                                foundWorkout = this.bikeLibrary.prescribeStandUpBikeWorkout(
                                    workout.bikeWorkoutName,
                                    bikeType,
                                    {
                                        targetDistance: runEqDistance,
                                        hasGarmin: true
                                    }
                                );
                                console.log(`    ✅ Bike library found exact match: "${foundWorkout.name}"`);
                            } catch (exactError) {
                                // If exact match fails, try to find by category and use first workout
                                console.log(`    ⚠️ Exact match failed: ${exactError.message}, trying category fallback...`);
                                // Access workouts directly from library (bike library doesn't have getWorkoutsByCategory method)
                                const categoryWorkouts = this.bikeLibrary.workoutLibrary[workout.workoutCategory];
                                if (categoryWorkouts && categoryWorkouts.length > 0) {
                                    // Use first workout in category as fallback
                                    const fallbackWorkout = categoryWorkouts[0];
                                    console.log(`    🔄 Using fallback workout from category: "${fallbackWorkout.name}"`);
                                    foundWorkout = this.bikeLibrary.prescribeStandUpBikeWorkout(
                                        fallbackWorkout.name,
                                        bikeType,
                                        {
                                            targetDistance: runEqDistance,
                                            hasGarmin: true
                                        }
                                    );
                                    console.log(`    ✅ Bike library returned fallback: "${foundWorkout.name}"`);
                                } else {
                                    throw new Error(`No workouts found in category ${workout.workoutCategory}`);
                                }
                            }
                            
                            if (foundWorkout) {
                                fullWorkout = foundWorkout;
                                // Store RunEQ distance for later use
                                if (runEqDistance && !fullWorkout.distance) {
                                    fullWorkout.distance = runEqDistance;
                                }
                            }
                        } catch (error) {
                            console.warn(`    ⚠️ Error prescribing bike workout: ${error.message}`);
                        }
                    }

                    if (fullWorkout) {
                        console.log(`    ✅ Found workout: ${fullWorkout.name}`);
                        
                        // CRITICAL: Fix typos BEFORE enriching (catches typos from library or AI)
                        if (fullWorkout.structure) {
                            fullWorkout.structure = this.fixCommonTypos(fullWorkout.structure);
                        }
                        if (fullWorkout.description) {
                            fullWorkout.description = this.fixCommonTypos(fullWorkout.description);
                        }
                        if (fullWorkout.name) {
                            fullWorkout.name = this.fixCommonTypos(fullWorkout.name);
                        }
                        
                        const enriched = this.injectUserPaces(fullWorkout, weekPaces);
                        
                        // CRITICAL: Ensure distance is preserved from AI's description
                        // For bike workouts, distance is already set by prescribeStandUpBikeWorkout
                        if (totalDistance && !enriched.distance) {
                            enriched.distance = totalDistance;
                            console.log(`    📏 Added distance ${totalDistance} miles to enriched workout`);
                        }

                        // TASK 3: PREVENT "DISTANCE: 0" - Parse structure if distance is missing/zero
                        let finalDistance = enriched.distance || workout.distance || 0;
                        if ((!finalDistance || finalDistance === 0) && workout.type !== 'rest') {
                            // Try to parse distance from structure string (already fixed for typos)
                            const structureText = enriched.structure || workout.structure || workout.description || '';
                            const distanceMatch = structureText.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi|kilometers?|km)\b/i);
                            
                            if (distanceMatch) {
                                finalDistance = parseFloat(distanceMatch[1]);
                                console.log(`    📏 Parsed distance ${finalDistance} miles from structure text`);
                            } else {
                                // Default based on workout type and intensity
                                if (workout.type === 'tempo' || workout.type === 'interval' || workout.type === 'hills') {
                                    finalDistance = 4; // Quality workouts typically 4-6 miles
                                } else if (workout.type === 'easy' || workout.type === 'longRun') {
                                    finalDistance = 3; // Easy runs typically 3-5 miles
                                } else {
                                    finalDistance = 3; // Safe default
                                }
                                console.log(`    📏 Defaulted distance to ${finalDistance} miles for ${workout.type} workout`);
                            }
                            enriched.distance = finalDistance;
                        }

                        return {
                            ...workout,
                            fullWorkoutDetails: enriched,
                            hasStructuredWorkout: true,
                            extractedDistance: totalDistance || finalDistance // Store for later use
                        };
                    } else {
                        console.log(`    ❌ No workout found at index ${workout.workoutIndex}`);
                    }
                } catch (error) {
                    console.warn(`    ⚠️ Error enriching workout: ${workout.workoutId}`, error);
                }

                // TASK 3: PREVENT "DISTANCE: 0" - Even for fallback workouts, try to extract distance
                let fallbackDistance = workout.distance || 0;
                if ((!fallbackDistance || fallbackDistance === 0) && workout.type !== 'rest') {
                    const structureText = workout.structure || workout.description || '';
                    const distanceMatch = structureText.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi|kilometers?|km)\b/i);
                    
                    if (distanceMatch) {
                        fallbackDistance = parseFloat(distanceMatch[1]);
                        console.log(`    📏 Parsed distance ${fallbackDistance} miles from fallback workout text`);
                    } else if (workout.type === 'tempo' || workout.type === 'interval' || workout.type === 'hills') {
                        fallbackDistance = 4;
                    } else if (workout.type === 'easy' || workout.type === 'longRun') {
                        fallbackDistance = 3;
                    } else {
                        fallbackDistance = 3;
                    }
                }

                return { 
                    ...workout, 
                    hasStructuredWorkout: false,
                    distance: fallbackDistance || workout.distance || 0
                };
            });

            return { ...week, workouts: enrichedWorkouts };
        });

        return { ...structuredPlan, weeks: enrichedWeeks };
    }

    /**
     * Inject user-specific paces into workout details
     * 
     * CRITICAL: Weekly Blended Pace (userPaces) is the Single Source of Truth.
     * This method overwrites ALL generic pace terms throughout the entire workout
     * and sets the targetPace metadata to match.
     * 
     * @param {object} workout - Workout object from library
     * @param {object} userPaces - User's calculated Weekly Blended Paces (Single Source of Truth)
     * @returns {object} Workout with paces injected and metadata set
     */
    injectUserPaces(workout, userPaces) {
        if (!userPaces) return workout;

        const enriched = JSON.parse(JSON.stringify(workout));

        // ============================================
        // FIX COMMON TYPOS IN ALL TEXT FIELDS (CRITICAL: "miless" appears in structure)
        // ============================================
        
        // Fix typos in name field
        if (enriched.name && typeof enriched.name === 'string') {
            enriched.name = this.fixCommonTypos(enriched.name);
        }

        // Fix typos in description field
        if (enriched.description && typeof enriched.description === 'string') {
            enriched.description = this.fixCommonTypos(enriched.description);
        }

        // Fix typos in structure field (MOST CRITICAL - "miless" appears here)
        if (enriched.structure && typeof enriched.structure === 'string') {
            enriched.structure = this.fixCommonTypos(enriched.structure);
        }

        // Fix typos in workout phases (warmup, main, recovery, cooldown)
        if (enriched.workout) {
            ['warmup', 'main', 'recovery', 'cooldown', 'repeat'].forEach(phase => {
                if (enriched.workout[phase] && typeof enriched.workout[phase] === 'string') {
                    enriched.workout[phase] = this.fixCommonTypos(enriched.workout[phase]);
                }
            });
        }

        // ============================================
        // REPLACE GENERIC PACES IN ALL TEXT FIELDS
        // ============================================
        
        // Replace in structure field
        if (enriched.structure && typeof enriched.structure === 'string') {
            enriched.structure = this.replaceGenericPaces(enriched.structure, userPaces);
        }

        // Replace in description field
        if (enriched.description && typeof enriched.description === 'string') {
            enriched.description = this.replaceGenericPaces(enriched.description, userPaces);
        }

        // Replace in name field (if it contains pace references)
        if (enriched.name && typeof enriched.name === 'string') {
            enriched.name = this.replaceGenericPaces(enriched.name, userPaces);
        }

        // Replace in workout phases (warmup, main, recovery, cooldown)
        if (enriched.workout) {
            ['warmup', 'main', 'recovery', 'cooldown', 'repeat'].forEach(phase => {
                if (enriched.workout[phase] && typeof enriched.workout[phase] === 'string') {
                    enriched.workout[phase] = this.replaceGenericPaces(enriched.workout[phase], userPaces);
                }
            });
        }

        // Replace in repetitions array
        if (enriched.repetitions && Array.isArray(enriched.repetitions)) {
            enriched.repetitions = enriched.repetitions.map(rep => {
                if (typeof rep === 'string') {
                    return this.replaceGenericPaces(rep, userPaces);
                }
                return rep;
            });
        }

        // ============================================
        // FORCE METADATA TO MATCH (Single Source of Truth)
        // ============================================
        
        // Determine workout type and set targetPace accordingly
        const workoutType = enriched.type || enriched.workoutType || '';
        const workoutName = (enriched.name || '').toLowerCase();
        const structure = (enriched.structure || '').toLowerCase();
        
        // Tempo/Threshold workouts → use threshold pace
        if (workoutType === 'tempo' || 
            workoutName.includes('tempo') || 
            workoutName.includes('threshold') ||
            structure.includes('tempo') ||
            structure.includes('threshold') ||
            structure.includes('10k pace')) {
            if (userPaces.threshold?.pace) {
                enriched.targetPace = userPaces.threshold.pace;
            }
        }
        // Interval/VO2 workouts → use interval pace
        else if (workoutType === 'interval' || 
                 workoutType === 'intervals' ||
                 workoutName.includes('interval') ||
                 workoutName.includes('vo2') ||
                 workoutName.includes('speed') ||
                 structure.includes('interval') ||
                 structure.includes('5k pace')) {
            if (userPaces.interval?.pace) {
                enriched.targetPace = userPaces.interval.pace;
            }
        }
        // Marathon pace workouts → use marathon pace
        else if (workoutName.includes('marathon') ||
                 structure.includes('marathon pace') ||
                 structure.includes('mp')) {
            if (userPaces.marathon?.pace) {
                enriched.targetPace = userPaces.marathon.pace;
            }
        }
        // Easy/Recovery workouts → use easy pace range
        else if (workoutType === 'easy' || 
                 workoutType === 'recovery' ||
                 workoutName.includes('easy') ||
                 workoutName.includes('recovery')) {
            if (userPaces.easy?.min && userPaces.easy?.max) {
                enriched.targetPace = `${userPaces.easy.min}-${userPaces.easy.max}`;
            }
        }

        return enriched;
    }

    /**
     * Universal Pace Translator - Single Source of Truth for Pace Replacement
     * 
     * This is the ONLY place where generic pace terms are converted to actual paces.
     * Weekly Blended Pace (userPaces) is the Single Source of Truth - it overwrites
     * ALL generic terms and Goal Paces throughout the entire workout.
     * 
     * @param {string} text - Text with generic pace placeholders
     * @param {object} paces - User's calculated Weekly Blended Paces (Single Source of Truth)
     * @returns {string} Text with actual paces injected
     */
    replaceGenericPaces(text, paces) {
        if (!text || typeof text !== 'string') return text;

        let p = text;

        // CRITICAL: Use structured VDOT paces only - no fallbacks to legacy field names
        // If pace is missing, it means VDOT calculation failed - don't guess
        const thresholdPace = paces.threshold?.pace;
        const intervalPace = paces.interval?.pace;
        const marathonPace = paces.marathon?.pace;
        const easyPace = (paces.easy?.min && paces.easy?.max)
            ? `${paces.easy.min}-${paces.easy.max}`
            : paces.easy;

        // ============================================
        // EXACT REPLACEMENTS (The Easy Ones)
        // ============================================
        
        if (thresholdPace) {
            // Tempo/Threshold variations
            p = p.replace(/@\s*tempo\b/gi, `@ ${thresholdPace}/mi`);
            p = p.replace(/\btempo\s+pace\b/gi, `${thresholdPace}/mi`);
            p = p.replace(/\bthreshold\s+pace\b/gi, `${thresholdPace}/mi`);
            p = p.replace(/\btempo\s+effort\b/gi, `@ ${thresholdPace}/mi`);
            p = p.replace(/\bthreshold\s+effort\b/gi, `@ ${thresholdPace}/mi`);
            p = p.replace(/\bmin\s+tempo\b/gi, `min @ ${thresholdPace}/mi`);
        }

        if (marathonPace) {
            // Marathon pace variations
            p = p.replace(/@\s*marathon\s+pace\b/gi, `@ ${marathonPace}/mi`);
            p = p.replace(/\bmarathon\s+pace\b/gi, `${marathonPace}/mi`);
            p = p.replace(/@\s*MP\b/gi, `@ ${marathonPace}/mi`);
            p = p.replace(/\bMP\b/g, `${marathonPace}/mi`);
        }

        if (intervalPace && typeof intervalPace === 'string') {
            // Interval/VO2 variations
            p = p.replace(/VO2\s+max\s+effort\b/gi, `@ ${intervalPace}/mi`);
            p = p.replace(/\binterval\s+pace\b/gi, `${intervalPace}/mi`);
        }

        if (easyPace && typeof easyPace === 'string') {
            // Easy pace variations (be careful not to replace "easy" in other contexts)
            p = p.replace(/\beasy\s+pace\b/gi, `${easyPace}/mi`);
            p = p.replace(/\beasy\s+effort\b/gi, `@ ${easyPace}/mi`);
        }

        // ============================================
        // THE "ILLUSIVE" RACE DISTANCES (The Missing Link)
        // Map these distances to the closest Physiological Zone we have
        // ============================================
        
        if (thresholdPace) {
            // 10K pace ≈ Threshold pace (lactate threshold)
            p = p.replace(/@\s*10K\s+pace\b/gi, `@ ${thresholdPace}/mi`);
            p = p.replace(/\b10K\s+pace\b/gi, `${thresholdPace}/mi`);
            p = p.replace(/\b10-K\s+pace\b/gi, `${thresholdPace}/mi`);
            p = p.replace(/10K\s+race\s+pace\b/gi, `${thresholdPace}/mi (10K/threshold pace)`);
            
            // Half marathon pace ≈ Threshold pace (close enough for training context)
            p = p.replace(/@\s*half\s+marathon\s+pace\b/gi, `@ ${thresholdPace}/mi`);
            p = p.replace(/\bhalf\s+marathon\s+pace\b/gi, `${thresholdPace}/mi`);
            p = p.replace(/@\s*half\s+pace\b/gi, `@ ${thresholdPace}/mi`);
        }

        if (intervalPace && typeof intervalPace === 'string') {
            // 5K pace ≈ VO2 Max / Interval pace
            p = p.replace(/@\s*5K\s+pace\b/gi, `@ ${intervalPace}/mi`);
            p = p.replace(/\b5K\s+pace\b/gi, `${intervalPace}/mi`);
            p = p.replace(/\b5-K\s+pace\b/gi, `${intervalPace}/mi`);
            p = p.replace(/5K\s+race\s+pace\b/gi, `${intervalPace}/mi (5K/interval pace)`);
        }

        return p;
    }
}

// Export singleton instance
export default new WorkoutEnricher();






