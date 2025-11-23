/**
 * RunEq Comprehensive Tempo Workout Library
 * Based on research from McMillan Running, Hal Higdon, Ben Parkes, and Runner's World
 * Addresses variety in lactate threshold training beyond basic tempo runs
 */
import { convertVagueStructureToSpecific } from './workout-structure-converter.js';

export class TempoWorkoutLibrary {
    constructor() {
        this.tempoIntensityGuidelines = {
            comfortablyHard: { 
                description: "Controlled breathing, can speak in short sentences",
                heartRate: "86-90% max HR",
                effort: "Medium-hard effort, sustainable for 20-60 minutes"
            },
            thresholdPace: {
                description: "Lactate threshold pace - usually around 1-hour race pace",
                heartRate: "88-92% max HR", 
                effort: "Controlled discomfort, rhythmic breathing"
            },
            tempoPlus: {
                description: "Slightly faster than threshold - 10K to 15K pace",
                heartRate: "90-94% max HR",
                effort: "Harder breathing, shorter sustainable durations"
            }
        };

        this.workoutLibrary = {
            TRADITIONAL_TEMPO: [
                {
                    name: "Classic Tempo Run",
                    duration: "20-40 minutes",
                    structure: "15-20 min easy warmup + 20-40 min tempo + 10-15 min easy cooldown",
                    intensity: "comfortablyHard",
                    source: "Hal Higdon / McMillan",
                    description: "Continuous run at lactate threshold pace",
                    benefits: "Improves lactate clearance, race pacing, mental toughness",
                    progression: {
                        beginner: "Start with 15-20 min tempo, build by 3-5 min weekly",
                        intermediate: "20-30 min tempo, focus on consistent pacing", 
                        advanced: "30-40 min tempo, practice race-specific scenarios"
                    }
                },
                {
                    name: "Sandwich Tempo",
                    duration: "30-45 minutes total",
                    structure: "10-15 min easy + 15-20 min tempo + 5-10 min easy",
                    intensity: "comfortablyHard",
                    source: "Hal Higdon adaptation",
                    description: "Tempo effort sandwiched between easy running",
                    benefits: "Teaches body to settle into tempo rhythm, race simulation"
                }
            ],

            TEMPO_INTERVALS: [
                {
                    name: "McMillan 2x2 Miles",
                    duration: "45-50 minutes total",
                    structure: "Warmup + 2x2 miles @ tempo with 3 min recovery + Cooldown",
                    intensity: "thresholdPace",
                    source: "McMillan Running",
                    description: "Two 2-mile repeats at threshold pace",
                    benefits: "Mental preparation for longer races, pacing practice",
                    variations: [
                        "2x3 miles for marathon training",
                        "3x2 miles for advanced athletes",
                        "2x1.5 miles for beginners"
                    ]
                },
                {
                    name: "Cruise Intervals",
                    duration: "30-40 minutes total", 
                    structure: "Warmup + 4-6 x 3-8 min @ tempo with 1-2 min recovery + Cooldown",
                    intensity: "thresholdPace",
                    source: "Jack Daniels / McMillan",
                    description: "Multiple medium-length intervals at threshold pace",
                    benefits: "Accumulates time at threshold, teaches recovery between efforts",
                    examples: [
                        "4 x 5 min with 90 sec recovery",
                        "5 x 4 min with 2 min recovery", 
                        "6 x 3 min with 60 sec recovery"
                    ]
                },
                {
                    name: "Cutdown Tempo Intervals",
                    duration: "40-45 minutes total",
                    structure: "Warmup + 5 min + 4 min + 3 min + 2 min @ tempo (2 min recovery) + Cooldown",
                    intensity: "thresholdPace",
                    source: "Advanced coaching adaptation",
                    description: "Descending interval lengths at consistent tempo pace", 
                    benefits: "Mental strength, teaches pace discipline under fatigue"
                }
            ],

            ALTERNATING_TEMPO: [
                {
                    name: "McMillan Minutes Workout", 
                    duration: "20-60 minutes total",
                    structure: "Warmup + Alternate 1 min tempo / 1 min easy x 10-30 + Cooldown",
                    intensity: "comfortablyHard",
                    source: "McMillan Running",
                    description: "Alternate tempo and easy minutes without stopping",
                    benefits: "Avoids going too fast, accumulates threshold time",
                    progression: {
                        week1: "10 x (1 min on / 1 min easy)",
                        week4: "20 x (1 min on / 1 min easy)", 
                        week8: "25-30 x (1 min on / 1 min easy)"
                    },
                    notes: "Easy minutes naturally get faster as workout progresses"
                },
                {
                    name: "2 Minutes On/Off",
                    duration: "32-48 minutes total",
                    structure: "Warmup + 8-12 x (2 min tempo / 2 min easy) + Cooldown", 
                    intensity: "comfortablyHard",
                    source: "Tempo progression adaptation",
                    description: "Longer alternating segments for advanced athletes",
                    benefits: "Extended time in tempo zone, teaches rhythm"
                },
                {
                    name: "Tempo Fartlek",
                    duration: "25-35 minutes total",
                    structure: "Warmup + 15-20 min of varied tempo surges (30sec-3min) + Cooldown",
                    intensity: "comfortablyHard to tempoPlus", 
                    source: "Swedish fartlek adaptation",
                    description: "Unstructured tempo efforts based on feel and terrain",
                    benefits: "Teaches pace variety, mental flexibility, fun factor"
                }
            ],

            PROGRESSIVE_TEMPO: [
                {
                    name: "Build-Up Tempo",
                    duration: "25-35 minutes",
                    structure: "Warmup + 20 min building from easy to tempo + Cooldown",
                    intensity: "easy to comfortablyHard",
                    source: "Progressive training philosophy", 
                    description: "Gradually build from easy pace to tempo over 20 minutes",
                    benefits: "Smooth transition to tempo, teaches pacing, less jarring"
                },
                {
                    name: "Negative Split Tempo",
                    duration: "30-40 minutes",
                    structure: "Warmup + 2 x 10-15 min (first @ easy-moderate, second @ tempo) + Cooldown",
                    intensity: "moderate to comfortablyHard",
                    source: "Race pacing strategy",
                    description: "Two equal segments with second half at tempo pace", 
                    benefits: "Race strategy practice, controlled progression"
                },
                {
                    name: "Tempo Ladder",
                    duration: "35-45 minutes",
                    structure: "Warmup + 3-5-7-5-3 min @ tempo (2 min recovery) + Cooldown",
                    intensity: "thresholdPace",
                    source: "Pyramid training adaptation",
                    description: "Ladder format building to longer tempo effort",
                    benefits: "Mental preparation, variety in interval lengths"
                }
            ],

            RACE_SPECIFIC: [
                {
                    name: "Marathon Pace Tempo",
                    duration: "40-70 minutes",
                    structure: "Warmup + 6-13 miles @ marathon pace + Cooldown", 
                    intensity: "Slightly easier than comfortablyHard",
                    source: "Ben Parkes / Marathon specific",
                    description: "Extended runs at goal marathon pace",
                    benefits: "Marathon pace practice, aerobic development",
                    progression: "Start at 6 miles, build by 1-2 miles every 2-3 weeks"
                },
                {
                    name: "10K Tempo Simulation", 
                    duration: "35-45 minutes",
                    structure: "Warmup + 2 miles easy + 4 miles @ 10K pace + 1-2 miles easy",
                    intensity: "tempoPlus",
                    source: "Race pace training",
                    description: "Simulate 10K race effort within longer run",
                    benefits: "10K pacing, mental preparation, race confidence"
                }
            ]
        };
    }

