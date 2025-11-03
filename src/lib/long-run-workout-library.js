/**
 * RunEq Comprehensive Long Run Workout Library
 * Based on research from McMillan Running, Hal Higdon, Ben Parkes, and Runner's World
 * Addresses the boring "run X miles easy" with varied long run formats
 */
export class LongRunWorkoutLibrary {
    constructor() {
        this.longRunIntensityGuidelines = {
            easy: {
                description: "Conversational pace, can speak in full sentences",
                pace: "30-90 seconds slower than marathon pace",
                heartRate: "65-78% max HR",
                effort: "Comfortable, sustainable for hours"
            },
            steadyState: {
                description: "Sustained aerobic effort, controlled breathing",
                pace: "1:15:00 to 2:30:00 race pace (usually 15-45 sec slower than marathon pace)", 
                heartRate: "83-87% max HR",
                effort: "Moderate effort, what you can sustain for 2-2.5 hours"
            },
            marathonPace: {
                description: "Goal marathon race pace",
                pace: "Marathon race pace",
                heartRate: "80-85% max HR", 
                effort: "Controlled hard effort, race-specific"
            },
            fastFinish: {
                description: "Faster than marathon pace for finishing segments",
                pace: "Half marathon to 10K pace",
                heartRate: "85-90% max HR",
                effort: "Strong finish, practice racing on tired legs"
            }
        };

        this.workoutLibrary = {
            TRADITIONAL_EASY: [
                {
                    name: "Classic Easy Long Run",
                    duration: "60-150 minutes",
                    structure: "Entire run at easy, conversational pace",
                    intensity: "easy",
                    source: "Hal Higdon foundation",
                    description: "Traditional base-building long run",
                    benefits: "Aerobic development, time on feet, mental endurance",
                    progression: "Increase by 1-2 miles per week, stepback every 3rd week",
                    notes: "30-90 seconds slower than marathon pace, finish refreshed"
                },
                {
                    name: "Conversational Long Run",
                    duration: "75-120 minutes", 
                    structure: "Run with partner/group, maintain conversation throughout",
                    intensity: "easy",
                    source: "Social running philosophy",
                    description: "Easy long run emphasizing conversational pace",
                    benefits: "Aerobic base, social aspect, pace discipline",
                    notes: "If you can't hold a conversation, you're going too fast"
                }
            ],

            PROGRESSIVE_RUNS: [
                {
                    name: "Thirds Progression",
                    duration: "45-90 minutes",
                    structure: "First 1/3 easy, middle 1/3 moderate, final 1/3 strong", 
                    intensity: "easy to fastFinish",
                    source: "McMillan Running",
                    description: "Equal time segments with increasing intensity",
                    benefits: "Teaches finishing speed, energy conservation",
                    example: "60 min run: 20 min easy + 20 min moderate + 20 min strong",
                    notes: "Final third at steady state or tempo pace, not all-out"
                },
                {
                    name: "DUSA Progression", 
                    duration: "50-90 minutes",
                    structure: "75-90% easy pace, final 10-25% strong pace",
                    intensity: "easy to fastFinish",
                    source: "McMillan Running (Discovery USA)",
                    description: "Majority easy with extended fast finish",
                    benefits: "Teaches racing on fatigued legs, builds confidence",
                    example: "60 min run: 45 min easy + 15 min strong pace",
                    notes: "Used by elite marathoners, builds race-specific fitness"
                },
                {
                    name: "Super Fast Finish", 
                    duration: "50-90 minutes",
                    structure: "Normal easy run + final 3-6 minutes at 5K race effort",
                    intensity: "easy to fastFinish",
                    source: "McMillan (Paul Tergat method)",
                    description: "Easy run with explosive final minutes",
                    benefits: "Finishing kick practice, confidence, speed on tired legs", 
                    notes: "Used by Paul Tergat for world record marathon buildup"
                },
                {
                    name: "10-Second Dropdowns",
                    duration: "45-75 minutes",
                    structure: "Drop pace by 10 seconds every mile (or every 10 minutes)",
                    intensity: "easy to marathonPace",
                    source: "Runner's World progression method",
                    description: "Gradual, systematic pace progression",
                    benefits: "Smooth pace control, negative split practice",
                    example: "Start 8:30 pace, drop to 8:20, 8:10, 8:00, etc."
                }
            ],

            STEADY_STATE_LONG: [
                {
                    name: "Marathon Pace Long Run",
                    duration: "60-120 minutes",
                    structure: "15-20 min easy warmup + 20-60 min @ marathon pace + 10-15 min easy",
                    intensity: "marathonPace", 
                    source: "Marathon-specific training",
                    description: "Extended time at goal marathon pace",
                    benefits: "Race pace practice, aerobic power, confidence",
                    progression: "Start with 20 min MP, build by 5-10 min weekly",
                    notes: "Practice fueling and pacing strategies"
                },
                {
                    name: "Steady State Long Run",
                    duration: "50-95 minutes", 
                    structure: "15 min easy warmup + 25-75 min steady state + 10 min easy",
                    intensity: "steadyState",
                    source: "McMillan Running",
                    description: "Extended aerobic effort at steady state pace",
                    benefits: "Aerobic power, endurance, lactate clearance",
                    notes: "Pace between 1:15:00 and 2:30:00 race pace"
                },
                {
                    name: "Half Marathon Pace Long Run",
                    duration: "60-90 minutes",
                    structure: "15 min easy + 30-60 min @ half marathon pace + 15 min easy", 
                    intensity: "steadyState",
                    source: "Half marathon training",
                    description: "Extended half marathon pace practice",
                    benefits: "Race-specific fitness, sustained speed"
                }
            ],

            MIXED_PACE_LONG: [
                {
                    name: "Fast-Slow Long Run",
                    duration: "60-120 minutes",
                    structure: "Alternate fast and easy segments (e.g., 2 min fast / 3 min easy)",
                    intensity: "easy to marathonPace", 
                    source: "Varied pace training",
                    description: "Alternating pace segments throughout long run",
                    benefits: "Pace variety, teaches recovery while running, mental engagement",
                    variations: [
                        "2 min fast / 3 min easy for entire run",
                        "5 min fast / 5 min easy x 6-12 sets", 
                        "1 mile fast / 2 miles easy pattern"
                    ]
                },
                {
                    name: "Surge Long Run", 
                    duration: "60-120 minutes",
                    structure: "Easy base pace with 30-60 second surges every 5-10 minutes",
                    intensity: "easy to fastFinish",
                    source: "Fartlek adaptation for long runs",
                    description: "Easy long run with regular speed surges", 
                    benefits: "Simulates race surges, mental toughness, speed on tired legs",
                    notes: "Surges should be strong but controlled, return to easy pace"
                },
                {
                    name: "Out-and-Back Negative Split",
                    duration: "60-120 minutes",
                    structure: "Run out easy, return faster (aim for 30-60 sec negative split)",
                    intensity: "easy to marathonPace",
                    source: "Negative split training",
                    description: "Practice negative splitting over long distance",
                    benefits: "Pacing discipline, finishing strength, race strategy",
                    notes: "Turn around at halfway point, aim to return 30-60 sec faster"
                }
            ],

            RACE_SIMULATION: [
                {
                    name: "Marathon Dress Rehearsal", 
                    duration: "120-180 minutes",
                    structure: "20-26 mile run at planned marathon paces with race fueling",
                    intensity: "easy to marathonPace",
                    source: "Marathon preparation",
                    description: "Full marathon simulation 3-4 weeks before race",
                    benefits: "Race day practice, fueling test, confidence",
                    structure_example: "6 easy + 13-16 @ MP + 1-3 easy cooldown",
                    notes: "Practice everything: clothing, fueling, pacing, mindset"
                },
                {
                    name: "Half Marathon Simulation",
                    duration: "90-120 minutes", 
                    structure: "15 min easy + 8-10 miles @ half pace + 15 min easy",
                    intensity: "easy to marathonPace",
                    source: "Half marathon preparation", 
                    description: "Simulate middle miles of half marathon",
                    benefits: "Race pace confidence, fueling practice",
                    notes: "Practice race day routine and mindset"
                },
                {
                    name: "Goal Pace Sandwich",
                    duration: "75-120 minutes",
                    structure: "Easy miles + goal pace block + easy miles (mimic race splits)",
                    intensity: "easy to marathonPace", 
                    source: "Race-specific training",
                    description: "Practice goal pace within context of longer run",
                    benefits: "Race pacing, mental preparation, confidence",
                    example: "3 easy + 6 @ goal pace + 3 easy for 12-mile long run"
                }
            ],

            TERRAIN_SPECIFIC: [
                {
                    name: "Rolling Hills Long Run",
                    duration: "60-120 minutes", 
                    structure: "Long run on rolling terrain, maintain effort (not pace)",
                    intensity: "easy to steadyState",
                    source: "Terrain-specific training",
                    description: "Long run emphasizing varied terrain", 
                    benefits: "Hill strength, effort-based pacing, race preparation",
                    notes: "Focus on consistent effort, let pace vary with terrain"
                },
                {
                    name: "Trail Long Run",
                    duration: "75-150 minutes",
                    structure: "Long run on trails, emphasis on time not distance", 
                    intensity: "easy",
                    source: "Trail running adaptation", 
                    description: "Time-based long run on trail terrain",
                    benefits: "Mental break, varied muscle recruitment, adventure",
                    notes: "Time-based rather than distance-based due to terrain"
                }
            ],

            RECOVERY_LONG: [
                {
                    name: "Aerobic Base Long Run",
                    duration: "90-150 minutes",
                    structure: "Very easy pace, focus on time on feet not speed",
                    intensity: "easy", 
                    source: "Base building philosophy",
                    description: "Ultra-easy long run for aerobic development",
                    benefits: "Aerobic base, active recovery, mental endurance",
                    notes: "Should feel refreshed after, not fatigued"
                },
                {
                    name: "Social Long Run", 
                    duration: "75-120 minutes",
                    structure: "Group long run with conversation throughout",
                    intensity: "easy",
                    source: "Social running", 
                    description: "Easy long run with group, emphasizing social aspect",
                    benefits: "Mental break, social connection, pace discipline"
                }
            ]
        };
    }

