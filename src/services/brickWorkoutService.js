/**
 * Brick Workout Service for RunEQ React App
 * Provides brick workout generation and management for the frontend
 */

export class BrickWorkoutService {
    constructor() {
        // Same transition guidelines as backend
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

        // Simplified brick types for frontend (most popular workouts)
        this.brickWorkouts = {
            aerobic: [
                {
                    name: "Base Building Brick",
                    totalDuration: "60-90 minutes",
                    difficulty: "beginner",
                    runeqRatio: "moderate",
                    structure: [
                        { type: "run", duration: "20 min", intensity: "easy", description: "Easy warm-up run" },
                        { type: "transition", duration: "90 sec", activity: "equipment change" },
                        { type: "bike", duration: "30 min", intensity: "easy", description: "Steady aerobic effort" },
                        { type: "transition", duration: "90 sec", activity: "equipment change" },
                        { type: "run", duration: "15 min", intensity: "easy", description: "Easy finish run" }
                    ],
                    purpose: "Develop aerobic fitness with equipment familiarity"
                },
                {
                    name: "Long Aerobic Brick",
                    totalDuration: "90-120 minutes",
                    difficulty: "intermediate",
                    runeqRatio: "balanced",
                    structure: [
                        { type: "run", duration: "30 min", intensity: "easy", description: "Extended warm-up" },
                        { type: "transition", duration: "2 min", activity: "hydration + equipment" },
                        { type: "bike", duration: "45 min", intensity: "easy", description: "Sustained aerobic effort" },
                        { type: "transition", duration: "2 min", activity: "hydration + equipment" },
                        { type: "run", duration: "20 min", intensity: "easy", description: "Finish strong" }
                    ],
                    purpose: "Extended aerobic development, mental toughness"
                }
            ],
            tempo: [
                {
                    name: "Alternating Tempo Brick",
                    totalDuration: "45-60 minutes",
                    difficulty: "intermediate",
                    runeqRatio: "run-focused",
                    structure: [
                        { type: "run", duration: "15 min", intensity: "easy", description: "Warm-up" },
                        { type: "run", duration: "10 min", intensity: "tempo", description: "Threshold effort" },
                        { type: "transition", duration: "60 sec", activity: "quick change" },
                        { type: "bike", duration: "15 min", intensity: "tempo", description: "Maintain threshold" },
                        { type: "transition", duration: "60 sec", activity: "quick change" },
                        { type: "run", duration: "8 min", intensity: "tempo", description: "Final threshold" },
                        { type: "run", duration: "10 min", intensity: "easy", description: "Cool down" }
                    ],
                    purpose: "Lactate threshold development with equipment variety"
                },
                {
                    name: "Sandwich Tempo Brick",
                    totalDuration: "50-65 minutes",
                    difficulty: "advanced",
                    runeqRatio: "balanced",
                    structure: [
                        { type: "run", duration: "12 min", intensity: "easy", description: "Warm-up" },
                        { type: "bike", duration: "20 min", intensity: "tempo", description: "Strong tempo effort" },
                        { type: "transition", duration: "90 sec", activity: "equipment change" },
                        { type: "run", duration: "15 min", intensity: "tempo", description: "Run off the bike" },
                        { type: "run", duration: "12 min", intensity: "easy", description: "Cool down" }
                    ],
                    purpose: "Practice running after hard bike effort"
                }
            ],
            speed: [
                {
                    name: "Speed Transition Brick",
                    totalDuration: "35-45 minutes",
                    difficulty: "advanced",
                    runeqRatio: "balanced",
                    structure: [
                        { type: "run", duration: "15 min", intensity: "easy", description: "Warm-up with strides" },
                        { 
                            type: "intervals", 
                            description: "4x (2min run hard + 45sec transition + 2min bike hard + 45sec transition)",
                            recovery: "2 min easy run between sets"
                        },
                        { type: "run", duration: "10 min", intensity: "easy", description: "Cool down" }
                    ],
                    purpose: "Speed endurance, equipment mastery"
                }
            ],
            recovery: [
                {
                    name: "Active Recovery Brick",
                    totalDuration: "30-45 minutes",
                    difficulty: "recovery",
                    runeqRatio: "balanced",
                    structure: [
                        { type: "run", duration: "10 min", intensity: "easy", description: "Gentle start" },
                        { type: "transition", duration: "2 min", activity: "relaxed change" },
                        { type: "bike", duration: "15 min", intensity: "recovery", description: "Very easy spinning" },
                        { type: "transition", duration: "2 min", activity: "relaxed change" },
                        { type: "run", duration: "10 min", intensity: "easy", description: "Easy finish" }
                    ],
                    purpose: "Active recovery, movement variety"
                }
            ]
        };
    }