    /**
     * Get tempo workout prescription with RunEq adaptations and USER-SPECIFIC PACES
     */
    prescribeTempoWorkout(workoutName, options = {}) {
        const { runEqPreference = 0, paces = null, weekNumber = null, totalWeeks = null } = options;

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

        const intensityInfo = this.tempoIntensityGuidelines[workout.intensity];

        // Build base workout object
        const prescribedWorkout = {
            ...workout,
            category,
            intensityGuidance: intensityInfo,
            runEqOptions: this.generateRunEqOptions(workout, runEqPreference),
            safetyNotes: this.getTempoSafetyNotes(workout),
            paceGuidance: this.getPaceGuidance(workout.intensity),
            alternatives: this.getTempoAlternatives(workout)
        };

        // INJECT USER-SPECIFIC PACES if provided
        if (paces) {
            prescribedWorkout.paces = paces;
            prescribedWorkout.name = this.injectPacesIntoName(workout.name, paces);  // NEW: Inject paces into name too!
            prescribedWorkout.structure = this.injectPacesIntoStructure(workout.structure, paces, weekNumber, totalWeeks);
            prescribedWorkout.description = this.injectPacesIntoDescription(workout.description, paces);
        } else {
            // Even without paces, convert vague structures to specific
            prescribedWorkout.structure = convertVagueStructureToSpecific(workout.structure, weekNumber, totalWeeks);
        }

        return prescribedWorkout;
    }

    /**
     * Inject specific pace numbers into workout name
     */
    injectPacesIntoName(name, paces) {
        let updatedName = name;

        // Add threshold pace to the name
        if (paces.threshold) {
            updatedName = `${name} (${paces.threshold.pace}/mi)`;
        }

        return updatedName;
    }

