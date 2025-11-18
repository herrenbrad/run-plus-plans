/**
 * Swimming Workout Library
 * Running-specific swimming workouts for cross-training
 * Focuses on aerobic development and interval training
 * Different movement pattern but maintains cardiovascular fitness
 */
export class SwimmingWorkoutLibrary {
    constructor() {
        // Equipment and pool specs
        this.equipmentSpecs = {
            name: "Swimming",
            poolTypes: ["25-yard pool", "25-meter pool", "50-meter pool", "Open water"],
            description: "Full-body cardiovascular workout, different movement pattern from running",
            accessibility: "Widely accessible - community pools, gyms, lakes, ocean",
            benefits: [
                "Low-impact full-body cardio",
                "Works different muscle groups than running",
                "Improves lung capacity and breathing control",
                "Excellent for injury recovery",
                "Can maintain aerobic fitness",
                "Active recovery for tired legs"
            ],
            swimStrokes: {
                freestyle: "Primary stroke for continuous swimming and aerobic work",
                backstroke: "Good for shoulder balance and variety",
                breaststroke: "Lower intensity, good for recovery",
                butterfly: "High intensity, brief use only unless experienced swimmer"
            },
            keyMetrics: {
                effort: "Use RPE (perceived exertion) rather than pace",
                heartRate: "Typically 10-15 bpm lower than running at same effort",
                breathing: "Controlled breathing improves lung capacity",
                technique: "Focus on efficiency over speed - poor technique = exhaustion"
            }
        };

        // Beginner guidance
        this.beginnerGuidance = {
            important: "Swimming technique matters more than other modalities. Poor technique = quick exhaustion.",
            recommendation: "If new to swimming, take 2-3 lessons to learn proper freestyle form",
            alternatives: "If not comfortable swimming laps, use aqua running instead",
            progression: "Start with easier strokes (freestyle, backstroke, breaststroke) before attempting butterfly"
        };

        this.workoutLibrary = {
            // EASY AEROBIC SWIMMING - Base Building
            EASY: [
                {
                    name: "Easy Aerobic Swim",
                    duration: "20-40 minutes",
                    description: "Continuous easy swimming for aerobic base",
                    structure: "10 min drills/warmup + 20-30 min continuous easy swimming (vary strokes) + 5-10 min easy cooldown",
                    intensity: "easy",
                    benefits: "Aerobic base, active recovery for running, improves breathing and lung capacity",
                    technique: {
                        focus: "Smooth, efficient stroke. Don't fight the water.",
                        breathing: "Controlled, rhythmic breathing",
                        effort: "Should feel easy, sustainable indefinitely"
                    },
                    workout: {
                        warmup: "200-400 yards easy mixed strokes",
                        main: "800-1200 yards freestyle at conversational effort",
                        cooldown: "200 yards easy backstroke or breaststroke"
                    },
                    effort: {
                        heartRate: "Zone 1-2 (60-75% max HR)",
                        perceived: "Easy, could maintain conversation if able to speak",
                        breathing: "Relaxed and controlled"
                    },
                    coachingTips: "Focus on technique. If you're exhausted, you're swimming too hard or need technique work.",
                    runningEquivalent: "30-40 min easy recovery run"
                },
                {
                    name: "Moderate Aerobic Swim",
                    duration: "30-45 minutes",
                    description: "Sustained aerobic work with varied strokes",
                    structure: "10 min drills + 30-40 min steady swimming (mostly freestyle, mix in other strokes) + 5-10 min cooldown",
                    intensity: "easy",
                    benefits: "Cardiovascular endurance, full-body conditioning, breathing development",
                    technique: {
                        focus: "Efficient stroke mechanics, bilateral breathing",
                        breathing: "Every 3 or 5 strokes for balance",
                        effort: "Moderate, sustainable"
                    },
                    workout: {
                        warmup: "400 yards (200 free, 100 back, 100 breast)",
                        main: "1200-1600 yards (1000 freestyle, mix in 200-400 other strokes for variety)",
                        cooldown: "200-300 yards easy choice of stroke"
                    },
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Comfortable but sustained effort",
                        breathing: "Controlled, rhythmic"
                    },
                    coachingTips: "Varying strokes gives different muscles a break. Don't skip warmup - prevents shoulder issues.",
                    runningEquivalent: "40-45 min easy run"
                },
                {
                    name: "Extended Aerobic Swim",
                    duration: "40-60 minutes",
                    description: "Long aerobic swim for endurance",
                    structure: "10 min drills + 45-50 min continuous varied swimming + 5-10 min cooldown",
                    intensity: "easy",
                    benefits: "Extended aerobic stimulus, mental endurance in water, active recovery",
                    technique: {
                        focus: "Maintain efficiency even when fatigued",
                        breathing: "Consistent pattern throughout",
                        effort: "Easy-moderate, mentally engaging"
                    },
                    workout: {
                        warmup: "400-600 yards mixed strokes with drills",
                        main: "2000-2500 yards (alternate 400 free, 200 back/breast, repeat)",
                        cooldown: "300-400 yards easy"
                    },
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Sustainable, becomes mentally challenging in final portion",
                        breathing: "Steady throughout"
                    },
                    coachingTips: "Long swims build mental toughness. Break into chunks mentally. Vary strokes to stay engaged.",
                    runningEquivalent: "60 min easy run"
                }
            ],