    /**
     * Get long run workout prescription with RunEq adaptations and USER-SPECIFIC PACES
     */
    prescribeLongRunWorkout(workoutName, options = {}) {
        const { runEqPreference = 0, distance = null, duration = null, paces = null } = options;

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

        // Build base workout object
        const prescribedWorkout = {
            ...workout,
            category,
            intensityGuidance: this.getIntensityGuidance(workout),
            runEqOptions: this.generateRunEqOptions(workout, runEqPreference),
            customization: this.getCustomizationOptions(workout, distance, duration, paces),
            safetyNotes: this.getLongRunSafetyNotes(workout),
            fuelingGuidance: this.getFuelingGuidance(workout),
            alternatives: this.getLongRunAlternatives(workout)
        };

        // INJECT USER-SPECIFIC PACES if provided
        if (paces) {
            prescribedWorkout.paces = paces;
            prescribedWorkout.name = this.injectPacesIntoName(workout.name, distance, paces);  // NEW: Inject distance and paces into name too!
            prescribedWorkout.structure = this.injectPacesIntoStructure(workout.structure, paces);
            prescribedWorkout.description = this.injectPacesIntoDescription(workout.description, paces);
        }

        return prescribedWorkout;
    }

    /**
     * Inject distance and pace numbers into workout name
     */
    injectPacesIntoName(name, distance, paces) {
        let updatedName = name;

        // Add distance and easy pace to the name
        if (distance && paces.easy) {
            updatedName = `${distance}-Mile ${name} (${paces.easy.min}-${paces.easy.max}/mi)`;
        } else if (distance) {
            updatedName = `${distance}-Mile ${name}`;
        } else if (paces.easy) {
            updatedName = `${name} (${paces.easy.min}-${paces.easy.max}/mi)`;
        }

        return updatedName;
    }