    /**
     * Inject specific pace numbers into workout structure
     * IMPROVED: Converts vague ranges to specific values first, then injects paces
     */
    injectPacesIntoStructure(structure, paces, weekNumber = null, totalWeeks = null) {
        // First, convert any vague ranges to specific values
        let updatedStructure = convertVagueStructureToSpecific(structure, weekNumber, totalWeeks);

        // Then replace generic pace terms with actual paces
        if (paces.threshold) {
            updatedStructure = updatedStructure.replace(/@ tempo/g, `@ ${paces.threshold.pace}/mile`);
            updatedStructure = updatedStructure.replace(/\bmin tempo\b/g, `min @ ${paces.threshold.pace}/mile`);
            updatedStructure = updatedStructure.replace(/tempo pace/g, `${paces.threshold.pace}/mile`);
        }

        if (paces.easy) {
            // Only replace "easy" if it doesn't already have a pace
            updatedStructure = updatedStructure.replace(/\beasy warmup\b/g, `easy (${paces.easy.min}-${paces.easy.max}/mile) warmup`);
            updatedStructure = updatedStructure.replace(/\beasy cooldown\b/g, `easy (${paces.easy.min}-${paces.easy.max}/mile) cooldown`);
            updatedStructure = updatedStructure.replace(/(\d+)(-\d+)? min easy\b/g, `$1$2 min easy (${paces.easy.min}-${paces.easy.max}/mile)`);
        }

        if (paces.marathon) {
            updatedStructure = updatedStructure.replace(/@ marathon pace/g, `@ ${paces.marathon.pace}/mile`);
            updatedStructure = updatedStructure.replace(/@ half pace/g, `@ ${paces.marathon.pace}/mile`); // Approximate half with marathon
            updatedStructure = updatedStructure.replace(/@ MP/g, `@ ${paces.marathon.pace}/mile`);
        }

        return updatedStructure;
    }

    /**
     * Inject specific pace numbers into workout description
     * IMPROVED: Better grammar - adds pace at end in parentheses
     */
    injectPacesIntoDescription(description, paces) {
        let updated = description;

        // Don't inject paces into description - description should be general
        // The specific pace will be shown in the structure and pace boxes
        // Just return the description as-is to avoid grammar issues like:
        // "Continuous run at lactate 8:45/mile threshold pace" (WRONG)

        return updated;
    }

    generateRunEqOptions(workout, preference) {
        const options = {
            optionA: "Full running workout",
            optionB: "First half running, second half riding (Cyclete/Elliptigo)",
            optionC: "Alternate running/riding every interval or segment",
            optionD: "Full Cyclete/Elliptigo ride (use Garmin RunEQ data field to track equivalent miles)"
        };

        if (preference >= 70) {
            options.recommendation = "Full Cyclete/Elliptigo ride";
        } else if (preference >= 40) {
            options.recommendation = "Split workout - start running, finish riding";
        } else if (preference >= 20) {
            options.recommendation = "Alternate segments between running and riding";
        } else {
            options.recommendation = "Full running workout";
        }

        return options;
    }

    getTempoSafetyNotes(workout) {
        const baseNotes = [
            "Start conservatively - tempo should feel 'controlled discomfort'",
            "If breathing becomes labored, slow down slightly", 
            "Better to run slightly too easy than too hard",
            "Recovery between intervals should be easy jogging or walking"
        ];

        if (workout.name.includes("Minutes") || workout.name.includes("Alternating")) {
            baseNotes.push("Let easy segments naturally speed up as workout progresses");
        }

        if (workout.duration.includes("40") || workout.duration.includes("50")) {
            baseNotes.push("Fuel appropriately for longer tempo sessions");
            baseNotes.push("Stay hydrated throughout the workout");
        }

        return baseNotes;
    }

    getPaceGuidance(intensity) {
        const guidance = {
            comfortablyHard: {
                description: "Half marathon to 10-mile race pace",
                breathingTest: "Can speak 3-5 words at a time",
                effortLevel: "7-8 out of 10",
                commonMistake: "Running too fast - this should feel controlled"
            },
            thresholdPace: {
                description: "15K to 1-hour race pace", 
                breathingTest: "Can speak 2-3 words with some difficulty",
                effortLevel: "8 out of 10",
                commonMistake: "Going anaerobic - keep it at threshold level"
            },
            tempoPlus: {
                description: "10K to 8K race pace",
                breathingTest: "Difficult to speak in sentences", 
                effortLevel: "8-9 out of 10",
                commonMistake: "Unsustainable pace - should feel hard but controlled"
            }
        };

        return guidance[intensity] || guidance.comfortablyHard;
    }

    getTempoAlternatives(workout) {
        return {
            treadmill: "Use slight incline (1-2%) to simulate outdoor effort",
            track: "4-6 laps for every mile of tempo running",
            badWeather: "Indoor track, treadmill, or covered area like parking garage", 
            injury: "Pool running, elliptical, or Cyclete/Elliptigo ride maintaining same effort level",
            noTime: "Shorten warmup/cooldown, focus on quality tempo portion",
            tooHard: "Reduce intensity to comfortable-moderate effort, build gradually",
            tooEasy: "Slightly increase pace, but avoid going anaerobic"
        };
    }

    /**
     * Get all workouts in a category
     */
    getWorkoutsByCategory(category) {
        return this.workoutLibrary[category] || [];
    }

    /**
     * Get all workout categories
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
     * Search workouts by name or description
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