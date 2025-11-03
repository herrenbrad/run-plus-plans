/**
 * RunEq Comprehensive Hill Workout Library
 * Addresses Runna's limitation of repetitive "30-60 second hill reps"
 * Includes varied hill workouts with specific grade/distance requirements
 */

export class HillWorkoutLibrary {
    constructor() {
        this.hillGradeGuidelines = {
            gentle: { min: 2, max: 4, description: "2-4% grade - sustainable for longer efforts" },
            moderate: { min: 4, max: 7, description: "4-7% grade - challenging but manageable" },
            steep: { min: 7, max: 12, description: "7-12% grade - short, intense efforts" },
            very_steep: { min: 12, max: 20, description: "12-20% grade - power/strength focus" }
        };
        
        this.workoutLibrary = this.buildWorkoutLibrary();
    }

    buildWorkoutLibrary() {
        return {
            // SHORT POWER HILLS (10-30 seconds)
            short_power: [
                {
                    name: "Hill Strides",
                    duration: "10-15 seconds",
                    hillRequirement: {
                        grade: "moderate",
                        distance: "50-100 meters",
                        description: "Find a 4-7% grade hill, at least 50m long"
                    },
                    workout: {
                        warmup: "15 min easy + 4x20sec strides on flat",
                        main: "6-8 x 12sec hill strides @ 90% effort",
                        recovery: "Walk/jog down + 1 min easy",
                        cooldown: "10-15 min easy"
                    },
                    focus: "Neuromuscular power, running form, leg turnover",
                    intensity: "Very High (TE 4.0+)",
                    runEqOptions: {
                        optionA: "Full running workout as prescribed",
                        optionB: "Warmup riding (Cyclete/Elliptigo), hill reps running, cooldown riding",
                        optionC: "Hill power intervals on Cyclete/Elliptigo (same RunEQ miles)",
                        optionD: "Full Cyclete/Elliptigo ride (use Garmin RunEQ data field)"
                    }
                },
                {
                    name: "Stadium Steps Simulation",
                    duration: "20-30 seconds",
                    hillRequirement: {
                        grade: "steep",
                        distance: "75-150 meters", 
                        description: "Find a 7-12% grade hill, stadium steps, or parking garage ramp"
                    },
                    workout: {
                        warmup: "20 min easy + dynamic drills",
                        main: "5-8 x 25sec explosive hill climbs @ 95% effort",
                        recovery: "Walk down + 2 min easy jog",
                        cooldown: "15 min easy"
                    },
                    focus: "Explosive power, anaerobic capacity, mental toughness",
                    intensity: "Maximum (TE 4.5+)"
                }
            ],

            // MEDIUM HILLS (1-4 minutes)  
            medium_vo2: [
                {
                    name: "Classic Hill Repeats",
                    duration: "2-3 minutes",
                    hillRequirement: {
                        grade: "moderate",
                        distance: "400-800 meters",
                        description: "Find a steady 4-7% grade, like your 0.75-mile hill"
                    },
                    workout: {
                        warmup: "20 min easy + 3x30sec pickups",
                        main: "4-6 x 2.5 min uphill @ threshold effort",
                        recovery: "Jog/walk down + 90sec easy",
                        cooldown: "15 min easy"
                    },
                    focus: "VO2 max, lactate threshold, hill running economy",
                    intensity: "Hard (TE 3.5-4.0)",
                    progression: {
                        week1: "4 x 2 min",
                        week2: "5 x 2 min", 
                        week3: "4 x 2.5 min",
                        week4: "5 x 2.5 min"
                    }
                },
                {
                    name: "Hill Pyramid",
                    duration: "Variable (1-4 min)",
                    hillRequirement: {
                        grade: "moderate",
                        distance: "600+ meters",
                        description: "Long steady hill - your 0.75-mile hill is perfect"
                    },
                    workout: {
                        warmup: "20 min easy",
                        main: "1-2-3-4-3-2-1 min uphill @ building effort",
                        recovery: "Equal time easy jog/walk down between reps",
                        cooldown: "15 min easy"
                    },
                    focus: "Progressive effort, mental strength, pacing discipline",
                    intensity: "Progressive (TE 3.0-4.0)"
                }
            ],

            // LONG STRENGTH HILLS (4-10+ minutes)
            long_strength: [
                {
                    name: "Tempo Hills",
                    duration: "6-12 minutes",
                    hillRequirement: {
                        grade: "gentle", 
                        distance: "1+ miles",
                        description: "Find a long 2-4% grade - perfect for your 0.75-mile hill!"
                    },
                    workout: {
                        warmup: "15-20 min easy",
                        main: "2-3 x 8-10 min uphill @ tempo effort", 
                        recovery: "5 min easy (jog down + flat)",
                        cooldown: "15 min easy"
                    },
                    focus: "Sustained power, aerobic strength, mental endurance",
                    intensity: "Moderately Hard (TE 3.0-3.5)",
                    runEqOptions: {
                        optionA: "Full running workout",
                        optionB: "First rep running, second rep riding (Cyclete/Elliptigo)",
                        optionC: "Alternate running/riding every 2-3 minutes",
                        optionD: "Full Cyclete/Elliptigo ride (use Garmin RunEQ data field)"
                    }
                },
                {
                    name: "Long Hill Progression",
                    duration: "8-15 minutes",
                    hillRequirement: {
                        grade: "gentle_to_moderate",
                        distance: "1.5+ miles",
                        description: "Long gradual climb - multiple loops of your hill work great"
                    },
                    workout: {
                        warmup: "20 min easy",
                        main: "12 min continuous uphill: 4min easy→4min moderate→4min hard",
                        recovery: "Walk/easy jog down",
                        repeat: "1-2 more times depending on fitness",
                        cooldown: "15-20 min easy"
                    },
                    focus: "Progressive effort, race simulation, mental toughness"
                }
            ],

            // HILL CIRCUITS & COMBINATIONS
            hill_circuits: [
                {
                    name: "Hill Circuit Training",
                    duration: "30-45 minutes",
                    hillRequirement: {
                        grade: "moderate",
                        distance: "Circuit of 1-2 miles", 
                        description: "Perfect for your 2-mile loop with 0.75-mile climb!"
                    },
                    workout: {
                        warmup: "15 min easy + dynamic drills",
                        main: "4-6 complete loops:\n• 0.75mi climb @ steady effort\n• Downhill recovery @ controlled pace\n• 0.25mi flat @ easy pace",
                        effort: "Build effort each loop (start 70%, finish 85%)",
                        cooldown: "10-15 min easy"
                    },
                    focus: "Hill-specific endurance, downhill control, circuit training",
                    intensity: "Moderate-Hard (TE 3.0-3.5)",
                    seasonal: "Great for base building and hill marathon prep"
                },
                {
                    name: "Hill Fartlek", 
                    duration: "25-35 minutes",
                    hillRequirement: {
                        grade: "rolling_terrain",
                        distance: "Varied",
                        description: "Rolling hills or repeated loops with varied efforts"
                    },
                    workout: {
                        warmup: "15 min easy",
                        main: "20 min continuous fartlek on hills:\n• Up hills: surge to moderate-hard\n• Down hills: controlled but not easy\n• Flats: settle to steady tempo",
                        style: "Unstructured - respond to terrain",
                        cooldown: "15 min easy"
                    },
                    focus: "Terrain adaptation, variable pacing, race preparation"
                }
            ],

            // DOWNHILL TRAINING
            downhill_specific: [
                {
                    name: "Controlled Downhill Repeats",
                    duration: "1-3 minutes", 
                    hillRequirement: {
                        grade: "moderate",
                        distance: "400-800 meters downhill",
                        description: "The downhill section of your 2-mile loop is ideal"
                    },
                    workout: {
                        warmup: "20 min easy + leg swings",
                        main: "5-8 x 90sec controlled fast downhill",
                        technique: "Quick cadence, lean slightly forward, land on forefoot",
                        recovery: "Walk/jog up hill + 1 min easy",
                        cooldown: "15 min easy + stretching"
                    },
                    focus: "Eccentric strength, downhill speed, injury prevention",
                    intensity: "Moderate (TE 2.5-3.0)",
                    caution: "Start conservative - high injury risk if overdone"
                }
            ],

            // SPECIALTY HILL WORKOUTS
            specialty: [
                {
                    name: "Hill Progression Run",
                    duration: "45-60 minutes",
                    hillRequirement: {
                        grade: "rolling_or_repeatable",
                        distance: "Multiple miles",
                        description: "Your 2-mile loop repeated, or rolling terrain course"
                    },
                    workout: {
                        warmup: "15 min easy",
                        main: "30-40 min progression:\n• First 10 min: easy on hills\n• Middle 15-20 min: moderate effort on climbs\n• Final 10-15 min: strong effort on all uphills",
                        approach: "Gradual effort increase, maintain form",
                        cooldown: "10-15 min easy"
                    },
                    focus: "Progressive loading, race preparation, mental preparation"
                },
                {
                    name: "Over-Under Hills",
                    duration: "Variable",
                    hillRequirement: {
                        grade: "moderate",
                        distance: "Long steady climb",
                        description: "Single long hill or multiple loops of your 0.75-mile climb"
                    },
                    workout: {
                        warmup: "20 min easy",
                        main: "3-4 x 6 min on hill: 3min @ threshold, 3min @ slightly above threshold",
                        pattern: "Switch effort every 3 minutes without stopping",
                        recovery: "4-5 min easy between sets",
                        cooldown: "15 min easy"
                    },
                    focus: "Lactate clearance, threshold power, race-pace variability"
                }
            ]
        };
    }

