/**
 * RunEq Comprehensive Interval Workout Library
 * Based on research from Runner's World, Hal Higdon, McMillan Running, and Ben Parkes
 * Covers short speed, VO2 max, and longer interval training
 */
export class IntervalWorkoutLibrary {
    constructor() {
        this.intervalIntensityGuidelines = {
            shortSpeed: {
                description: "All-out sprint efforts, neuromuscular power",
                pace: "800m to mile race pace", 
                heartRate: "105%+ max HR",
                effort: "Maximum sustainable for 15-90 seconds",
                recovery: "Complete recovery between reps (walk/jog)"
            },
            vo2Max: {
                description: "VO2 max development, aerobic power",
                pace: "3K to 5K race pace",
                heartRate: "90-100% max HR", 
                effort: "Hard but sustainable for 2-8 minutes",
                recovery: "Equal time recovery (light jog)"
            },
            longIntervals: {
                description: "Sustained speed, race-specific preparation",
                pace: "5K to 10K race pace",
                heartRate: "85-95% max HR",
                effort: "Controlled hard effort for 4+ minutes", 
                recovery: "50-75% of work interval (easy jog)"
            }
        };

        this.workoutLibrary = {
            SHORT_SPEED: [
                {
                    name: "Classic 200m Repeats",
                    distance: "200m",
                    repetitions: "6-12 x 200m",
                    intensity: "shortSpeed",
                    recovery: "200m walk/jog (2-3 minutes)",
                    source: "Hal Higdon",
                    description: "Short speed bursts for neuromuscular development", 
                    pace: "800m race pace",
                    benefits: "Leg turnover, running economy, speed development",
                    progression: "Start 6 reps, add 1-2 per week to 12 reps"
                },
                {
                    name: "400m Speed Intervals", 
                    distance: "400m",
                    repetitions: "5-10 x 400m",
                    intensity: "shortSpeed",
                    recovery: "400m jog (3-4 minutes)",
                    source: "Hal Higdon / Track training",
                    description: "Classic one-lap speed intervals",
                    pace: "Mile to 5K race pace", 
                    benefits: "Speed endurance, lactate tolerance, mental toughness",
                    progression: "Start 5 reps, build by 1 every 2 weeks to 10"
                },
                {
                    name: "Flying 100s",
                    distance: "100m", 
                    repetitions: "6-10 x 100m",
                    intensity: "shortSpeed",
                    recovery: "Full recovery (3-5 minutes walk)",
                    source: "Speed development training",
                    description: "Accelerate 30m, sprint 100m, decelerate 30m",
                    pace: "Faster than mile race pace",
                    benefits: "Top-end speed, form at speed, confidence"
                },
                {
                    name: "30-Second Strides",
                    distance: "30 seconds",
                    repetitions: "8-12 x 30 seconds", 
                    intensity: "shortSpeed",
                    recovery: "90 seconds easy walk/jog",
                    source: "General speed development",
                    description: "Time-based speed intervals", 
                    pace: "5K pace or slightly faster",
                    benefits: "Speed without track access, time-efficient"
                }
            ],

            VO2_MAX: [
                {
                    name: "1000m VO2 Max Intervals",
                    distance: "1000m",
                    repetitions: "3-6 x 1000m", 
                    intensity: "vo2Max",
                    recovery: "Equal time recovery (3-4 minutes jog)",
                    source: "Runner's World",
                    description: "Classic VO2 max development intervals",
                    pace: "5K race pace",
                    benefits: "Aerobic power, VO2 max improvement, race preparation"
                },
                {
                    name: "2-Minute VO2 Intervals", 
                    distance: "2 minutes",
                    repetitions: "4-8 x 2 minutes",
                    intensity: "vo2Max", 
                    recovery: "2 minutes easy jog",
                    source: "Runner's World",
                    description: "Time-based VO2 max intervals",
                    pace: "5K effort",
                    benefits: "VO2 max development without track access"
                },
                {
                    name: "800m Track Intervals",
                    distance: "800m", 
                    repetitions: "4-8 x 800m",
                    intensity: "vo2Max",
                    recovery: "400m jog (2-3 minutes)",
                    source: "Classic track training",
                    description: "Two-lap intervals at VO2 max intensity", 
                    pace: "3K to 5K race pace", 
                    benefits: "Speed endurance, lactate processing, mental strength"
                },
                {
                    name: "1200m Extended VO2",
                    distance: "1200m",
                    repetitions: "3-5 x 1200m",
                    intensity: "vo2Max", 
                    recovery: "400m jog (3-4 minutes)",
                    source: "Extended VO2 max training", 
                    description: "Longer VO2 max intervals for advanced athletes",
                    pace: "5K race pace",
                    benefits: "Extended time at VO2 max, mental toughness"
                },
                {
                    name: "Ladder Intervals", 
                    distance: "Variable",
                    repetitions: "400-800-1200-800-400m",
                    intensity: "vo2Max",
                    recovery: "Half distance jog between reps", 
                    source: "Pyramid training",
                    description: "Ascending and descending interval distances",
                    pace: "5K race pace throughout",
                    benefits: "Variety, mental engagement, comprehensive VO2 stimulus"
                }
            ],

            LONG_INTERVALS: [
                {
                    name: "Mile Repeats",
                    distance: "1 mile", 
                    repetitions: "2-5 x 1 mile",
                    intensity: "longIntervals",
                    recovery: "3-4 minutes easy jog",
                    source: "Distance training classic",
                    description: "Sustained speed over longer distance",
                    pace: "5K to 10K race pace", 
                    benefits: "Race-specific speed, sustained effort, pacing practice"
                },
                {
                    name: "2K Intervals",
                    distance: "2000m",
                    repetitions: "3-4 x 2K", 
                    intensity: "longIntervals", 
                    recovery: "800m jog (4-5 minutes)",
                    source: "International distance training",
                    description: "Extended intervals for 5K/10K preparation",
                    pace: "10K race pace",
                    benefits: "Race-specific endurance, sustained speed"
                },
                {
                    name: "6-Minute Intervals", 
                    distance: "6 minutes",
                    repetitions: "3-5 x 6 minutes",
                    intensity: "longIntervals",
                    recovery: "3 minutes easy jog",
                    source: "Time-based distance training", 
                    description: "Extended time-based intervals",
                    pace: "10K effort",
                    benefits: "Sustained speed without distance pressure"
                },
                {
                    name: "1K-2K-1K Sandwich",
                    distance: "Variable", 
                    repetitions: "1K + 2K + 1K",
                    intensity: "longIntervals",
                    recovery: "600m jog between reps",
                    source: "Varied distance training",
                    description: "Build to longer effort, then recover with shorter",
                    pace: "5K-10K race pace",
                    benefits: "Mental challenge, varied stimulus, race simulation"
                }
            ],

            MIXED_INTERVALS: [
                {
                    name: "Progressive Pyramid",
                    distance: "Variable",
                    repetitions: "2:30-3:30-4:30 @ 10K, then repeat @ 5K pace", 
                    intensity: "vo2Max to longIntervals",
                    recovery: "Same time recovery as work interval",
                    source: "Runner's World",
                    description: "Build effort, then repeat at higher intensity",
                    pace: "10K pace, then 5K pace",
                    benefits: "Progressive overload, mental toughness, pace variety"
                },
                {
                    name: "Fartlek Intervals",
                    distance: "Variable",
                    repetitions: "20-30 minutes of varied surges", 
                    intensity: "shortSpeed to longIntervals",
                    recovery: "Easy running between surges",
                    source: "Swedish training method",
                    description: "Unstructured speed play based on feel",
                    pace: "Varies from 5K to 10K effort", 
                    benefits: "Mental flexibility, fun factor, natural terrain adaptation"
                },
                {
                    name: "Mona Fartlek",
                    distance: "Variable",
                    repetitions: "90s-3min-90s-60s-30s-30s hard efforts", 
                    intensity: "vo2Max",
                    recovery: "90 seconds easy between all efforts",
                    source: "Steve Moneghetti training",
                    description: "Structured fartlek with specific time intervals",
                    pace: "5K effort for all intervals",
                    benefits: "Structured variety, comprehensive speed stimulus"
                }
            ],

            RACE_SIMULATION: [
                {
                    name: "5K Simulation Intervals",
                    distance: "1K",
                    repetitions: "5 x 1K", 
                    intensity: "longIntervals", 
                    recovery: "200m jog (90 seconds)",
                    source: "Race-specific training",
                    description: "Simulate 5K race with brief recoveries",
                    pace: "Goal 5K race pace",
                    benefits: "Race pacing, confidence, mental preparation"
                },
                {
                    name: "10K Tempo-Speed Mix",
                    distance: "Variable",
                    repetitions: "2 x (2K @ 10K pace + 4 x 400m @ 5K pace)", 
                    intensity: "longIntervals to vo2Max", 
                    recovery: "2 min between sets, 90s between 400s",
                    source: "10K race preparation",
                    description: "Combine race pace with speed finish",
                    pace: "10K pace + 5K pace",
                    benefits: "Race-specific fitness, finishing kick practice"
                },
                {
                    name: "Cut-Down Intervals", 
                    distance: "Variable",
                    repetitions: "1200m-1000m-800m-600m-400m",
                    intensity: "longIntervals to shortSpeed",
                    recovery: "400m jog between reps",
                    source: "Descending interval training", 
                    description: "Get faster as intervals get shorter",
                    pace: "Start at 10K pace, end at 3K pace",
                    benefits: "Finishing kick, mental toughness, speed development"
                }
            ]
        };
    }

