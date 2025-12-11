/**
 * PlanTransformer - Transforms enriched plan to Dashboard format
 * 
 * Single Responsibility: Convert enriched plan structure to format expected by Dashboard component
 */

import phaseCalculator from './PhaseCalculator';

class PlanTransformer {
    /**
     * Parse date string (handles both ISO strings and date-only strings)
     */
    parseDate(dateString) {
        if (!dateString) return null;
        if (dateString.includes('T')) {
            // Already an ISO string
            return new Date(dateString);
        } else {
            // Date-only string, append time
            return new Date(`${dateString}T00:00:00`);
        }
    }

    /**
     * Transform enriched plan to Dashboard format
     * @param {object} enrichedPlan - Enriched plan with full workout details
     * @param {object} userProfile - User profile data
     * @returns {object} Plan in Dashboard format
     */
    transformToDashboardFormat(enrichedPlan, userProfile) {
        console.log('\n🔧 TRANSFORMING TO DASHBOARD FORMAT');
        
        // CRITICAL: Calculate totalWeeks from dates as fallback if weeks array is empty
        let totalWeeks = enrichedPlan.weeks?.length || 0;
        if (totalWeeks === 0) {
            // Fallback: Calculate from race date and start date
            const startDate = this.parseDate(userProfile.startDate);
            const raceDate = this.parseDate(userProfile.raceDate);
            if (startDate && raceDate && !isNaN(startDate.getTime()) && !isNaN(raceDate.getTime())) {
                const msPerWeek = 7 * 24 * 60 * 60 * 1000;
                totalWeeks = Math.max(1, Math.ceil((raceDate.getTime() - startDate.getTime()) / msPerWeek));
                console.warn(`⚠️ Weeks array is empty - calculated totalWeeks from dates: ${totalWeeks}`);
            } else {
                console.error('❌ Cannot calculate totalWeeks - missing or invalid dates');
                throw new Error('Cannot create plan: weeks array is empty and dates are invalid');
            }
        }
        const phasePlan = phaseCalculator.getPhasePlan(totalWeeks);
        const phaseFocusMap = {
            Base: 'Aerobic foundation & durability',
            Build: 'Strength & speed development',
            Peak: 'Race-specific sharpening',
            Taper: 'Freshen up & execute'
        };
        const motivationMap = {
            Base: [
                'Consistency right now builds race-day confidence 💪',
                'Aerobic base today = faster workouts later ⚙️',
                'Keep stacking easy miles - durability wins 🧱',
                'Recovery matters as much as the miles 😴'
            ],
            Build: [
                'Dial in effort - smooth, fast, controlled 🚀',
                'This phase teaches you to love the grind 🔁',
                'Every quality day is sharpening your edge ✂️',
                'Fuel, sleep, repeat - you\'re in the work zone 🧪'
            ],
            Peak: [
                'Race-specific work now = calm on race day 🏁',
                'Trust your legs - they know what to do 👣',
                'Two words: race rehearsals 🧠',
                'Your engine is built. Now we fine tune 🔧'
            ],
            Taper: [
                'Less work, more readiness - let freshness build 🌱',
                'Nothing new. Stay sharp, stay calm 🎯',
                'Visualize success - you\'ve earned this 💫',
                'Rest is training. Really. 😴'
            ]
        };
        // Parse start date - handle both ISO strings and date-only strings
        let planStartDate;
        if (userProfile.startDate) {
            if (userProfile.startDate.includes('T')) {
                // Already an ISO string
                planStartDate = new Date(userProfile.startDate);
            } else {
                // Date-only string, append time
                planStartDate = new Date(`${userProfile.startDate}T00:00:00`);
            }
        } else {
            planStartDate = new Date();
        }
        
        // Parse race date - handle both ISO strings and date-only strings
        let raceDate;
        if (userProfile.raceDate) {
            if (userProfile.raceDate.includes('T')) {
                // Already an ISO string
                raceDate = new Date(userProfile.raceDate);
            } else {
                // Date-only string, append time
                raceDate = new Date(`${userProfile.raceDate}T00:00:00`);
            }
        } else {
            raceDate = new Date(planStartDate);
        }
        
        // Validate dates
        if (isNaN(planStartDate.getTime())) {
            throw new Error(`Invalid start date: ${userProfile.startDate}`);
        }
        if (isNaN(raceDate.getTime())) {
            throw new Error(`Invalid race date: ${userProfile.raceDate}`);
        }
        const formatWeekDates = (weekNumber) => {
            const start = new Date(planStartDate);
            start.setDate(planStartDate.getDate() + (weekNumber - 1) * 7);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
                displayText: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            };
        };
        const getMotivation = (phase, weekNumber) => {
            const options = motivationMap[phase] || motivationMap.Base;
            return options[(weekNumber - 1) % options.length];
        };

