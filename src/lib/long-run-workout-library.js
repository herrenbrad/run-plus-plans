/**
 * RunEq Comprehensive Long Run Workout Library
 * Based on research from McMillan Running, Hal Higdon, Ben Parkes, and Runner's World
 * Addresses the boring "run X miles easy" with varied long run formats
 */
import { convertVagueStructureToSpecific } from './workout-structure-converter.js';

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
     * Safely extract easy pace from paces object regardless of format
     * Handles: { min: "9:20", max: "9:50" }, { pace: "9:30" }, or string "9:30-9:50"
     * Always strips any existing "/mile" suffix to prevent doubling
     */
    getEasyPace(paces, preferMax = true) {
        if (!paces?.easy) return null;

        // Helper to strip /mile suffix if present
        const stripMileSuffix = (pace) => pace ? pace.replace(/\/mile$/i, '').trim() : null;

        // If it's an object with min/max
        if (paces.easy.max) return stripMileSuffix(preferMax ? paces.easy.max : paces.easy.min);
        if (paces.easy.min) return stripMileSuffix(paces.easy.min);

        // If it has a single pace property
        if (paces.easy.pace) {
            // Strip /mile first, then split on dash
            const cleanPace = stripMileSuffix(paces.easy.pace);
            const parts = cleanPace.split('-');
            if (parts.length === 2) {
                return preferMax ? parts[1].trim() : parts[0].trim();
            }
            return cleanPace;
        }

        // If it's a string like "9:30" or "9:30-9:50" or "9:30-9:50/mile"
        if (typeof paces.easy === 'string') {
            const cleanPace = stripMileSuffix(paces.easy);
            const parts = cleanPace.split('-');
            return preferMax ? parts[parts.length - 1].trim() : parts[0].trim();
        }

        return null;
    }

    /**
     * Generic pace extractor for marathon, threshold, interval, etc.
     * Handles: { pace: "8:45" }, { min: "8:30", max: "9:00" }, or string "8:45"
     * Always strips any existing "/mile" suffix
     */
    getPace(paceObj, preferMax = true) {
        if (!paceObj) return null;

        // Helper to strip /mile suffix if present
        const stripMileSuffix = (pace) => pace ? pace.replace(/\/mile$/i, '').trim() : null;

        // If it has a single pace property
        if (paceObj.pace) {
            const cleanPace = stripMileSuffix(paceObj.pace);
            const parts = cleanPace.split('-');
            if (parts.length === 2) {
                return preferMax ? parts[1].trim() : parts[0].trim();
            }
            return cleanPace;
        }

        // If it's an object with min/max
        if (paceObj.max) return stripMileSuffix(preferMax ? paceObj.max : paceObj.min);
        if (paceObj.min) return stripMileSuffix(paceObj.min);

        // If it's a string like "8:45" or "8:30-9:00"
        if (typeof paceObj === 'string') {
            const cleanPace = stripMileSuffix(paceObj);
            const parts = cleanPace.split('-');
            return preferMax ? parts[parts.length - 1].trim() : parts[0].trim();
        }

        return null;
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
            prescribedWorkout.name = this.injectPacesIntoName(workout.name, distance, paces, workout.intensity);  // Pass intensity to show correct pace
            // Convert vague structures first, then inject paces
            const convertedStructure = convertVagueStructureToSpecific(workout.structure, null, null);
            prescribedWorkout.structure = this.injectPacesIntoStructure(convertedStructure, paces);
            prescribedWorkout.description = this.injectPacesIntoDescription(workout.description, paces);

            // Generate detailed mile-by-mile pacing for progression workouts
            if (distance && category === 'PROGRESSIVE_RUNS') {
                const mileByMile = this.generateProgressionPacing(workout.name, distance, paces);
                if (mileByMile) {
                    prescribedWorkout.mileByMilePacing = mileByMile;
                    prescribedWorkout.structure = mileByMile;
                }
            }

            // Generate detailed mile-by-mile pacing for sandwich/simulation workouts
            if (distance && category === 'RACE_SIMULATION') {
                const mileByMile = this.generateSandwichPacing(workout.name, distance, paces);
                if (mileByMile) {
                    prescribedWorkout.mileByMilePacing = mileByMile;
                    prescribedWorkout.structure = mileByMile;
                }
            }
        }

        // Calculate realistic duration from distance and easy pace
        if (distance && paces?.easy) {
            prescribedWorkout.duration = this.calculateDurationFromDistance(distance, paces.easy);
        }

        // CRITICAL: Include the distance in the returned workout
        // This is the distance assigned by the AI coach (e.g., "10-Second Dropdowns 8 miles" -> 8)
        if (distance) {
            prescribedWorkout.distance = distance;
        }

        return prescribedWorkout;
    }

    /**
     * Inject distance and pace numbers into workout name
     * Uses appropriate pace based on workout intensity
     *
     * IMPORTANT: For progression runs (Dropdowns, Thirds, DUSA, etc.),
     * show the STARTING pace (easy), not the ending pace (marathon).
     * The intensity field "easy to marathonPace" describes the progression,
     * but the workout STARTS at easy pace.
     */
    injectPacesIntoName(name, distance, paces, intensity) {
        let updatedName = name;
        let paceDisplay = null;
        const nameLower = name.toLowerCase();

        // Get easy paces safely using helper
        const easyPaceMin = this.getEasyPace(paces, false);
        const easyPaceMax = this.getEasyPace(paces, true);

        // PROGRESSION RUNS: Show easy pace as the starting pace
        // These are identified by their names - they START easy and END fast
        const isProgressionRun = nameLower.includes('dropdown') ||
                                  nameLower.includes('10-second') ||
                                  nameLower.includes('thirds') ||
                                  nameLower.includes('dusa') ||
                                  nameLower.includes('fast finish') ||
                                  nameLower.includes('progressive');

        // SANDWICH/SIMULATION WORKOUTS: Show marathon pace (the KEY portion)
        // These have goal pace in the MIDDLE, sandwiched between easy miles
        const isSandwichWorkout = nameLower.includes('sandwich') ||
                                   nameLower.includes('simulation') ||
                                   nameLower.includes('dress rehearsal') ||
                                   nameLower.includes('marathon pace long') ||
                                   nameLower.includes('goal pace');

        // FAST FINISH WORKOUTS: Show both easy pace AND fast finish pace
        const isFastFinish = nameLower.includes('fast finish') || nameLower.includes('super fast');

        // Safely extract paces using helper
        const intervalPace = this.getPace(paces?.interval);
        const marathonPace = this.getPace(paces?.marathon);
        const thresholdPace = this.getPace(paces?.threshold);
        const racePace = this.getPace(paces?.racePace);

        if (isFastFinish && easyPaceMin && easyPaceMax && intervalPace) {
            // Fast finish workouts show both starting easy pace AND fast finish pace (5K/interval effort)
            paceDisplay = `${easyPaceMin}-${easyPaceMax}/mi → ${intervalPace}/mi`;
        } else if (isProgressionRun && easyPaceMax) {
            // Other progression runs show easy pace (where they START)
            paceDisplay = `${easyPaceMax}/mi start`;
        } else if (isSandwichWorkout && (racePace || marathonPace)) {
            // Sandwich workouts show ACTUAL RACE PACE (not marathon training pace)
            // For half marathon: 9:09/mi for 2:00 goal, NOT marathon pace 9:27/mi
            const goalPace = racePace || marathonPace;
            paceDisplay = `${goalPace}/mi goal`;
        } else if (intensity && intensity === 'marathonPace' && marathonPace) {
            // Pure marathon pace workouts (e.g., "Marathon Pace Long Run")
            // Only match exact "marathonPace", not "easy to marathonPace"
            paceDisplay = `${marathonPace}/mi`;
        } else if (intensity && intensity.includes('threshold') && thresholdPace) {
            // Threshold/tempo pace workouts
            paceDisplay = `${thresholdPace}/mi`;
        } else if (easyPaceMin && easyPaceMax) {
            // Default to easy pace for pure easy long runs
            paceDisplay = `${easyPaceMin}-${easyPaceMax}/mi`;
        }

        // Build the name with distance and pace
        if (distance && paceDisplay) {
            updatedName = `${distance}-Mile ${name} (${paceDisplay})`;
        } else if (distance) {
            updatedName = `${distance}-Mile ${name}`;
        } else if (paceDisplay) {
            updatedName = `${name} (${paceDisplay})`;
        }

        return updatedName;
    }

    /**
     * Inject specific pace numbers into long run structure
     */
    injectPacesIntoStructure(structure, paces) {
        let updated = structure;

        // Use helper to safely get easy paces
        const easyPaceMin = this.getEasyPace(paces, false);
        const easyPaceMax = this.getEasyPace(paces, true);

        // Replace pace references with actual paces
        // Use negative lookahead (?!\s*\() to avoid matching text that already has paces
        if (easyPaceMin && easyPaceMax) {
            const easyRange = `${easyPaceMin}-${easyPaceMax}/mile`;
            updated = updated.replace(/easy pace(?!\s*\()/gi, `easy pace (${easyRange})`);
            updated = updated.replace(/easy warmup(?!\s*\()/gi, `easy warmup (${easyRange})`);
            updated = updated.replace(/\bmin easy(?!\s*\()/gi, `min easy (${easyRange})`);
            updated = updated.replace(/easy cooldown(?!\s*\()/gi, `easy cooldown (${easyRange})`);
            updated = updated.replace(/\bmiles easy(?!\s*\()/gi, `miles easy (${easyRange})`);
            updated = updated.replace(/Very easy pace(?!\s*\()/gi, `Very easy pace (${easyRange})`);
        }

        // Safely extract paces using helper
        const marathonPace = this.getPace(paces?.marathon);
        const thresholdPace = this.getPace(paces?.threshold);

        if (marathonPace) {
            updated = updated.replace(/@ marathon pace(?!\s*\()/gi, `@ ${marathonPace}/mile marathon pace`);
            updated = updated.replace(/@ MP(?!\s*\()/g, `@ ${marathonPace}/mile`);
            updated = updated.replace(/@ half pace(?!\s*\()/gi, `@ ${marathonPace}/mile pace`);
        }

        if (thresholdPace) {
            updated = updated.replace(/steady state(?!\s*\()/gi, `steady state (${thresholdPace}/mile)`);
            updated = updated.replace(/strong pace(?!\s*\()/gi, `strong pace (${thresholdPace}/mile)`);
        }

        return updated;
    }

    /**
     * Inject specific pace numbers into long run description
     */
    injectPacesIntoDescription(description, paces) {
        let updated = description;

        // Use helper to safely get easy paces
        const easyPaceMin = this.getEasyPace(paces, false);
        const easyPaceMax = this.getEasyPace(paces, true);

        // Use negative lookahead to avoid matching text that already has paces
        if (easyPaceMin && easyPaceMax) {
            const easyRange = `${easyPaceMin}-${easyPaceMax}/mile`;
            updated = updated.replace(/easy pace(?!\s*\()/gi, `easy pace (${easyRange})`);
            updated = updated.replace(/conversational pace(?!\s*\()/gi, `conversational pace (${easyRange})`);
        }

        // Safely extract marathon pace using helper
        const marathonPace = this.getPace(paces?.marathon);
        if (marathonPace) {
            updated = updated.replace(/marathon pace(?!\s*\()/gi, `marathon pace (${marathonPace}/mile)`);
            updated = updated.replace(/goal pace(?!\s*\()/gi, `goal pace (${marathonPace}/mile)`);
        }

        return updated;
    }

    /**
     * Calculate realistic duration from distance and easy pace
     * Returns a range like "75-90 minutes" based on user's actual pace
     */
    calculateDurationFromDistance(distance, easyPace) {
        if (!distance || !easyPace) return null;

        // Parse easy pace - format is like "9:30" or could be min/max object
        const minPace = easyPace.min || easyPace;
        const maxPace = easyPace.max || easyPace;

        // Convert pace string "MM:SS" to total minutes
        const paceToMinutes = (pace) => {
            if (typeof pace !== 'string') return 10; // fallback 10 min/mile
            const parts = pace.split(':');
            if (parts.length !== 2) return 10;
            return parseInt(parts[0]) + parseInt(parts[1]) / 60;
        };

        const minPaceMinutes = paceToMinutes(minPace);
        const maxPaceMinutes = paceToMinutes(maxPace);

        // Calculate duration range (faster pace = less time, slower pace = more time)
        const fastDuration = Math.round(distance * minPaceMinutes);
        const slowDuration = Math.round(distance * maxPaceMinutes);

        // Format as "X-Y minutes" or "X hours Y minutes" for long runs
        const formatDuration = (mins) => {
            if (mins >= 120) {
                const hours = Math.floor(mins / 60);
                const remainingMins = mins % 60;
                return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours} hours`;
            }
            return `${mins} minutes`;
        };

        // Return range if there's meaningful difference, otherwise single value
        if (slowDuration - fastDuration >= 5) {
            return `${formatDuration(fastDuration)} - ${formatDuration(slowDuration)}`;
        }
        return formatDuration(Math.round((fastDuration + slowDuration) / 2));
    }

    /**
     * Generate detailed mile-by-mile pacing for progression workouts
     * Like Runna does: "Miles 1-3: 11:24, Miles 4-5: 10:55, Miles 6-8: 10:23"
     */
    generateProgressionPacing(workoutName, distance, paces) {
        if (!distance || !paces?.easy) return null;

        const name = workoutName.toLowerCase();
        const easyPace = this.getEasyPace(paces, true); // Slowest easy pace
        const moderatePace = this.getEasyPace(paces, false); // Faster easy pace
        if (!easyPace) return null; // Can't generate pacing without easy pace
        const strongPace = paces.marathon?.pace || paces.threshold?.pace || moderatePace;

        // Helper to format mile ranges
        const formatMileRange = (start, end, pace) => {
            if (start === end) {
                return `Mile ${start}: ${pace}/mile`;
            }
            return `Miles ${start}-${end}: ${pace}/mile`;
        };

        // Thirds Progression: 1/3 easy, 1/3 moderate, 1/3 strong
        if (name.includes('thirds')) {
            const third = Math.floor(distance / 3);
            const remainder = distance - (third * 3);
            const firstEnd = third;
            const middleEnd = third * 2;

            const segments = [];
            segments.push(formatMileRange(1, firstEnd, easyPace));
            segments.push(formatMileRange(firstEnd + 1, middleEnd, moderatePace));
            segments.push(formatMileRange(middleEnd + 1, distance, strongPace));

            return segments.join('\n');
        }

        // 10-Second Dropdowns: Drop pace by 10 seconds each mile
        if (name.includes('dropdown') || name.includes('10-second')) {
            // Parse easy pace to seconds
            const paceToSeconds = (pace) => {
                const [min, sec] = pace.split(':').map(Number);
                return min * 60 + sec;
            };
            const secondsToPace = (secs) => {
                const min = Math.floor(secs / 60);
                const sec = Math.round(secs % 60);
                return `${min}:${sec.toString().padStart(2, '0')}`;
            };

            const startPaceSeconds = paceToSeconds(easyPace);
            const segments = [];

            for (let mile = 1; mile <= distance; mile++) {
                const dropSeconds = (mile - 1) * 10; // 10 seconds faster each mile
                const currentPace = secondsToPace(Math.max(startPaceSeconds - dropSeconds, paceToSeconds(strongPace)));
                segments.push(`Mile ${mile}: ${currentPace}/mile`);
            }

            return segments.join('\n');
        }

        // DUSA Progression: 75-90% easy, final 10-25% strong
        if (name.includes('dusa')) {
            const easyMiles = Math.ceil(distance * 0.8); // 80% easy
            const strongMiles = distance - easyMiles;

            const segments = [];
            segments.push(formatMileRange(1, easyMiles, easyPace));
            if (strongMiles > 0) {
                segments.push(formatMileRange(easyMiles + 1, distance, strongPace));
            }

            return segments.join('\n');
        }

        // Super Fast Finish: Easy run + final 0.5-1 mile at 5K pace
        if (name.includes('fast finish') || name.includes('super fast')) {
            const easyMiles = distance - 1;
            const intervalPace = paces.interval?.pace || strongPace;

            const segments = [];
            segments.push(formatMileRange(1, easyMiles, easyPace));
            segments.push(`Mile ${distance}: ${intervalPace}/mile (5K effort)`);

            return segments.join('\n');
        }

        // Default: just show easy pace
        return `Miles 1-${distance}: ${easyPace}/mile`;
    }

    /**
     * Generate mile-by-mile pacing for sandwich/simulation workouts
     * Structure: Easy warmup miles + Goal pace block + Easy cooldown miles
     * Example: 3 easy + 6 @ goal pace + 3 easy = 12 miles total
     *
     * IMPORTANT: Uses racePace (actual goal time / distance) NOT marathon training pace
     * For half marathon: racePace = 9:09/mi for 2:00 goal, NOT marathon pace 9:27/mi
     */
    generateSandwichPacing(workoutName, distance, paces) {
        if (!distance || !paces?.easy) return null;

        // Use actual race pace if available, fall back to marathon pace
        const goalPace = paces.racePace?.pace || paces.marathon?.pace;
        if (!goalPace) return null;

        const name = workoutName.toLowerCase();
        const easyPace = this.getEasyPace(paces, true); // Slowest easy pace
        if (!easyPace) return null; // Can't generate pacing without easy pace

        // Helper to format mile ranges
        const formatMileRange = (start, end, pace, label = '') => {
            const labelSuffix = label ? ` (${label})` : '';
            if (start === end) {
                return `Mile ${start}: ${pace}/mile${labelSuffix}`;
            }
            return `Miles ${start}-${end}: ${pace}/mile${labelSuffix}`;
        };

        // Goal Pace Sandwich: ~25% easy + ~50% goal pace + ~25% easy
        // Standard split for sandwich workouts
        const warmupMiles = Math.max(2, Math.floor(distance * 0.25));
        const cooldownMiles = Math.max(1, Math.floor(distance * 0.2));
        const goalPaceMiles = distance - warmupMiles - cooldownMiles;

        // Adjust if goal pace block would be too small
        const adjustedGoalPaceMiles = Math.max(4, goalPaceMiles);

        const segments = [];
        segments.push(formatMileRange(1, warmupMiles, easyPace, 'warmup'));
        segments.push(formatMileRange(warmupMiles + 1, warmupMiles + adjustedGoalPaceMiles, goalPace, 'goal pace'));
        if (cooldownMiles > 0) {
            segments.push(formatMileRange(warmupMiles + adjustedGoalPaceMiles + 1, distance, easyPace, 'cooldown'));
        }

        return segments.join('\n');
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

        // Use helper to safely get paces
        const easyPaceMin = this.getEasyPace(paces, false);
        const easyPaceMax = this.getEasyPace(paces, true);
        const easyRange = (easyPaceMin && easyPaceMax) ? `${easyPaceMin}-${easyPaceMax}/mile` : null;
        const thresholdPace = this.getPace(paces?.threshold);
        const marathonPace = this.getPace(paces?.marathon);

        // Provide specific adaptations based on workout type
        if (workout.name.includes('Progression') || workout.name.includes('Progressive')) {
            if (easyRange && thresholdPace) {
                customization.adaptForDistance = {
                    "6-8 miles": `2-3 miles easy (${easyRange}), 2-3 miles moderate, 2 miles strong (${thresholdPace}/mile)`,
                    "10-12 miles": `4 miles easy (${easyRange}), 4 miles moderate, 4 miles strong (${thresholdPace}/mile)`,
                    "16-18 miles": `6 miles easy (${easyRange}), 6 miles moderate, 6 miles strong (${thresholdPace}/mile)`
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
            if (easyRange && marathonPace) {
                customization.adaptForDistance = {
                    "10-12 miles": `3 miles easy (${easyRange}) + 6 miles @ ${marathonPace}/mile + 2 miles easy`,
                    "14-16 miles": `3 miles easy (${easyRange}) + 10 miles @ ${marathonPace}/mile + 3 miles easy`,
                    "18-20 miles": `3 miles easy (${easyRange}) + 13 miles @ ${marathonPace}/mile + 4 miles easy`
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