    /**
     * Get appropriate hill workouts based on training phase and available terrain
     */
    getWorkoutsForTerrain(terrainType, trainingPhase = 'build', fitnessLevel = 'intermediate') {
        const recommendations = [];
        
        // Your specific 2-mile loop example
        if (terrainType === 'loop_with_climb') {
            recommendations.push(
                ...this.workoutLibrary.long_strength.filter(w => w.name.includes('Tempo')),
                ...this.workoutLibrary.hill_circuits,
                ...this.workoutLibrary.medium_vo2.filter(w => w.name.includes('Pyramid'))
            );
        }
        
        // Generic terrain matching
        const terrainWorkouts = {
            short_steep: [...this.workoutLibrary.short_power],
            medium_steady: [...this.workoutLibrary.medium_vo2],
            long_gentle: [...this.workoutLibrary.long_strength],
            rolling_terrain: [...this.workoutLibrary.specialty, ...this.workoutLibrary.hill_circuits]
        };
        
        return terrainWorkouts[terrainType] || [];
    }

    /**
     * Generate hill workout prescription with specific terrain requirements
     */
    prescribeHillWorkout(workoutId, userPreferences = {}) {
        const { runEqPreference = 0, paces = null } = userPreferences;

        // Find workout in library
        let workout = null;
        let category = null;

        for (const [cat, workouts] of Object.entries(this.workoutLibrary)) {
            const found = workouts.find(w => w.name.toLowerCase().includes(workoutId.toLowerCase()));
            if (found) {
                workout = found;
                category = cat;
                break;
            }
        }

        if (!workout) return null;

        const prescription = {
            ...workout,
            terrainInstructions: this.generateTerrainInstructions(workout.hillRequirement),
            runEqAdaptation: this.adaptForRunEq(workout, runEqPreference),
            safetyNotes: this.generateSafetyNotes(category, workout),
            alternatives: this.suggestAlternatives(workout.hillRequirement)
        };

        // INJECT USER-SPECIFIC PACES if provided
        if (paces) {
            prescription.paces = paces;
            prescription.name = this.injectPacesIntoName(workout.name, paces);  // NEW: Inject paces into name!
        }

        return prescription;
    }

