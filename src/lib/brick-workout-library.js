/**
 * RunEQ Brick Workout Generator Library
 * Unique run+bike combination workouts - RunEQ's signature feature
 * Creates seamless transitions between running and stand-up biking
 * Based on triathlon brick principles adapted for RunEQ methodology
 */

export class BrickWorkoutLibrary {
    constructor() {
        // Transition timing and recovery guidelines
        this.transitionGuidelines = {
            quick: { time: "30-60 seconds", description: "Simulate race conditions" },
            standard: { time: "60-90 seconds", description: "Equipment change + brief recovery" },
            recovery: { time: "2-3 minutes", description: "Hydration + equipment adjustment" },
            full: { time: "5+ minutes", description: "Complete recovery between segments" }
        };

        // Equipment-specific transition considerations
        this.equipmentTransitions = {
            cyclete: {
                setup: "30-45 seconds",
                notes: "Quick height adjustment, similar running position",
                advantages: "Minimal setup, running-like feel"
            },
            elliptigo: {
                setup: "60-90 seconds", 
                notes: "Stride adjustment, gear selection",
                advantages: "Full body engagement after running"
            }
        };

        this.brickTypes = {
            // Classic endurance bricks - build aerobic capacity
            AEROBIC_BRICK: [
                {
                    name: "Base Building Brick",
                    totalDuration: "60-90 minutes",
                    structure: [
                        { type: "run", duration: "20 min", intensity: "easy", description: "Easy warm-up run" },
                        { type: "transition", duration: "90 sec", activity: "equipment change" },
                        { type: "bike", duration: "30 min", intensity: "easy", description: "Steady aerobic effort" },
                        { type: "transition", duration: "90 sec", activity: "equipment change" },
                        { type: "run", duration: "15 min", intensity: "easy", description: "Easy finish run" }
                    ],
                    runeqRatio: "moderate", // 35 min run, 30 min bike
                    purpose: "Develop aerobic fitness with equipment familiarity",
                    progression: "Increase each segment by 5 minutes weekly",
                    equipment: "any",
                    difficulty: "beginner"
                },
                {
                    name: "Long Aerobic Brick",
                    totalDuration: "90-120 minutes",
                    structure: [
                        { type: "run", duration: "30 min", intensity: "easy", description: "Extended warm-up" },
                        { type: "transition", duration: "2 min", activity: "hydration + equipment" },
                        { type: "bike", duration: "45 min", intensity: "easy", description: "Sustained aerobic effort" },
                        { type: "transition", duration: "2 min", activity: "hydration + equipment" },
                        { type: "run", duration: "20 min", intensity: "easy", description: "Finish strong" }
                    ],
                    runeqRatio: "balanced", // 50 min run, 45 min bike
                    purpose: "Extended aerobic development, mental toughness",
                    progression: "Build bike segment first, then running segments",
                    equipment: "cyclete preferred for long bike segment",
                    difficulty: "intermediate"
                }
            ],

            // Tempo bricks - lactate threshold training
            TEMPO_BRICK: [
                {
                    name: "Alternating Tempo Brick",
                    totalDuration: "45-60 minutes",
                    structure: [
                        { type: "run", duration: "15 min", intensity: "easy", description: "Warm-up" },
                        { type: "run", duration: "10 min", intensity: "tempo", description: "Threshold effort" },
                        { type: "transition", duration: "60 sec", activity: "quick change" },
                        { type: "bike", duration: "15 min", intensity: "tempo", description: "Maintain threshold" },
                        { type: "transition", duration: "60 sec", activity: "quick change" },
                        { type: "run", duration: "8 min", intensity: "tempo", description: "Final threshold" },
                        { type: "run", duration: "10 min", intensity: "easy", description: "Cool down" }
                    ],
                    runeqRatio: "run-focused", // 43 min run, 15 min bike
                    purpose: "Lactate threshold development with equipment variety",
                    progression: "Extend tempo segments by 2 min each week",
                    equipment: "elliptigo for power, cyclete for endurance feel",
                    difficulty: "intermediate"
                },
                {
                    name: "Sandwich Tempo Brick",
                    totalDuration: "50-65 minutes",
                    structure: [
                        { type: "run", duration: "12 min", intensity: "easy", description: "Warm-up" },
                        { type: "bike", duration: "20 min", intensity: "tempo", description: "Strong tempo effort" },
                        { type: "transition", duration: "90 sec", activity: "equipment change" },
                        { type: "run", duration: "15 min", intensity: "tempo", description: "Run off the bike" },
                        { type: "run", duration: "12 min", intensity: "easy", description: "Cool down" }
                    ],
                    runeqRatio: "balanced", // 39 min run, 20 min bike
                    purpose: "Practice running after hard bike effort",
                    progression: "Maintain tempo segments, reduce transitions",
                    equipment: "any",
                    difficulty: "advanced"
                }
            ],

            // Speed and interval bricks - VO2 max and neuromuscular power
            INTERVAL_BRICK: [
                {
                    name: "Speed Transition Brick",
                    totalDuration: "35-45 minutes",
                    structure: [
                        { type: "run", duration: "15 min", intensity: "easy", description: "Warm-up with strides" },
                        { type: "intervals", segments: [
                            { type: "run", duration: "2 min", intensity: "hard", description: "VO2 effort" },
                            { type: "transition", duration: "45 sec", activity: "quick switch" },
                            { type: "bike", duration: "2 min", intensity: "hard", description: "Match run effort" },
                            { type: "transition", duration: "45 sec", activity: "quick switch" }
                        ], repeats: 4, recoveryBetween: "2 min easy run" },
                        { type: "run", duration: "10 min", intensity: "easy", description: "Cool down" }
                    ],
                    runeqRatio: "balanced", // Equal high-intensity time
                    purpose: "Speed endurance, equipment mastery",
                    progression: "Add 1 repeat every 2 weeks",
                    equipment: "elliptigo for power intervals",
                    difficulty: "advanced"
                },
                {
                    name: "Pyramid Brick",
                    totalDuration: "40-50 minutes",
                    structure: [
                        { type: "run", duration: "12 min", intensity: "easy", description: "Warm-up" },
                        { type: "run", duration: "1 min", intensity: "hard", description: "Build 1" },
                        { type: "transition", duration: "30 sec", activity: "quick change" },
                        { type: "bike", duration: "2 min", intensity: "hard", description: "Build 2" },
                        { type: "transition", duration: "30 sec", activity: "quick change" },
                        { type: "run", duration: "3 min", intensity: "hard", description: "Peak effort" },
                        { type: "transition", duration: "30 sec", activity: "quick change" },
                        { type: "bike", duration: "2 min", intensity: "hard", description: "Build down 1" },
                        { type: "transition", duration: "30 sec", activity: "quick change" },
                        { type: "run", duration: "1 min", intensity: "hard", description: "Build down 2" },
                        { type: "run", duration: "12 min", intensity: "easy", description: "Cool down" }
                    ],
                    runeqRatio: "run-focused", // 28 min run, 4 min bike
                    purpose: "Progressive intensity with equipment changes",
                    progression: "Extend peak segment by 30 sec every 2 weeks",
                    equipment: "any",
                    difficulty: "advanced"
                }
            ],

            // Recovery and technique bricks - active recovery
            RECOVERY_BRICK: [
                {
                    name: "Active Recovery Brick",
                    totalDuration: "30-45 minutes",
                    structure: [
                        { type: "run", duration: "10 min", intensity: "easy", description: "Gentle start" },
                        { type: "transition", duration: "2 min", activity: "relaxed change" },
                        { type: "bike", duration: "15 min", intensity: "recovery", description: "Very easy spinning" },
                        { type: "transition", duration: "2 min", activity: "relaxed change" },
                        { type: "run", duration: "10 min", intensity: "easy", description: "Easy finish" }
                    ],
                    runeqRatio: "balanced", // 20 min run, 15 min bike
                    purpose: "Active recovery, movement variety",
                    progression: "Focus on form, not intensity or duration",
                    equipment: "cyclete for smooth motion",
                    difficulty: "recovery"
                },
                {
                    name: "Form Focus Brick",
                    totalDuration: "25-35 minutes",
                    structure: [
                        { type: "run", duration: "8 min", intensity: "easy", description: "Form-focused running" },
                        { type: "transition", duration: "90 sec", activity: "mindful equipment setup" },
                        { type: "bike", duration: "12 min", intensity: "easy", description: "Technique practice" },
                        { type: "transition", duration: "90 sec", activity: "mindful equipment setup" },
                        { type: "run", duration: "6 min", intensity: "easy", description: "Form integration" }
                    ],
                    runeqRatio: "balanced", // 14 min run, 12 min bike
                    purpose: "Technique refinement, neuromuscular coordination",
                    progression: "Focus on movement quality improvements",
                    equipment: "elliptigo for full body coordination",
                    difficulty: "recovery"
                }
            ],

            // Race simulation bricks - event preparation
            RACE_SIMULATION: [
                {
                    name: "Half Marathon Simulation Brick",
                    totalDuration: "75-90 minutes",
                    structure: [
                        { type: "run", duration: "20 min", intensity: "easy", description: "Race day warm-up" },
                        { type: "run", duration: "25 min", intensity: "race pace", description: "Half marathon pace" },
                        { type: "transition", duration: "2 min", activity: "race simulation break" },
                        { type: "bike", duration: "20 min", intensity: "race effort", description: "Maintain race effort" },
                        { type: "transition", duration: "2 min", activity: "race simulation break" },
                        { type: "run", duration: "15 min", intensity: "race pace", description: "Strong finish" }
                    ],
                    runeqRatio: "run-focused", // 60 min run, 20 min bike
                    purpose: "Half marathon preparation with equipment options",
                    progression: "Build race pace segments, reduce transitions",
                    equipment: "cyclete for endurance simulation",
                    difficulty: "race-specific"
                },
                {
                    name: "Marathon Simulation Brick",
                    totalDuration: "120-150 minutes",
                    structure: [
                        { type: "run", duration: "30 min", intensity: "easy", description: "Marathon warm-up" },
                        { type: "run", duration: "35 min", intensity: "marathon pace", description: "Steady marathon effort" },
                        { type: "transition", duration: "3 min", activity: "aid station simulation" },
                        { type: "bike", duration: "40 min", intensity: "marathon effort", description: "Sustain race effort" },
                        { type: "transition", duration: "3 min", activity: "aid station simulation" },
                        { type: "run", duration: "20 min", intensity: "marathon pace", description: "Final push" }
                    ],
                    runeqRatio: "balanced", // 85 min run, 40 min bike
                    purpose: "Marathon endurance with RunEQ pacing strategy",
                    progression: "Extend marathon pace segments gradually",
                    equipment: "cyclete preferred for long bike segment",
                    difficulty: "race-specific"
                }
            ]
        };
    }