    // Get all brick workout types
    getBrickWorkoutTypes() {
        return Object.keys(this.brickWorkouts);
    }

    // Get workouts by type
    getBrickWorkoutsByType(type) {
        return this.brickWorkouts[type] || [];
    }

    // Generate a brick workout based on preferences
    generateBrickWorkout(preferences = {}) {
        const {
            type = 'aerobic',
            difficulty = 'intermediate',
            equipment = 'cyclete'
        } = preferences;

        const availableWorkouts = this.brickWorkouts[type] || this.brickWorkouts.aerobic;
        
        // Filter by difficulty if specified
        let filteredWorkouts = availableWorkouts;
        if (difficulty !== 'any') {
            filteredWorkouts = availableWorkouts.filter(w => 
                w.difficulty === difficulty || w.difficulty === 'any'
            );
            
            // Fallback if no matches
            if (filteredWorkouts.length === 0) {
                filteredWorkouts = availableWorkouts;
            }
        }

        // Select random workout
        const selectedWorkout = filteredWorkouts[Math.floor(Math.random() * filteredWorkouts.length)];
        
        return this.formatBrickWorkoutForUI(selectedWorkout, equipment);
    }

    // Format brick workout for UI display
    formatBrickWorkoutForUI(workout, equipment = 'cyclete') {
        return {
            ...workout,
            type: 'brick',
            category: 'Brick Workout',
            runeqFeatures: {
                equipmentUsed: equipment,
                transitionPractice: true,
                uniqueFeature: "🧱 Run+Bike Combination",
                alternatives: this.getBrickAlternatives(workout)
            },
            equipmentNotes: this.equipmentTransitions[equipment] || this.equipmentTransitions.cyclete,
            safetyNotes: [
                "Practice transitions in training before using in workouts",
                "Stay hydrated during equipment changes",
                "Start with longer transition times, speed up as you improve",
                "Listen to your body - brick workouts are demanding"
            ],
            paceGuidance: {
                easy: "Conversational pace, 65-75% max HR",
                tempo: "Comfortably hard, 85-90% max HR",
                hard: "Hard effort, 90-95% max HR",
                recovery: "Very easy, 60-70% max HR"
            }
        };
    }

    // Get alternatives for brick workouts
    getBrickAlternatives(workout) {
        return [
            {
                category: "🌡️ Weather Alternatives",
                options: [
                    {
                        name: "Hot Weather Adaptation",
                        description: "Extend transition times for hydration and cooling",
                        intensity: workout.difficulty
                    },
                    {
                        name: "Cold Weather Adaptation", 
                        description: "Minimize transition time to maintain body temperature",
                        intensity: workout.difficulty
                    }
                ]
            },
            {
                category: "⚡ Equipment Alternatives", 
                options: [
                    {
                        name: "No Bike Available",
                        description: "Replace bike segments with hill running at equivalent effort",
                        intensity: workout.difficulty
                    },
                    {
                        name: "No Transitions",
                        description: "Combine segments into continuous workout",
                        intensity: workout.difficulty
                    },
                    {
                        name: "Indoor Alternative",
                        description: "Use treadmill incline to simulate bike resistance",
                        intensity: workout.difficulty
                    }
                ]
            },
            {
                category: "⬇️ Make It Easier",
                options: [
                    {
                        name: "Extended Recovery Brick",
                        description: "Longer transition times, lower intensity",
                        intensity: "recovery"
                    },
                    {
                        name: "Single Transition Brick",
                        description: "Just one run→bike or bike→run transition",
                        intensity: "easy"
                    }
                ]
            },
            {
                category: "⬆️ Make It Harder",
                options: [
                    {
                        name: "Quick Transition Brick",
                        description: "Minimize transition times, race-like pace",
                        intensity: "hard"
                    },
                    {
                        name: "Multi-Transition Brick",
                        description: "Add more run↔bike switches throughout workout",
                        intensity: "advanced"
                    }
                ]
            }
        ];
    }

    // Get a random brick workout
    getRandomBrickWorkout() {
        const types = this.getBrickWorkoutTypes();
        const randomType = types[Math.floor(Math.random() * types.length)];
        return this.generateBrickWorkout({ type: randomType });
    }

    // Check if workout is a brick workout
    isBrickWorkout(workout) {
        return workout?.type === 'brick' || 
               workout?.category === 'Brick Workout' ||
               workout?.name?.toLowerCase().includes('brick');
    }

    // Format brick workout structure for display
    formatBrickStructure(structure) {
        return structure.map((segment, index) => ({
            step: index + 1,
            type: segment.type,
            duration: segment.duration || segment.description,
            intensity: segment.intensity || 'standard',
            description: segment.description || segment.activity,
            isTransition: segment.type === 'transition'
        }));
    }
}

export default BrickWorkoutService;