    /**
     * Inject specific pace numbers into workout name
     */
    injectPacesIntoName(name, paces) {
        let updatedName = name;

        // For hill workouts, add threshold or interval pace depending on intensity
        if (paces.threshold) {
            updatedName = `${name} (${paces.threshold.pace}/mi)`;
        } else if (paces.interval) {
            updatedName = `${name} (${paces.interval.pace}/mi)`;
        }

        return updatedName;
    }

    generateTerrainInstructions(hillRequirement) {
        if (!hillRequirement || !hillRequirement.grade) {
            return {
                findHill: "Look for a moderate hill with 4-7% grade",
                measurement: "Use your phone's inclinometer app or estimate: you should feel challenged but able to maintain form",
                distance: "Hill should be at least 100 meters long",
                examples: ["Neighborhood hills", "Park paths", "Treadmill incline"],
                backup: "If no ideal hill available, use treadmill at appropriate incline or find closest available grade"
            };
        }
        
        const grade = this.hillGradeGuidelines[hillRequirement.grade];
        if (!grade) {
            return this.generateTerrainInstructions(null); // Fallback to default
        }
        
        return {
            findHill: `Look for a hill with ${grade.description}`,
            measurement: "Use your phone's inclinometer app or estimate: you should feel challenged but able to maintain form",
            distance: `Hill should be at least ${hillRequirement.distance}`,
            examples: this.getTerrainExamples(hillRequirement.grade),
            backup: "If no ideal hill available, use treadmill at appropriate incline or find closest available grade"
        };
    }