    /**
     * Inject specific pace numbers into long run structure
     */
    injectPacesIntoStructure(structure, paces) {
        let updated = structure;

        // Replace pace references with actual paces
        if (paces.easy) {
            updated = updated.replace(/easy pace/g, `easy pace (${paces.easy.min}-${paces.easy.max}/mile)`);
            updated = updated.replace(/easy warmup/g, `easy warmup (${paces.easy.min}-${paces.easy.max}/mile)`);
            updated = updated.replace(/\bmin easy/g, `min easy (${paces.easy.min}-${paces.easy.max}/mile)`);
            updated = updated.replace(/easy cooldown/g, `easy cooldown (${paces.easy.min}-${paces.easy.max}/mile)`);
            updated = updated.replace(/\bmiles easy/g, `miles easy (${paces.easy.min}-${paces.easy.max}/mile)`);
        }

        if (paces.marathon) {
            updated = updated.replace(/@ marathon pace/g, `@ ${paces.marathon.pace}/mile marathon pace`);
            updated = updated.replace(/@ MP/g, `@ ${paces.marathon.pace}/mile`);
            updated = updated.replace(/@ half pace/g, `@ ${paces.marathon.pace}/mile pace`);
        }

        if (paces.threshold) {
            updated = updated.replace(/steady state/g, `steady state (${paces.threshold.pace}/mile)`);
            updated = updated.replace(/strong pace/g, `strong pace (${paces.threshold.pace}/mile)`);
        }

        return updated;
    }

