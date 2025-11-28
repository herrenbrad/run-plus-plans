/**
 * PhaseCalculator - Calculates training plan phases (Base, Build, Peak, Taper)
 * 
 * Single Responsibility: Calculate periodization phases based on total weeks
 */

class PhaseCalculator {
    /**
     * Calculate phase plan for a training plan of given duration
     * @param {number} totalWeeks - Total number of weeks in the plan
     * @returns {Array} Array of phase blocks with startWeek and endWeek
     */
    getPhasePlan(totalWeeks) {
        if (!totalWeeks || totalWeeks <= 0) {
            return [{
                phase: 'Base',
                startWeek: 1,
                endWeek: totalWeeks || 1
            }];
        }

        // Calculate phase boundaries as percentages of total weeks
        // Ensure at least 2 weeks for taper (race week + taper week)
        const taperWeeks = Math.max(2, Math.ceil(totalWeeks * 0.1));
        const trainingWeeks = totalWeeks - taperWeeks;
        
        // Distribute training weeks across Base, Build, Peak
        const baseWeeks = Math.max(1, Math.round(trainingWeeks * 0.4));
        const buildWeeks = Math.max(1, Math.round(trainingWeeks * 0.35));
        const peakWeeks = Math.max(1, trainingWeeks - baseWeeks - buildWeeks); // Remaining weeks go to peak
        
        // Calculate cumulative week boundaries
        const baseEnd = baseWeeks;
        const buildEnd = baseEnd + buildWeeks;
        const peakEnd = buildEnd + peakWeeks;
        const taperEnd = totalWeeks;

        const phases = [
            { phase: 'Base', startWeek: 1, endWeek: baseEnd },
            { phase: 'Build', startWeek: baseEnd + 1, endWeek: buildEnd },
            { phase: 'Peak', startWeek: buildEnd + 1, endWeek: peakEnd },
            { phase: 'Taper', startWeek: peakEnd + 1, endWeek: taperEnd }
        ];

        // Filter out invalid phases and log for debugging
        const validPhases = phases.filter(block => block.startWeek <= block.endWeek);
        console.log(`📊 Phase Plan for ${totalWeeks} weeks:`, validPhases.map(p => 
            `${p.phase}: weeks ${p.startWeek}-${p.endWeek}`
        ).join(', '));

        return validPhases;
    }

    /**
     * Get phase label for a specific week number
     * @param {number} weekNumber - Week number (1-based)
     * @param {number} totalWeeks - Total number of weeks in the plan
     * @returns {string} Phase name ('Base', 'Build', 'Peak', or 'Taper')
     */
    getPhaseForWeek(weekNumber, totalWeeks) {
        const plan = this.getPhasePlan(totalWeeks);
        const block = plan.find(phase => weekNumber >= phase.startWeek && weekNumber <= phase.endWeek);
        const phase = block ? block.phase : 'Base';
        if (!block) {
            console.warn(`⚠️ No phase found for week ${weekNumber} of ${totalWeeks} weeks. Defaulting to Base.`);
            console.log('Available phases:', plan);
        }
        return phase;
    }
}

// Export singleton instance
export default new PhaseCalculator();