    /**
     * Get interval workout prescription with RunEq adaptations and USER-SPECIFIC PACES
     */
    prescribeIntervalWorkout(workoutName, options = {}) {
        const { runEqPreference = 0, paces = null, trackIntervals = null, specificReps = null } = options;

        // Find the workout
        let workout = null;
        let category = null;

        for (const [cat, workouts] of Object.entries(this.workoutLibrary)) {
            const found = workouts.find(w =>
                w.name.toLowerCase().includes(workoutName.toLowerCase()) ||
                workoutName.toLowerCase().includes(w.name.toLowerCase())
            );
            if (found) {
                workout = found;
                category = cat;
                break;
            }
        }

        if (!workout) {
            throw new Error(`Workout "${workoutName}" not found`);
        }

        const intensityInfo = this.intervalIntensityGuidelines[workout.intensity];

        // Use specificReps if provided (from progression logic), otherwise use workout default
        const repetitionsToUse = specificReps || workout.repetitions;

        // Build base workout object
        const prescribedWorkout = {
            ...workout,
            repetitions: repetitionsToUse,  // Override with specific reps
            category,
            intensityGuidance: intensityInfo,
            totalWorkout: this.calculateTotalWorkout(workout, paces, repetitionsToUse),  // Pass specific reps
            runEqOptions: this.generateRunEqOptions(workout, runEqPreference),
            safetyNotes: this.getIntervalSafetyNotes(workout),
            alternatives: this.getIntervalAlternatives(workout),
            warmupCooldown: this.getWarmupCooldown(workout.intensity, paces)
        };

        // INJECT USER-SPECIFIC PACES if provided
        if (paces) {
            prescribedWorkout.paces = paces;
            prescribedWorkout.trackIntervals = trackIntervals;
            prescribedWorkout.name = this.injectPacesIntoName(workout.name, repetitionsToUse, paces, trackIntervals);  // Use specificReps here
            prescribedWorkout.repetitions = this.injectPacesIntoReps(repetitionsToUse, paces, trackIntervals);  // Use specificReps here
            prescribedWorkout.description = this.injectPacesIntoDescription(workout.description, workout.pace, paces);
        }

        return prescribedWorkout;
    }