    // Generate a brick workout based on user preferences and training phase
    generateBrickWorkout(preferences = {}) {
        const {
            type = 'AEROBIC_BRICK',
            equipment = 'any',
            duration = 'medium', // short, medium, long
            difficulty = 'intermediate',
            runeqRatio = 'balanced' // run-focused, bike-focused, balanced
        } = preferences;

        const workoutCategory = this.brickTypes[type] || this.brickTypes.AEROBIC_BRICK;
        
        // Filter workouts by preferences
        let suitableWorkouts = workoutCategory.filter(workout => {
            return (equipment === 'any' || workout.equipment === 'any' || workout.equipment.includes(equipment)) &&
                   (difficulty === 'any' || workout.difficulty === difficulty || workout.difficulty === 'any') &&
                   (runeqRatio === 'any' || workout.runeqRatio === runeqRatio);
        });

        if (suitableWorkouts.length === 0) {
            suitableWorkouts = workoutCategory; // Fallback to all workouts in category
        }

        // Select random workout from suitable options
        const selectedWorkout = suitableWorkouts[Math.floor(Math.random() * suitableWorkouts.length)];
        
        return this.formatBrickWorkout(selectedWorkout, preferences);
    }

    // Format brick workout with RunEQ-specific details
    formatBrickWorkout(workout, preferences) {
        const { equipment = 'cyclete' } = preferences;
        
        return {
            ...workout,
            runeqFeatures: {
                equipmentUsed: equipment,
                transitionPractice: true,
                paceGuidance: this.generatePaceGuidance(workout),
                safetyNotes: this.generateSafetyNotes(workout),
                alternatives: this.generateAlternatives(workout)
            },
            estimatedTrainingEffect: this.calculateBrickTrainingEffect(workout),
            equipmentNotes: this.equipmentTransitions[equipment] || this.equipmentTransitions.cyclete
        };
    }

