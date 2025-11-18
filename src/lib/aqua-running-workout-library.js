/**
 * Aqua Running (Deep Water Running) Workout Library
 * Time-based workouts for injury recovery and cross-training
 * Based on Jeff Galloway methodology and running-specific pool training
 */
export class AquaRunningWorkoutLibrary {
    constructor() {
        // Equipment requirements
        this.equipmentSpecs = {
            required: ["Deep water pool", "Flotation belt"],
            optional: ["Waterproof timer/watch", "Visor (outdoor pools)"],
            description: "Deep end pool running with flotation belt - zero impact, running-specific motion",
            benefits: [
                "Maintains cardiovascular fitness during injury",
                "Strengthens backup muscles",
                "Smooths running gait through resistance",
                "Zero impact on joints",
                "Can replicate any running workout"
            ]
        };

        // Beginner progression for those new to aqua running
        this.beginnerProgression = {
            session1: {
                name: "Introduction to Aqua Running",
                description: "First aqua running session - learn technique and build adaptation",
                structure: "2 sets x (3-5 min easy aqua running + 10 min rest/practice technique)",
                totalTime: "20-25 minutes",
                notes: "Focus on upright posture, smooth leg motion identical to land running. Take breaks as needed."
            },
            session2: {
                name: "Building Duration",
                description: "Second session (3-4 days after first)",
                structure: "2 sets x (7-9 min easy aqua running + 5 min rest)",
                totalTime: "25-30 minutes",
                notes: "Increase continuous time, maintain good form throughout"
            },
            session3: {
                name: "Extended Efforts",
                description: "Third session - approaching normal workout duration",
                structure: "2 sets x (12-15 min easy aqua running + 3 min rest)",
                totalTime: "30-35 minutes",
                notes: "Nearly ready for full continuous sessions"
            },
            session4: {
                name: "Full Duration",
                description: "Ready for continuous sessions matching land running time",
                structure: "Single continuous session matching prescribed workout duration",
                notes: "You're now adapted! Can match any land running workout duration in the pool"
            }
        };

        this.workoutLibrary = {
            // EASY RECOVERY RUNS - Aerobic Base Maintenance
            EASY: [
                {
                    name: "Easy Recovery Run",
                    duration: "30-45 minutes",
                    description: "Gentle aerobic effort for recovery and base building",
                    structure: "30-45 min continuous easy aqua running",
                    intensity: "easy",
                    benefits: "Active recovery, maintains aerobic base, zero impact healing",
                    technique: "Smooth, relaxed leg motion. Upright posture. Arms move naturally like land running.",
                    effort: {
                        heartRate: "Zone 1-2 (60-75% max HR)",
                        perceived: "Conversational pace, could maintain for hours",
                        legTurnover: "Moderate, natural rhythm"
                    },
                    coachingTips: "Focus on smooth, efficient motion. The water resistance will automatically improve your running form."
                },
                {
                    name: "Moderate Easy Run",
                    duration: "45-60 minutes",
                    description: "Sustained easy aerobic work",
                    structure: "45-60 min continuous easy aqua running",
                    intensity: "easy",
                    benefits: "Aerobic development, endurance maintenance, mental refreshment",
                    technique: "Maintain upright position, feet directly underneath hips. Consistent smooth rhythm.",
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Comfortable, steady effort",
                        legTurnover: "Natural running cadence in water"
                    },
                    coachingTips: "Time passes quickly in the pool. Focus on maintaining good form rather than pushing effort."
                },
                {
                    name: "Extended Easy Run",
                    duration: "60-75 minutes",
                    description: "Long easy aerobic session",
                    structure: "60-75 min continuous easy aqua running",
                    intensity: "easy",
                    benefits: "Extended aerobic stimulus, mental toughness, significant calorie burn",
                    technique: "Stay relaxed. Break into mental chunks (15min segments) if needed.",
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Steady, sustainable effort",
                        legTurnover: "Consistent throughout"
                    },
                    coachingTips: "Longer than an hour in the pool builds serious mental fortitude. Stay patient and focused."
                }
            ],