    /**
     * Convert track interval time to per-mile pace
     * E.g., "6:32" for 1200m -> "8:46/mi"
     */
    convertToMilePace(time, distanceMeters) {
        // Parse time (format: "M:SS" or "MM:SS")
        const parts = time.split(':');
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        const totalSeconds = minutes * 60 + seconds;

        // Convert to per-mile pace
        const metersPerMile = 1609.34;
        const secondsPerMile = (totalSeconds / distanceMeters) * metersPerMile;

        const mileMinutes = Math.floor(secondsPerMile / 60);
        const mileSeconds = Math.round(secondsPerMile % 60);

        return `${mileMinutes}:${mileSeconds.toString().padStart(2, '0')}/mi`;
    }

    /**
     * Inject specific pace numbers into workout name
     */
    injectPacesIntoName(name, repetitions, paces, trackIntervals) {
        let updatedName = name;

        // Add interval pace to the name
        if (paces.interval && trackIntervals && trackIntervals.interval) {
            // For track workouts, show the specific interval time AND equivalent per-mile pace
            if (repetitions.includes('400m') && trackIntervals.interval['400m']) {
                const milePace = this.convertToMilePace(trackIntervals.interval['400m'], 400);
                updatedName = `${name} (${trackIntervals.interval['400m']}/400m = ${milePace})`;
            } else if (repetitions.includes('800m') && trackIntervals.threshold && trackIntervals.threshold['800m']) {
                const milePace = this.convertToMilePace(trackIntervals.threshold['800m'], 800);
                updatedName = `${name} (${trackIntervals.threshold['800m']}/800m = ${milePace})`;
            } else if (repetitions.includes('1200m') && trackIntervals.threshold && trackIntervals.threshold['1200m']) {
                const milePace = this.convertToMilePace(trackIntervals.threshold['1200m'], 1200);
                updatedName = `${name} (${trackIntervals.threshold['1200m']}/1200m = ${milePace})`;
            } else if (repetitions.includes('200m') && trackIntervals.interval['200m']) {
                const milePace = this.convertToMilePace(trackIntervals.interval['200m'], 200);
                updatedName = `${name} (${trackIntervals.interval['200m']}/200m = ${milePace})`;
            } else {
                // Fallback to mile pace
                updatedName = `${name} (${paces.interval.pace}/mi)`;
            }
        } else if (paces.interval) {
            updatedName = `${name} (${paces.interval.pace}/mi)`;
        }

        return updatedName;
    }