    // Generate pace guidance for brick workout
    generatePaceGuidance(workout) {
        return {
            easy: "Conversational pace, 65-75% max HR",
            tempo: "Comfortably hard, 85-90% max HR", 
            hard: "Hard effort, 90-95% max HR",
            recovery: "Very easy, 60-70% max HR",
            transitions: "Focus on smooth equipment changes, not speed"
        };
    }

    // Generate safety notes specific to brick workouts
    generateSafetyNotes(workout) {
        return [
            "Practice transitions in training before using in workouts",
            "Stay hydrated during equipment changes",
            "Start with longer transition times, speed up as you improve", 
            "Listen to your body - brick workouts are demanding",
            "Ensure proper bike setup before beginning workout"
        ];
    }

    // Generate alternatives for brick workouts
    generateAlternatives(workout) {
        return {
            weather: {
                hot: "Extend transition times for hydration",
                cold: "Minimize transition time to maintain body temperature",
                windy: "Consider indoor bike alternatives"
            },
            equipment: {
                noBike: "Replace bike segments with hill running at equivalent effort",
                noTransitions: "Combine segments into continuous workout", 
                treadmill: "Use incline to simulate bike resistance"
            },
            fitness: {
                beginner: "Extend transition times, reduce intensity slightly",
                advanced: "Minimize transitions, increase intensity or duration"
            }
        };
    }