    getTerrainExamples(gradeType) {
        const examples = {
            gentle: ["Long highway on-ramps", "Gradual neighborhood streets", "Park paths with slight incline", "Treadmill at 2-4% incline"],
            moderate: ["Typical neighborhood hills", "Multi-story parking garage ramps", "Bridge approaches", "Treadmill at 4-7% incline"],  
            steep: ["Short neighborhood climbs", "Stadium stairs", "Steep parking garage ramps", "Treadmill at 7-12% incline"],
            very_steep: ["Stadium steps", "Ski slope access roads", "Short power line hills", "Treadmill at 12%+ incline"]
        };
        
        return examples[gradeType] || [];
    }

    adaptForRunEq(workout, runEqPreference) {
        if (runEqPreference === 0) return { note: "Full running workout as prescribed" };
        
        if (!workout.runEqOptions) {
            // Generate default RunEq options
            return {
                lowPreference: "Consider doing warmup/cooldown on Cyclete/Elliptigo",
                mediumPreference: "Alternate running and Cyclete/Elliptigo intervals",
                highPreference: "Full Cyclete/Elliptigo ride (use Garmin RunEQ data field to track equivalent miles)"
            };
        }
        
        // Use specific RunEq options if available
        if (runEqPreference <= 25) return { recommendation: workout.runEqOptions.optionA };
        if (runEqPreference <= 50) return { recommendation: workout.runEqOptions.optionB };
        if (runEqPreference <= 75) return { recommendation: workout.runEqOptions.optionC };
        return { recommendation: workout.runEqOptions.optionD };
    }

    generateSafetyNotes(category, workout) {
        const baseNotes = [
            "Start conservatively and build intensity gradually",
            "Focus on form - don't let hills break down your running mechanics",
            "Stay hydrated and fuel appropriately for longer hill sessions"
        ];
        
        const categoryNotes = {
            short_power: ["Very high intensity - ensure adequate recovery", "Perfect form is critical at high speeds"],
            medium_vo2: ["Monitor effort level - hills amplify perceived exertion", "Don't start too fast on first rep"],
            long_strength: ["Pace should feel sustainable for the full duration", "Mental focus is as important as physical strength"],
            downhill_specific: ["HIGH INJURY RISK - start very conservatively", "Focus on quick cadence, not long strides", "Stop if you feel excessive quad/knee stress"],
            hill_circuits: ["Monitor cumulative fatigue across multiple loops", "Adjust effort based on conditions and fatigue"]
        };
        
        return [...baseNotes, ...(categoryNotes[category] || [])];
    }

    suggestAlternatives(hillRequirement) {
        return {
            noHill: "Use treadmill with appropriate incline setting",
            hillTooShort: "Repeat shorter hill multiple times with brief recovery", 
            hillTooLong: "Use only portion of longer hill, mark turnaround point",
            wrongGrade: "Adjust effort level to compensate - easier on steeper hills, harder on gentler grades",
            indoorOption: "StairMaster, stadium stairs, or parking garage ramps can substitute"
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
                    workout.focus.toLowerCase().includes(searchTerm)) {
                    results.push({ ...workout, category });
                }
            }
        }

        return results;
    }
}

// Browser-compatible library - Node.js test code removed