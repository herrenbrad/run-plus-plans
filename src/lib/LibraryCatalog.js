/**
 * LibraryCatalog.js
 * Central aggregator for all workout libraries
 *
 * Purpose:
 * 1. Single import point for all workout libraries
 * 2. Provides workout catalog for AI selection (names only)
 * 3. Fetches full workout details after AI selects
 * 4. Routes to correct library based on workout type and equipment
 */

// Running Libraries
import { TempoWorkoutLibrary } from './tempo-workout-library';
import { IntervalWorkoutLibrary } from './interval-workout-library';
import { HillWorkoutLibrary } from './hill-workout-library';
import { LongRunWorkoutLibrary } from './long-run-workout-library';

// Cross-Training Libraries
import { StandUpBikeWorkoutLibrary } from './standup-bike-workout-library';
import { AquaRunningWorkoutLibrary } from './aqua-running-workout-library';
import { RowingWorkoutLibrary } from './rowing-workout-library';
import { EllipticalWorkoutLibrary } from './elliptical-workout-library';
import { SwimmingWorkoutLibrary } from './swimming-workout-library';
import { StationaryBikeWorkoutLibrary } from './stationary-bike-workout-library';

class LibraryCatalogClass {
  constructor() {
    // Initialize all running libraries
    this.running = {
      tempo: new TempoWorkoutLibrary(),
      intervals: new IntervalWorkoutLibrary(),
      hills: new HillWorkoutLibrary(),
      longRun: new LongRunWorkoutLibrary()
    };

    // Initialize all cross-training libraries
    this.crossTraining = {
      standUpBike: new StandUpBikeWorkoutLibrary(),
      aquaRunning: new AquaRunningWorkoutLibrary(),
      rowing: new RowingWorkoutLibrary(),
      elliptical: new EllipticalWorkoutLibrary(),
      swimming: new SwimmingWorkoutLibrary(),
      stationaryBike: new StationaryBikeWorkoutLibrary()
    };

    // Map equipment names to library keys
    this.equipmentToLibrary = {
      'cyclete': 'standUpBike',
      'elliptigo': 'standUpBike',
      'pool': 'aquaRunning',
      'aquaRunning': 'aquaRunning',
      'rowing': 'rowing',
      'elliptical': 'elliptical',
      'swimming': 'swimming',
      'stationaryBike': 'stationaryBike'
    };
  }

  /**
   * Extract all workout names from a library's workoutLibrary object
   */
  extractWorkoutNames(library) {
    const names = [];
    const workoutLib = library.workoutLibrary;

    if (!workoutLib) return names;

    for (const [category, workouts] of Object.entries(workoutLib)) {
      if (Array.isArray(workouts)) {
        workouts.forEach(workout => {
          if (workout.name) {
            names.push({
              name: workout.name,
              category,
              duration: workout.duration || null,
              intensity: workout.intensity || null
            });
          }
        });
      }
    }
    return names;
  }

  /**
   * Get catalog of available workouts for AI to select from
   * Only returns workout names organized by type - AI picks from this menu
   *
   * @param {string} runningStatus - 'active', 'crossTrainingOnly', or 'transitioning'
   * @param {object} equipment - User's available equipment { standUpBike: true, rowing: true, etc. }
   * @param {string} standUpBikeType - 'cyclete' or 'elliptigo' if applicable
   * @returns {object} Catalog organized by workout type
   */
  getCatalogForAI(runningStatus, equipment = {}, standUpBikeType = null) {
    const catalog = {};

    // For active runners or transitioning users, include running workouts
    if (runningStatus === 'active' || runningStatus === 'transitioning') {
      catalog.running = {
        tempo: this.extractWorkoutNames(this.running.tempo),
        intervals: this.extractWorkoutNames(this.running.intervals),
        hills: this.extractWorkoutNames(this.running.hills),
        longRun: this.extractWorkoutNames(this.running.longRun)
      };
    }

    // For cross-training only or transitioning, include cross-training workouts
    if (runningStatus === 'crossTrainingOnly' || runningStatus === 'transitioning') {
      catalog.crossTraining = {};

      // Stand-up bike (Cyclete or ElliptiGO)
      if (standUpBikeType || equipment.standUpBike) {
        catalog.crossTraining.standUpBike = this.extractWorkoutNames(this.crossTraining.standUpBike);
      }

      // Pool / Aqua Running
      if (equipment.pool || equipment.aquaRunning) {
        catalog.crossTraining.aquaRunning = this.extractWorkoutNames(this.crossTraining.aquaRunning);
      }

      // Rowing
      if (equipment.rowing) {
        catalog.crossTraining.rowing = this.extractWorkoutNames(this.crossTraining.rowing);
      }

      // Elliptical
      if (equipment.elliptical) {
        catalog.crossTraining.elliptical = this.extractWorkoutNames(this.crossTraining.elliptical);
      }

      // Swimming
      if (equipment.swimming) {
        catalog.crossTraining.swimming = this.extractWorkoutNames(this.crossTraining.swimming);
      }

      // Stationary Bike
      if (equipment.stationaryBike) {
        catalog.crossTraining.stationaryBike = this.extractWorkoutNames(this.crossTraining.stationaryBike);
      }
    }

    // For active runners with a stand-up bike, include bike workouts for bike days
    if (runningStatus === 'active' && standUpBikeType) {
      if (!catalog.crossTraining) catalog.crossTraining = {};
      catalog.crossTraining.standUpBike = this.extractWorkoutNames(this.crossTraining.standUpBike);
    }

    return catalog;
  }

