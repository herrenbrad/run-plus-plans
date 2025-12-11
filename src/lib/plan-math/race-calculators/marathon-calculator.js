/**
 * Marathon Plan Calculator
 *
 * Race-specific parameters for Marathon training plans:
 * - Long runs up to 20-23 miles (20 mile minimum REQUIRED)
 * - Heavy endurance focus
 * - Extended build cycles
 * - Most complex periodization
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
 * Marathon-specific constants
 */
export const RACE_PARAMS = {
    distance: 'Marathon',
    distanceMiles: 26.2,

    // Peak mileage cap - even for experienced marathoners
    peakWeeklyMileageCap: 75,

    // Long run constraints - CRITICAL for marathon success
    longRunMax: 23,           // Max long run (elite level)
    longRunFloor: 20,         // MINIMUM long run - NON-NEGOTIABLE for marathon
    longRunPercentage: 0.35,  // Long run as % of weekly mileage

    // Minimum preparation target (warning threshold)
    minimumLongRunTarget: 18,

    // Quality workout percentages of weekly mileage
    // Marathon has more tempo focus, less intervals
    workoutPercentages: {
        tempo: 0.16,      // Threshold work
        interval: 0.12,   // VO2max intervals (less emphasis)
        hill: 0.10        // Strength/power (less emphasis)
    },

    // Quality workout bounds
    workoutBounds: {
        tempo: { min: 4, max: 10 },
        interval: { min: 4, max: 8 },
        hill: { min: 4, max: 7 }
    }
};

/**
 * Calculate peak weekly mileage for Marathon
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

    logger.info(`Marathon Peak mileage: ${currentWeeklyMileage} → ${peak} mpw (${buildCycles} cycles, ${(growthRate * 100).toFixed(1)}% rate)`);
    return peak;
}

/**
 * Calculate long run max for Marathon
 * This is the most critical calculation for marathon training
 * EVERY marathon plan MUST include at least one 20-miler
 *
 * @param {number} currentLongRun - Current long run distance
 * @param {number} totalWeeks - Plan length
 * @param {number} peakWeeklyMileage - Calculated peak mileage
 * @returns {number} Max long run distance
 */
export function calculateLongRunMax(currentLongRun, totalWeeks, peakWeeklyMileage) {
    const phases = calculatePhaseDistribution(totalWeeks);

    // For marathon, we MUST reach at least 20 miles
    // Calculate what growth rate is needed
    const gapTo20 = Math.max(0, 20 - currentLongRun);
    const requiredGrowthPerWeek = gapTo20 / phases.totalBuildWeeks;

    // Use required growth if > safe, but cap at aggressive growth
    const safeGrowthPerWeek = 0.5;
    const aggressiveGrowthPerWeek = 0.75;
    const effectiveGrowthRate = Math.min(Math.max(safeGrowthPerWeek, requiredGrowthPerWeek), aggressiveGrowthPerWeek);

    const theoreticalMax = currentLongRun + (phases.totalBuildWeeks * effectiveGrowthRate);

    // Apply caps
    const percentageCap = peakWeeklyMileage * RACE_PARAMS.longRunPercentage;
    const longRunMax = Math.min(
        Math.round(theoreticalMax),
        RACE_PARAMS.longRunMax,
        Math.round(percentageCap)
    );

    // Log warnings for suboptimal situations
    if (longRunMax < RACE_PARAMS.minimumLongRunTarget) {
        logger.warn(`⚠️ Marathon Plan: Can only reach ${longRunMax} mile long run, typically needs ${RACE_PARAMS.minimumLongRunTarget}+ miles. User may need higher base mileage or longer plan.`);
    }

    if (requiredGrowthPerWeek > aggressiveGrowthPerWeek) {
        logger.warn(`⚠️ Marathon Plan: Required growth rate (${requiredGrowthPerWeek.toFixed(2)} mi/wk) exceeds safe maximum. Plan may be too short for current fitness.`);
    }

    logger.info(`Marathon Long run: ${currentLongRun} → ${longRunMax} miles (growth rate: ${effectiveGrowthRate.toFixed(2)} mi/wk)`);
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
    const bounds = RACE_PARAMS.workoutBounds[workoutType] || { min: 4, max: 8 };
    const distance = weeklyMileage * percent;
    return Math.round(Math.min(Math.max(distance, bounds.min), bounds.max));
}

/**
 * Generate complete Marathon training plan math
 * @param {Object} inputs - User inputs
 * @returns {Object} Complete plan with week-by-week numbers
 */
export function generatePlan(inputs) {
    const { currentWeeklyMileage, currentLongRun, totalWeeks, experienceLevel } = inputs;

    logger.info(`\n📊 MARATHON PLAN CALCULATOR`);
    logger.info(`Input: ${currentWeeklyMileage} mpw, ${currentLongRun} mi long run, ${totalWeeks} weeks`);

    // Calculate base targets
    const basePeakMileage = calculatePeakMileage(currentWeeklyMileage, totalWeeks);
    const baseLongRunMax = calculateLongRunMax(currentLongRun, totalWeeks, basePeakMileage);

    // Apply experience level adjustments
    // NOTE: For marathon, the floor of 20 miles is ENFORCED regardless of experience
    const adjusted = applyExperienceAdjustments(
        basePeakMileage,
        baseLongRunMax,
        experienceLevel,
        RACE_PARAMS.longRunFloor  // 20 miles - non-negotiable
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

    // Verify 20-miler exists
    const maxLongRun = Math.max(...weeks.map(w => w.longRun));
    if (maxLongRun < 20) {
        logger.error(`❌ CRITICAL: Marathon plan does not include 20-miler! Max long run is only ${maxLongRun} miles.`);
    } else {
        logger.info(`✅ Marathon plan includes ${maxLongRun}-mile long run`);
    }

    return {
        raceDistance: 'Marathon',
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