    /**
     * Inject specific pace numbers into long run description
     */
    injectPacesIntoDescription(description, paces) {
        let updated = description;

        if (paces.easy) {
            updated = updated.replace(/easy pace/g, `easy pace (${paces.easy.min}-${paces.easy.max}/mile)`);
            updated = updated.replace(/conversational pace/g, `conversational pace (${paces.easy.min}-${paces.easy.max}/mile)`);
        }

        if (paces.marathon) {
            updated = updated.replace(/marathon pace/g, `marathon pace (${paces.marathon.pace}/mile)`);
            updated = updated.replace(/goal pace/g, `goal pace (${paces.marathon.pace}/mile)`);
        }

        return updated;
    }

    getIntensityGuidance(workout) {
        // Determine primary intensity zone
        let primaryIntensity = workout.intensity;
        if (typeof workout.intensity === 'string' && workout.intensity.includes(' to ')) {
            primaryIntensity = workout.intensity.split(' to ')[0];
        }
        
        return this.longRunIntensityGuidelines[primaryIntensity] || this.longRunIntensityGuidelines.easy;
    }

    generateRunEqOptions(workout, preference) {
        // Long runs typically use 2x conversion for easy pace, 2.5x for marathon pace
        const baseConversion = 2.0;
        const options = {
            optionA: "Full running workout",
            optionB: "First half running, second half on stand-up bike",
            optionC: "Alternate segments between running and biking (if structured workout)",
            optionD: `Full stand-up bike workout (${baseConversion}x time conversion for easy pace)`,
            conversionFactor: baseConversion
        };

        // Adjust for different pace segments
        if (workout.intensity.includes('marathonPace') || workout.intensity.includes('steadyState')) {
            options.optionD = "Full stand-up bike workout (2x easy pace, 2.5x marathon pace)";
            options.conversionNotes = "Use 2.5x conversion for marathon pace segments, 2x for easy segments";
        }

        if (preference >= 70) {
            options.recommendation = "Full stand-up bike workout";
        } else if (preference >= 40) {
            options.recommendation = "Split workout - first half running, second half biking";
        } else if (preference >= 20) {
            options.recommendation = "Alternate major segments if structured workout";
        } else {
            options.recommendation = "Full running workout";
        }

        return options;
    }

