/**
 * Base Calculator - Shared Formulas
 *
 * Contains race-agnostic calculations used by all race distance calculators:
 * - Phase distribution (Base, Build, Peak, Taper)
 * - Weekly growth rates
 * - Periodization patterns (3-1 build/recovery)
 * - Experience level adjustments
 */

import logger from '../../utils/logger.js';

/**
 * Experience level multipliers
 * Applied AFTER race-specific calculations
 */
export const EXPERIENCE_MULTIPLIERS = {
    beginner: {
        peakMileage: 0.80,    // 20% lower peak (more conservative)
        longRunMax: 0.95,     // 5% shorter long runs (but never below race minimum)
        description: 'Conservative approach - prioritizes consistency over volume'
    },
    intermediate: {
        peakMileage: 1.00,    // Standard targets
        longRunMax: 1.00,     // Standard long runs
        description: 'Balanced approach - standard progression'
    },
    advanced: {
        peakMileage: 1.15,    // 15% higher peak (more aggressive)
        longRunMax: 1.10,     // 10% longer long runs
        description: 'Aggressive approach - maximizes training stimulus'
    }
};

/**
 * Calculate phase distribution by plan length
 * @param {number} totalWeeks - Total plan length
 * @returns {Object} Phase breakdown with week ranges
 */
export function calculatePhaseDistribution(totalWeeks) {
    // Taper is always 2-3 weeks regardless of plan length
    const taperWeeks = totalWeeks >= 20 ? 3 : 2;
    const trainingWeeks = totalWeeks - taperWeeks;

    // Phase percentages vary by plan length
    let basePercent, buildPercent, peakPercent;

    if (totalWeeks <= 14) {
        // Short plans: minimize base, maximize build
        basePercent = 0.25;
        buildPercent = 0.55;
        peakPercent = 0.20;
    } else if (totalWeeks >= 24) {
        // Long plans: extended base for aerobic development
        basePercent = 0.35;
        buildPercent = 0.45;
        peakPercent = 0.20;
    } else {
        // Medium plans: balanced approach
        basePercent = 0.30;
        buildPercent = 0.50;
        peakPercent = 0.20;
    }

    const baseWeeks = Math.round(trainingWeeks * basePercent);
    const peakWeeks = Math.round(trainingWeeks * peakPercent);
    const buildWeeks = trainingWeeks - baseWeeks - peakWeeks;

    return {
        base: { weeks: baseWeeks, startWeek: 1, endWeek: baseWeeks },
        build: { weeks: buildWeeks, startWeek: baseWeeks + 1, endWeek: baseWeeks + buildWeeks },
        peak: { weeks: peakWeeks, startWeek: baseWeeks + buildWeeks + 1, endWeek: baseWeeks + buildWeeks + peakWeeks },
        taper: { weeks: taperWeeks, startWeek: totalWeeks - taperWeeks + 1, endWeek: totalWeeks },
        totalBuildWeeks: trainingWeeks
    };
}

/**
 * Calculate adaptive weekly growth rate based on plan length
 * @param {number} totalWeeks - Total plan length
 * @returns {number} Weekly growth rate (decimal)
 */
export function calculateWeeklyGrowthRate(totalWeeks) {
    const MAX_WEEKLY_GROWTH = 0.10;  // 10% - the standard safe max
    const MIN_WEEKLY_GROWTH = 0.04;  // 4% - for very long plans

    if (totalWeeks <= 12) {
        return MAX_WEEKLY_GROWTH;
    } else if (totalWeeks >= 28) {
        return MIN_WEEKLY_GROWTH;
    } else {
        // Linear interpolation between 12 and 28 weeks
        const range = 28 - 12;
        const position = (totalWeeks - 12) / range;
        return MAX_WEEKLY_GROWTH - (position * (MAX_WEEKLY_GROWTH - MIN_WEEKLY_GROWTH));
    }
}

/**
 * Calculate weekly mileage for a specific week using 3-1 periodization
 * @param {number} weekNumber - Week in plan (1-indexed)
 * @param {number} startingMileage - Week 1 mileage
 * @param {number} peakMileage - Target peak mileage
 * @param {number} totalWeeks - Total plan length
 * @returns {number} Mileage for this week
 */