  /**
   * Format catalog as a string for AI prompt
   * Makes it easy for AI to see available options
   */
  formatCatalogForPrompt(catalog) {
    let prompt = '';

    if (catalog.running) {
      prompt += '## RUNNING WORKOUTS\n\n';

      if (catalog.running.tempo?.length) {
        prompt += '### Tempo Workouts (Lactate Threshold)\n';
        catalog.running.tempo.forEach(w => {
          prompt += `- ${w.name}\n`;
        });
        prompt += '\n';
      }

      if (catalog.running.intervals?.length) {
        prompt += '### Interval Workouts (Speed/VO2 Max)\n';
        catalog.running.intervals.forEach(w => {
          prompt += `- ${w.name}\n`;
        });
        prompt += '\n';
      }

      if (catalog.running.hills?.length) {
        prompt += '### Hill Workouts (Power/Strength)\n';
        catalog.running.hills.forEach(w => {
          prompt += `- ${w.name}\n`;
        });
        prompt += '\n';
      }

      if (catalog.running.longRun?.length) {
        prompt += '### Long Run Workouts (Endurance)\n';
        catalog.running.longRun.forEach(w => {
          prompt += `- ${w.name}\n`;
        });
        prompt += '\n';
      }
    }

    if (catalog.crossTraining) {
      prompt += '## CROSS-TRAINING WORKOUTS\n\n';

      for (const [equipment, workouts] of Object.entries(catalog.crossTraining)) {
        if (workouts?.length) {
          const equipmentLabel = this.getEquipmentLabel(equipment);
          prompt += `### ${equipmentLabel}\n`;
          workouts.forEach(w => {
            prompt += `- ${w.name}\n`;
          });
          prompt += '\n';
        }
      }
    }

    return prompt;
  }

  /**
   * Get human-readable label for equipment type
   */
  getEquipmentLabel(equipmentKey) {
    const labels = {
      standUpBike: 'Stand-Up Bike (Cyclete/ElliptiGO)',
      aquaRunning: 'Pool / Aqua Running',
      rowing: 'Rowing Machine',
      elliptical: 'Elliptical',
      swimming: 'Swimming',
      stationaryBike: 'Stationary Bike'
    };
    return labels[equipmentKey] || equipmentKey;
  }

  /**
   * Get a full workout from a running library
   * Used after AI selects a workout name
   *
   * @param {string} libraryType - 'tempo', 'intervals', 'hills', or 'longRun'
   * @param {string} workoutName - The name AI selected
   * @param {object} options - { paces, weekNumber, totalWeeks, distance, etc. }
   * @returns {object} Full workout with structure, benefits, paces injected
   */
  getRunningWorkout(libraryType, workoutName, options = {}) {
    const library = this.running[libraryType];
    if (!library) {
      console.warn(`Unknown running library type: ${libraryType}`);
      return null;
    }

    try {
      switch (libraryType) {
        case 'tempo':
          return library.prescribeTempoWorkout(workoutName, options);
        case 'intervals':
          return library.prescribeIntervalWorkout(workoutName, options);
        case 'hills':
          return library.prescribeHillWorkout(workoutName, options);
        case 'longRun':
          return library.prescribeLongRunWorkout(workoutName, options);
        default:
          return null;
      }
    } catch (error) {
      console.warn(`Could not fetch workout "${workoutName}" from ${libraryType} library:`, error.message);
      return null;
    }
  }

  /**
   * Get a full workout from a cross-training library
   *
   * @param {string} equipmentType - 'standUpBike', 'rowing', 'aquaRunning', etc.
   * @param {string} workoutName - The name AI selected
   * @param {object} options - { equipment: 'cyclete', paces, targetDistance, etc. }
   * @returns {object} Full workout with structure, benefits, etc.
   */
  getCrossTrainingWorkout(equipmentType, workoutName, options = {}) {
    const libraryKey = this.equipmentToLibrary[equipmentType] || equipmentType;
    const library = this.crossTraining[libraryKey];

    if (!library) {
      console.warn(`Unknown cross-training equipment: ${equipmentType}`);
      return null;
    }

    // Stand-up bike has prescribe method
    if (libraryKey === 'standUpBike' && library.prescribeStandUpBikeWorkout) {
      try {
        return library.prescribeStandUpBikeWorkout(workoutName, options.equipment || 'cyclete', options);
      } catch (error) {
        console.warn(`Could not fetch stand-up bike workout "${workoutName}":`, error.message);
      }
    }

    // Other cross-training libraries - find workout by name
    const workoutLib = library.workoutLibrary;
    if (!workoutLib) return null;

    for (const [category, workouts] of Object.entries(workoutLib)) {
      if (Array.isArray(workouts)) {
        const found = workouts.find(w =>
          w.name.toLowerCase() === workoutName.toLowerCase() ||
          w.name.toLowerCase().includes(workoutName.toLowerCase()) ||
          workoutName.toLowerCase().includes(w.name.toLowerCase())
        );
        if (found) {
          return {
            ...found,
            category,
            equipmentType: libraryKey,
            crossTrainingType: libraryKey
          };
        }
      }
    }

    console.warn(`Workout "${workoutName}" not found in ${equipmentType} library`);
    return null;
  }

