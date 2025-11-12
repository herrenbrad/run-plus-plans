/**
 * Calorie Calculator for RunEQ Training
 * Based on UCSD and ACE research showing ElliptiGO/Cyclete provides
 * similar energy expenditure to running at equivalent paces
 */

export class CalorieCalculator {
    /**
     * Calculate calories for running workouts
     * @param {number} miles - Distance in miles
     * @param {number} weightLbs - User weight in pounds (optional, defaults to 150lb average)
     * @returns {object} - { estimate, min, max, range }
     */
    calculateRunningCalories(miles, weightLbs = null) {
        // Standard running calorie formula: 0.63 × weight × miles
        // Or default to ~100 calories per mile for average 150lb person
        const caloriesPerMile = weightLbs ? (0.63 * weightLbs) : 100;
        const baseCalories = miles * caloriesPerMile;

        // Return as range (±15%) to account for individual variation
        // ACE study showed ~20% variation, we're being slightly conservative
        return {
            estimate: Math.round(baseCalories),
            min: Math.round(baseCalories * 0.85),
            max: Math.round(baseCalories * 1.15),
            range: `${Math.round(baseCalories * 0.85)}-${Math.round(baseCalories * 1.15)}`
        };
    }

    /**
     * Calculate calories for stand-up bike workouts (Cyclete/ElliptiGO)
     * Uses RunEQ equivalency - research shows similar HR/exertion to running
     * @param {number} runeqMiles - Distance in RunEQ miles
     * @param {number} weightLbs - User weight in pounds (optional)
     * @returns {object} - { estimate, min, max, range }
     */
    calculateBikeCalories(runeqMiles, weightLbs = null) {
        // Stand-up bike calories = RunEQ miles × running formula
        // This is based on:
        // - UCSD 2011: ElliptiGO shows "very similar" HR and perceived exertion to running
        // - ACE 2015: 356-436 calories in 30 minutes at 75% VO2max
        // - Ohio University 2016: Equivalent fitness gains to running
        return this.calculateRunningCalories(runeqMiles, weightLbs);
    }

    /**
     * Calculate calories for any workout based on type
     * @param {object} workout - Workout object with type and distance
     * @param {number} weightLbs - User weight (optional)
     * @returns {object|null} - Calorie data or null if not applicable
     */
    calculateWorkoutCalories(workout, weightLbs = null) {
        if (!workout || !workout.distance || workout.distance === 0) {
            return null;
        }

        // Only calculate for bike workouts for now
        if (workout.type === 'bike' || workout.equipmentSpecific) {
            return this.calculateBikeCalories(workout.distance, weightLbs);
        }

        // Could expand to running workouts in future
        // if (workout.type === 'longRun' || workout.type === 'easy' || workout.type === 'intervals' || workout.type === 'tempo' || workout.type === 'hills') {
        //     return this.calculateRunningCalories(workout.distance, weightLbs);
        // }

        return null;
    }
}

// Export singleton instance
export const calorieCalculator = new CalorieCalculator();
