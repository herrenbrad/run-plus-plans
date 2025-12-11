/**
 * 5K Plan Calculator
 *
 * Race-specific parameters for 5K training plans:
 * - Shorter long runs (max 10-12 miles)
 * - Higher intensity focus (VO2max, speed)
 * - Shorter build cycles
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
 * 5K-specific constants
 */
export const RACE_PARAMS = {
    distance: '5K',
    distanceMiles: 3.1,

    // Peak mileage cap - even elite 5K runners rarely need more
    peakWeeklyMileageCap: 45,

    // Long run constraints
    longRunMax: 12,           // Max long run needed for 5K
    longRunFloor: 5,          // Minimum long run (absolute floor)
    longRunPercentage: 0.30,  // Long run as % of weekly mileage

    // Minimum preparation target (warning threshold)
    minimumLongRunTarget: 6,

    // Quality workout percentages of weekly mileage
    workoutPercentages: {
        tempo: 0.18,      // Threshold work
        interval: 0.12,   // VO2max intervals
        hill: 0.12        // Strength/power
    },

    // Quality workout bounds
    workoutBounds: {
        tempo: { min: 3, max: 6 },
        interval: { min: 3, max: 5 },
        hill: { min: 3, max: 5 }
    }
};

/**
 * Calculate peak weekly mileage for 5K
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

    logger.info(`5K Peak mileage: ${currentWeeklyMileage} → ${peak} mpw (${buildCycles} cycles, ${(growthRate * 100).toFixed(1)}% rate)`);
    return peak;
}

/**
 * Calculate long run max for 5K
 * @param {number} currentLongRun - Current long run distance
 * @param {number} totalWeeks - Plan length
 * @param {number} peakWeeklyMileage - Calculated peak mileage
 * @returns {number} Max long run distance
 */
export function calculateLongRunMax(currentLongRun, totalWeeks, peakWeeklyMileage) {
    const phases = calculatePhaseDistribution(totalWeeks);

    // Safe growth rate: ~0.5 miles per week
    const safeGrowthPerWeek = 0.5;
    const theoreticalMax = currentLongRun + (phases.totalBuildWeeks * safeGrowthPerWeek);

    // Apply caps
    const percentageCap = peakWeeklyMileage * RACE_PARAMS.longRunPercentage;
    const longRunMax = Math.min(
        Math.round(theoreticalMax),
        RACE_PARAMS.longRunMax,
        Math.round(percentageCap)
    );

    if (longRunMax < RACE_PARAMS.minimumLongRunTarget) {
        logger.warn(`⚠️ 5K Plan: Can only reach ${longRunMax} mile long run, typically needs ${RACE_PARAMS.minimumLongRunTarget}+ miles`);
    }

    logger.info(`5K Long run: ${currentLongRun} → ${longRunMax} miles`);
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
    const bounds = RACE_PARAMS.workoutBounds[workoutType] || { min: 3, max: 5 };
    const distance = weeklyMileage * percent;
    return Math.round(Math.min(Math.max(distance, bounds.min), bounds.max));
}

/**
 * Generate complete 5K training plan math
 * @param {Object} inputs - User inputs
 * @returns {Object} Complete plan with week-by-week numbers
 */
export function generatePlan(inputs) {
    const { currentWeeklyMileage, currentLongRun, totalWeeks, experienceLevel } = inputs;

    logger.info(`\n📊 5K PLAN CALCULATOR`);
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
        raceDistance: '5K',
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