  /**
   * Get a workout by type and duration (for cross-training)
   * Used when you need a workout of a specific intensity/type and duration
   *
   * @param {string} equipmentType - Equipment key
   * @param {string} workoutType - 'EASY', 'TEMPO', 'INTERVALS', 'LONG', etc.
   * @param {number} durationMinutes - Target duration
   * @returns {object} Matching workout
   */
  getCrossTrainingByDuration(equipmentType, workoutType, durationMinutes) {
    const libraryKey = this.equipmentToLibrary[equipmentType] || equipmentType;
    const library = this.crossTraining[libraryKey];

    if (!library || !library.getWorkoutByDuration) {
      console.warn(`Library ${equipmentType} does not support getWorkoutByDuration`);
      return null;
    }

    const workout = library.getWorkoutByDuration(workoutType, durationMinutes);
    if (workout) {
      return {
        ...workout,
        equipmentType: libraryKey,
        crossTrainingType: libraryKey
      };
    }
    return null;
  }

  /**
   * Get an easy run workout (no library needed - simple structure)
   *
   * @param {object} options - { distance, paces, duration }
   * @returns {object} Easy run workout
   */
  getEasyRunWorkout(options = {}) {
    const { distance = 4, paces = null, duration = null } = options;

    let paceGuidance = 'Conversational pace, should feel easy';
    if (paces?.easy) {
      // Handle various pace formats: {min, max}, {pace}, or string
      const easyMin = paces.easy.min || (paces.easy.pace ? paces.easy.pace.split('-')[0]?.trim() : null);
      const easyMax = paces.easy.max || (paces.easy.pace ? paces.easy.pace.split('-')[1]?.trim() || paces.easy.pace : null);
      if (easyMin && easyMax) {
        paceGuidance = `${easyMin}-${easyMax}/mile`.replace(/\/mile\/mile/g, '/mile');
      } else if (easyMin || easyMax) {
        paceGuidance = `${easyMin || easyMax}/mile`.replace(/\/mile\/mile/g, '/mile');
      }
    }

    return {
      name: distance ? `${distance}-Mile Easy Run` : 'Easy Run',
      type: 'easy',
      focus: 'Aerobic Base',
      description: 'Conversational pace run for aerobic development and recovery',
      structure: 'Easy effort throughout - should feel refreshed after',
      intensity: 'Easy - can hold full conversation',
      heartRate: '65-75% Max HR',
      paceGuidance,
      distance,
      duration: duration || `${Math.round(distance * 10)}-${Math.round(distance * 12)} minutes`,
      benefits: 'Builds aerobic base, promotes recovery, strengthens cardiovascular system',
      safetyNotes: [
        'This should feel easy - not a workout day',
        'Focus on form and relaxation',
        'Cut short if feeling overly fatigued'
      ]
    };
  }

  /**
   * Get a rest day object
   */
  getRestDay() {
    return {
      name: 'Rest Day',
      type: 'rest',
      focus: 'Recovery',
      description: 'Complete rest - let your body recover and adapt',
      structure: 'No structured activity',
      intensity: 'None',
      benefits: 'Allows muscle repair, glycogen replenishment, mental refreshment',
      alternatives: {
        activeRecovery: 'Light walk, gentle stretching, or foam rolling',
        mentalReset: 'Use this time for life outside of training'
      }
    };
  }

  /**
   * Get all available equipment types for a user based on their profile
   */
  getAvailableEquipment(profile) {
    const available = [];

    if (profile.standUpBikeType) {
      available.push({
        key: 'standUpBike',
        type: profile.standUpBikeType,
        label: profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'
      });
    }

    const crossTrainingEquipment = profile.crossTrainingEquipment || {};

    if (crossTrainingEquipment.pool || crossTrainingEquipment.aquaRunning) {
      available.push({ key: 'aquaRunning', type: 'pool', label: 'Pool / Aqua Running' });
    }
    if (crossTrainingEquipment.rowing) {
      available.push({ key: 'rowing', type: 'rowing', label: 'Rowing Machine' });
    }
    if (crossTrainingEquipment.elliptical) {
      available.push({ key: 'elliptical', type: 'elliptical', label: 'Elliptical' });
    }
    if (crossTrainingEquipment.swimming) {
      available.push({ key: 'swimming', type: 'swimming', label: 'Swimming' });
    }
    if (crossTrainingEquipment.stationaryBike) {
      available.push({ key: 'stationaryBike', type: 'stationaryBike', label: 'Stationary Bike' });
    }

    return available;
  }
}

// Export singleton instance
export const LibraryCatalog = new LibraryCatalogClass();

// Also export the class for testing
export { LibraryCatalogClass };