    getCustomizationOptions(workout, targetDistance, targetDuration, paces = null) {
        const customization = {
            distanceOptions: {
                short: "45-75 minutes or 6-10 miles",
                medium: "75-120 minutes or 10-16 miles",
                long: "120-180 minutes or 16-26 miles"
            },
            adaptForDistance: {},
            adaptForTime: {}
        };

        // Provide specific adaptations based on workout type
        if (workout.name.includes('Progression') || workout.name.includes('Progressive')) {
            if (paces && paces.easy && paces.threshold) {
                customization.adaptForDistance = {
                    "6-8 miles": `2-3 miles easy (${paces.easy.min}-${paces.easy.max}/mile), 2-3 miles moderate, 2 miles strong (${paces.threshold.pace}/mile)`,
                    "10-12 miles": `4 miles easy (${paces.easy.min}-${paces.easy.max}/mile), 4 miles moderate, 4 miles strong (${paces.threshold.pace}/mile)`,
                    "16-18 miles": `6 miles easy (${paces.easy.min}-${paces.easy.max}/mile), 6 miles moderate, 6 miles strong (${paces.threshold.pace}/mile)`
                };
            } else {
                customization.adaptForDistance = {
                    "6-8 miles": "2-3 miles easy, 2-3 miles moderate, 2 miles strong",
                    "10-12 miles": "4 miles easy, 4 miles moderate, 4 miles strong",
                    "16-18 miles": "6 miles easy, 6 miles moderate, 6 miles strong"
                };
            }
        }

        if (workout.name.includes('Marathon Pace')) {
            if (paces && paces.easy && paces.marathon) {
                customization.adaptForDistance = {
                    "10-12 miles": `3 miles easy (${paces.easy.min}-${paces.easy.max}/mile) + 6 miles @ ${paces.marathon.pace}/mile + 2 miles easy`,
                    "14-16 miles": `3 miles easy (${paces.easy.min}-${paces.easy.max}/mile) + 10 miles @ ${paces.marathon.pace}/mile + 3 miles easy`,
                    "18-20 miles": `3 miles easy (${paces.easy.min}-${paces.easy.max}/mile) + 13 miles @ ${paces.marathon.pace}/mile + 4 miles easy`
                };
            } else {
                customization.adaptForDistance = {
                    "10-12 miles": "3 miles easy + 6 miles MP + 2 miles easy",
                    "14-16 miles": "3 miles easy + 10 miles MP + 3 miles easy",
                    "18-20 miles": "3 miles easy + 13 miles MP + 4 miles easy"
                };
            }
        }

        return customization;
    }

    getLongRunSafetyNotes(workout) {
        const baseNotes = [
            "Start conservatively - long runs should feel sustainable",
            "Focus on effort over pace, especially in varying weather/terrain",
            "Plan hydration strategy for runs over 90 minutes",
            "Carry identification and emergency contact information",
            "Know your route and have bailout options"
        ];

        if (workout.intensity.includes('marathonPace') || workout.intensity.includes('fastFinish')) {
            baseNotes.push("Save faster segments for when you're warmed up (after 15+ minutes)");
            baseNotes.push("If pace becomes unsustainable, dial back to easy effort");
        }

        if (workout.duration.includes('120') || workout.duration.includes('150')) {
            baseNotes.push("Practice race-day fueling for runs over 2 hours");
            baseNotes.push("Consider electrolyte replacement for extended efforts");
        }

        if (workout.name.includes('Progression') || workout.name.includes('Progressive')) {
            baseNotes.push("Build pace gradually - avoid sudden speed changes");
            baseNotes.push("Final segments should feel strong but controlled, not all-out");
        }

        return baseNotes;
    }

    getFuelingGuidance(workout) {
        const baseFueling = {
            under60min: "Generally no fueling needed, just hydration",
            "60-90min": "Consider sports drink or small fuel if hot weather",
            "90-120min": "Practice race fueling - 30-60g carbs per hour after first hour",
            over120min: "Definitely fuel - practice exact race day strategy"
        };

        const notes = [];
        if (workout.duration.includes('120') || workout.duration.includes('150') || workout.duration.includes('180')) {
            notes.push("This is a key fueling practice opportunity");
            notes.push("Test gels, sports drinks, or real food you plan to use in races");
            notes.push("Practice taking fuel while maintaining pace/effort");
        }

        return { baseFueling, notes };
    }

    getLongRunAlternatives(workout) {
        return {
            badWeather: {
                treadmill: "Use 1% incline, break into segments if needed for mental engagement",
                indoor: "Mall walking, indoor track (expect many laps)",
                postpone: "Better to move day than compromise safety"
            },
            timeConstraints: {
                shortenDistance: "Maintain workout structure but reduce total time/distance",
                focusOnQuality: "Keep key pace segments, reduce easy portions",
                splitAcrossDays: "Not ideal, but could split very long runs across 2 days"
            },
            injury: {
                pool: "Aqua jogging maintaining same effort and time",
                bike: "Stand-up bike or regular bike with appropriate time conversion",
                elliptical: "Good alternative maintaining effort level"
            },
            terrain: {
                noHills: "Use treadmill incline or find bridges/overpasses",
                onlyTrack: "Long run on track requires mental strategies, audiobooks/podcasts help",
                onlyTreadmill: "Break into segments, vary incline/pace for mental engagement"
            }
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