            // TEMPO SWIMMING - Threshold Work
            TEMPO: [
                {
                    name: "Tempo Swim",
                    duration: "35-50 minutes",
                    description: "Sustained harder effort for threshold development",
                    structure: "10 min warmup + 15-20 min @ tempo effort (80% effort) + 10 min easy cooldown",
                    intensity: "tempo",
                    benefits: "Lactate threshold, sustained effort tolerance, cardiovascular fitness",
                    technique: {
                        focus: "Maintain stroke efficiency despite elevated effort",
                        breathing: "More frequent than easy pace",
                        effort: "Comfortably hard, breathing elevated"
                    },
                    workout: {
                        warmup: "400 yards (200 free, 100 back, 100 drills)",
                        tempo: "800-1000 yards freestyle @ tempo effort (or 4 x 200 with 20 sec rest)",
                        cooldown: "400 yards easy mixed"
                    },
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Comfortably hard, breathing elevated but controlled",
                        breathing: "Every 2-3 strokes"
                    },
                    coachingTips: "Tempo swimming teaches breathing control under duress. Don't let stroke fall apart.",
                    runningEquivalent: "30 min tempo run"
                },
                {
                    name: "Threshold Intervals",
                    duration: "40-55 minutes",
                    description: "Repeated threshold efforts with brief recovery",
                    structure: "10 min warmup + 6 x 100 yards @ threshold with 15-20 sec rest + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Threshold efficiency, recovery management, pacing practice",
                    technique: {
                        focus: "Consistent stroke count per length across all intervals",
                        breathing: "Controlled despite effort",
                        effort: "Hard but repeatable"
                    },
                    workout: {
                        warmup: "400-600 yards easy mixed with drills",
                        main: "6-8 x 100 yards @ 85% effort with 15-20 sec rest between",
                        cooldown: "300-400 yards easy"
                    },
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Hard, breathing elevated, short rest keeps it honest",
                        breathing: "Every 2-3 strokes"
                    },
                    coachingTips: "Short rest = never fully recovered. Classic threshold work. Monitor stroke count to ensure form holds.",
                    runningEquivalent: "Cruise intervals (6 x 5 min tempo)"
                }
            ],

            // INTERVAL SWIMMING - VO2max and Speed
            INTERVALS: [
                {
                    name: "Sprint Intervals - 25s",
                    duration: "35-50 minutes",
                    description: "Short fast efforts for speed and power",
                    structure: "10 min warmup + 12-16 x 25 yards @ 90% effort with 20-30 sec rest + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max, speed, explosive power, anaerobic capacity",
                    technique: {
                        focus: "Maximum sustainable speed while maintaining technique",
                        breathing: "Minimal during sprint (breath control)",
                        effort: "Very hard for 25 yards"
                    },
                    workout: {
                        warmup: "400-600 yards easy with speed drills",
                        sprints: "12-16 x 25 yards @ 90% with 20-30 sec rest",
                        cooldown: "400 yards easy"
                    },
                    effort: {
                        heartRate: "Zone 5 (95%+ max HR)",
                        perceived: "Very hard, nearly all-out for 25 yards",
                        breathing: "Controlled, minimal breaths during sprint"
                    },
                    coachingTips: "25 yards is short enough to go hard. Focus on explosive speed off walls. Technique matters!",
                    runningEquivalent: "200m sprint repeats",
                    landEquivalent: "Simulates 12-16 x 200m sprints"
                },
                {
                    name: "Medium Intervals - 50s",
                    duration: "40-55 minutes",
                    description: "Classic interval training at 50-yard distance",
                    structure: "10 min warmup + 10-15 x 50 yards fast (80% max) with 20-30 sec rest + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max development, speed endurance, breathing control",
                    technique: {
                        focus: "Fast but controlled - technique holds throughout",
                        breathing: "Every 2-3 strokes, controlled",
                        effort: "Hard for full 50 yards"
                    },
                    workout: {
                        warmup: "600 yards (400 easy, 200 drills/build)",
                        intervals: "10-15 x 50 yards @ 80% effort with 20-30 sec rest",
                        cooldown: "400 yards easy"
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Hard, breathing elevated, repeatable",
                        breathing: "Every 2-3 strokes"
                    },
                    coachingTips: "50 yards is perfect interval distance. Long enough to work, short enough to maintain quality.",
                    runningEquivalent: "400m interval repeats",
                    landEquivalent: "Simulates 10-15 x 400m on track"
                },
                {
                    name: "100-Yard Intervals",
                    duration: "45-60 minutes",
                    description: "Longer intervals building VO2max endurance",
                    structure: "10 min warmup + 8-12 x 100 yards @ 80% with 30 sec rest + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max endurance, lactate tolerance, mental toughness",
                    technique: {
                        focus: "Maintain stroke efficiency throughout 100 yards",
                        breathing: "Consistent pattern, don't panic breathe",
                        effort: "Controlled hard effort"
                    },
                    workout: {
                        warmup: "600-800 yards easy mixed with drills",
                        intervals: "8-12 x 100 yards @ 80% effort with 30 sec rest",
                        cooldown: "400 yards easy"
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Very hard, requires pacing discipline",
                        breathing: "Every 2-3 strokes, controlled"
                    },
                    coachingTips: "100s require pacing. Don't blow up first 25 yards. Final 25 should hurt but technique holds.",
                    runningEquivalent: "800m interval repeats",
                    landEquivalent: "Simulates 8-12 x 800m on track"
                },
                {
                    name: "Descending Ladder",
                    duration: "45-60 minutes",
                    description: "Pyramid intervals for mental engagement",
                    structure: "10 min warmup + [200-150-100-50-100-150-200] yards hard with 30-45 sec rest + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Mental engagement, varied pace practice, comprehensive speed work",
                    technique: {
                        focus: "Adjust effort slightly for distance - shorter = faster",
                        breathing: "Varies with distance",
                        effort: "Hard throughout"
                    },
                    workout: {
                        warmup: "600-800 yards easy with drills",
                        pyramid: "200-150-100-50-100-150-200 @ 80-90% effort with 30-45 sec rest",
                        cooldown: "400-600 yards easy"
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Varies with distance, all feel hard",
                        breathing: "Adjust with distance"
                    },
                    coachingTips: "Pyramid keeps mind engaged. Shorter distances allow faster swimming. Challenge yourself on the 50!",
                    runningEquivalent: "Track pyramid workout",
                    landEquivalent: "Simulates 800m-600m-400m-200m-400m-600m-800m pyramid"
                }
            ],

            // ENDURANCE SWIMMING - Long Sessions
            LONG: [
                {
                    name: "Continuous Distance Swim",
                    duration: "45-60 minutes",
                    description: "Long continuous swim for endurance",
                    structure: "10 min warmup/drills + 2000-3000 yards continuous varied swimming + 10 min cooldown",
                    intensity: "long",
                    benefits: "Aerobic capacity, mental endurance, full-body conditioning",
                    technique: {
                        focus: "Efficiency and patience - long swim is mental",
                        breathing: "Bilateral for balance, consistent pattern",
                        effort: "Moderate, sustainable"
                    },
                    workout: {
                        warmup: "400-600 yards mixed with drills",
                        main: "2000-3000 yards (vary: 500 free, 200 back, 300 free, 200 breast, repeat)",
                        cooldown: "400 yards easy"
                    },
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Moderate, mentally challenging in final portion",
                        breathing: "Steady, controlled"
                    },
                    coachingTips: "Long swims are as much mental as physical. Break into chunks. Vary strokes to stay fresh.",
                    runningEquivalent: "60-75 min long run"
                },
                {
                    name: "Extended Distance Swim",
                    duration: "60-90 minutes",
                    description: "Very long swim for maximum aerobic development",
                    structure: "10-15 min warmup + 3500-5000 yards continuous + 10-15 min cooldown",
                    intensity: "long",
                    benefits: "Maximum aerobic development, mental fortitude, comprehensive conditioning",
                    technique: {
                        focus: "Maintain form even when tired - count strokes to ensure efficiency",
                        breathing: "Consistent throughout, bilateral recommended",
                        effort: "Moderate, patient"
                    },
                    workout: {
                        warmup: "600-800 yards mixed with drills",
                        main: "3500-5000 yards (create sets: 10 x 400 with varied strokes, or continuous)",
                        cooldown: "500-600 yards easy"
                    },
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Comfortable early, requires mental discipline late",
                        breathing: "Controlled, rhythmic"
                    },
                    coachingTips: "This is serious aerobic training. Stay patient. Focus on efficiency over speed. Mental game is key.",
                    runningEquivalent: "90-120 min long run"
                },
                {
                    name: "Negative Split Distance",
                    duration: "45-60 minutes",
                    description: "Long swim with faster second half",
                    structure: "10 min warmup + 2000-2500 yards (first half easy, second half moderate-hard) + 10 min cooldown",
                    intensity: "long",
                    benefits: "Pacing practice, finishing strength, mental toughness",
                    technique: {
                        focus: "Start conservatively, build effort gradually",
                        breathing: "More frequent in second half as effort increases",
                        effort: "Building from easy to moderate-hard"
                    },
                    workout: {
                        warmup: "600 yards easy with drills",
                        main: "2000-2500 yards (first 1000-1250 @ easy, second half @ moderate-hard)",
                        cooldown: "400 yards easy"
                    },
                    effort: {
                        heartRate: "Zone 2 building to Zone 3-4",
                        perceived: "Easy early, hard finish",
                        breathing: "Controlled early, faster late"
                    },
                    coachingTips: "Negative splits teach you to pace and finish strong. Resist urge to go hard early.",
                    runningEquivalent: "Long run with progression"
                }
            ],

            // RECOVERY SWIMMING
            RECOVERY: [
                {
                    name: "Recovery Swim",
                    duration: "20-30 minutes",
                    description: "Very easy swimming for active recovery",
                    structure: "20-30 min continuous very easy mixed strokes",
                    intensity: "recovery",
                    benefits: "Active recovery for running, promotes blood flow, maintains feel for water",
                    technique: {
                        focus: "Minimal effort, maximum relaxation",
                        breathing: "Relaxed, no breathlessness",
                        effort: "Very easy"
                    },
                    workout: {
                        main: "800-1200 yards ultra-easy (mix freestyle, backstroke, breaststroke)"
                    },
                    effort: {
                        heartRate: "Zone 1 (60-70% max HR)",
                        perceived: "Very easy, restorative",
                        breathing: "Relaxed and comfortable"
                    },
                    coachingTips: "Perfect day-after-hard-workout. Legs get a break, cardio system stays engaged. Should feel refreshing.",
                    runningEquivalent: "20-30 min recovery jog"
                },
                {
                    name: "Extended Recovery Swim",
                    duration: "30-40 minutes",
                    description: "Longer gentle swim for deep recovery",
                    structure: "30-40 min continuous very easy varied swimming",
                    intensity: "recovery",
                    benefits: "Extended active recovery without running impact, mental reset",
                    technique: {
                        focus: "Smooth, effortless strokes",
                        breathing: "Natural, comfortable",
                        effort: "Minimal"
                    },
                    workout: {
                        main: "1200-1600 yards ultra-easy mixed strokes with emphasis on drills and technique work"
                    },
                    effort: {
                        heartRate: "Zone 1 (60-70% max HR)",
                        perceived: "Extremely easy, almost meditative",
                        breathing: "Relaxed"
                    },
                    coachingTips: "Great for tired runners. Water supports body weight - zero impact. Focus on technique and relaxation.",
                    runningEquivalent: "30-40 min easy recovery run"
                }
            ],

            // TECHNIQUE WORK - Drills and Skills
            TECHNIQUE: [
                {
                    name: "Drill-Focused Session",
                    duration: "30-45 minutes",
                    description: "Technique drills for stroke improvement",
                    structure: "Continuous 30-45 min of mixed drills and easy swimming",
                    intensity: "easy",
                    benefits: "Improved stroke efficiency, better body position, injury prevention",
                    drills: [
                        "Catch-up drill (one arm at a time)",
                        "Fingertip drag (high elbow recovery)",
                        "Side-kick drill (rotation practice)",
                        "Fist swimming (feel for water)",
                        "6-kick switch (body rotation)",
                        "Sculling drills (hand position awareness)"
                    ],
                    workout: {
                        structure: "Rotate through 6-8 different drills, 50-100 yards each, with easy swimming between"
                    },
                    coachingTips: "Drills improve efficiency more than just swimming hard. Better technique = easier swimming = more sustainable training.",
                    runningEquivalent: "Running drills and form work"
                }
            ]
        };
    }

    /**
     * Get workout by type and approximate duration
     */
    getWorkoutByDuration(type, durationMinutes) {
        const typeKey = type.toUpperCase();
        const workouts = this.workoutLibrary[typeKey];

        if (!workouts || workouts.length === 0) {
            return null;
        }

        let closestWorkout = workouts[0];
        let smallestDiff = Math.abs(this.parseDuration(workouts[0].duration) - durationMinutes);

        workouts.forEach(workout => {
            const workoutDuration = this.parseDuration(workout.duration);
            const diff = Math.abs(workoutDuration - durationMinutes);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closestWorkout = workout;
            }
        });

        return closestWorkout;
    }

    /**
     * Parse duration string to midpoint
     */
    parseDuration(durationString) {
        const match = durationString.match(/(\d+)(?:-(\d+))?/);
        if (!match) return 40;

        const min = parseInt(match[1]);
        const max = match[2] ? parseInt(match[2]) : min;
        return (min + max) / 2;
    }

    /**
     * Get all workouts of specific type
     */
    getWorkoutsByType(type) {
        const typeKey = type.toUpperCase();
        return this.workoutLibrary[typeKey] || [];
    }
}

export default SwimmingWorkoutLibrary;