            // TEMPO RUNS - Lactate Threshold Work
            TEMPO: [
                {
                    name: "Sustained Tempo Effort",
                    duration: "50-65 minutes",
                    description: "Continuous tempo effort at lactate threshold",
                    structure: "10 min easy warmup + 30-40 min @ tempo effort + 10 min easy cooldown",
                    intensity: "tempo",
                    benefits: "Lactate threshold development, sustained effort tolerance, race-specific fitness",
                    technique: "Increase leg turnover noticeably. You should feel your heart rate climb. Maintain smooth form even when breathing harder.",
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Comfortably hard - you'll 'huff and puff' but can speak short sentences",
                        legTurnover: "Noticeably faster than easy pace, crisp leg motion"
                    },
                    coachingTips: "The tempo portion should feel challenging but sustainable. If you can't maintain effort, you started too hard."
                },
                {
                    name: "Tempo Intervals",
                    duration: "55-70 minutes",
                    description: "Repeated tempo efforts with active recovery",
                    structure: "10 min easy warmup + 3-4 x 8 min @ tempo with 3 min easy recovery + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Threshold power development, recovery management, pacing practice",
                    technique: "During intervals: crisp leg turnover, strong core engagement. During recovery: truly easy, let HR drop.",
                    effort: {
                        heartRate: "Zone 3-4 during efforts (80-90% max HR), Zone 1-2 during recovery",
                        perceived: "Hard but repeatable, recovery feels genuinely easy",
                        legTurnover: "Fast during efforts, relaxed during recovery"
                    },
                    coachingTips: "The recovery jogs are crucial. Don't skip them - they teach your body to process lactate."
                },
                {
                    name: "Progressive Tempo Build",
                    duration: "50-65 minutes",
                    description: "Gradually increasing effort to simulate race finish",
                    structure: "10 min easy + 10 min moderate + 15 min tempo + 5 min hard + 10 min easy cooldown",
                    intensity: "tempo",
                    benefits: "Graduated effort adaptation, race simulation, finishing strength",
                    technique: "Smoothly increase leg speed and core tension. Final 5min should feel legitimately hard.",
                    effort: {
                        heartRate: "Building from Zone 2 → Zone 3 → Zone 4 → Zone 5",
                        perceived: "Starting comfortable, finishing hard like final mile of race",
                        legTurnover: "Progressive increase in cadence"
                    },
                    coachingTips: "This simulates racing when fatigued. The mental toughness gained here transfers directly to race day."
                },
                {
                    name: "Cruise Intervals",
                    duration: "55-70 minutes",
                    description: "Classic lactate threshold intervals",
                    structure: "10 min warmup + 5-6 x 5 min @ tempo with 2 min easy recovery + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Threshold efficiency, mental resilience, pacing consistency",
                    technique: "Each interval should feel identical in effort. Monitor turnover consistency.",
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Comfortably hard, short recovery keeps you honest",
                        legTurnover: "Fast, controlled, repeatable"
                    },
                    coachingTips: "Short recovery means you never fully recover. This is threshold work at its finest."
                }
            ],

            // INTERVAL WORKOUTS - High Intensity Speed Work
            INTERVALS: [
                {
                    name: "Classic 400m Repeats",
                    duration: "50-65 minutes",
                    description: "Short, fast intervals simulating track 400m repeats",
                    structure: "15 min easy warmup + 8-12 x 90 sec hard with 90 sec easy recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max development, speed endurance, running economy",
                    technique: "Maximum leg turnover while maintaining control. Arms pump hard. You'll be breathing very hard.",
                    effort: {
                        heartRate: "Zone 4-5 (90-95%+ max HR)",
                        perceived: "Hard - can't speak during efforts, breathing heavily",
                        legTurnover: "Very fast, approaching maximum controlled speed"
                    },
                    coachingTips: "These are hard! The 90sec recovery is short by design - teaches recovery under duress. Equal work:rest ratio.",
                    landEquivalent: "Simulates 8-12 x 400m on track"
                },
                {
                    name: "800m Repeats",
                    duration: "55-70 minutes",
                    description: "Medium intervals simulating track 800m repeats",
                    structure: "15 min easy warmup + 6-8 x 3 min hard with 2 min easy recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max, lactate tolerance, mental toughness",
                    technique: "Fast sustained leg speed. Control your breathing rhythm. Stay upright even when fatigued.",
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Very hard, last 30 seconds of each interval hurts",
                        legTurnover: "Fast and sustained throughout 3 minutes"
                    },
                    coachingTips: "The 3min duration is long enough to really build lactate. Fight through the discomfort.",
                    landEquivalent: "Simulates 6-8 x 800m on track"
                },
                {
                    name: "Pyramid Intervals",
                    duration: "60-75 minutes",
                    description: "Varied interval lengths building mental adaptability",
                    structure: "15 min warmup + [1min, 2min, 3min, 4min, 3min, 2min, 1min] hard with equal recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Mental engagement, varied pace practice, comprehensive speed work",
                    technique: "Adjust effort slightly for each interval length. Shorter = faster turnover, longer = controlled hard effort.",
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Hard throughout, but manageable with varying durations",
                        legTurnover: "Varies with interval length"
                    },
                    coachingTips: "The pyramid keeps your mind engaged. Equal recovery keeps it challenging.",
                    landEquivalent: "Simulates track pyramid workout (200m-400m-600m-800m-600m-400m-200m)"
                },
                {
                    name: "Short Speed Bursts",
                    duration: "45-60 minutes",
                    description: "Very short, very fast intervals for speed development",
                    structure: "15 min easy warmup + 12-16 x 45 sec @ max effort with 90 sec easy recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Top-end speed, neuromuscular power, running economy",
                    technique: "Explosive leg turnover. Maximum controllable speed. Form breaks down = stop interval.",
                    effort: {
                        heartRate: "Zone 5 (95%+ max HR)",
                        perceived: "Very hard, nearly all-out, can't maintain conversation",
                        legTurnover: "Maximum controlled turnover"
                    },
                    coachingTips: "These are about leg speed and power, not endurance. Quality over quantity - stop if form deteriorates.",
                    landEquivalent: "Simulates 12-16 x 200m on track"
                },
                {
                    name: "1000m Repeats",
                    duration: "60-75 minutes",
                    description: "Longer intervals building VO2max endurance",
                    structure: "15 min warmup + 5-6 x 4 min hard with 3 min easy recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max endurance, mental toughness, race-pace specificity",
                    technique: "Controlled hard effort. The 4min duration requires pacing discipline - don't go out too fast.",
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Hard and sustained, requires mental focus",
                        legTurnover: "Fast but controlled, sustainable for 4 minutes"
                    },
                    coachingTips: "Longer intervals teach you to manage discomfort. The final minute of each is pure mental training.",
                    landEquivalent: "Simulates 5-6 x 1000m on track"
                }
            ],

            // LONG RUNS - Endurance Development
            LONG: [
                {
                    name: "Steady Long Run",
                    duration: "75-90 minutes",
                    description: "Extended aerobic endurance session",
                    structure: "75-90 min continuous easy-moderate effort",
                    intensity: "long",
                    benefits: "Aerobic capacity, mental endurance, fat burning adaptation",
                    technique: "Stay relaxed. Break into mental segments (every 15-20 minutes). Focus on smooth, efficient form.",
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Conversational but sustained, should feel moderately challenging by the end",
                        legTurnover: "Steady, natural rhythm throughout"
                    },
                    coachingTips: "Long runs in the pool build incredible mental toughness. The monotony is part of the training.",
                    landEquivalent: "Simulates 10-12 mile long run"
                },
                {
                    name: "Extended Long Run",
                    duration: "90-120 minutes",
                    description: "Marathon-specific endurance work",
                    structure: "90-120 min continuous easy-moderate effort",
                    intensity: "long",
                    benefits: "Maximum aerobic development, glycogen depletion training, mental fortitude",
                    technique: "Mental breaks every 20 minutes. Stay patient. Maintain form even when fatigued.",
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Comfortable early, becomes work in final 30 minutes",
                        legTurnover: "Consistent, don't slow down when tired"
                    },
                    coachingTips: "Two hours in the pool is serious training. Bring water. Mental game is everything here.",
                    landEquivalent: "Simulates 13-16 mile long run"
                },
                {
                    name: "Progressive Long Run",
                    duration: "75-105 minutes",
                    description: "Long run with building effort in final portion",
                    structure: "60 min easy + 15-30 min @ moderate-tempo effort + 10 min easy cooldown",
                    intensity: "long",
                    benefits: "Endurance + race-specific fatigue resistance, teaches finishing strong",
                    technique: "Start relaxed. Gradually increase leg speed in final portion. Simulate racing tired.",
                    effort: {
                        heartRate: "Zone 2 early, building to Zone 3-4 in final portion",
                        perceived: "Easy early, hard finish simulates race fatigue",
                        legTurnover: "Natural early, picking up noticeably in final portion"
                    },
                    coachingTips: "This teaches you to run hard when tired - critical for race day. The mental aspect is huge.",
                    landEquivalent: "Simulates long run with marathon pace finish"
                },
                {
                    name: "Long Run with Surges",
                    duration: "75-90 minutes",
                    description: "Long run with periodic hard efforts",
                    structure: "75-90 min with 6-8 x 2 min @ tempo effort scattered throughout (every 10-12 min), remainder easy",
                    intensity: "long",
                    benefits: "Endurance + speed endurance, race simulation, mental engagement",
                    technique: "Easy running between surges. Surges are controlled hard - not all-out sprints.",
                    effort: {
                        heartRate: "Zone 2 baseline, Zone 3-4 during surges",
                        perceived: "Mostly comfortable with periodic challenging efforts",
                        legTurnover: "Natural rhythm, faster during surges"
                    },
                    coachingTips: "Surges break up the monotony and teach you to change pace mid-workout. Very race-specific.",
                    landEquivalent: "Simulates long run with fartlek surges"
                }
            ],

            // HILL WORKOUTS - Strength and Power Development
            HILLS: [
                {
                    name: "Pool Hill Repeats",
                    duration: "50-65 minutes",
                    description: "Simulated hill running using increased resistance and exaggerated leg drive",
                    structure: "15 min easy warmup + 8-10 x 90 sec @ hill effort (high knee drive, powerful push) with 2 min easy recovery + 10 min cooldown",
                    intensity: "hills",
                    benefits: "Leg strength, power development, running economy, glute/hamstring activation",
                    technique: "Exaggerate knee lift. Drive feet down powerfully. Engage glutes strongly. Lean slightly forward from ankles.",
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Hard, muscular effort with elevated breathing",
                        legTurnover: "Powerful, deliberate, high knee drive"
                    },
                    coachingTips: "Focus on power and strength. The water resistance simulates uphill running perfectly. Feel the glutes working.",
                    landEquivalent: "Simulates 8-10 x 90-second hill repeats"
                },
                {
                    name: "Long Hill Intervals",
                    duration: "55-70 minutes",
                    description: "Extended hill efforts building strength endurance",
                    structure: "15 min warmup + 5-6 x 3 min @ hill effort with 3 min easy recovery + 10 min cooldown",
                    intensity: "hills",
                    benefits: "Sustained power, muscular endurance, mental toughness",
                    technique: "Maintain powerful knee drive for full 3 minutes. Don't let form deteriorate.",
                    effort: {
                        heartRate: "Zone 4 (85-90% max HR)",
                        perceived: "Hard and sustained, muscular fatigue is primary limiter",
                        legTurnover: "Controlled powerful motion, resist urge to speed up"
                    },
                    coachingTips: "These are long enough to build serious strength endurance. Last minute of each is pure grit.",
                    landEquivalent: "Simulates 5-6 x 3-minute hill repeats"
                },
                {
                    name: "Short Explosive Hills",
                    duration: "45-60 minutes",
                    description: "Short, powerful hill bursts for explosive strength",
                    structure: "15 min warmup + 12-15 x 45 sec @ maximum hill effort with 90 sec easy recovery + 10 min cooldown",
                    intensity: "hills",
                    benefits: "Explosive power, fast-twitch recruitment, neuromuscular development",
                    technique: "Explosive knee drive, maximum power output. Quality over quantity - stop if power drops.",
                    effort: {
                        heartRate: "Zone 5 (95%+ max HR)",
                        perceived: "Very hard, nearly maximum effort",
                        legTurnover: "Explosive, powerful, exaggerated knee lift"
                    },
                    coachingTips: "These are about maximum power production. If you can't maintain explosiveness, end the workout.",
                    landEquivalent: "Simulates 12-15 x 45-second steep hill sprints"
                }
            ],

            // RECOVERY RUNS - Active Recovery
            RECOVERY: [
                {
                    name: "Short Recovery Session",
                    duration: "20-30 minutes",
                    description: "Gentle active recovery to promote blood flow and healing",
                    structure: "20-30 min very easy aqua running",
                    intensity: "recovery",
                    benefits: "Active recovery, blood flow to damaged tissues, mental refreshment without impact stress",
                    technique: "Minimal effort. Focus on smooth, relaxed motion. This should feel easy.",
                    effort: {
                        heartRate: "Zone 1 (60-70% max HR)",
                        perceived: "Very easy, restorative, could maintain indefinitely",
                        legTurnover: "Slow, relaxed, natural"
                    },
                    coachingTips: "The goal is recovery, not fitness. If this feels hard, you're going too fast or need complete rest instead."
                },
                {
                    name: "Extended Recovery Float",
                    duration: "30-40 minutes",
                    description: "Longer gentle session for deep recovery",
                    structure: "30-40 min very easy aqua running with ultra-relaxed form",
                    intensity: "recovery",
                    benefits: "Extended active recovery, mental reset, maintains movement patterns without stress",
                    technique: "Barely moving. Think 'floating run.' Let the water do the work.",
                    effort: {
                        heartRate: "Zone 1 (60-70% max HR)",
                        perceived: "Extremely easy, almost meditative",
                        legTurnover: "Minimal, smooth, effortless"
                    },
                    coachingTips: "This is recovery disguised as training. The zero impact makes it perfect for day-after-hard-workout sessions."
                }
            ]
        };
    }

    /**
     * Get workout by type and approximate duration
     * @param {string} type - Workout type: 'easy', 'tempo', 'intervals', 'long', 'hills', 'recovery'
     * @param {number} durationMinutes - Target duration in minutes
     * @returns {object} - Matching workout or closest match
     */
    getWorkoutByDuration(type, durationMinutes) {
        const typeKey = type.toUpperCase();
        const workouts = this.workoutLibrary[typeKey];

        if (!workouts || workouts.length === 0) {
            return null;
        }

        // Parse duration string (e.g., "50-65 minutes") and find closest match
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
     * Parse duration string to get midpoint value
     * @param {string} durationString - e.g., "50-65 minutes" or "90 minutes"
     * @returns {number} - Duration in minutes
     */
    parseDuration(durationString) {
        const match = durationString.match(/(\d+)(?:-(\d+))?/);
        if (!match) return 60; // default

        const min = parseInt(match[1]);
        const max = match[2] ? parseInt(match[2]) : min;
        return (min + max) / 2; // return midpoint
    }

    /**
     * Get all workouts of a specific type
     * @param {string} type - Workout type
     * @returns {array} - Array of workouts
     */
    getWorkoutsByType(type) {
        const typeKey = type.toUpperCase();
        return this.workoutLibrary[typeKey] || [];
    }

    /**
     * Get beginner progression protocol
     * @returns {object} - Beginner progression guide
     */
    getBeginnerProgression() {
        return this.beginnerProgression;
    }
}

export default AquaRunningWorkoutLibrary;