    // Calculate estimated training effect for brick workout
    calculateBrickTrainingEffect(workout) {
        // Simplified training effect calculation
        // Real implementation would use heart rate zones and duration
        let totalIntensity = 0;
        let totalTime = 0;

        workout.structure.forEach(segment => {
            if (segment.type === 'run' || segment.type === 'bike') {
                const duration = this.parseDuration(segment.duration);
                let intensity = 1; // base intensity
                
                switch(segment.intensity) {
                    case 'hard': intensity = 4; break;
                    case 'tempo': intensity = 3; break;
                    case 'easy': intensity = 1.5; break;
                    case 'recovery': intensity = 1; break;
                }
                
                totalIntensity += intensity * duration;
                totalTime += duration;
            }
        });

        const averageIntensity = totalIntensity / totalTime;
        
        return {
            aerobic: Math.min(5, averageIntensity * 1.2), // Brick workouts boost aerobic benefit
            anaerobic: Math.min(5, Math.max(0, (averageIntensity - 2) * 1.5)),
            neuromuscular: Math.min(5, workout.structure.filter(s => s.type === 'transition').length * 0.5)
        };
    }

    // Helper function to parse duration strings
    parseDuration(durationStr) {
        const match = durationStr.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    // Get all available brick workout types
    getAllBrickTypes() {
        return Object.keys(this.brickTypes);
    }

    // Get workouts by category
    getWorkoutsByCategory(category) {
        return this.brickTypes[category] || [];
    }

    // Get random brick workout
    getRandomBrickWorkout() {
        const categories = Object.keys(this.brickTypes);
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const workouts = this.brickTypes[randomCategory];
        return workouts[Math.floor(Math.random() * workouts.length)];
    }
}

export default BrickWorkoutLibrary;