export function calculateWeeklyMileage(weekNumber, startingMileage, peakMileage, totalWeeks) {
    const phases = calculatePhaseDistribution(totalWeeks);

    // During taper: progressive reduction
    if (weekNumber >= phases.taper.startWeek) {
        const taperWeek = weekNumber - phases.taper.startWeek + 1;
        const taperPercent = 1 - (taperWeek * 0.20);
        return Math.round(peakMileage * Math.max(taperPercent, 0.40));
    }

    // During build phases
    const buildWeekNumber = weekNumber;
    const totalBuildWeeks = phases.totalBuildWeeks;
    const progressPercent = buildWeekNumber / totalBuildWeeks;
    const linearMileage = startingMileage + ((peakMileage - startingMileage) * progressPercent);

    // Apply 3-week cycle: 2 build, 1 recovery
    const positionInCycle = (buildWeekNumber - 1) % 3;

    if (positionInCycle === 2) {
        // Recovery week: -10% from target
        return Math.round(linearMileage * 0.90);
    } else {
        return Math.round(linearMileage);
    }
}

/**
 * Calculate long run distance for a specific week
 * @param {number} weekNumber - Week in plan (1-indexed)
 * @param {number} startingLongRun - Week 1 long run
 * @param {number} longRunMax - Target max long run
 * @param {number} totalWeeks - Total plan length
 * @returns {number} Long run distance for this week
 */
export function calculateWeeklyLongRun(weekNumber, startingLongRun, longRunMax, totalWeeks) {
    const phases = calculatePhaseDistribution(totalWeeks);

    // During taper: reduced long runs
    if (weekNumber >= phases.taper.startWeek) {
        const taperWeek = weekNumber - phases.taper.startWeek + 1;
        if (taperWeek === 1) return Math.round(longRunMax * 0.65);
        if (taperWeek === 2) return Math.round(longRunMax * 0.50);
        return Math.round(longRunMax * 0.35);
    }

    // During build phases
    const buildWeekNumber = weekNumber;
    const totalBuildWeeks = phases.totalBuildWeeks;
    const progressPercent = buildWeekNumber / totalBuildWeeks;
    const linearLongRun = startingLongRun + ((longRunMax - startingLongRun) * progressPercent);

    // Apply 3-week cycle: build, build+1, recover
    const positionInCycle = (buildWeekNumber - 1) % 3;

    if (positionInCycle === 0) {
        return Math.round(linearLongRun);
    } else if (positionInCycle === 1) {
        return Math.min(Math.round(linearLongRun * 1.08), longRunMax);
    } else {
        return Math.round(Math.max(linearLongRun - 2, linearLongRun * 0.85));
    }
}

/**
 * Apply experience level adjustments to calculated targets
 * @param {number} basePeakMileage - Calculated peak mileage before adjustment
 * @param {number} baseLongRunMax - Calculated long run max before adjustment
 * @param {string} experienceLevel - 'beginner', 'intermediate', or 'advanced'
 * @param {number} longRunFloor - Minimum long run for this race distance (non-negotiable)
 * @returns {Object} Adjusted values
 */
export function applyExperienceAdjustments(basePeakMileage, baseLongRunMax, experienceLevel, longRunFloor) {
    const expLevel = experienceLevel || 'intermediate';
    const multipliers = EXPERIENCE_MULTIPLIERS[expLevel] || EXPERIENCE_MULTIPLIERS.intermediate;

    const peakMileage = Math.round(basePeakMileage * multipliers.peakMileage);
    const adjustedLongRun = Math.round(baseLongRunMax * multipliers.longRunMax);
    const longRunMax = Math.max(adjustedLongRun, longRunFloor);

    if (adjustedLongRun < longRunFloor) {
        logger.info(`Long run floor applied: ${adjustedLongRun} raised to ${longRunFloor} (race minimum)`);
    }

    return {
        peakMileage,
        longRunMax,
        experienceLevel: expLevel,
        multipliers,
        basePeakMileage,
        baseLongRunMax
    };
}

/**
 * Get phase name for a given week number
 * @param {number} weekNumber - Week number (1-indexed)
 * @param {Object} phases - Phase distribution object
 * @returns {string} Phase name
 */
export function getPhaseForWeek(weekNumber, phases) {
    if (weekNumber <= phases.base.endWeek) return 'base';
    if (weekNumber <= phases.build.endWeek) return 'build';
    if (weekNumber <= phases.peak.endWeek) return 'peak';
    return 'taper';
}

export default {
    EXPERIENCE_MULTIPLIERS,
    calculatePhaseDistribution,
    calculateWeeklyGrowthRate,
    calculateWeeklyMileage,
    calculateWeeklyLongRun,
    applyExperienceAdjustments,
    getPhaseForWeek
};
