/**
 * Rowing Machine Workout Library
 * Running-specific rowing workouts for cross-training
 * Based on Concept2 erg protocols adapted for runners
 * Power-based training that transfers to running fitness
 */
export class RowingWorkoutLibrary {
    constructor() {
        // Equipment and metrics
        this.equipmentSpecs = {
            name: "Rowing Machine (Erg)",
            primaryEquipment: "Concept2 Rowing Erg",
            description: "Full-body power-based cardio using rowing motion",
            accessibility: "Common in gyms, CrossFit boxes, home Concept2 machines",
            benefits: [
                "Full-body cardiovascular workout",
                "Power-based training similar to running",
                "Low impact on running-specific joints",
                "Builds posterior chain strength (glutes, hamstrings, back)",
                "Excellent for maintaining fitness during injury",
                "Teaches explosive power application"
            ],
            runningConversion: {
                distance: "500m row ≈ 400m run (track workout equivalent)",
                longDistance: "2000m row ≈ 1 mile run",
                time: "Use time-based matching for easy/tempo work",
                effort: "Match heart rate zones and RPE to running"
            },
            keyMetrics: {
                strokeRate: "24-32 spm for steady state, 28-36 spm for intervals",
                pace: "Measure in time per 500m (e.g., 2:00/500m)",
                power: "Watts output correlates to effort level",
                damper: "Setting 3-5 typical for cardio work (higher = more resistance per stroke)",
                splitPace: "Monitor split pace (time per 500m) to gauge effort"
            },
            technique: {
                important: "Proper rowing technique is critical - prevents injury and maximizes efficiency",
                sequence: "Legs → Core → Arms on drive; Arms → Core → Legs on recovery",
                ratio: "Drive:Recovery should be roughly 1:2 (explosive drive, controlled recovery)",
                power: "70% of power from legs, 20% core, 10% arms"
            }
        };

        // Technique guidance
        this.techniqueGuidance = {
            catchPosition: "Shins vertical, arms straight, shoulders relaxed, core engaged",
            drive: "Explosive leg push → lean back with core → pull arms to lower ribs",
            finish: "Legs extended, lean back ~11 o'clock, handle to lower ribs, elbows past body",
            recovery: "Arms away → lean forward from hips → slide forward, controlled",
            commonMistakes: [
                "Arms before legs (should be legs first)",
                "Hunched back (maintain neutral spine)",
                "Too fast recovery (should be twice as slow as drive)",
                "Jerky motion (should be smooth and powerful)"
            ]
        };

        this.workoutLibrary = {
            // EASY STEADY STATE - Aerobic Base
            EASY: [
                {
                    name: "Easy Steady State Row",
                    duration: "30-45 minutes",
                    description: "Low-intensity rowing for aerobic base",
                    structure: "30-45 min continuous at easy effort",
                    intensity: "easy",
                    benefits: "Aerobic base building, active recovery, full-body conditioning without impact",
                    settings: {
                        strokeRate: "20-24 spm (slow and controlled)",
                        pace: "2:15-2:30 per 500m (adjust for fitness)",
                        damper: "3-4",
                        heartRate: "Zone 1-2 (60-75% max HR)",
                        power: "< 70% of max watts"
                    },
                    technique: "Focus on smooth, controlled strokes. Long recovery, powerful drive. Ratio 1:2 (drive:recovery).",
                    coachingTips: "Easy rowing should feel sustainable indefinitely. If breathing hard, slow down stroke rate or reduce power.",
                    runningEquivalent: "30-45 min easy recovery run"
                },
                {
                    name: "Moderate Steady State",
                    duration: "45-60 minutes",
                    description: "Sustained aerobic work at moderate effort",
                    structure: "45-60 min continuous at conversational pace",
                    intensity: "easy",
                    benefits: "Aerobic development, endurance building, fat burning",
                    settings: {
                        strokeRate: "22-26 spm",
                        pace: "2:05-2:20 per 500m",
                        damper: "4-5",
                        heartRate: "Zone 2 (65-75% max HR)",
                        power: "65-75% of max watts"
                    },
                    technique: "Maintain consistent stroke rate. Focus on powerful leg drive. Keep core engaged throughout.",
                    coachingTips: "Should feel like you could maintain this for hours. Build aerobic foundation here.",
                    runningEquivalent: "45-60 min easy run"
                },
                {
                    name: "Extended Steady State",
                    duration: "60-90 minutes",
                    description: "Long aerobic session for endurance",
                    structure: "60-90 min continuous at easy-moderate effort",
                    intensity: "easy",
                    benefits: "Maximum aerobic development, mental endurance, comprehensive conditioning",
                    settings: {
                        strokeRate: "20-24 spm",
                        pace: "2:10-2:25 per 500m",
                        damper: "3-5",
                        heartRate: "Zone 2 (65-75% max HR)",
                        power: "60-70% of max watts"
                    },
                    technique: "Patience is key. Maintain form even when tired. Break mentally into 15-20 min chunks.",
                    coachingTips: "Long rows build serious aerobic capacity. Stay patient. Hydrate throughout.",
                    runningEquivalent: "60-75 min easy run"
                }
            ],

            // TEMPO ROWING - Threshold Work
            TEMPO: [
                {
                    name: "Sustained Tempo Row",
                    duration: "45-60 minutes",
                    description: "Continuous rowing at lactate threshold",
                    structure: "10 min easy warmup + 20-40 min @ tempo pace (2:00-2:10/500m) + 10 min easy cooldown",
                    intensity: "tempo",
                    benefits: "Lactate threshold development, sustained power, mental toughness",
                    settings: {
                        warmup: {strokeRate: 20, pace: "2:20/500m"},
                        tempo: {strokeRate: 24-28, pace: "1:55-2:10/500m"},
                        cooldown: {strokeRate: 18-20, pace: "2:30/500m"},
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        power: "80-90% of max watts"
                    },
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Comfortably hard - can speak short sentences",
                        strokeRate: "24-28 spm"
                    },
                    technique: "Strong leg drive. Maintain stroke length even under fatigue. Controlled power application.",
                    coachingTips: "Tempo pace should be sustainable for 20-40 min. Don't start too hard.",
                    runningEquivalent: "30-40 min tempo run"
                },
                {
                    name: "Tempo Intervals",
                    duration: "50-70 minutes",
                    description: "Repeated threshold efforts with recovery",
                    structure: "10 min warmup + 4 x 8-10 min @ tempo with 3-4 min easy recovery + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Threshold power, recovery management under fatigue",
                    settings: {
                        intervals: {strokeRate: 26-28, pace: "1:55-2:05/500m"},
                        recovery: {strokeRate: 20, pace: "2:25/500m"},
                        heartRate: "Zone 3-4 during efforts",
                        power: "85-95% max watts"
                    },
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Hard but repeatable",
                        strokeRate: "26-28 spm during efforts"
                    },
                    technique: "Each interval should feel the same. Monitor pace consistency. Recover completely during rest.",
                    coachingTips: "Classic threshold training. Each piece should match in pace and effort.",
                    runningEquivalent: "4 x 8 min tempo intervals"
                },
                {
                    name: "2K Tempo Repeats",
                    duration: "45-65 minutes",
                    description: "Race-distance tempo work",
                    structure: "10 min warmup + 3-4 x 2000m @ tempo effort with 5 min easy recovery + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Sustained power at race pace, mental toughness, pacing practice",
                    settings: {
                        intervals: {strokeRate: 26-30, pace: "1:50-2:00/500m"},
                        recovery: {strokeRate: 18-20, pace: "2:30/500m"},
                        heartRate: "Zone 3-4",
                        power: "85-95% max watts"
                    },
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Hard and sustained, requires pacing",
                        strokeRate: "26-30 spm"
                    },
                    technique: "2000m is the Olympic rowing race distance. Pace yourself - don't blow up early.",
                    coachingTips: "2K repeats are classic rowing threshold work. Focus on even pacing.",
                    runningEquivalent: "Mile repeats at threshold"
                }
            ],

            // INTERVAL WORKOUTS - VO2max and Power
            INTERVALS: [
                {
                    name: "500m Repeats",
                    duration: "45-60 minutes",
                    description: "Classic track-style intervals",
                    structure: "10 min warmup + 8-12 x 500m @ hard effort with 2-3 min easy recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max development, power output, speed endurance",
                    settings: {
                        intervals: {strokeRate: 30-36, pace: "1:35-1:50/500m"},
                        recovery: {strokeRate: 20, pace: "2:30/500m"},
                        heartRate: "Zone 4-5 (90-95%+ max HR)",
                        power: "100-120% max watts"
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Very hard, breathing heavily",
                        strokeRate: "30-36 spm"
                    },
                    technique: "Explosive leg drive. Maximum power output. Maintain stroke length despite high rate.",
                    coachingTips: "500m is rowing's version of 400m run. Hard but manageable. Focus on power and speed.",
                    runningEquivalent: "8-12 x 400m track repeats",
                    landEquivalent: "Simulates 8-12 x 400m on track"
                },
                {
                    name: "1000m Repeats",
                    duration: "50-70 minutes",
                    description: "Longer intervals building VO2max endurance",
                    structure: "10 min warmup + 5-6 x 1000m @ hard effort with 3-4 min recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max endurance, lactate tolerance, mental toughness",
                    settings: {
                        intervals: {strokeRate: 28-32, pace: "1:45-1:58/500m"},
                        recovery: {strokeRate: 18-20, pace: "2:30/500m"},
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        power: "95-110% max watts"
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Very hard and sustained, requires pacing",
                        strokeRate: "28-32 spm"
                    },
                    technique: "Pacing critical - don't blow up first 500m. Maintain powerful strokes throughout.",
                    coachingTips: "1K repeats build serious power endurance. Last 250m is mental training.",
                    runningEquivalent: "5-6 x 1000m track repeats",
                    landEquivalent: "Simulates 5-6 x 1000m on track"
                },
                {
                    name: "Pyramid Intervals",
                    duration: "55-70 minutes",
                    description: "Varied distance intervals for engagement",
                    structure: "10 min warmup + [250m-500m-750m-1000m-750m-500m-250m] hard with 2-4 min recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Mental engagement, varied power output, comprehensive speed work",
                    settings: {
                        intervals: {strokeRate: "30-36 for short, 28-32 for long", pace: "varies by distance"},
                        recovery: {strokeRate: 20, pace: "2:30/500m", time: "2-4 min based on distance"},
                        heartRate: "Zone 4-5",
                        power: "100-120% max watts"
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Varies with distance, all hard",
                        strokeRate: "Adjust for distance"
                    },
                    technique: "Shorter pieces = higher stroke rate and power. Longer = controlled high power.",
                    coachingTips: "Pyramid keeps mind engaged. Challenge yourself on the 250s!",
                    runningEquivalent: "Track pyramid workout",
                    landEquivalent: "Simulates 200m-400m-600m-800m-600m-400m-200m"
                },
                {
                    name: "1-Minute Max Efforts",
                    duration: "40-55 minutes",
                    description: "Short explosive intervals",
                    structure: "10 min warmup + 10 x 1 min @ maximum effort with 2 min easy recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Explosive power, anaerobic capacity, maximum watt development",
                    settings: {
                        intervals: {strokeRate: 32-40, pace: "1:25-1:40/500m", power: "maximum"},
                        recovery: {strokeRate: 18, pace: "slow", power: "minimal"},
                        heartRate: "Zone 5 (95%+ max HR)"
                    },
                    effort: {
                        heartRate: "Zone 5 (95%+ max HR)",
                        perceived: "All-out, gasping",
                        strokeRate: "32-40 spm - as high as controllable"
                    },
                    technique: "Maximum power from start. Explosive leg drive. High stroke rate but maintain form.",
                    coachingTips: "These are brutal. Quality over quantity. If power drops significantly, stop workout.",
                    runningEquivalent: "10 x 400m hard",
                    landEquivalent: "Simulates hard 400m repeats"
                },
                {
                    name: "2-Minute Power Intervals",
                    duration: "45-60 minutes",
                    description: "Medium intervals at high power",
                    structure: "10 min warmup + 8 x 2 min @ very hard effort with 2-3 min recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Power endurance, VO2max, lactate tolerance",
                    settings: {
                        intervals: {strokeRate: 30-34, pace: "1:40-1:52/500m"},
                        recovery: {strokeRate: 20, pace: "2:30/500m"},
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        power: "105-120% max watts"
                    },
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Very hard, final 30 sec hurts",
                        strokeRate: "30-34 spm"
                    },
                    technique: "2 minutes is long enough to build serious lactate. Maintain power output throughout.",
                    coachingTips: "Classic VO2max work. Don't fade in final 30 seconds - finish strong.",
                    runningEquivalent: "8 x 800m intervals",
                    landEquivalent: "Simulates 8 x 800m on track"
                }
            ],

            // LONG ROWS - Endurance Development
            LONG: [
                {
                    name: "10K Row",
                    duration: "45-55 minutes",
                    description: "Classic long rowing distance",
                    structure: "10K (10,000 meters) continuous at steady effort",
                    intensity: "long",
                    benefits: "Aerobic capacity, mental endurance, pacing practice",
                    settings: {
                        strokeRate: "22-26 spm",
                        pace: "2:05-2:15/500m (adjust for fitness)",
                        damper: "4-5",
                        heartRate: "Zone 2 (65-75% max HR)",
                        power: "70-80% max watts"
                    },
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Moderate, sustainable",
                        strokeRate: "Steady 22-26 spm"
                    },
                    technique: "Pacing is everything. Even splits. Stay patient. Final 2K can be slightly faster.",
                    coachingTips: "10K is classic rowing endurance distance. Break into 2K chunks mentally. Monitor your split pace.",
                    runningEquivalent: "10-12 mile long run"
                },
                {
                    name: "Half Marathon Row",
                    duration: "75-95 minutes",
                    description: "Extended endurance row (21,097 meters)",
                    structure: "Half marathon distance (21,097m) at steady moderate effort",
                    intensity: "long",
                    benefits: "Maximum aerobic development, mental fortitude, glycogen management",
                    settings: {
                        strokeRate: "20-24 spm",
                        pace: "2:08-2:18/500m",
                        damper: "3-5",
                        heartRate: "Zone 2 (65-75% max HR)",
                        power: "65-75% max watts"
                    },
                    effort: {
                        heartRate: "Zone 2 (65-75% max HR)",
                        perceived: "Moderate, becomes challenging late",
                        strokeRate: "Consistent 20-24 spm"
                    },
                    technique: "Ultra-patient pacing. Fuel every 30-45 min. Stay mentally engaged by breaking into 5K segments.",
                    coachingTips: "This is serious endurance work. Bring water and fuel. Mental game is critical.",
                    runningEquivalent: "Half marathon distance run"
                },
                {
                    name: "Progressive 8K",
                    duration: "35-45 minutes",
                    description: "8K row with building effort",
                    structure: "8000m with progressive effort: first 4K easy, next 2K moderate, final 2K hard",
                    intensity: "long",
                    benefits: "Negative split practice, finishing power, race simulation",
                    settings: {
                        first4K: {strokeRate: 22, pace: "2:15/500m"},
                        middle2K: {strokeRate: 24, pace: "2:05/500m"},
                        final2K: {strokeRate: 26-28, pace: "1:55/500m"}
                    },
                    effort: {
                        heartRate: "Zone 2 building to Zone 4",
                        perceived: "Easy early, hard finish",
                        strokeRate: "Building throughout"
                    },
                    technique: "Start conservatively. Build power and rate gradually. Final 2K should feel like racing.",
                    coachingTips: "Teaches you to negative split and finish strong. Resist urge to go hard early.",
                    runningEquivalent: "Long run with progression"
                }
            ],

            // POWER WORKOUTS - Strength and Explosive Power
            POWER: [
                {
                    name: "Power Strokes",
                    duration: "40-55 minutes",
                    description: "Maximum power output for brief periods",
                    structure: "10 min warmup + 10-12 x 10 strokes @ maximum power with 2 min easy recovery + 10 min cooldown",
                    intensity: "power",
                    benefits: "Explosive power, neuromuscular development, maximum watt production",
                    settings: {
                        strokes: {strokeRate: "maximum controllable", pace: "sub-1:20/500m", power: "absolute max"},
                        recovery: {strokeRate: 18, pace: "easy", duration: "2 min"}
                    },
                    effort: {
                        heartRate: "Spikes to Zone 5 briefly",
                        perceived: "All-out maximum effort for 10 strokes",
                        strokeRate: "Maximum while maintaining form"
                    },
                    technique: "Explosive from first stroke. Maximum leg drive. Form must hold - if technique breaks, stop.",
                    coachingTips: "These build explosive power that transfers to running. Quality is everything - full recovery between sets.",
                    runningEquivalent: "Sprint drills, explosive power work"
                },
                {
                    name: "30-Second Power Bursts",
                    duration: "40-55 minutes",
                    description: "Short maximum efforts",
                    structure: "10 min warmup + 8-10 x 30 sec @ max effort with 3 min recovery + 10 min cooldown",
                    intensity: "power",
                    benefits: "Anaerobic power, explosive strength, running-specific power transfer",
                    settings: {
                        bursts: {strokeRate: 36-44, pace: "1:15-1:30/500m", power: "maximum"},
                        recovery: {strokeRate: 18-20, pace: "easy"}
                    },
                    effort: {
                        heartRate: "Zone 5 (95%+ max HR)",
                        perceived: "Maximum sustainable effort for 30 sec",
                        strokeRate: "Very high, controlled"
                    },
                    technique: "All-out from start. Maximum power production. Long recovery allows quality.",
                    coachingTips: "30 seconds is long enough to really work anaerobic system. Push through the burn.",
                    runningEquivalent: "200m sprint repeats"
                }
            ],

            // RECOVERY ROWING
            RECOVERY: [
                {
                    name: "Recovery Row",
                    duration: "20-30 minutes",
                    description: "Very easy rowing for active recovery",
                    structure: "20-30 min continuous at minimal effort",
                    intensity: "recovery",
                    benefits: "Blood flow without stress, active recovery, maintains movement patterns",
                    settings: {
                        strokeRate: "16-20 spm (very slow)",
                        pace: "2:30-2:45/500m",
                        damper: "3",
                        heartRate: "Zone 1 (60-70% max HR)",
                        power: "< 60% max watts"
                    },
                    effort: {
                        heartRate: "Zone 1 (60-70% max HR)",
                        perceived: "Very easy, restorative",
                        strokeRate: "Slow and controlled"
                    },
                    technique: "Minimal effort. Focus on perfect form. This should feel easy.",
                    coachingTips: "If this feels hard, you need complete rest. Goal is recovery, not fitness.",
                    runningEquivalent: "20-30 min recovery jog"
                },
                {
                    name: "Extended Recovery Row",
                    duration: "30-40 minutes",
                    description: "Longer gentle row for deep recovery",
                    structure: "30-40 min continuous very easy rowing",
                    intensity: "recovery",
                    benefits: "Extended active recovery, full-body movement without impact",
                    settings: {
                        strokeRate: "18-22 spm",
                        pace: "2:25-2:40/500m",
                        damper: "3-4",
                        heartRate: "Zone 1 (60-70% max HR)"
                    },
                    effort: {
                        heartRate: "Zone 1 (60-70% max HR)",
                        perceived: "Extremely easy",
                        strokeRate: "Relaxed and natural"
                    },
                    technique: "Smooth, effortless strokes. Focus on technique perfection.",
                    coachingTips: "Perfect for day-after-hard-workout. Promotes recovery while maintaining fitness.",
                    runningEquivalent: "30-40 min easy recovery run"
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
        if (!match) return 50;

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

export default RowingWorkoutLibrary;
