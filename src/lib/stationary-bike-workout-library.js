/**
 * Stationary Bike Workout Library
 * Running-specific cycling workouts for cross-training
 * Includes spin bikes, upright bikes, Peloton, indoor trainers
 * Different from stand-up bikes (Cyclete/ElliptiGO)
 */
export class StationaryBikeWorkoutLibrary {
    constructor() {
        // Equipment characteristics
        this.equipmentSpecs = {
            name: "Stationary Bike",
            types: ["Spin bike", "Upright bike", "Peloton", "Indoor trainer with road bike", "Recumbent bike"],
            description: "Traditional seated cycling for running-specific cross-training",
            accessibility: "Highly accessible - gyms, home Pelotons, Zwift setups, spin studios",
            benefits: [
                "Low impact cardiovascular training",
                "Maintains aerobic fitness during injury",
                "Builds leg strength and power",
                "Can match running heart rate zones",
                "Accessible almost anywhere"
            ],
            runningConversion: {
                time: "10-15 min cycling ≈ 1 mile running",
                distance: "3x distance (5 mile run ≈ 15 mile ride)",
                effort: "1 hour cycling ≈ 30-40 min running"
            },
            keyMetrics: {
                cadence: "Target 90 RPM (matches 180 spm running), up to 125 RPM for sprints",
                heartRate: "~8-10 bpm lower than running initially (sport-specific fitness improves this)",
                power: "If available: FTP-based zones similar to running pace zones",
                resistance: "Adjust to match running effort levels"
            }
        };

        this.workoutLibrary = {
            // EASY RECOVERY RIDES - Active Recovery
            EASY: [
                {
                    name: "Recovery Spin",
                    duration: "30-45 minutes",
                    description: "Gentle spinning for active recovery",
                    structure: "30-45 min continuous easy spinning at low resistance",
                    intensity: "easy",
                    benefits: "Active recovery, blood flow to legs, maintains aerobic base without impact",
                    settings: {
                        resistance: "Low (easy to spin)",
                        cadence: "85-95 RPM",
                        heartRate: "Zone 1-2 (60-75% max HR)",
                        power: "< 60% FTP if using power meter"
                    },
                    technique: "Smooth, relaxed pedal stroke. Seated position. Light grip on handlebars. Let legs spin freely.",
                    coachingTips: "This should feel easy. If you're breathing hard, reduce resistance. Recovery is the goal.",
                    runningEquivalent: "30-45 min easy recovery run"
                },
                {
                    name: "Moderate Easy Ride",
                    duration: "45-75 minutes",
                    description: "Sustained easy aerobic ride",
                    structure: "45-75 min continuous steady effort",
                    intensity: "easy",
                    benefits: "Aerobic base building, endurance maintenance without running impact",
                    settings: {
                        resistance: "Moderate (conversational effort)",
                        cadence: "88-95 RPM",
                        heartRate: "Zone 2 (65-75% max HR)",
                        power: "60-70% FTP"
                    },
                    technique: "Consistent cadence throughout. Vary seated/standing every 10-15 min for variety.",
                    coachingTips: "Should feel comfortable and sustainable. You're building aerobic foundation.",
                    runningEquivalent: "45-60 min easy run"
                },
                {
                    name: "Extended Easy Ride",
                    duration: "75-120 minutes",
                    description: "Long easy aerobic session",
                    structure: "75-120 min continuous steady effort, vary position occasionally",
                    intensity: "easy",
                    benefits: "Extended aerobic stimulus, fat burning adaptation, mental endurance",
                    settings: {
                        resistance: "Moderate",
                        cadence: "88-92 RPM",
                        heartRate: "Zone 2 (65-75% max HR)",
                        power: "60-70% FTP"
                    },
                    technique: "Alternate seated and standing climbs every 15-20 min. Stay patient and consistent.",
                    coachingTips: "Long rides build serious endurance. Bring water and fuel if over 90 minutes.",
                    runningEquivalent: "60-75 min easy run"
                }
            ],

            // TEMPO RIDES - Lactate Threshold Work
            TEMPO: [
                {
                    name: "Sustained Tempo Ride",
                    duration: "60-90 minutes",
                    description: "Continuous tempo effort at lactate threshold",
                    structure: "15 min easy warmup + 30-60 min @ tempo effort (high resistance, 85-90 RPM) + 15 min easy cooldown",
                    intensity: "tempo",
                    benefits: "Lactate threshold development, sustained power, mental toughness",
                    settings: {
                        warmup: {resistance: "low", cadence: 90},
                        tempo: {resistance: "moderate-high", cadence: "85-90 RPM"},
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        power: "85-95% FTP"
                    },
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Comfortably hard - can speak short sentences, breathing elevated",
                        cadence: "85-90 RPM consistently"
                    },
                    technique: "Seated mostly. Increase resistance to hit effort, not just higher cadence. Strong steady pedal stroke.",
                    coachingTips: "Tempo should feel challenging but sustainable. Don't start too hard.",
                    runningEquivalent: "45-60 min tempo run"
                },
                {
                    name: "Tempo Intervals",
                    duration: "75-105 minutes",
                    description: "Repeated tempo efforts with active recovery",
                    structure: "15 min warmup + 4 x 15 min @ tempo (moderate-high resistance) with 8 min easy spinning + 15 min cooldown",
                    intensity: "tempo",
                    benefits: "Threshold power, recovery management, pacing practice",
                    settings: {
                        intervals: {resistance: "moderate-high", cadence: "85-90 RPM"},
                        recovery: {resistance: "low", cadence: "90-95 RPM"},
                        heartRate: "Zone 3-4 during efforts",
                        power: "85-95% FTP during efforts"
                    },
                    effort: {
                        heartRate: "Zone 3-4 during efforts (80-90% max HR)",
                        perceived: "Hard but repeatable, recovery truly easy",
                        cadence: "85-90 RPM during efforts, faster during recovery"
                    },
                    technique: "Strong resistance during efforts. Truly easy spinning during recovery - let HR drop.",
                    coachingTips: "This is classic threshold work. Each interval should feel the same.",
                    runningEquivalent: "Tempo interval workout"
                },
                {
                    name: "Progressive Power Build",
                    duration: "60-90 minutes",
                    description: "Gradually increasing resistance simulating race finish",
                    structure: "15 min easy + 15 min moderate + 20 min tempo + 10 min hard + 15 min easy cooldown",
                    intensity: "tempo",
                    benefits: "Graduated effort adaptation, finishing strength, race simulation",
                    settings: {
                        progressive: {resistance: "increasing each segment", cadence: "88-92 RPM"},
                        heartRate: "Building from Zone 2 → Zone 5",
                        power: "Building from 65% → 100% FTP"
                    },
                    effort: {
                        heartRate: "Building from Zone 2 to Zone 5",
                        perceived: "Starting comfortable, finishing very hard",
                        cadence: "Steady throughout"
                    },
                    technique: "Gradually increase resistance each segment. Final 10min should feel like racing.",
                    coachingTips: "This teaches you to push when tired. Mental training for race day.",
                    runningEquivalent: "Progressive tempo run"
                },
                {
                    name: "Sweet Spot Intervals",
                    duration: "60-90 minutes",
                    description: "Sustained efforts just below threshold",
                    structure: "15 min warmup + 3 x 20 min @ sweet spot (88-93% FTP) with 5 min easy + 15 min cooldown",
                    intensity: "tempo",
                    benefits: "Threshold development with more volume, sustainable power",
                    settings: {
                        intervals: {resistance: "moderate-high", cadence: "85-90 RPM"},
                        recovery: {resistance: "low", cadence: "95 RPM"},
                        heartRate: "Zone 3 (75-85% max HR)",
                        power: "88-93% FTP"
                    },
                    effort: {
                        heartRate: "Zone 3 (75-85% max HR)",
                        perceived: "Moderately hard, sustainable for longer durations",
                        cadence: "Steady 85-90 RPM"
                    },
                    technique: "Just below threshold = can sustain longer. Focus on smooth power delivery.",
                    coachingTips: "Sweet spot is hard enough to build fitness, sustainable enough for volume.",
                    runningEquivalent: "Tempo run or marathon pace work"
                }
            ],

            // INTERVAL WORKOUTS - VO2max and Power Development
            INTERVALS: [
                {
                    name: "1-Minute Sprint Intervals",
                    duration: "60-75 minutes",
                    description: "Short, intense sprints with recovery",
                    structure: "15 min warmup + 10 x 1 min all-out sprint (out of saddle) with 2 min easy recovery + 15 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max, explosive power, neuromuscular development",
                    settings: {
                        sprints: {resistance: "high", cadence: "100-125 RPM", position: "out of saddle"},
                        recovery: {resistance: "low", cadence: "80-90 RPM"},
                        heartRate: "Zone 5 (95%+ max HR)",
                        power: "120-150% FTP"
                    },
                    effort: {
                        heartRate: "Zone 5 (95%+ max HR)",
                        perceived: "All-out effort, gasping for air",
                        cadence: "100-125 RPM during sprints"
                    },
                    technique: "Out of saddle. Maximum power output. Control your bike. Recovery is truly easy.",
                    coachingTips: "These are hard! Quality over quantity. If power drops significantly, stop the workout.",
                    runningEquivalent: "10 x 400m track repeats",
                    landEquivalent: "Simulates 10 x 400m on track"
                },
                {
                    name: "90-Second Power Intervals",
                    duration: "60-75 minutes",
                    description: "Medium intervals building VO2max",
                    structure: "15 min warmup + 6 x 90 sec @ RPE 9-10 with 3 min easy pedaling + 15 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max development, lactate tolerance, mental toughness",
                    settings: {
                        intervals: {resistance: "very high", cadence: "95-105 RPM"},
                        recovery: {resistance: "low", cadence: "85 RPM"},
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        power: "110-130% FTP"
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Very hard, last 30 seconds hurts",
                        cadence: "95-105 RPM"
                    },
                    technique: "Seated or standing - your choice. Maximum sustainable power for 90 seconds.",
                    coachingTips: "90 seconds is long enough to hurt. Push through the final 30 seconds.",
                    runningEquivalent: "6-8 x 800m repeats",
                    landEquivalent: "Simulates 6 x 800m on track"
                },
                {
                    name: "3-Minute Hard Repeats",
                    duration: "60-90 minutes",
                    description: "Longer intervals at high intensity",
                    structure: "15 min warmup + 8 x 3 min hard with 2 min easy recovery + 15 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max endurance, sustained high power, mental resilience",
                    settings: {
                        intervals: {resistance: "high", cadence: "90-95 RPM"},
                        recovery: {resistance: "low", cadence: "90 RPM"},
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        power: "100-115% FTP"
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Hard and sustained, requires focus",
                        cadence: "90-95 RPM"
                    },
                    technique: "Control your effort - 3 minutes is long enough to blow up early. Pace yourself.",
                    coachingTips: "These are threshold-plus efforts. Final minute of each is mental training.",
                    runningEquivalent: "8 x 1000m repeats",
                    landEquivalent: "Simulates 8 x 1000m on track"
                },
                {
                    name: "Tabata Sprints",
                    duration: "45-60 minutes",
                    description: "Ultra-short maximum efforts",
                    structure: "15 min warmup + 8 rounds x (20 sec max sprint / 10 sec rest) + 3 min recovery, repeat 2-3 sets + 15 min cooldown",
                    intensity: "intervals",
                    benefits: "Anaerobic capacity, explosive power, maximum RPM development",
                    settings: {
                        sprints: {resistance: "moderate", cadence: "maximum sustainable RPM (120-140)"},
                        rest: {resistance: "low", cadence: "slow pedal"},
                        heartRate: "Zone 5 (95%+ max HR)",
                        power: "150%+ FTP"
                    },
                    effort: {
                        heartRate: "Zone 5 (95%+ max HR)",
                        perceived: "Maximum effort, explosive",
                        cadence: "Maximum controllable RPM"
                    },
                    technique: "Explosive leg speed. 20 seconds goes fast - go all out immediately. 10 sec rest = barely recover.",
                    coachingTips: "These are brutal. Classic Tabata protocol. If form breaks, stop.",
                    runningEquivalent: "Sprint intervals",
                    landEquivalent: "Simulates all-out sprint training"
                },
                {
                    name: "5-Minute Power Intervals",
                    duration: "75-90 minutes",
                    description: "Long VO2max efforts proven to improve running",
                    structure: "15 min warmup + 4-5 x 5 min hard with 5 min easy recovery + 15 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max endurance, research-proven to improve 5K run times",
                    settings: {
                        intervals: {resistance: "high", cadence: "88-92 RPM"},
                        recovery: {resistance: "low", cadence: "90-95 RPM"},
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        power: "95-105% FTP"
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Very hard and sustained",
                        cadence: "88-92 RPM"
                    },
                    technique: "Seated position. Control your pacing - 5 minutes is long. Equal work:rest ratio allows quality.",
                    coachingTips: "Research shows 5-min bike intervals improve running performance. These are gold.",
                    runningEquivalent: "Mile repeats",
                    landEquivalent: "Simulates 4-5 x mile repeats",
                    researchNote: "Longer bike intervals (5 min) shown to improve running 5K times by over 1 minute in triathletes"
                },
                {
                    name: "10-Second Max Sprints",
                    duration: "45-60 minutes",
                    description: "Ultra-short maximal sprints for running performance",
                    structure: "15 min warmup + 6 x 10 sec maximal sprint with 5 min easy recovery + 15 min cooldown",
                    intensity: "intervals",
                    benefits: "Neuromuscular power, running economy, 3K performance improvement",
                    settings: {
                        sprints: {resistance: "moderate", cadence: "absolute maximum RPM"},
                        recovery: {resistance: "very low", cadence: "easy spinning"},
                        heartRate: "Zone 5 briefly",
                        power: "Maximum wattage output"
                    },
                    effort: {
                        heartRate: "Spikes to Zone 5",
                        perceived: "Absolute maximum effort for 10 seconds",
                        cadence: "Maximum possible RPM"
                    },
                    technique: "Explosive from first second. All-out maximum power for full 10 seconds. Long recovery allows quality.",
                    coachingTips: "Research-backed for 3K running improvement. Maximum quality, full recovery between efforts.",
                    runningEquivalent: "Sprint drills",
                    researchNote: "6 x 10-second maximal sprints shown to improve 3K running performance"
                }
            ],

            // LONG RIDES - Endurance Development
            LONG: [
                {
                    name: "Steady Endurance Ride",
                    duration: "90-150 minutes",
                    description: "Long steady effort for aerobic development",
                    structure: "90-150 min continuous moderate effort, vary seated/standing every 15-20 min",
                    intensity: "long",
                    benefits: "Aerobic capacity, fat burning, endurance without running impact",
                    settings: {
                        resistance: "Moderate",
                        cadence: "88-92 RPM",
                        heartRate: "Zone 2 (65-75% max HR)",
                        power: "65-75% FTP"
                    },
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Conversational but sustained",
                        cadence: "Steady 88-92 RPM"
                    },
                    technique: "Vary position to prevent fatigue. Stay patient. Fuel properly if over 90 minutes.",
                    coachingTips: "Long rides build massive aerobic base. Time in Zone 2 is gold for endurance.",
                    runningEquivalent: "Long run (1.5-2 hours)"
                },
                {
                    name: "Extended Endurance Ride",
                    duration: "150-240 minutes",
                    description: "Ultra-long ride for maximum endurance",
                    structure: "2.5-4 hours continuous moderate effort with nutrition strategy",
                    intensity: "long",
                    benefits: "Maximum aerobic development, glycogen management, mental fortitude",
                    settings: {
                        resistance: "Moderate",
                        cadence: "88-92 RPM",
                        heartRate: "Zone 2 (65-75% max HR)",
                        power: "60-70% FTP"
                    },
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Easy-moderate, becomes work in final hour",
                        cadence: "Consistent throughout"
                    },
                    technique: "Nutrition is critical - fuel every 45-60 min. Stay hydrated. Mental breaks every 30 min.",
                    coachingTips: "This is serious endurance training. Bring food, water, entertainment. Plan your fueling strategy.",
                    runningEquivalent: "16-20 mile long run"
                },
                {
                    name: "Progressive Endurance Ride",
                    duration: "90-135 minutes",
                    description: "Long ride with building effort finish",
                    structure: "75 min easy-moderate + 15-45 min @ increased resistance/tempo + 15 min easy cooldown",
                    intensity: "long",
                    benefits: "Endurance + fatigue resistance, teaches pushing when tired",
                    settings: {
                        base: {resistance: "moderate", cadence: 90, power: "70% FTP"},
                        finish: {resistance: "moderate-high", cadence: 88, power: "85-90% FTP"}
                    },
                    effort: {
                        heartRate: "Zone 2 early, building to Zone 3-4",
                        perceived: "Easy early, hard finish",
                        cadence: "Steady throughout"
                    },
                    technique: "Simulate racing tired. Hard finish after endurance work is race-specific.",
                    coachingTips: "The hard finish when fatigued is key race training. This is mental strength work.",
                    runningEquivalent: "Long run with marathon pace finish"
                }
            ],

            // HILL WORKOUTS - Strength and Power
            HILLS: [
                {
                    name: "Seated Climbing Intervals",
                    duration: "60-75 minutes",
                    description: "High resistance climbs for leg strength",
                    structure: "15 min warmup + 8-10 x 2 min @ very high resistance (seated) with 3 min easy recovery + 15 min cooldown",
                    intensity: "hills",
                    benefits: "Leg strength, sustained power, glute/quad development",
                    settings: {
                        climbs: {resistance: "very high", cadence: "60-75 RPM", position: "seated"},
                        recovery: {resistance: "low", cadence: "90-95 RPM"}
                    },
                    effort: {
                        heartRate: "Zone 4 (85-90% max HR)",
                        perceived: "Very hard, muscular effort",
                        cadence: "60-75 RPM - power over speed"
                    },
                    technique: "Seated position. Grind through high resistance. Feel the leg muscles working hard.",
                    coachingTips: "Low cadence + high resistance = serious strength work. Builds running power.",
                    runningEquivalent: "Hill repeats"
                },
                {
                    name: "Standing Power Climbs",
                    duration: "60-75 minutes",
                    description: "Out-of-saddle climbing for explosive power",
                    structure: "15 min warmup + 6-8 x 90 sec standing climb @ high resistance with 3 min easy recovery + 15 min cooldown",
                    intensity: "hills",
                    benefits: "Explosive power, full-body strength, running-specific power development",
                    settings: {
                        climbs: {resistance: "very high", cadence: "70-80 RPM", position: "standing"},
                        recovery: {resistance: "low", cadence: "90 RPM", position: "seated"}
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Very hard, explosive effort",
                        cadence: "70-80 RPM out of saddle"
                    },
                    technique: "Standing position. Drive through legs. Rock bike side to side slightly. Core engaged.",
                    coachingTips: "Standing climbs build explosive power that transfers to running. Feel the burn!",
                    runningEquivalent: "Steep hill repeats"
                },
                {
                    name: "Mixed Climbing Session",
                    duration: "60-90 minutes",
                    description: "Alternating seated and standing climbs",
                    structure: "15 min warmup + 5 x (3 min seated climb + 2 min standing climb) with 4 min recovery + 15 min cooldown",
                    intensity: "hills",
                    benefits: "Comprehensive power development, muscular endurance, mental toughness",
                    settings: {
                        seated: {resistance: "very high", cadence: "65-75 RPM"},
                        standing: {resistance: "very high", cadence: "75-85 RPM"}
                    },
                    effort: {
                        heartRate: "Zone 4 (85-90% max HR)",
                        perceived: "Hard throughout, muscular fatigue builds",
                        cadence: "Varies between seated and standing"
                    },
                    technique: "Seated: grind through resistance. Standing: drive explosively. Transition smoothly.",
                    coachingTips: "This builds both sustained and explosive power. Comprehensive strength session.",
                    runningEquivalent: "Long hill workout"
                }
            ],

            // RECOVERY RIDES
            RECOVERY: [
                {
                    name: "Active Recovery Spin",
                    duration: "20-30 minutes",
                    description: "Very easy spinning for recovery",
                    structure: "20-30 min very easy, minimal resistance",
                    intensity: "recovery",
                    benefits: "Blood flow without stress, active recovery",
                    settings: {
                        resistance: "Very low",
                        cadence: "85-95 RPM",
                        heartRate: "Zone 1 (60-70% max HR)",
                        power: "< 55% FTP"
                    },
                    effort: {
                        heartRate: "Zone 1 (60-70% max HR)",
                        perceived: "Very easy, restorative",
                        cadence: "Free spinning"
                    },
                    technique: "Let legs spin freely. Minimal resistance. This should feel easy.",
                    coachingTips: "If this feels hard, you need complete rest. Recovery is the goal, not fitness."
                },
                {
                    name: "Extended Recovery Ride",
                    duration: "30-45 minutes",
                    description: "Longer gentle ride for deep recovery",
                    structure: "30-45 min very easy spinning",
                    intensity: "recovery",
                    benefits: "Extended active recovery, maintains movement patterns",
                    settings: {
                        resistance: "Very low",
                        cadence: "88-95 RPM",
                        heartRate: "Zone 1 (60-70% max HR)",
                        power: "< 60% FTP"
                    },
                    effort: {
                        heartRate: "Zone 1 (60-70% max HR)",
                        perceived: "Extremely easy",
                        cadence: "Natural, relaxed"
                    },
                    technique: "Effortless pedaling. Focus on smooth circular motion.",
                    coachingTips: "Perfect day-after-hard-workout session. Promotes recovery without stress."
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

export default StationaryBikeWorkoutLibrary;