    /**
     * Inject specific pace numbers into workout repetitions
     */
    injectPacesIntoReps(repetitions, paces, trackIntervals) {
        let updated = repetitions;

        // Handle track interval distances with specific times
        if (trackIntervals && trackIntervals.interval) {
            if (updated.includes('400m') && trackIntervals.interval['400m']) {
                updated = updated.replace(/(\d+)\s*x\s*400m/g, `$1 x 400m (${trackIntervals.interval['400m']} each)`);
            }
            if (updated.includes('800m') && trackIntervals.threshold && trackIntervals.threshold['800m']) {
                updated = updated.replace(/(\d+)\s*x\s*800m/g, `$1 x 800m (${trackIntervals.threshold['800m']} each)`);
            }
            if (updated.includes('1200m') && trackIntervals.threshold && trackIntervals.threshold['1200m']) {
                updated = updated.replace(/(\d+)\s*x\s*1200m/g, `$1 x 1200m (${trackIntervals.threshold['1200m']} each)`);
            }
            if (updated.includes('200m') && trackIntervals.interval['200m']) {
                updated = updated.replace(/(\d+)\s*x\s*200m/g, `$1 x 200m (${trackIntervals.interval['200m']} each)`);
            }
        }

        // Handle mile pace
        if (paces.interval) {
            updated = updated.replace(/(\d+)\s*x\s*1\s*mile/g, `$1 x 1 mile @ ${paces.interval.pace}/mile`);
            updated = updated.replace(/(\d+)\s*x\s*2\s*mile/g, `$1 x 2 miles @ ${paces.interval.pace}/mile`);
        }

        return updated;
    }

    /**
     * Inject specific pace numbers into workout description
     */
    injectPacesIntoDescription(description, genericPace, paces) {
        let updated = description;

        // Map generic pace descriptions to actual paces
        if (paces.interval && (genericPace.includes('5K') || genericPace.includes('VO2'))) {
            updated = updated.replace(/5K race pace/g, `${paces.interval.pace}/mile (5K race pace)`);
            updated = updated.replace(/5K pace/g, `${paces.interval.pace}/mile`);
        }

        if (paces.threshold && (genericPace.includes('10K') || genericPace.includes('threshold'))) {
            updated = updated.replace(/10K race pace/g, `${paces.threshold.pace}/mile (10K/threshold pace)`);
            updated = updated.replace(/10K pace/g, `${paces.threshold.pace}/mile`);
        }

        return updated;
    }

    calculateTotalWorkout(workout, paces = null, specificReps = null) {
        let warmup = "15-20 minutes easy + dynamic warmup + 3-4 strides";
        let cooldown = "15-20 minutes easy";

        if (paces && paces.easy) {
            warmup = `15-20 minutes easy (${paces.easy.min}-${paces.easy.max}/mile) + dynamic warmup + 3-4 strides`;
            cooldown = `15-20 minutes easy (${paces.easy.min}-${paces.easy.max}/mile)`;
        }

        // Use specific reps if provided, otherwise use original workout reps
        const repsToDisplay = specificReps || workout.repetitions;

        let estimatedTime = "50-70 minutes total";
        if (workout.intensity === "shortSpeed") {
            estimatedTime = "45-60 minutes total";
        } else if (repsToDisplay.includes("x 6") || repsToDisplay.includes("x 8")) {
            estimatedTime = "60-75 minutes total";
        }

        return {
            structure: `${warmup} + ${repsToDisplay} + ${cooldown}`,
            estimatedTime,
            focusPhase: "Main interval set should take 15-30 minutes"
        };
    }

