/**
 * PlanMergeUtils - Utility functions for merging training plan weeks
 *
 * Single responsibility: Preserve completed weeks when regenerating plans
 */

import logger from '../utils/logger';

/**
 * Preserve completed weeks and merge with new regenerated weeks
 * @param {object} existingPlan - Current training plan
 * @param {array} newWeeks - New weeks from AI regeneration
 * @param {number} currentWeek - Current week number (1-indexed)
 * @returns {array} - Merged weeks array
 */
export function preserveAndMergeWeeks(existingPlan, newWeeks, currentWeek) {
    logger.log('🔧 Preserving completed weeks and merging...');

    // Get existing weekly plans
    const weeklyPlans = existingPlan?.weeks || existingPlan?.weeklyPlans;
    if (!weeklyPlans) {
        throw new Error('Training plan structure is invalid - missing weeks array');
    }

    // Preserve completed weeks (everything before current week)
    const completedWeeks = weeklyPlans.slice(0, currentWeek - 1);
    logger.log('  Preserved', completedWeeks.length, 'completed weeks');
    logger.log('  Merging', newWeeks.length, 'new weeks from week', currentWeek);

    // Merge: completed weeks + new future weeks
    const mergedWeeklyPlans = [...completedWeeks, ...newWeeks];

    logger.log('  ✅ Weeks merged successfully');
    logger.log('    Total weeks:', mergedWeeklyPlans.length);
    logger.log('    Completed weeks:', completedWeeks.length);
    logger.log('    New weeks:', newWeeks.length);

    return mergedWeeklyPlans;
}
