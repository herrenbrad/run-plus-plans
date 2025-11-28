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

