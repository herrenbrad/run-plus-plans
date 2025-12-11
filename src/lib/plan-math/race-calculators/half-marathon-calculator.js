/**
 * Half Marathon Plan Calculator
 *
 * Race-specific parameters for Half Marathon training plans:
 * - Longer long runs (max 15 miles) - allows over-distance runs (14-15 miles) for confidence building
 * - Strong threshold focus
 * - Balance of endurance and speed
 */

import logger from '../../../utils/logger.js';
import {
    calculatePhaseDistribution,
    calculateWeeklyGrowthRate,
    calculateWeeklyMileage,
    calculateWeeklyLongRun,
    applyExperienceAdjustments,
    getPhaseForWeek
} from '../base-calculator.js';

/**
 * Half Marathon-specific constants
 */
export const RACE_PARAMS = {
    distance: 'Half Marathon',
    distanceMiles: 13.1,

    // Peak mileage cap
    peakWeeklyMileageCap: 60,

    // Long run constraints
    longRunMax: 15,           // Max long run - allows over-distance runs (14-15 miles) for confidence building
    longRunFloor: 12,         // Minimum long run - MUST hit this for proper prep
    longRunPercentage: 0.35,  // Long run as % of weekly mileage (increased slightly to allow longer runs)

    // Minimum preparation target (warning threshold)
    minimumLongRunTarget: 12,

    // Quality workout percentages of weekly mileage
    workoutPercentages: {
        tempo: 0.18,      // Threshold work - key for half marathon
        interval: 0.14,   // VO2max intervals
        hill: 0.12        // Strength/power
    },

    // Quality workout bounds
    workoutBounds: {
        tempo: { min: 4, max: 8 },
        interval: { min: 4, max: 7 },
        hill: { min: 4, max: 6 }
    }
};

/**
 * Calculate peak weekly mileage for Half Marathon
 * @param {number} currentWeeklyMileage - Current weekly volume
 * @param {number} totalWeeks - Plan length
 * @returns {number} Peak weekly mileage
 */
export function calculatePeakMileage(currentWeeklyMileage, totalWeeks) {
    const phases = calculatePhaseDistribution(totalWeeks);
    const growthRate = calculateWeeklyGrowthRate(totalWeeks);
    const buildCycles = Math.floor(phases.totalBuildWeeks / 3);
    const effectiveGrowthWeeks = buildCycles * 2;

    const theoreticalPeak = currentWeeklyMileage * Math.pow(1 + growthRate, effectiveGrowthWeeks);
    const peak = Math.min(Math.round(theoreticalPeak), RACE_PARAMS.peakWeeklyMileageCap);

    logger.info(`Half Marathon Peak mileage: ${currentWeeklyMileage} → ${peak} mpw (${buildCycles} cycles, ${(growthRate * 100).toFixed(1)}% rate)`);
    return peak;
}

/**
 * Calculate long run max for Half Marathon
 * @param {number} currentLongRun - Current long run distance
 * @param {number} totalWeeks - Plan length
 * @param {number} peakWeeklyMileage - Calculated peak mileage
 * @returns {number} Max long run distance
 */
export function calculateLongRunMax(currentLongRun, totalWeeks, peakWeeklyMileage) {
    const phases = calculatePhaseDistribution(totalWeeks);

    // Calculate gap to minimum target
    const gapToTarget = Math.max(0, RACE_PARAMS.minimumLongRunTarget - currentLongRun);

    // Safe growth rate, but increase if needed to hit minimum
    const safeGrowthPerWeek = 0.5;
    const requiredGrowthPerWeek = gapToTarget / phases.totalBuildWeeks;
    const effectiveGrowthRate = Math.min(Math.max(safeGrowthPerWeek, requiredGrowthPerWeek), 0.75);

    const theoreticalMax = currentLongRun + (phases.totalBuildWeeks * effectiveGrowthRate);

    // Apply caps
    const percentageCap = peakWeeklyMileage * RACE_PARAMS.longRunPercentage;
    const longRunMax = Math.min(
        Math.round(theoreticalMax),
        RACE_PARAMS.longRunMax,
        Math.round(percentageCap)
    );

    if (longRunMax < RACE_PARAMS.minimumLongRunTarget) {
        logger.warn(`⚠️ Half Marathon Plan: Can only reach ${longRunMax} mile long run, typically needs ${RACE_PARAMS.minimumLongRunTarget}+ miles. User may need higher base mileage or longer plan.`);
    }

    logger.info(`Half Marathon Long run: ${currentLongRun} → ${longRunMax} miles (growth rate: ${effectiveGrowthRate.toFixed(2)} mi/wk)`);
    return longRunMax;
}

/**
 * Calculate quality workout distance
 * @param {number} weeklyMileage - This week's mileage
 * @param {string} workoutType - 'tempo', 'interval', or 'hill'
 * @returns {number} Workout distance
 */
export function calculateWorkoutDistance(weeklyMileage, workoutType) {
    const percent = RACE_PARAMS.workoutPercentages[workoutType] || 0.15;
    const bounds = RACE_PARAMS.workoutBounds[workoutType] || { min: 4, max: 7 };
    const distance = weeklyMileage * percent;
    return Math.round(Math.min(Math.max(distance, bounds.min), bounds.max));
}

/**
 * Generate complete Half Marathon training plan math
 * @param {Object} inputs - User inputs
 * @returns {Object} Complete plan with week-by-week numbers
 */
export function generatePlan(inputs) {
    const { currentWeeklyMileage, currentLongRun, totalWeeks, experienceLevel } = inputs;

    logger.info(`\n📊 HALF MARATHON PLAN CALCULATOR`);
    logger.info(`Input: ${currentWeeklyMileage} mpw, ${currentLongRun} mi long run, ${totalWeeks} weeks`);

    // Calculate base targets
    const basePeakMileage = calculatePeakMileage(currentWeeklyMileage, totalWeeks);
    const baseLongRunMax = calculateLongRunMax(currentLongRun, totalWeeks, basePeakMileage);

    // Apply experience level adjustments
    const adjusted = applyExperienceAdjustments(
        basePeakMileage,
        baseLongRunMax,
        experienceLevel,
        RACE_PARAMS.longRunFloor
    );

    const phases = calculatePhaseDistribution(totalWeeks);

    // Generate week-by-week plan
    const weeks = [];
    for (let week = 1; week <= totalWeeks; week++) {
        const weeklyMileage = calculateWeeklyMileage(week, currentWeeklyMileage, adjusted.peakMileage, totalWeeks);
        const longRun = calculateWeeklyLongRun(week, currentLongRun, adjusted.longRunMax, totalWeeks);
        const phase = getPhaseForWeek(week, phases);

        weeks.push({
            weekNumber: week,
            phase,
            weeklyMileage,
            longRun,
            tempoDistance: calculateWorkoutDistance(weeklyMileage, 'tempo'),
            intervalDistance: calculateWorkoutDistance(weeklyMileage, 'interval'),
            hillDistance: calculateWorkoutDistance(weeklyMileage, 'hill')
        });
    }

    return {
        raceDistance: 'Half Marathon',
        inputs,
        experienceLevel: adjusted,
        targets: {
            peakWeeklyMileage: adjusted.peakMileage,
            longRunMax: adjusted.longRunMax,
            growthRate: calculateWeeklyGrowthRate(totalWeeks)
        },
        phases,
        weeks,
        raceParams: RACE_PARAMS
    };
}

export default {
    RACE_PARAMS,
    calculatePeakMileage,
    calculateLongRunMax,
    calculateWorkoutDistance,
    generatePlan
};
