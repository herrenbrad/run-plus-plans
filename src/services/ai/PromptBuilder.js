/**
 * PromptBuilder - Builds AI prompts for training plan generation
 * 
 * Single Responsibility: Construct all AI prompts from user profiles
 * 
 * Note: Takes libraries as constructor dependencies
 */

import { HillWorkoutLibrary } from '../../lib/hill-workout-library';
import { IntervalWorkoutLibrary } from '../../lib/interval-workout-library';
import { TempoWorkoutLibrary } from '../../lib/tempo-workout-library';
import { LongRunWorkoutLibrary } from '../../lib/long-run-workout-library';

class PromptBuilder {
    constructor() {
        // Instantiate workout libraries
        this.hillLibrary = new HillWorkoutLibrary();
        this.intervalLibrary = new IntervalWorkoutLibrary();
        this.tempoLibrary = new TempoWorkoutLibrary();
        this.longRunLibrary = new LongRunWorkoutLibrary();
    }

    /**
     * Build workout library context for AI prompts
     * Shows available workouts that AI can select from
     */
    buildWorkoutLibraryContext() {
        // Optimized: Concise format to reduce prompt size and speed up generation
        let context = `**WORKOUT LIBRARY - Use [WORKOUT_ID: ...] format**\n\n`;

        // Hill Workouts - Just IDs and names
        context += `**HILL:** `;
        const hillCategories = this.hillLibrary.getCategories();
        const hillWorkouts = [];
        hillCategories.forEach(category => {
            const workouts = this.hillLibrary.getWorkoutsByCategory(category);
            workouts.forEach((workout, index) => {
                hillWorkouts.push(`[hill_${category}_${index}] ${workout.name}`);
            });
        });
        context += hillWorkouts.join(', ') + `\n`;

        // Interval Workouts - Just IDs and names
        context += `**INTERVALS:** `;
        const intervalCategories = this.intervalLibrary.getCategories();
        const intervalWorkouts = [];
        intervalCategories.forEach(category => {
            const workouts = this.intervalLibrary.getWorkoutsByCategory(category);
            workouts.forEach((workout, index) => {
                intervalWorkouts.push(`[interval_${category}_${index}] ${workout.name}`);
            });
        });
        context += intervalWorkouts.join(', ') + `\n`;

        // Tempo Workouts - Just IDs and names
        context += `**TEMPO:** `;
        const tempoCategories = this.tempoLibrary.getCategories();
        const tempoWorkouts = [];
        tempoCategories.forEach(category => {
            const workouts = this.tempoLibrary.getWorkoutsByCategory(category);
            workouts.forEach((workout, index) => {
                tempoWorkouts.push(`[tempo_${category}_${index}] ${workout.name}`);
            });
        });
        context += tempoWorkouts.join(', ') + `\n`;

        // Long Run Workouts - Just IDs and names
        context += `**LONG RUNS:** `;
        const longRunCategories = this.longRunLibrary.getCategories();
        const longRunWorkouts = [];
        longRunCategories.forEach(category => {
            const workouts = this.longRunLibrary.getWorkoutsByCategory(category);
            workouts.forEach((workout, index) => {
                longRunWorkouts.push(`[longrun_${category}_${index}] ${workout.name}`);
            });
        });
        context += longRunWorkouts.join(', ') + `\n`;

        return context;
    }
}

// Export singleton instance
export default new PromptBuilder();