    generateRunEqOptions(workout, preference) {
        const options = {
            optionA: "Full running workout",
            optionB: "First half of intervals running, second half riding (Cyclete/Elliptigo)",
            optionC: "Alternate each interval between running and riding",
            optionD: "Full Cyclete/Elliptigo ride (use Garmin RunEQ data field to track equivalent miles)"
        };

        if (preference >= 70) {
            options.recommendation = "Full Cyclete/Elliptigo ride";
        } else if (preference >= 40) {
            options.recommendation = "Split intervals - some running, some riding";
        } else if (preference >= 20) {
            options.recommendation = "Alternate every other interval";
        } else {
            options.recommendation = "Full running workout";
        }

        return options;
    }

    getIntervalSafetyNotes(workout) {
        const baseNotes = [
            "Proper warmup is CRUCIAL - never skip the full warmup routine",
            "Start conservatively - first interval should feel controlled",
            "Recovery should be truly easy - avoid rushing between intervals",
            "Stop workout if form breaks down significantly"
        ];

        if (workout.intensity === "shortSpeed") {
            baseNotes.push("Complete recovery between reps - walk or very easy jog only");
            baseNotes.push("Focus on form and efficiency over pure speed");
        } else if (workout.intensity === "vo2Max") {
            baseNotes.push("Should reach breathing heavily but not gasping");
            baseNotes.push("Equal time recovery allows partial recovery while maintaining stimulus");
        } else {
            baseNotes.push("Maintain consistent pace across all intervals");
            baseNotes.push("These should feel 'comfortably hard' not all-out");
        }

        return baseNotes;
    }

    getWarmupCooldown(intensity, paces = null) {
        const base = {
            warmup: "15-20 minutes easy running + 5 minutes dynamic exercises + 3-4 x 20-second strides",
            cooldown: "15-20 minutes easy running + stretching"
        };

        if (paces && paces.easy) {
            base.warmup = `15-20 minutes easy running (${paces.easy.min}-${paces.easy.max}/mile) + 5 minutes dynamic exercises + 3-4 x 20-second strides`;
            base.cooldown = `15-20 minutes easy running (${paces.easy.min}-${paces.easy.max}/mile) + stretching`;
        }

        if (intensity === "shortSpeed") {
            if (paces && paces.easy) {
                base.warmup = `20-25 minutes easy running (${paces.easy.min}-${paces.easy.max}/mile) + 10 minutes dynamic warmup + 4-6 progressive strides`;
            } else {
                base.warmup = "20-25 minutes easy running + 10 minutes dynamic warmup + 4-6 progressive strides";
            }
            base.notes = "Extra warmup time crucial for speed work";
        }

        return base;
    }

    getIntervalAlternatives(workout) {
        return {
            noTrack: {
                "200m": "20-30 second hard efforts on any surface",
                "400m": "60-90 second hard efforts", 
                "800m": "2.5-3 minute hard efforts",
                "1000m": "3-4 minute hard efforts",
                "1 mile": "5-7 minute hard efforts"
            },
            badWeather: "Treadmill (use 1% incline), indoor track, or covered parking garage",
            injury: "Pool running, elliptical, or Cyclete/Elliptigo ride maintaining same effort level",
            altitude: "Reduce pace by 15-30 seconds per mile, extend recovery time",
            heat: "Run early morning, extend recovery, focus on effort over pace",
            beginners: "Start with fewer reps, longer recovery, slightly easier pace"
        };
    }

    /**
     * Get workouts by category
     */
    getWorkoutsByCategory(category) {
        return this.workoutLibrary[category] || [];
    }

    /**
     * Get all categories
     */
    getCategories() {
        return Object.keys(this.workoutLibrary);
    }

    /**
     * Get a random workout from a specific category
     */
    getRandomWorkout(category) {
        const workouts = this.getWorkoutsByCategory(category);
        if (workouts.length === 0) {
            throw new Error(`No workouts found in category: ${category}`);
        }
        const randomIndex = Math.floor(Math.random() * workouts.length);
        return workouts[randomIndex];
    }

    /**
     * Search workouts
     */
    searchWorkouts(query) {
        const results = [];
        const searchTerm = query.toLowerCase();

        for (const [category, workouts] of Object.entries(this.workoutLibrary)) {
            for (const workout of workouts) {
                if (workout.name.toLowerCase().includes(searchTerm) ||
                    workout.description.toLowerCase().includes(searchTerm) ||
                    workout.source.toLowerCase().includes(searchTerm)) {
                    results.push({ ...workout, category });
                }
            }
        }

        return results;
    }
}