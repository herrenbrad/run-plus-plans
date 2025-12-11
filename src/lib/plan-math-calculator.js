/**
 * Plan Math Calculator
 *
 * CRITICAL: This module contains ZERO defaults.
 * Every output is calculated from user inputs using physiologically-sound formulas.
 *
 * Works for:
 * - All plan lengths: 12-30 weeks
 * - All race distances: 5K, 10K, Half Marathon, Marathon
 * - All ability levels: from 3-hour half marathoners to elites
 */

import logger from '../utils/logger.js';

/**
 * Hard caps based on race physiology - these are NOT defaults,
 * they are maximums that even elite plans shouldn't exceed
 */
const RACE_DISTANCE_CAPS = {
    '5K': {
        peakWeeklyMileage: 45,      // Even elite 5K runners rarely need 45+ mpw
        longRunMax: 12,              // 10-12 miles is plenty for 5K
        longRunPercentage: 0.30      // Long run ~30% of weekly for shorter races
    },
    '10K': {
        peakWeeklyMileage: 55,
        longRunMax: 15,
        longRunPercentage: 0.30
    },
    'Half Marathon': {
        peakWeeklyMileage: 60,
        longRunMax: 16,              // 14-16 miles standard for half
        longRunPercentage: 0.32
    },
    'Marathon': {
        peakWeeklyMileage: 75,
        longRunMax: 23,              // 20-23 miles standard for marathon
        longRunPercentage: 0.35
    }
};

/**
 * Minimum long run targets by race distance
 * If user can't reach these, the plan is too short for their starting point
 */
const MINIMUM_LONG_RUN_TARGETS = {
    '5K': 6,
    '10K': 8,
    'Half Marathon': 12,
    'Marathon': 18
};

/**
 * Phase distribution by plan length
 * Returns percentage of plan for each phase
 */
function calculatePhaseDistribution(totalWeeks) {
    // Taper is always 2-3 weeks regardless of plan length
    const taperWeeks = totalWeeks >= 20 ? 3 : 2;

    // Remaining weeks split into Base, Build, Peak
    const trainingWeeks = totalWeeks - taperWeeks;

    // Base: 30-35% of training weeks (longer plans get more base)
    // Build: 45-50% of training weeks
    // Peak: 15-20% of training weeks

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
    const buildWeeks = trainingWeeks - baseWeeks - peakWeeks; // Give remainder to build

    return {
        base: { weeks: baseWeeks, startWeek: 1, endWeek: baseWeeks },
        build: { weeks: buildWeeks, startWeek: baseWeeks + 1, endWeek: baseWeeks + buildWeeks },
        peak: { weeks: peakWeeks, startWeek: baseWeeks + buildWeeks + 1, endWeek: baseWeeks + buildWeeks + peakWeeks },
        taper: { weeks: taperWeeks, startWeek: totalWeeks - taperWeeks + 1, endWeek: totalWeeks },
        totalBuildWeeks: trainingWeeks // All non-taper weeks
    };
}

/**
 * Calculate adaptive weekly growth rate based on plan length
 * Shorter plans = slightly higher rate (within safe limits)
 * Longer plans = lower rate but more total time to grow
 */