        const dashboardWeeks = enrichedPlan.weeks.map(week => {
            console.log(`\n📅 Week ${week.weekNumber} - ${week.workouts.length} workouts`);
            const dashboardWorkouts = week.workouts.map(workout => {
                console.log(`\n  Processing workout:`, {
                    day: workout.day,
                    description: workout.description,
                    hasWorkoutId: !!workout.workoutId,
                    hasFullDetails: !!workout.fullWorkoutDetails,
                    workoutType: workout.workoutType
                });

                // If workout has full details from library, use them
                if (workout.fullWorkoutDetails) {
                    const details = workout.fullWorkoutDetails;
                    console.log(`  ✅ Using fullWorkoutDetails:`, {
                        name: details.name,
                        category: details.category,
                        hasNestedWorkout: !!details.workout
                    });

                    // Try to extract distance from AI's workout description (e.g., "Long Run 10 miles")
                    // CRITICAL: Check workout.distance first (may have been adjusted by PlanFixer), then extractedDistance
                    let extractedDistance = workout.distance || workout.extractedDistance || details.distance || 0;
                    if (!extractedDistance) {
                        const distanceMatch = workout.description.match(/(\d+(?:\.\d+)?)\s*(mile|miles|mi|km)/i);
                        if (distanceMatch) {
                            extractedDistance = parseFloat(distanceMatch[1]);
                            console.log(`  📏 Extracted distance from description: ${extractedDistance} ${distanceMatch[2]}`);
                        }
                    }
                    
                    // CRITICAL: If still no distance, try to extract from the original description before cleaning
                    if (!extractedDistance && workout.originalDescription) {
                        const originalMatch = workout.originalDescription.match(/(\d+(?:\.\d+)?)\s*(mile|miles|mi|km)/i);
                        if (originalMatch) {
                            extractedDistance = parseFloat(originalMatch[1]);
                            console.log(`  📏 Extracted distance from original description: ${extractedDistance}`);
                        }
                    }

                    // Dashboard expects workout.workout.name structure
                    // Some libraries have nested workout{} object (hills), others are flat (tempo/interval/longrun)
                    // IMPORTANT: Always include name from details.name for library lookup in WorkoutDetail
                    const workoutObj = details.workout
                        ? { ...details.workout, name: details.name, description: details.description }
                        : {
                            name: details.name,
                            description: details.description,
                            warmup: details.warmup,
                            main: details.main,
                            cooldown: details.cooldown,
                            repetitions: details.repetitions,
                            structure: details.structure,
                            duration: details.duration,
                            pace: details.pace,
                            intensity: details.intensity
                        };

                    // Normalize workout type for Dashboard (intervals, hills, tempo, longRun, easy)
                    // The library category (VO2_MAX, SHORT_SPEED, etc.) is for internal use
                    // but we need normalized types for the Choose Adventure button logic
                    const normalizeWorkoutType = (workoutType, category) => {
                        const type = (workoutType || '').toLowerCase();
                        const cat = (category || '').toLowerCase();

                        // Interval types
                        if (type === 'interval' || cat.includes('vo2') || cat.includes('speed') ||
                            cat.includes('interval') || cat.includes('short_speed') || cat.includes('long_interval')) {
                            return 'intervals';
                        }
                        // Hill types
                        if (type === 'hill' || cat.includes('hill') || cat.includes('power') || cat.includes('strength')) {
                            return 'hills';
                        }
                        // Tempo types
                        if (type === 'tempo' || cat.includes('tempo') || cat.includes('threshold')) {
                            return 'tempo';
                        }
                        // Long run types
                        if (type === 'longrun' || cat.includes('long') || cat.includes('progressive') || cat.includes('mixed_pace')) {
                            return 'longRun';
                        }
                        return type || 'easy';
                    };

                    const normalizedType = normalizeWorkoutType(workout.workoutType, details.category);

                    const focusMap = {
                        tempo: 'Lactate Threshold',
                        intervals: 'Speed & VO2 Max',
                        hills: 'Strength & Power',
                        longRun: 'Endurance',
                        easy: 'Aerobic Base',
                        bike: 'Cross-Training',
                        rest: 'Recovery',
                        rest_or_xt: 'Recovery / XT'
                    };

                    // Clean workout name - remove [WORKOUT_ID: ...] tags if present (including malformed ones)
                    let cleanName = details.name || workout.description;
                    // First try complete format, then catch any partial/malformed WORKOUT_ID tags
                    cleanName = cleanName
                        .replace(/\[WORKOUT_ID:\s*(?:tempo|interval|longrun|hill|fartlek)_.+?_\d+\]\s*/g, '')
                        .replace(/\[WORKOUT_ID[^\]]*\]?\s*/gi, '') // Catch malformed/truncated tags
                        .trim();

                    // If name is empty or still looks like a tag, use a sensible fallback
                    if (!cleanName || cleanName.startsWith('[')) {
                        cleanName = focusMap[normalizedType] || 'Workout';
                    }

                    let cleanDescription = details.description || workout.description;
                    cleanDescription = cleanDescription
                        .replace(/\[WORKOUT_ID:\s*(?:tempo|interval|longrun|hill|fartlek)_.+?_\d+\]\s*/g, '')
                        .replace(/\[WORKOUT_ID[^\]]*\]?\s*/gi, '') // Catch malformed/truncated tags
                        .trim();

                    return {
                        day: workout.day,
                        type: normalizedType,
                        // CRITICAL: Clean names/descriptions - remove WORKOUT_ID tags
                        name: cleanName,
                        description: cleanDescription,
                        distance: extractedDistance || workout.extractedDistance || 0, // CRITICAL: Preserve distance from AI description
                        // CRITICAL: Focus should come from library or type mapping - only fallback to 'Training' if truly unknown
                        focus: focusMap[normalizedType] || details.focus || 'Training',
                        workout: workoutObj,
                        terrain: details.terrain,
                        safety: details.safety,
                        runeq_options: details.runeq_options || details.runEqOptions,
                        warmup: workoutObj.warmup,
                        cooldown: workoutObj.cooldown,
                        repetitions: workoutObj.repetitions || details.repetitions,
                        // Rich library data - pass through for WorkoutDetail display
                        hillRequirement: details.hillRequirement,
                        intensity: details.intensity,
                        progression: details.progression,
                        safetyNotes: details.safetyNotes,
                        duration: details.duration,
                        specificFocus: details.focus, // The detailed focus from library (e.g., "VO2 max, lactate threshold, hill running economy")
                        metadata: {
                            workoutId: workout.workoutId,
                            aiGenerated: true,
                            libraryCategory: details.category // Keep original category for internal use
                        }
                    };
                }

                // Fallback for workouts without library details (e.g., rest days, easy runs, bike days)
                // CRITICAL: Fix "miless" typos BEFORE processing
                let cleanDescription = workout.description || '';
                if (cleanDescription) {
                    cleanDescription = cleanDescription
                        .replace(/miless/gi, 'miles')
                        .replace(/milees/gi, 'miles')
                        .replace(/milles/gi, 'miles')
                        .replace(/milse/gi, 'miles')
                        .replace(/mile\s+s/gi, 'miles');
                    workout.description = cleanDescription; // Update the description
                }
                console.log(`  ⚠️ Using FALLBACK - description: "${cleanDescription}"`);

                // Try to extract distance from description (e.g., "Easy 4 miles", "8 RunEQ miles")
                // CRITICAL: Check workout.distance first (may have been adjusted by PlanFixer)
                let extractedDistance = workout.distance || 0;
                if (!extractedDistance) {
                    const distanceMatch = cleanDescription.match(/(\d+(?:\.\d+)?)\s*(mile|miles|mi|km|RunEQ)/i);
                    if (distanceMatch) {
                        extractedDistance = parseFloat(distanceMatch[1]);
                        console.log(`  📏 Extracted distance: ${extractedDistance} ${distanceMatch[2]}`);
                    }
                }

                // Determine focus for fallback workouts
                // CRITICAL: Extract type from description, don't default to 'easy'
                // Fallback workouts are rest days, easy runs, or bike days - extract type from description
                let fallbackType = 'easy'; // Only default if we can't determine from description
                const descLower = cleanDescription.toLowerCase();
                if (descLower.includes('rest') || descLower === 'rest') {
                    fallbackType = 'rest';
                } else if (descLower.includes('ride') || descLower.includes('runeq') || descLower.includes('bike')) {
                    fallbackType = 'bike';
                    // CRITICAL: For bike workouts, extract RunEQ miles (not convert to bike miles)
                    // The AI generates "Ride 3 RunEQ miles" - we want to preserve the RunEQ value
                    const runEqMatch = cleanDescription.match(/(\d+(?:\.\d+)?)\s*RunEQ/i);
                    if (runEqMatch) {
                        extractedDistance = parseFloat(runEqMatch[1]);
                        console.log(`  📏 Extracted RunEQ distance: ${extractedDistance} RunEQ miles`);
                    }
                } else if (descLower.includes('easy')) {
                    fallbackType = 'easy';
                } else if (descLower.includes('tempo')) {
                    fallbackType = 'tempo';
                } else if (descLower.includes('interval')) {
                    fallbackType = 'intervals';
                } else if (descLower.includes('hill')) {
                    fallbackType = 'hills';
                } else if (descLower.includes('long')) {
                    fallbackType = 'longRun';
                }
                
                const fallbackFocusMap = {
                    tempo: 'Lactate Threshold',
                    intervals: 'Speed & VO2 Max',
                    hills: 'Strength & Power',
                    longRun: 'Endurance',
                    easy: 'Aerobic Base',
                    bike: 'Cross-Training',
                    rest: 'Recovery',
                    rest_or_xt: 'Recovery / XT'
                };

                // Fix common AI typos first (e.g., "miless" -> "miles")
                const fixTypos = (text) => {
                    if (!text) return text;
                    return text
                        .replace(/miless/gi, 'miles')
                        .replace(/milees/gi, 'miles')
                        .replace(/milles/gi, 'miles')
                        .replace(/milse/gi, 'miles')
                        .replace(/mies/gi, 'miles');
                };

                // Clean fallback workout name - remove [WORKOUT_ID: ...] tags if present (including malformed ones)
                // CRITICAL: Fix typos before cleaning tags
                let cleanFallbackName = fixTypos(workout.description);
                cleanFallbackName = cleanFallbackName
                    .replace(/\[WORKOUT_ID:\s*(?:tempo|interval|longrun|hill|fartlek)_.+?_\d+\]\s*/g, '')
                    .replace(/\[WORKOUT_ID[^\]]*\]?\s*/gi, '') // Catch malformed/truncated tags
                    .trim();

                // If name is empty or still looks like a tag, use a sensible fallback
                if (!cleanFallbackName || cleanFallbackName.startsWith('[')) {
                    cleanFallbackName = fallbackFocusMap[fallbackType] || 'Workout';
                }

                // CRITICAL: For bike workouts, preserve RunEQ in the name
                let finalName = cleanFallbackName;
                let finalDescription = cleanFallbackName;
                if (fallbackType === 'bike' && workout.description.match(/RunEQ/i)) {
                    // Preserve "RunEQ miles" in the name/description
                    const runEqMatch = fixTypos(workout.description).match(/(\d+(?:\.\d+)?)\s*RunEQ\s*miles?/i);
                    if (runEqMatch) {
                        finalName = `Ride ${runEqMatch[1]} RunEQ miles`;
                        // Fix typos in description before using it
                        finalDescription = fixTypos(workout.description); // Keep original description with RunEQ, but fix typos
                    }
                } else {
                    // Fix typos in all other fallback descriptions
                    finalName = cleanFallbackName; // Already fixed above
                    finalDescription = fixTypos(workout.description);
                }
                
                const fallbackWorkout = {
                    day: workout.day,
                    type: fallbackType,
                    name: finalName,
                    description: finalDescription,
                    distance: extractedDistance,
                    focus: fallbackFocusMap[fallbackType] || 'Training', // Keep this fallback for safety, but type should be determined above
                    workout: {
                        name: finalName,
                        description: finalDescription
                    },
                    metadata: {
                        aiGenerated: true,
                        fallback: true
                    }
                };
                console.log(`  Created fallback workout:`, fallbackWorkout);
                return fallbackWorkout;
            });

            const phaseLabel = phaseCalculator.getPhaseForWeek(week.weekNumber, totalWeeks);
            const phaseKey = phaseLabel.toLowerCase();
            if (week.weekNumber === 1 || week.weekNumber === Math.ceil(totalWeeks * 0.5) || week.weekNumber === totalWeeks) {
                console.log(`📅 Week ${week.weekNumber}/${totalWeeks}: Phase = ${phaseLabel} (${phaseKey})`);
            }
            
            // CRITICAL: Calculate total mileage from workouts
            // RunEQ miles REPLACE runs (both easy AND hard), so they count as running miles (not additional)
            let calculatedTotalMileage = 0;
            dashboardWorkouts.forEach(workout => {
                if (workout.type === 'bike' && workout.distance) {
                    // Hard RunEQ workouts (tempo, intervals) have type: 'bike' and distance
                    // Easy RunEQ workouts also have type: 'bike' and distance
                    // RunEQ miles REPLACE runs - they ARE running miles
                    calculatedTotalMileage += parseFloat(workout.distance);
                } else if (workout.distance && workout.type !== 'rest' && workout.type !== 'rest_or_xt' && workout.type !== 'bike') {
                    // Running workouts - add distance (exclude bike type since we already handled it above)
                    calculatedTotalMileage += workout.distance;
                }
            });
            
            // CRITICAL: Always prefer calculated total (includes RunEQ that AI might have missed)
            // The parser and PlanFixer should have already fixed week.totalMileage, but recalculate here as final check
            let finalTotalMileage;
            if (calculatedTotalMileage > 0) {
                // Always use calculated total as the source of truth (it's based on actual workouts)
                // Only fall back to week.totalMileage if calculation failed
                finalTotalMileage = Math.round(calculatedTotalMileage);
                if (Math.abs(finalTotalMileage - (week.totalMileage || 0)) > 1) {
                    console.log(`  📊 Week ${week.weekNumber}: Using calculated ${finalTotalMileage}mi (week.totalMileage was ${week.totalMileage}mi)`);
                }
            } else {
                // Calculation failed - use week.totalMileage as fallback
                finalTotalMileage = week.totalMileage || 0;
                if (finalTotalMileage === 0) {
                    console.warn(`  ⚠️ Week ${week.weekNumber}: Could not calculate mileage from workouts, using 0`);
                }
            }
            
            return {
                weekNumber: week.weekNumber,
                totalMileage: finalTotalMileage,
                workouts: dashboardWorkouts,
                phase: phaseKey,
                weeklyFocus: phaseFocusMap[phaseLabel] || 'Periodized training',
                motivation: getMotivation(phaseLabel, week.weekNumber),
                weekDates: formatWeekDates(week.weekNumber)
            };
        });

        // CRITICAL: Ensure race day is in the final week with correct distance, type, and focus
        // The AI sometimes forgets to include it, or includes it with wrong distance/type
        if (dashboardWeeks.length > 0 && userProfile.raceDate) {
            const finalWeek = dashboardWeeks[dashboardWeeks.length - 1];
            const hasSunday = finalWeek.workouts.some(w => w.day === 'Sunday');
            
            // Calculate correct race distance
            // Handle both "Half" and "Half Marathon" formats
            const raceDist = userProfile.raceDistance || '';
            const correctRaceDistance = raceDist === 'Marathon' || raceDist.includes('Marathon') ? 26.2 :
                                      raceDist === 'Half' || raceDist.includes('Half') ? 13.1 :
                                      raceDist === '10K' || raceDist.includes('10K') ? 6.2 :
                                      raceDist === '5K' || raceDist.includes('5K') ? 3.1 : 0;
            
            // Find existing race day workout (if any)
            const existingRaceDayIndex = finalWeek.workouts.findIndex(w =>
                w.type === 'race' ||
                (w.name && w.name.toLowerCase().includes('race')) ||
                (w.description && w.description.toLowerCase().includes('race day'))
            );
            
            // Check if existing race day is correct
            const existingRaceDay = existingRaceDayIndex >= 0 ? finalWeek.workouts[existingRaceDayIndex] : null;
            const isRaceDayCorrect = existingRaceDay && 
                                    existingRaceDay.type === 'race' &&
                                    Math.abs(existingRaceDay.distance - correctRaceDistance) < 0.5 &&
                                    existingRaceDay.focus === 'Race Day';
            
            // Get race distance for display
            const raceDistanceDisplay = userProfile.raceDistance === 'Half' ? 'Half Marathon' : userProfile.raceDistance;
            const goalTime = userProfile.raceTime || '';

            if (!hasSunday || !existingRaceDay || !isRaceDayCorrect) {
                const raceDayWorkout = {
                    day: 'Sunday',
                    type: 'race',
                    name: `🏁 Race Day: ${raceDistanceDisplay}`,
                    description: goalTime ? `${raceDistanceDisplay} - Goal: ${goalTime}` : `${raceDistanceDisplay} Race`,
                    distance: correctRaceDistance,
                    focus: 'Race Day',
                    workout: {
                        name: `🏁 Race Day: ${raceDistanceDisplay}`,
                        description: `Your ${raceDistanceDisplay} race! Execute your race plan and trust your training.`
                    },
                    metadata: {
                        isRaceDay: true,
                        raceDistance: userProfile.raceDistance,
                        goalTime: goalTime
                    }
                };

                // Remove existing Sunday workout (whether it's a wrong race day or a regular workout)
                if (hasSunday) {
                    finalWeek.workouts = finalWeek.workouts.filter(w => w.day !== 'Sunday');
                }

                // Add correct race day workout
                finalWeek.workouts.push(raceDayWorkout);
                
                if (existingRaceDay && !isRaceDayCorrect) {
                    console.log(`🏁 Fixed Race Day in final week (Week ${finalWeek.weekNumber}): Was distance=${existingRaceDay.distance}, type=${existingRaceDay.type}, focus=${existingRaceDay.focus} → Now distance=${correctRaceDistance}, type=race, focus=Race Day`);
                } else {
                    console.log(`🏁 Injected Race Day into final week (Week ${finalWeek.weekNumber})`);
                }
            }
        }

        // Clean coaching analysis for welcome page display:
        // 1. Remove WORKOUT_ID tags
        // 2. Strip the detailed week-by-week schedule (users see this on dashboard instead)
        // 3. Fix common AI typos (e.g., "miless" -> "miles")
        const workoutIdRegex = /\[WORKOUT_ID:\s*(?:tempo|interval|longrun|hill|fartlek)_[^\]]+\]\s*/gi;
        let cleanedCoachingText = enrichedPlan.fullPlanText
            ? enrichedPlan.fullPlanText.replace(workoutIdRegex, '').trim()
            : enrichedPlan.fullPlanText;

        // Strip the detailed week-by-week plan from the coaching text
        // This prevents showing duplicate/conflicting data on welcome page vs dashboard
        if (cleanedCoachingText) {
            // Remove everything from "# Week-by-Week Training Schedule" or "# DETAILED" onwards
            const weekSchedulePatterns = [
                /#+\s*Week-by-Week Training Schedule[\s\S]*/i,
                /#+\s*DETAILED\s+\d+-WEEK\s+TRAINING\s+PLAN[\s\S]*/i,
                /#+\s*\d+-WEEK\s+TRAINING\s+PLAN[\s\S]*/i
            ];
            for (const pattern of weekSchedulePatterns) {
                cleanedCoachingText = cleanedCoachingText.replace(pattern, '').trim();
            }

            // Fix common AI typos (e.g., "miless" -> "miles")
            cleanedCoachingText = cleanedCoachingText
                .replace(/miless/gi, 'miles')
                .replace(/milees/gi, 'miles')
                .replace(/milles/gi, 'miles')
                .replace(/milse/gi, 'miles');
        }

        // Format as YYYY-MM-DD for consistency
        const startDateString = planStartDate.toISOString().split('T')[0];
        const raceDateString = raceDate.toISOString().split('T')[0];

        return {
            userProfile: enrichedPlan.userProfile,
            paces: enrichedPlan.paces,
            trackIntervals: enrichedPlan.trackIntervals, // Include VDOT track interval times
            weeks: dashboardWeeks,
            fullPlanText: enrichedPlan.fullPlanText,
            aiCoachingAnalysis: cleanedCoachingText, // Store cleaned coaching output
            planOverview: {
                startDate: startDateString,
                raceDate: raceDateString,
                totalWeeks: totalWeeks,
                raceDistance: userProfile.raceDistance,
                goalTime: userProfile.raceTime,
                trainingPhilosophy: userProfile.trainingPhilosophy || userProfile.trainingStyle || 'practical_periodization',
                phasePlan
            }
        };
    }
}

// Export singleton instance
export default new PlanTransformer();

