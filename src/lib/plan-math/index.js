/**
 * Plan Math Calculator - Main Entry Point
 *
 * Routes to the appropriate race-distance calculator:
 * - 5K: src/lib/plan-math/race-calculators/5k-calculator.js
 * - 10K: src/lib/plan-math/race-calculators/10k-calculator.js
 * - Half Marathon: src/lib/plan-math/race-calculators/half-marathon-calculator.js
 * - Marathon: src/lib/plan-math/race-calculators/marathon-calculator.js
 *
 * Each calculator has race-specific:
 * - Peak mileage caps
 * - Long run maximums and floors
 * - Workout percentages
 * - Quality workout bounds
 */

import logger from '../../utils/logger.js';

// Import race-specific calculators
import fiveKCalculator from './race-calculators/5k-calculator.js';
import tenKCalculator from './race-calculators/10k-calculator.js';
import halfMarathonCalculator from './race-calculators/half-marathon-calculator.js';
import marathonCalculator from './race-calculators/marathon-calculator.js';

// Import base calculator for exports
import baseCalculator from './base-calculator.js';

/**
 * Map race distance strings to calculators
 */
const CALCULATORS = {
    '5K': fiveKCalculator,
    '10K': tenKCalculator,
    'Half Marathon': halfMarathonCalculator,
    'Half': halfMarathonCalculator,  // Alias
    'Marathon': marathonCalculator
};

/**
 * Generate complete training plan math for any race distance
 *
 * @param {Object} userInputs - All required user inputs
 * @param {number} userInputs.currentWeeklyMileage - Current weekly running volume
 * @param {number} userInputs.currentLongRun - Current long run distance
 * @param {number} userInputs.totalWeeks - Plan length in weeks
 * @param {string} userInputs.raceDistance - Target race (5K, 10K, Half Marathon, Marathon)
 * @param {string} userInputs.experienceLevel - 'beginner', 'intermediate', or 'advanced' (optional)
 * @returns {Object} Complete plan structure with week-by-week numbers
 */
export function generatePlanMath(userInputs) {
    const { currentWeeklyMileage, currentLongRun, totalWeeks, raceDistance, experienceLevel } = userInputs;

    // Validate required inputs
    if (!currentWeeklyMileage || !currentLongRun || !totalWeeks || !raceDistance) {
        throw new Error(`MISSING REQUIRED INPUTS - No defaults allowed! Received: ${JSON.stringify(userInputs)}`);
    }

    // Normalize race distance
    const normalizedDistance = raceDistance === 'Half' ? 'Half Marathon' : raceDistance;

    // Get the appropriate calculator
    const calculator = CALCULATORS[normalizedDistance];
    if (!calculator) {
        throw new Error(`Unknown race distance: ${raceDistance}. Supported: 5K, 10K, Half Marathon, Marathon`);
    }

    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`PLAN MATH: ${normalizedDistance} | ${totalWeeks} weeks | ${experienceLevel || 'intermediate'}`);
    logger.info(`${'='.repeat(60)}`);

    // Generate plan using race-specific calculator
    const plan = calculator.generatePlan({
        currentWeeklyMileage: parseInt(currentWeeklyMileage),
        currentLongRun: parseInt(currentLongRun),
        totalWeeks: parseInt(totalWeeks),
        experienceLevel: experienceLevel || 'intermediate'
    });

    // Log summary
    logger.info(`\n📊 PLAN SUMMARY:`);
    logger.info(`   Race: ${plan.raceDistance}`);
    logger.info(`   Peak Mileage: ${plan.targets.peakWeeklyMileage} mpw`);
    logger.info(`   Long Run Max: ${plan.targets.longRunMax} miles`);
    logger.info(`   Phases: Base=${plan.phases.base.weeks}wks, Build=${plan.phases.build.weeks}wks, Peak=${plan.phases.peak.weeks}wks, Taper=${plan.phases.taper.weeks}wks`);
    logger.info(`   Long runs: ${plan.weeks.map(w => w.longRun).join(', ')}`);
    logger.info(`${'='.repeat(60)}\n`);

    return plan;
}

/**
 * Get race-specific parameters without generating a full plan
 * Useful for UI display or validation
 */
export function getRaceParams(raceDistance) {
    const normalizedDistance = raceDistance === 'Half' ? 'Half Marathon' : raceDistance;
    const calculator = CALCULATORS[normalizedDistance];
    if (!calculator) {
        throw new Error(`Unknown race distance: ${raceDistance}`);
    }
    return calculator.RACE_PARAMS;
}

/**
 * Get all available race calculators
 */
export function getAvailableRaces() {
    return ['5K', '10K', 'Half Marathon', 'Marathon'];
}

// Export everything for backward compatibility and direct access
export const PlanMathCalculator = {
    generatePlanMath,
    getRaceParams,
    getAvailableRaces,

    // Base calculator functions
    ...baseCalculator,

    // Race-specific calculators for direct access if needed
    calculators: {
        '5K': fiveKCalculator,
        '10K': tenKCalculator,
        'Half Marathon': halfMarathonCalculator,
        'Marathon': marathonCalculator
    }
};

export default PlanMathCalculator;
