/**
 * Elliptical Machine Workout Library
 * Time and effort-based workouts for running-specific cross-training
 * Most accessible option - available in nearly every gym
 */
export class EllipticalWorkoutLibrary {
    constructor() {
        // Equipment characteristics
        this.equipmentSpecs = {
            name: "Elliptical Machine",
            description: "Low-impact cardio with running-like motion, adjustable resistance and incline",
            accessibility: "Highly accessible - found in virtually every gym, common home equipment",
            benefits: [
                "Low impact alternative to running",
                "Similar movement pattern to running",
                "Adjustable resistance and incline for varied intensity",
                "Can match running heart rate zones",
                "Works similar muscle groups with less joint stress"
            ],
            keyMetrics: {
                cadence: "Target 90 RPM (revolutions per minute) - matches 180 spm running cadence",
                heartRate: "87-92% max for tempo, 95-100% max for intervals",
                resistance: "Increase for harder efforts, combined with incline changes",
                incline: "Higher incline = more glute/hamstring activation, simulates hills"
            }
        };

        this.workoutLibrary = {
            // EASY RECOVERY WORKOUTS - Active Recovery and Base Building
            EASY: [
                {
                    name: "Easy Recovery Session",
                    duration: "30-45 minutes",
                    description: "Low-intensity active recovery to promote blood flow and healing",
                    structure: "30-45 min continuous easy effort at low resistance and moderate incline",
                    intensity: "easy",
                    benefits: "Active recovery, maintains aerobic base without impact stress, promotes healing",
                    settings: {
                        resistance: "Low (3-5 out of 20)",
                        incline: "Moderate (5-8)",
                        cadence: "85-90 RPM",
                        heartRate: "Zone 1-2 (60-75% max HR)"
                    },
                    technique: "Smooth, relaxed motion. Full foot contact on pedals. Upright posture. Let the machine do the work.",
                    coachingTips: "This should feel easy. If you're breathing hard, reduce resistance. The goal is recovery, not fitness."
                },
                {
                    name: "Moderate Easy Workout",
                    duration: "45-60 minutes",
                    description: "Sustained easy aerobic work for base building",
                    structure: "45-60 min continuous steady effort",
                    intensity: "easy",
                    benefits: "Aerobic base development, maintains endurance without running impact",
                    settings: {
                        resistance: "Moderate (5-8 out of 20)",
                        incline: "Moderate (6-10)",
                        cadence: "90 RPM",
                        heartRate: "Zone 2 (65-75% max HR)"
                    },
                    technique: "Consistent rhythm throughout. Focus on smooth circular motion. Engage core.",
                    coachingTips: "Should feel comfortable and sustainable. You're building aerobic foundation."
                },
                {
                    name: "Extended Easy Session",
                    duration: "60-75 minutes",
                    description: "Long easy aerobic session",
                    structure: "60-75 min continuous steady effort with occasional resistance/incline variations",
                    intensity: "easy",
                    benefits: "Extended aerobic stimulus, mental endurance, significant calorie burn",
                    settings: {
                        resistance: "Moderate (6-9 out of 20)",
                        incline: "Varies (6-12)",
                        cadence: "90 RPM",
                        heartRate: "Zone 2 (65-75% max HR)"
                    },
                    technique: "Vary incline every 10-15 minutes to work different muscle groups. Maintain consistent effort.",
                    coachingTips: "Long sessions on the elliptical require mental toughness. Break it into chunks. Stay patient."
                }
            ],

            // TEMPO WORKOUTS - Lactate Threshold Development
            TEMPO: [
                {
                    name: "Sustained Tempo Effort",
                    duration: "50-65 minutes",
                    description: "Continuous tempo effort at lactate threshold",
                    structure: "10 min easy warmup + 30-40 min @ tempo effort (high resistance, moderate incline) + 10 min easy cooldown",
                    intensity: "tempo",
                    benefits: "Lactate threshold development, sustained hard effort tolerance, race-specific fitness",
                    settings: {
                        warmup: {resistance: 4, incline: 6, cadence: 85},
                        tempo: {resistance: "12-14", incline: "8-10", cadence: "90-92 RPM"},
                        cooldown: {resistance: 3, incline: 5, cadence: 85}
                    },
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Comfortably hard - can speak in short sentences, breathing elevated",
                        cadence: "90-92 RPM during tempo portion"
                    },
                    technique: "Increase resistance to elevate heart rate. Maintain 90+ RPM. Strong leg drive. Upright posture.",
                    coachingTips: "The tempo should feel challenging but sustainable for the full duration. Don't start too hard."
                },
                {
                    name: "Tempo Intervals",
                    duration: "55-70 minutes",
                    description: "Repeated tempo blocks with active recovery",
                    structure: "10 min warmup + 3-4 x 8 min @ tempo (high resistance) with 3 min easy recovery + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Threshold power, recovery management under fatigue, pacing discipline",
                    settings: {
                        intervals: {resistance: "13-15", incline: "8-10", cadence: "90-92 RPM"},
                        recovery: {resistance: 4, incline: 5, cadence: 85}
                    },
                    effort: {
                        heartRate: "Zone 3-4 during efforts (80-90% max HR)",
                        perceived: "Hard but repeatable, recovery feels easy",
                        cadence: "90-92 RPM during efforts"
                    },
                    technique: "Sharp contrast between effort and recovery. Recovery is truly easy - let HR drop.",
                    coachingTips: "Each interval should feel the same. If you're dying on the last one, you went too hard early."
                },
                {
                    name: "Progressive Tempo Build",
                    duration: "50-65 minutes",
                    description: "Gradually increasing resistance to simulate race finish",
                    structure: "10 min easy + 10 min moderate + 15 min tempo + 5 min hard + 10 min easy cooldown",
                    intensity: "tempo",
                    benefits: "Graduated effort adaptation, finishing strength, race simulation",
                    settings: {
                        easy: {resistance: 4, incline: 6},
                        moderate: {resistance: 9, incline: 8},
                        tempo: {resistance: 13, incline: 9},
                        hard: {resistance: 16, incline: 10},
                        cooldown: {resistance: 3, incline: 5}
                    },
                    effort: {
                        heartRate: "Building from Zone 2 → Zone 5",
                        perceived: "Starting comfortable, finishing very hard",
                        cadence: "85 RPM building to 92+ RPM"
                    },
                    technique: "Progressive resistance increases. Final 5min should feel like racing the final mile.",
                    coachingTips: "This teaches you to push when tired. The mental aspect is crucial for race day."
                },
                {
                    name: "Cruise Intervals",
                    duration: "55-70 minutes",
                    description: "Classic lactate threshold intervals with short recovery",
                    structure: "10 min warmup + 5-6 x 5 min @ tempo with 2 min easy recovery + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Threshold efficiency, mental resilience, consistent pacing",
                    settings: {
                        intervals: {resistance: "13-14", incline: "8-9", cadence: "90 RPM"},
                        recovery: {resistance: 4, incline: 5, cadence: 85}
                    },
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Comfortably hard, short recovery keeps it honest",
                        cadence: "Consistent 90 RPM"
                    },
                    technique: "Consistent effort and cadence across all intervals. Monitor RPM closely.",
                    coachingTips: "Short recovery = never fully recovered. Classic threshold training."
                }
            ],

