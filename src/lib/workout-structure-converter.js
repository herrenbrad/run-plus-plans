/**
 * Shared utility for converting vague workout structures to specific values
 * Used by all workout libraries to ensure coach-like specificity
 * 
 * Example conversions:
 * - "4-6 x 3-8 min" → "5 x 4 min"
 * - "8-12 x (2 min tempo)" → "10 x (2 min tempo)"
 * - "x 10-30" → "x 20"
 * - "2 x 10-15 min" → "2 x 12 min"
 * - "1-2 min recovery" → "90 sec recovery"
 */

/**
 * Convert vague structure ranges to specific values
 * @param {string} structure - The workout structure string with ranges
 * @param {number|null} weekNumber - Current week number (for progression)
 * @param {number|null} totalWeeks - Total weeks in plan (for progression)
 * @returns {string} - Structure with specific values instead of ranges
 */
export function convertVagueStructureToSpecific(structure, weekNumber = null, totalWeeks = null) {
    if (!structure || typeof structure !== 'string') return structure;

    let updatedStructure = structure;

    // Helper to calculate specific value from range
    const calculateSpecific = (min, max, weekNum, totalWks) => {
        if (weekNum && totalWks) {
            const progression = Math.min(1.0, weekNum / (totalWks * 0.75));
            return Math.round(min + (progression * (max - min)));
        }
        return Math.round((min + max) / 2);
    };

    // Pattern 1: "4-6 x 3-8 min" (reps x duration ranges)
    const repDurationRangeMatch = updatedStructure.match(/(\d+)-(\d+)\s*x\s*(\d+)-(\d+)\s*min/);
    if (repDurationRangeMatch) {
        const minReps = parseInt(repDurationRangeMatch[1], 10);
        const maxReps = parseInt(repDurationRangeMatch[2], 10);
        const minDuration = parseInt(repDurationRangeMatch[3], 10);
        const maxDuration = parseInt(repDurationRangeMatch[4], 10);

        const specificReps = calculateSpecific(minReps, maxReps, weekNumber, totalWeeks);
        const specificDuration = calculateSpecific(minDuration, maxDuration, weekNumber, totalWeeks);

        updatedStructure = updatedStructure.replace(
            /(\d+)-(\d+)\s*x\s*(\d+)-(\d+)\s*min/,
            `${specificReps} x ${specificDuration} min`
        );
    }

    // Pattern 2: "8-12 x (2 min tempo / 2 min easy)" (rep range with fixed duration)
    const repRangeMatch = updatedStructure.match(/(\d+)-(\d+)\s*x\s*\(/);
    if (repRangeMatch) {
        const minReps = parseInt(repRangeMatch[1], 10);
        const maxReps = parseInt(repRangeMatch[2], 10);
        const specificReps = calculateSpecific(minReps, maxReps, weekNumber, totalWeeks);
        updatedStructure = updatedStructure.replace(
            /(\d+)-(\d+)\s*x\s*\(/,
            `${specificReps} x (`
        );
    }

    // Pattern 3: "x 10-30" (rep range at end, like "Alternate... x 10-30")
    const endRepRangeMatch = updatedStructure.match(/x\s*(\d+)-(\d+)(?:\s|$|\)|,)/);
    if (endRepRangeMatch && !updatedStructure.includes('x (')) {
        const minReps = parseInt(endRepRangeMatch[1], 10);
        const maxReps = parseInt(endRepRangeMatch[2], 10);
        const specificReps = calculateSpecific(minReps, maxReps, weekNumber, totalWeeks);
        updatedStructure = updatedStructure.replace(
            /x\s*(\d+)-(\d+)(?:\s|$|\)|,)/,
            `x ${specificReps} `
        );
    }

    // Pattern 4: "2 x 10-15 min" (fixed reps, duration range)
    const fixedRepDurationRangeMatch = updatedStructure.match(/(\d+)\s*x\s*(\d+)-(\d+)\s*min/);
    if (fixedRepDurationRangeMatch) {
        const reps = parseInt(fixedRepDurationRangeMatch[1], 10);
        const minDuration = parseInt(fixedRepDurationRangeMatch[2], 10);
        const maxDuration = parseInt(fixedRepDurationRangeMatch[3], 10);
        const specificDuration = calculateSpecific(minDuration, maxDuration, weekNumber, totalWeeks);
        updatedStructure = updatedStructure.replace(
            /(\d+)\s*x\s*(\d+)-(\d+)\s*min/,
            `${reps} x ${specificDuration} min`
        );
    }

    // Pattern 5: "1-2 min recovery" or similar recovery ranges
    const recoveryRangeMatch = updatedStructure.match(/(\d+)-(\d+)\s*min\s*recovery/);
    if (recoveryRangeMatch) {
        const minRecovery = parseInt(recoveryRangeMatch[1], 10);
        const maxRecovery = parseInt(recoveryRangeMatch[2], 10);
        const specificRecovery = Math.round((minRecovery + maxRecovery) / 2);
        
        // Convert to seconds if it's a small number (1-2 min → 90 sec)
        if (specificRecovery <= 2) {
            const recoverySeconds = specificRecovery * 60;
            updatedStructure = updatedStructure.replace(
                /(\d+)-(\d+)\s*min\s*recovery/,
                `${recoverySeconds} sec recovery`
            );
        } else {
            updatedStructure = updatedStructure.replace(
                /(\d+)-(\d+)\s*min\s*recovery/,
                `${specificRecovery} min recovery`
            );
        }
    }

    // Pattern 6: "15-20 min easy" (duration ranges in warmup/cooldown)
    const durationRangeMatch = updatedStructure.match(/(\d+)-(\d+)\s*min\s+(?:easy|warmup|cooldown|tempo|steady)/);
    if (durationRangeMatch) {
        const minDuration = parseInt(durationRangeMatch[1], 10);
        const maxDuration = parseInt(durationRangeMatch[2], 10);
        const specificDuration = calculateSpecific(minDuration, maxDuration, weekNumber, totalWeeks);
        updatedStructure = updatedStructure.replace(
            /(\d+)-(\d+)\s*min\s+(?:easy|warmup|cooldown|tempo|steady)/,
            `${specificDuration} min $2`
        );
    }

    // Pattern 7: "4-6 x 8 min" (rep range with fixed duration)
    const repRangeFixedDurationMatch = updatedStructure.match(/(\d+)-(\d+)\s*x\s*(\d+)\s*min/);
    if (repRangeFixedDurationMatch) {
        const minReps = parseInt(repRangeFixedDurationMatch[1], 10);
        const maxReps = parseInt(repRangeFixedDurationMatch[2], 10);
        const duration = repRangeFixedDurationMatch[3];
        const specificReps = calculateSpecific(minReps, maxReps, weekNumber, totalWeeks);
        updatedStructure = updatedStructure.replace(
            /(\d+)-(\d+)\s*x\s*(\d+)\s*min/,
            `${specificReps} x ${duration} min`
        );
    }

    // Pattern 8: "3-4 x 5 min" (rep range with fixed duration, no @ symbol)
    const repRangeFixedMinMatch = updatedStructure.match(/(\d+)-(\d+)\s*x\s*(\d+)\s*min(?!\s*@)/);
    if (repRangeFixedMinMatch && !updatedStructure.match(/(\d+)-(\d+)\s*x\s*(\d+)-(\d+)\s*min/)) {
        const minReps = parseInt(repRangeFixedMinMatch[1], 10);
        const maxReps = parseInt(repRangeFixedMinMatch[2], 10);
        const duration = repRangeFixedMinMatch[3];
        const specificReps = calculateSpecific(minReps, maxReps, weekNumber, totalWeeks);
        updatedStructure = updatedStructure.replace(
            /(\d+)-(\d+)\s*x\s*(\d+)\s*min(?!\s*@)/,
            `${specificReps} x ${duration} min`
        );
    }

    // Pattern 9: "6-13 miles" or "1-2 miles" (distance ranges)
    const distanceRangeMatch = updatedStructure.match(/(\d+)-(\d+)\s*miles?\s*(?:@|at|easy|pace)/);
    if (distanceRangeMatch) {
        const minDistance = parseInt(distanceRangeMatch[1], 10);
        const maxDistance = parseInt(distanceRangeMatch[2], 10);
        const specificDistance = calculateSpecific(minDistance, maxDistance, weekNumber, totalWeeks);
        updatedStructure = updatedStructure.replace(
            /(\d+)-(\d+)\s*miles?\s*(?:@|at|easy|pace)/,
            `${specificDistance} miles `
        );
    }

    // Pattern 10: "30-60 sec" or "30sec-3min" (time ranges)
    const timeRangeMatch = updatedStructure.match(/(\d+)-(\d+)\s*(?:sec|seconds?|min|minutes?)/);
    if (timeRangeMatch && !updatedStructure.match(/\d+-\d+\s*x\s*\d+/)) {
        const minTime = parseInt(timeRangeMatch[1], 10);
        const maxTime = parseInt(timeRangeMatch[2], 10);
        const unit = timeRangeMatch[0].includes('sec') ? 'sec' : 'min';
        const specificTime = calculateSpecific(minTime, maxTime, weekNumber, totalWeeks);
        updatedStructure = updatedStructure.replace(
            /(\d+)-(\d+)\s*(?:sec|seconds?|min|minutes?)/,
            `${specificTime} ${unit}`
        );
    }

    return updatedStructure;
}

/**
 * Convert vague structures in an object (for workout objects with nested structures)
 * @param {object} workout - Workout object that may have vague structures
 * @param {number|null} weekNumber - Current week number
 * @param {number|null} totalWeeks - Total weeks in plan
 * @returns {object} - Workout object with converted structures
 */
export function convertWorkoutStructures(workout, weekNumber = null, totalWeeks = null) {
    if (!workout) return workout;

    const converted = { ...workout };

    // Convert main structure field
    if (converted.structure && typeof converted.structure === 'string') {
        converted.structure = convertVagueStructureToSpecific(converted.structure, weekNumber, totalWeeks);
    }

    // Convert nested workout object structures
    if (converted.workout) {
        converted.workout = { ...converted.workout };
        ['warmup', 'main', 'recovery', 'cooldown', 'repeat'].forEach(field => {
            if (converted.workout[field] && typeof converted.workout[field] === 'string') {
                converted.workout[field] = convertVagueStructureToSpecific(
                    converted.workout[field], 
                    weekNumber, 
                    totalWeeks
                );
            }
        });
    }

    return converted;
}