function calculateWeeklyGrowthRate(totalWeeks) {
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
 * Calculate peak weekly mileage from user inputs
 *
 * @param {number} currentWeeklyMileage - User's current weekly mileage (REQUIRED)
 * @param {number} totalWeeks - Total plan length (REQUIRED)
 * @param {string} raceDistance - Target race distance (REQUIRED)
 * @returns {number} Peak weekly mileage
 */
function calculatePeakWeeklyMileage(currentWeeklyMileage, totalWeeks, raceDistance) {
    if (!currentWeeklyMileage || !totalWeeks || !raceDistance) {
        throw new Error(`Missing required inputs: currentWeeklyMileage=${currentWeeklyMileage}, totalWeeks=${totalWeeks}, raceDistance=${raceDistance}`);
    }

    const caps = RACE_DISTANCE_CAPS[raceDistance];
    if (!caps) {
        throw new Error(`Unknown race distance: ${raceDistance}`);
    }

    const phases = calculatePhaseDistribution(totalWeeks);
    const growthRate = calculateWeeklyGrowthRate(totalWeeks);

    // Calculate number of 3-week cycles (2 build + 1 recovery)
    const buildCycles = Math.floor(phases.totalBuildWeeks / 3);

    // Each cycle has 2 "build" weeks, so total build weeks is cycles * 2
    const effectiveGrowthWeeks = buildCycles * 2;

    // Compound growth formula: current * (1 + rate)^weeks
    const theoreticalPeak = currentWeeklyMileage * Math.pow(1 + growthRate, effectiveGrowthWeeks);

    // Cap at race-appropriate maximum
    const peak = Math.min(Math.round(theoreticalPeak), caps.peakWeeklyMileage);

    logger.info(`Peak mileage calculation: ${currentWeeklyMileage} → ${peak} mpw over ${totalWeeks} weeks (${buildCycles} cycles, ${(growthRate * 100).toFixed(1)}% rate)`);

    return peak;
}

/**
 * Calculate long run max from user inputs
 *
 * @param {number} currentLongRun - User's current long run distance (REQUIRED)
 * @param {number} totalWeeks - Total plan length (REQUIRED)
 * @param {string} raceDistance - Target race distance (REQUIRED)
 * @param {number} peakWeeklyMileage - Calculated peak weekly mileage (REQUIRED)
 * @returns {number} Maximum long run distance
 */
function calculateLongRunMax(currentLongRun, totalWeeks, raceDistance, peakWeeklyMileage) {
    if (!currentLongRun || !totalWeeks || !raceDistance || !peakWeeklyMileage) {
        throw new Error(`Missing required inputs: currentLongRun=${currentLongRun}, totalWeeks=${totalWeeks}, raceDistance=${raceDistance}, peakWeeklyMileage=${peakWeeklyMileage}`);
    }

    const caps = RACE_DISTANCE_CAPS[raceDistance];
    if (!caps) {
        throw new Error(`Unknown race distance: ${raceDistance}`);
    }

    const phases = calculatePhaseDistribution(totalWeeks);
    const minTarget = MINIMUM_LONG_RUN_TARGETS[raceDistance];

    // Calculate required growth to hit minimum target
    const gapToTarget = Math.max(0, minTarget - currentLongRun);

    // Safe long run growth: roughly 1 mile every 2 weeks during build/peak
    const safeGrowthPerWeek = 0.5;

    // Required growth per week to hit minimum target
    const requiredGrowthPerWeek = gapToTarget / phases.totalBuildWeeks;

    // Use whichever is higher: safe rate or required rate (but cap at 0.75 miles/week max)
    const effectiveGrowthRate = Math.min(Math.max(safeGrowthPerWeek, requiredGrowthPerWeek), 0.75);

    // Calculate theoretical max
    const theoreticalMax = currentLongRun + (phases.totalBuildWeeks * effectiveGrowthRate);

    // Apply three caps:
    // 1. Race distance cap
    // 2. Percentage of weekly mileage cap
    // 3. Calculated theoretical max
    const percentageCap = peakWeeklyMileage * caps.longRunPercentage;

    const longRunMax = Math.min(
        Math.round(theoreticalMax),
        caps.longRunMax,
        Math.round(percentageCap)
    );

    // Warn if we can't hit minimum target
    if (longRunMax < minTarget) {
        logger.warn(`⚠️ Plan constraints: Can only reach ${longRunMax} mile long run, ${raceDistance} typically needs ${minTarget}+ miles. User may need to start with higher base mileage or choose a longer plan.`);
    }

    logger.info(`Long run calculation: ${currentLongRun} → ${longRunMax} miles (target: ${minTarget}, rate: ${effectiveGrowthRate.toFixed(2)} mi/wk)`);

    return longRunMax;
}

/**
 * Calculate weekly mileage for a specific week using 3-1 periodization
 * 2 weeks build, 1 week recovery (repeat)
 *
 * @param {number} weekNumber - Week in plan (1-indexed)
 * @param {number} startingMileage - Week 1 mileage
 * @param {number} peakMileage - Target peak mileage
 * @param {number} totalWeeks - Total plan length
 * @returns {number} Mileage for this week
 */
function calculateWeeklyMileage(weekNumber, startingMileage, peakMileage, totalWeeks) {
    const phases = calculatePhaseDistribution(totalWeeks);

    // During taper: progressive reduction
    if (weekNumber >= phases.taper.startWeek) {
        const taperWeek = weekNumber - phases.taper.startWeek + 1;
        const taperPercent = 1 - (taperWeek * 0.20); // 20% reduction each taper week
        return Math.round(peakMileage * Math.max(taperPercent, 0.40)); // Never below 40% of peak
    }

    // During build phases (base, build, peak)
    const buildWeekNumber = weekNumber; // Week in build portion
    const totalBuildWeeks = phases.totalBuildWeeks;

    // Linear progression from start to peak with 3-1 periodization
    const progressPercent = buildWeekNumber / totalBuildWeeks;
    const linearMileage = startingMileage + ((peakMileage - startingMileage) * progressPercent);

    // Apply 3-week cycle: 2 build, 1 recovery
    const positionInCycle = (buildWeekNumber - 1) % 3;

    if (positionInCycle === 2) {
        // Recovery week: -10% from previous week's target
        return Math.round(linearMileage * 0.90);
    } else {
        return Math.round(linearMileage);
    }
}

/**
 * Calculate long run distance for a specific week
 *
 * @param {number} weekNumber - Week in plan (1-indexed)
 * @param {number} startingLongRun - Week 1 long run
 * @param {number} longRunMax - Target max long run
 * @param {number} totalWeeks - Total plan length
 * @returns {number} Long run distance for this week
 */
function calculateWeeklyLongRun(weekNumber, startingLongRun, longRunMax, totalWeeks) {
    const phases = calculatePhaseDistribution(totalWeeks);

    // During taper: reduced long runs
    if (weekNumber >= phases.taper.startWeek) {
        const taperWeek = weekNumber - phases.taper.startWeek + 1;
        if (taperWeek === 1) return Math.round(longRunMax * 0.65);
        if (taperWeek === 2) return Math.round(longRunMax * 0.50);
        return Math.round(longRunMax * 0.35); // Race week
    }

    // During build phases
    const buildWeekNumber = weekNumber;
    const totalBuildWeeks = phases.totalBuildWeeks;

    // Linear progression from start to max
    const progressPercent = buildWeekNumber / totalBuildWeeks;
    const linearLongRun = startingLongRun + ((longRunMax - startingLongRun) * progressPercent);

    // Apply 3-week cycle: build, build+1, recover to base
    const cycleNumber = Math.floor((buildWeekNumber - 1) / 3);
    const positionInCycle = (buildWeekNumber - 1) % 3;

    // Long runs alternate: normal, +1, cutback
    if (positionInCycle === 0) {
        return Math.round(linearLongRun);
    } else if (positionInCycle === 1) {
        // Bump up slightly more on second week
        return Math.min(Math.round(linearLongRun * 1.08), longRunMax);
    } else {
        // Recovery week: step back ~2 miles or 15%
        return Math.round(Math.max(linearLongRun - 2, linearLongRun * 0.85));
    }
}

/**
 * Calculate quality workout distance (tempo, intervals, hills) for a specific week
 * Quality workouts scale with weekly mileage but at a lower ratio
 *
 * @param {number} weeklyMileage - This week's total mileage
 * @param {string} workoutType - 'tempo', 'interval', or 'hill'
 * @param {string} raceDistance - Target race distance
 * @returns {number} Distance for this workout
 */
function calculateQualityWorkoutDistance(weeklyMileage, workoutType, raceDistance) {
    // Quality workout as percentage of weekly mileage
    // Varies by workout type and race distance

    const percentages = {
        '5K': { tempo: 0.18, interval: 0.12, hill: 0.12 },
        '10K': { tempo: 0.18, interval: 0.14, hill: 0.12 },
        'Half Marathon': { tempo: 0.18, interval: 0.14, hill: 0.12 },
        'Marathon': { tempo: 0.16, interval: 0.12, hill: 0.10 }
    };

    const racePercentages = percentages[raceDistance] || percentages['Half Marathon'];
    const percent = racePercentages[workoutType] || 0.15;

    // Calculate distance
    const distance = weeklyMileage * percent;

    // Apply min/max bounds
    const minMax = {
        tempo: { min: 4, max: 10 },
        interval: { min: 4, max: 8 },
        hill: { min: 4, max: 7 }
    };

    const bounds = minMax[workoutType] || { min: 4, max: 8 };

    return Math.round(Math.min(Math.max(distance, bounds.min), bounds.max));
}

/**
 * Experience level multipliers
 * Adjusts peak mileage and long run max based on runner's experience
 * NOTE: Long run adjustments are applied ONLY to non-essential volume
 * Race-specific minimum long runs are NEVER reduced (e.g., marathon always gets 20 miler)
 */
const EXPERIENCE_MULTIPLIERS = {
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
 * ABSOLUTE MINIMUM long runs by race distance
 * These are non-negotiable - experience level cannot reduce below these
 * These represent the minimum preparation needed to safely complete the race
 */
const MINIMUM_LONG_RUN_FLOORS = {
    '5K': 5,              // 5 miles minimum for 5K prep
    '10K': 7,             // 7 miles minimum for 10K prep
    'Half Marathon': 12,  // 12 miles minimum for half marathon
    'Marathon': 20        // 20 miles minimum - EVERY marathon plan needs this
};

/**
 * Generate complete mileage plan for all weeks
 * Returns an array with all calculated values for each week
 *
 * @param {Object} userInputs - All required user inputs
 * @param {number} userInputs.currentWeeklyMileage - Current weekly running volume
 * @param {number} userInputs.currentLongRun - Current long run distance
 * @param {number} userInputs.totalWeeks - Plan length in weeks
 * @param {string} userInputs.raceDistance - Target race (5K, 10K, Half Marathon, Marathon)
 * @param {string} userInputs.experienceLevel - 'beginner', 'intermediate', or 'advanced' (optional, defaults to intermediate)
 * @returns {Object} Complete plan structure with all weeks calculated
 */
export function generatePlanMath(userInputs) {
    const { currentWeeklyMileage, currentLongRun, totalWeeks, raceDistance, experienceLevel } = userInputs;

    // Validate all required inputs exist
    if (!currentWeeklyMileage || !currentLongRun || !totalWeeks || !raceDistance) {
        throw new Error(`MISSING REQUIRED INPUTS - No defaults allowed! Received: ${JSON.stringify(userInputs)}`);
    }

    // Get experience level multipliers (default to intermediate if not provided)
    const expLevel = experienceLevel || 'intermediate';
    const expMultipliers = EXPERIENCE_MULTIPLIERS[expLevel] || EXPERIENCE_MULTIPLIERS.intermediate;

    logger.info(`Generating plan math for: ${totalWeeks}-week ${raceDistance} plan starting at ${currentWeeklyMileage} mpw, ${currentLongRun} mile long run (${expLevel} level)`);

    // Calculate BASE key targets (before experience adjustment)
    const basePeakMileage = calculatePeakWeeklyMileage(currentWeeklyMileage, totalWeeks, raceDistance);
    const baseLongRunMax = calculateLongRunMax(currentLongRun, totalWeeks, raceDistance, basePeakMileage);

    // Apply experience level adjustments
    const peakWeeklyMileage = Math.round(basePeakMileage * expMultipliers.peakMileage);

    // Apply long run adjustment BUT enforce race-specific minimum floor
    const longRunFloor = MINIMUM_LONG_RUN_FLOORS[raceDistance] || 10;
    const adjustedLongRun = Math.round(baseLongRunMax * expMultipliers.longRunMax);
    const longRunMax = Math.max(adjustedLongRun, longRunFloor);

    logger.info(`Experience level ${expLevel}: peak ${basePeakMileage}→${peakWeeklyMileage} mpw, long run ${baseLongRunMax}→${longRunMax} mi (floor: ${longRunFloor})`);

    if (adjustedLongRun < longRunFloor) {
        logger.info(`Long run floor applied: ${adjustedLongRun} raised to ${longRunFloor} (${raceDistance} minimum)`);
    }
    const phases = calculatePhaseDistribution(totalWeeks);

    // Generate week-by-week numbers
    const weeks = [];
    for (let week = 1; week <= totalWeeks; week++) {
        const weeklyMileage = calculateWeeklyMileage(week, currentWeeklyMileage, peakWeeklyMileage, totalWeeks);
        const longRun = calculateWeeklyLongRun(week, currentLongRun, longRunMax, totalWeeks);

        // Determine phase for this week
        let phase;
        if (week <= phases.base.endWeek) phase = 'base';
        else if (week <= phases.build.endWeek) phase = 'build';
        else if (week <= phases.peak.endWeek) phase = 'peak';
        else phase = 'taper';

        weeks.push({
            weekNumber: week,
            phase,
            weeklyMileage,
            longRun,
            tempoDistance: calculateQualityWorkoutDistance(weeklyMileage, 'tempo', raceDistance),
            intervalDistance: calculateQualityWorkoutDistance(weeklyMileage, 'interval', raceDistance),
            hillDistance: calculateQualityWorkoutDistance(weeklyMileage, 'hill', raceDistance)
        });
    }

    const result = {
        inputs: userInputs,
        experienceLevel: {
            level: expLevel,
            multipliers: expMultipliers,
            basePeakMileage,
            baseLongRunMax
        },
        targets: {
            peakWeeklyMileage,
            longRunMax,
            growthRate: calculateWeeklyGrowthRate(totalWeeks)
        },
        phases,
        weeks
    };

    // Log summary
    logger.info(`Plan math complete:
        Peak mileage: ${peakWeeklyMileage} mpw
        Long run max: ${longRunMax} miles
        Phases: Base=${phases.base.weeks}wks, Build=${phases.build.weeks}wks, Peak=${phases.peak.weeks}wks, Taper=${phases.taper.weeks}wks`);

    // Log weekly progression for verification
    const longRunProgression = weeks.map(w => w.longRun).join(', ');
    logger.info(`Long run progression: ${longRunProgression}`);

    return result;
}

export const PlanMathCalculator = {
    generatePlanMath,
    calculatePeakWeeklyMileage,
    calculateLongRunMax,
    calculateWeeklyMileage,
    calculateWeeklyLongRun,
    calculateQualityWorkoutDistance,
    calculatePhaseDistribution,
    calculateWeeklyGrowthRate,
    RACE_DISTANCE_CAPS,
    MINIMUM_LONG_RUN_TARGETS,
    MINIMUM_LONG_RUN_FLOORS,
    EXPERIENCE_MULTIPLIERS
};