            // INTERVAL WORKOUTS - VO2max and Speed Development
            INTERVALS: [
                {
                    name: "1-Minute On/Off Intervals",
                    duration: "45-60 minutes",
                    description: "Short, intense intervals with equal recovery",
                    structure: "10-15 min easy warmup + 15 x 1 min fast (high resistance + incline) / 1 min easy float + 10-15 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max development, speed endurance, mental toughness",
                    settings: {
                        intervals: {resistance: "15-17", incline: "10-12", cadence: "95-100 RPM"},
                        recovery: {resistance: 3, incline: 4, cadence: 80}
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95%+ max HR)",
                        perceived: "Hard - breathing heavily, can't speak during efforts",
                        cadence: "95-100 RPM during efforts"
                    },
                    technique: "Maximum sustainable resistance and cadence. Drive hard through legs. Recover completely during floats.",
                    coachingTips: "Equal work:rest teaches your body to recover under duress. These are hard!",
                    landEquivalent: "Simulates 15 x 400m track repeats"
                },
                {
                    name: "Pyramid Intervals",
                    duration: "55-70 minutes",
                    description: "Varied interval lengths for mental engagement",
                    structure: "15 min warmup + [1min, 2min, 3min, 4min, 3min, 2min, 1min] hard with equal recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Mental adaptability, varied pace practice, comprehensive speed work",
                    settings: {
                        intervals: {resistance: "14-16", incline: "9-11", cadence: "92-98 RPM"},
                        recovery: {resistance: 4, incline: 5, cadence: 85}
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Hard throughout, varying with interval length",
                        cadence: "Adjust slightly for each length"
                    },
                    technique: "Shorter intervals = higher cadence, longer = controlled hard effort with moderate cadence.",
                    coachingTips: "Pyramid keeps your mind engaged. Adjust resistance for each interval duration.",
                    landEquivalent: "Simulates 200m-400m-600m-800m-600m-400m-200m pyramid"
                },
                {
                    name: "3-Minute Hard Repeats",
                    duration: "55-70 minutes",
                    description: "Medium-length intervals building VO2max",
                    structure: "15 min warmup + 6-8 x 3 min hard with 2 min easy recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max, lactate tolerance, sustained hard effort",
                    settings: {
                        intervals: {resistance: "15-16", incline: 10, cadence: "92-95 RPM"},
                        recovery: {resistance: 4, incline: 5, cadence: 85}
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Very hard, last 30 seconds hurts",
                        cadence: "92-95 RPM"
                    },
                    technique: "Control your effort - 3 minutes is long enough to blow up if you start too hard.",
                    coachingTips: "The 3-min duration builds serious lactate. Fight through the discomfort.",
                    landEquivalent: "Simulates 6-8 x 800m track repeats"
                },
                {
                    name: "Tabata-Style Sprint Intervals",
                    duration: "40-55 minutes",
                    description: "Very short, very intense efforts",
                    structure: "15 min warmup + 8 rounds x (20 sec all-out / 10 sec rest) + 3 min recovery, repeat 2-3 sets + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Anaerobic capacity, explosive power, mental toughness",
                    settings: {
                        sprints: {resistance: "12-14", incline: 8, cadence: "110-120 RPM"},
                        rest: {resistance: 4, incline: 4, cadence: 70}
                    },
                    effort: {
                        heartRate: "Zone 5 (95%+ max HR)",
                        perceived: "Maximum effort, gasping for air",
                        cadence: "110-120 RPM - as fast as controllable"
                    },
                    technique: "Explosive leg speed. Maximum RPM while maintaining control. 10 seconds goes fast!",
                    coachingTips: "These are brutal. Quality over quantity - if form breaks, stop the set.",
                    landEquivalent: "Simulates all-out sprint intervals"
                },
                {
                    name: "4-Minute VO2max Intervals",
                    duration: "60-75 minutes",
                    description: "Longer intervals at VO2max intensity",
                    structure: "15 min warmup + 5-6 x 4 min hard with 3 min easy recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max endurance, mental toughness, race-pace specificity",
                    settings: {
                        intervals: {resistance: "14-15", incline: 9, cadence: "92-95 RPM"},
                        recovery: {resistance: 4, incline: 5, cadence: 85}
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Hard and sustained, requires focus",
                        cadence: "92-95 RPM consistently"
                    },
                    technique: "Pacing is critical - don't blow up early. Final minute is pure mental training.",
                    coachingTips: "4 minutes is long enough to teach you to manage suffering. This is race prep.",
                    landEquivalent: "Simulates 5-6 x 1000m track repeats"
                }
            ],

            // LONG SESSIONS - Endurance Development
            LONG: [
                {
                    name: "Steady Long Session",
                    duration: "75-90 minutes",
                    description: "Extended moderate effort for aerobic development",
                    structure: "75-90 min continuous moderate effort, vary incline every 10-15 min for muscle variety",
                    intensity: "long",
                    benefits: "Aerobic capacity, fat burning adaptation, mental endurance",
                    settings: {
                        resistance: "Moderate (7-9)",
                        incline: "Varies (6-12)",
                        cadence: "88-92 RPM"
                    },
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Conversational but sustained",
                        cadence: "Steady 88-92 RPM"
                    },
                    technique: "Vary incline to work different muscle angles. Stay patient and consistent.",
                    coachingTips: "Long elliptical sessions build serious mental fortitude. Stay engaged by varying incline.",
                    landEquivalent: "Simulates 10-12 mile long run"
                },
                {
                    name: "Extended Long Session",
                    duration: "90-120 minutes",
                    description: "Marathon-specific endurance work",
                    structure: "90-120 min continuous effort, systematic incline changes every 15 min",
                    intensity: "long",
                    benefits: "Maximum aerobic development, glycogen depletion training, mental toughness",
                    settings: {
                        resistance: "Moderate (7-10)",
                        incline: "Cycles through 6-8-10-12 every 15 min",
                        cadence: "88-92 RPM"
                    },
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Comfortable early, becomes work in final 30 min",
                        cadence: "Consistent throughout"
                    },
                    technique: "Systematic incline changes prevent boredom and work multiple muscle angles.",
                    coachingTips: "Two hours on the elliptical is serious training. Bring water and entertainment.",
                    landEquivalent: "Simulates 13-16 mile long run"
                },
                {
                    name: "Progressive Long Session",
                    duration: "75-105 minutes",
                    description: "Long session with building effort in final portion",
                    structure: "60 min easy-moderate + 15-30 min @ increased resistance/tempo effort + 10 min easy",
                    intensity: "long",
                    benefits: "Endurance + race-specific fatigue resistance",
                    settings: {
                        base: {resistance: 7, incline: 8, cadence: 90},
                        finish: {resistance: "12-13", incline: 9, cadence: 92},
                        cooldown: {resistance: 4, incline: 5, cadence: 85}
                    },
                    effort: {
                        heartRate: "Zone 2 early, building to Zone 3-4",
                        perceived: "Easy early, hard finish",
                        cadence: "Building from 90 to 92+ RPM"
                    },
                    technique: "Simulate running hard when tired. This is race-day practice.",
                    coachingTips: "The hard finish teaches you to push when fatigued - critical for racing.",
                    landEquivalent: "Simulates long run with marathon pace finish"
                }
            ],

            // HILL WORKOUTS - Strength Development
            HILLS: [
                {
                    name: "Hill Repeats",
                    duration: "50-65 minutes",
                    description: "Simulated hill running using maximum incline",
                    structure: "15 min easy warmup + 8-10 x 90 sec @ max incline (high resistance) with 2 min easy recovery + 10 min cooldown",
                    intensity: "hills",
                    benefits: "Leg strength, power development, glute/hamstring activation",
                    settings: {
                        hills: {resistance: "13-15", incline: "15-20 (max)", cadence: "85-90 RPM"},
                        recovery: {resistance: 3, incline: 2, cadence: 80}
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Hard, muscular effort",
                        cadence: "85-90 RPM - power over speed"
                    },
                    technique: "Maximum incline. Focus on driving through glutes and hamstrings. Strong core engagement.",
                    coachingTips: "High incline + resistance = serious strength work. Feel the glutes burn.",
                    landEquivalent: "Simulates 8-10 x 90-second hill repeats"
                },
                {
                    name: "Long Hill Intervals",
                    duration: "55-70 minutes",
                    description: "Extended hill efforts for strength endurance",
                    structure: "15 min warmup + 5-6 x 3 min @ high incline with 3 min easy recovery + 10 min cooldown",
                    intensity: "hills",
                    benefits: "Sustained power, muscular endurance, mental toughness",
                    settings: {
                        hills: {resistance: "12-14", incline: "12-15", cadence: "85-88 RPM"},
                        recovery: {resistance: 3, incline: 2, cadence: 80}
                    },
                    effort: {
                        heartRate: "Zone 4 (85-90% max HR)",
                        perceived: "Hard and sustained, muscular fatigue",
                        cadence: "85-88 RPM"
                    },
                    technique: "Maintain form for full 3 minutes despite fatigue. Don't let cadence drop.",
                    coachingTips: "3 minutes at high incline builds serious strength endurance. Last minute is grit.",
                    landEquivalent: "Simulates 5-6 x 3-minute hill repeats"
                },
                {
                    name: "Rolling Hills Session",
                    duration: "60-75 minutes",
                    description: "Varied incline simulating hilly terrain",
                    structure: "Continuous 60-75 min with incline varying every 2-3 minutes between 4-16",
                    intensity: "hills",
                    benefits: "Variable terrain adaptation, mental engagement, comprehensive leg strength",
                    settings: {
                        resistance: "Moderate (8-10)",
                        incline: "Cycles: 4-8-12-16-12-8-4 every 2-3 min",
                        cadence: "90 RPM on flats, 85 RPM on steep sections"
                    },
                    effort: {
                        heartRate: "Zone 2-4 (varies with incline)",
                        perceived: "Moderate to hard depending on current incline",
                        cadence: "Adjust with terrain"
                    },
                    technique: "Adjust cadence and effort with incline changes. Simulate real trail running.",
                    coachingTips: "This simulates hilly race courses. Mental engagement is high with constant changes.",
                    landEquivalent: "Simulates hilly long run or trail run"
                }
            ],

            // RECOVERY SESSIONS - Active Recovery
            RECOVERY: [
                {
                    name: "Short Recovery Session",
                    duration: "20-30 minutes",
                    description: "Gentle movement for active recovery",
                    structure: "20-30 min very easy, minimal resistance and incline",
                    intensity: "recovery",
                    benefits: "Blood flow without stress, active recovery, movement pattern maintenance",
                    settings: {
                        resistance: "Very low (2-3)",
                        incline: "Low (3-5)",
                        cadence: "80-85 RPM"
                    },
                    effort: {
                        heartRate: "Zone 1 (60-70% max HR)",
                        perceived: "Very easy, restorative",
                        cadence: "Slow and relaxed"
                    },
                    technique: "Minimal effort. Focus on smooth motion. This should feel easy.",
                    coachingTips: "If this feels hard, you need complete rest instead. Goal is recovery, not fitness."
                },
                {
                    name: "Extended Recovery Session",
                    duration: "30-45 minutes",
                    description: "Longer gentle session for deep recovery",
                    structure: "30-45 min very easy with minimal resistance",
                    intensity: "recovery",
                    benefits: "Extended active recovery without impact stress",
                    settings: {
                        resistance: "Very low (2-4)",
                        incline: "Low (4-6)",
                        cadence: "82-87 RPM"
                    },
                    effort: {
                        heartRate: "Zone 1 (60-70% max HR)",
                        perceived: "Extremely easy, almost meditative",
                        cadence: "Relaxed and natural"
                    },
                    technique: "Let the machine do the work. Focus on smooth, effortless motion.",
                    coachingTips: "Perfect for day-after-hard-workout. Zero impact makes it ideal for recovery."
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
        if (!match) return 60;

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

export default EllipticalWorkoutLibrary;
