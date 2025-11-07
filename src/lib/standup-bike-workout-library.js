/**
 * RunEq Stand-Up Bike Specific Workout Library
 * Equipment-specific workouts for cyclete and elliptiGO
 * Based on research about differences between the two platforms
 */
export class StandUpBikeWorkoutLibrary {
    constructor() {
        // Equipment-specific characteristics
        this.equipmentSpecs = {
            cyclete: {
                name: "cyclete",
                description: "Fluid, powerful running-like motion",
                strengths: ["Long distance", "Running simulation", "Endurance training"],
                optimalDurations: "Extended sessions (60+ minutes)",
                resistanceType: "Variable terrain simulation"
            },
            elliptigo: {
                name: "elliptiGO", 
                description: "Smooth elliptical motion, up to 26-inch adjustable stride",
                strengths: ["Full body workout", "Interval training", "Recovery sessions"],
                optimalDurations: "Varied (20-120 minutes)",
                resistanceType: "Gear-based resistance"
            }
        };

        // Note: Training Effect calculations handled by companion Garmin Data Field

        this.workoutLibrary = {
            // TEMPO BIKE WORKOUTS - Lactate Threshold Work on Roads
            TEMPO_BIKE: [
                {
                    name: "Sustained Threshold Effort",
                    duration: "50-70 minutes",
                    equipment: "both",
                    description: "Continuous steady hard effort at lactate threshold",
                    structure: "10 min easy warmup + 20-40 min @ threshold effort + 10 min easy cooldown",
                    intensity: "tempo",
                    benefits: "Lactate threshold development, sustained power, mental toughness",
                    cycleteNotes: "Excellent for building race-pace endurance on natural motion",
                    elliptigoNotes: "Use moderate-long stride, maintain steady resistance throughout",
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Comfortably hard, can speak in short sentences"
                    },
                    roadConsiderations: "Find a flat, uninterrupted stretch of bike path or quiet road for sustained effort"
                },
                {
                    name: "Tempo Intervals",
                    duration: "60-75 minutes",
                    equipment: "both",
                    description: "Repeated threshold efforts with short recovery",
                    structure: "10 min warmup + 3-4 x 8 min @ threshold with 3 min easy recovery + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Threshold power, recovery management, pacing practice",
                    cycleteNotes: "Perfect for building powerful sustained efforts",
                    elliptigoNotes: "Maintain consistent stride pattern across intervals",
                    effort: {
                        heartRate: "Zone 3-4 during intervals (80-90% max HR)",
                        perceived: "Hard but sustainable, recovery is truly easy"
                    },
                    roadConsiderations: "Out-and-back route or loop works well, recovery is active (keep moving)"
                },
                {
                    name: "Progressive Tempo Build",
                    duration: "55-70 minutes",
                    equipment: "both",
                    description: "Gradually building effort to threshold and beyond",
                    structure: "15 min easy + 10 min moderate + 10 min threshold + 5 min hard + 15 min easy cooldown",
                    intensity: "tempo",
                    benefits: "Graduated effort adaptation, race simulation, finishing strength",
                    cycleteNotes: "Natural motion allows smooth power progression",
                    elliptigoNotes: "Increase resistance and/or cadence to build effort",
                    effort: {
                        heartRate: "Building from Zone 2 → Zone 4 → Zone 5",
                        perceived: "Starting comfortable, finishing hard"
                    },
                    roadConsiderations: "Slight uphill finish helps with progressive build"
                },
                {
                    name: "Cruise Intervals",
                    duration: "60-80 minutes",
                    equipment: "both",
                    description: "Classic lactate threshold intervals with short recovery",
                    structure: "15 min warmup + 5-6 x 5 min @ threshold with 2 min easy + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Threshold efficiency, power sustainability, mental resilience",
                    cycleteNotes: "Maintain smooth natural rhythm throughout efforts",
                    elliptigoNotes: "Focus on consistent resistance and stride pattern",
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Comfortably hard, short recovery keeps you honest"
                    },
                    roadConsiderations: "Timer-based intervals work anywhere, don't need specific landmarks"
                },
                {
                    name: "Tempo Sandwich",
                    duration: "60-75 minutes",
                    equipment: "both",
                    description: "Two threshold blocks separated by easy riding",
                    structure: "10 min warmup + 15 min @ threshold + 10 min easy + 15 min @ threshold + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Threshold endurance, mid-ride recovery practice, race pacing",
                    cycleteNotes: "Second effort teaches pacing discipline",
                    elliptigoNotes: "Maintain form quality into second block",
                    effort: {
                        heartRate: "Zone 3-4 during blocks",
                        perceived: "First block strong, second block requires focus"
                    },
                    roadConsiderations: "Out-and-back route ideal (turnaround during easy section)"
                },
                {
                    name: "Fast Finish Tempo",
                    duration: "50-65 minutes",
                    equipment: "both",
                    description: "Steady effort with strong closing surge",
                    structure: "10 min warmup + 25 min @ steady moderate + 10 min @ threshold + 5 min hard + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Finishing strength, race simulation, mental toughness",
                    cycleteNotes: "Teaches finishing power when fatigued",
                    elliptigoNotes: "Final surge requires full body engagement",
                    effort: {
                        heartRate: "Building to Zone 4-5 at finish",
                        perceived: "Start controlled, finish strong"
                    },
                    roadConsiderations: "Plan route so final hard section is on good road surface"
                },
                {
                    name: "Threshold Pyramid",
                    duration: "70-85 minutes",
                    equipment: "both",
                    description: "Ascending and descending threshold intervals",
                    structure: "15 min warmup + 5-7-10-7-5 min @ threshold with 3 min easy recovery + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Variable effort management, mental engagement, threshold development",
                    cycleteNotes: "Varied interval lengths prevent mental monotony",
                    elliptigoNotes: "Practice pacing across different interval durations",
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Maintain same effort despite changing durations"
                    },
                    roadConsiderations: "Timer-based, works on any reasonable road"
                },
                {
                    name: "Cutdown Tempo",
                    duration: "55-70 minutes",
                    equipment: "both",
                    description: "Progressively faster tempo intervals",
                    structure: "10 min warmup + 10 min @ moderate + 8 min @ threshold + 6 min @ hard + 4 min @ very hard with 3 min recovery between + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Pace judgment, variable effort training, finishing power",
                    cycleteNotes: "Progressive resistance or cadence increase",
                    elliptigoNotes: "Combine resistance and stride adjustments",
                    effort: {
                        heartRate: "Building from Zone 3 → Zone 5",
                        perceived: "Each interval harder than previous"
                    },
                    roadConsiderations: "Descending intervals keep mental engagement high"
                },
                {
                    name: "Steady State Tempo",
                    duration: "60-80 minutes",
                    equipment: "both",
                    description: "Extended time at threshold for endurance adaptation",
                    structure: "15 min warmup + 30-40 min @ steady threshold + 15 min cooldown",
                    intensity: "tempo",
                    benefits: "Threshold endurance, mental training, race-specific work",
                    cycleteNotes: "Long sustained natural motion builds race fitness",
                    elliptigoNotes: "Maintain consistent form over extended effort",
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Comfortably hard for extended duration"
                    },
                    roadConsiderations: "Need long uninterrupted stretch, bike path or quiet country road ideal"
                },
                {
                    name: "Tempo with Surges",
                    duration: "55-70 minutes",
                    equipment: "both",
                    description: "Threshold effort with periodic hard surges",
                    structure: "10 min warmup + 20 min @ threshold with 6 x 30 sec surges every 3 min + 10 min cooldown",
                    intensity: "tempo",
                    benefits: "Race simulation, surge recovery, variable pace training",
                    cycleteNotes: "Surges mimic race attacks or traffic situations",
                    elliptigoNotes: "Quick resistance/cadence changes develop responsiveness",
                    effort: {
                        heartRate: "Zone 3-4 baseline, Zone 5 during surges",
                        perceived: "Hard base with brief very hard surges"
                    },
                    roadConsiderations: "Surges work well at intersections or road features"
                }
            ],

            // INTERVAL BIKE WORKOUTS - VO2max and Power Work
            INTERVAL_BIKE: [
                {
                    name: "Short Power Repeats",
                    duration: "50-65 minutes",
                    equipment: "both",
                    description: "High-intensity short intervals for power development",
                    structure: "15 min warmup + 10-12 x 2 min hard with 2 min easy recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max development, neuromuscular power, aerobic capacity",
                    cycleteNotes: "Explosive power in natural motion pattern",
                    elliptigoNotes: "Quick stride and resistance changes",
                    effort: {
                        heartRate: "Zone 4-5 during intervals (90-100% max HR)",
                        perceived: "Hard effort, breathing heavy, full recovery needed"
                    },
                    roadConsiderations: "Timer-based, any safe road works, recovery is active (keep moving)"
                },
                {
                    name: "Classic 5-Minute Repeats",
                    duration: "65-80 minutes",
                    equipment: "both",
                    description: "VO2max intervals at hard sustainable effort",
                    structure: "15 min warmup + 4-6 x 5 min @ VO2max with 3-4 min easy recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Aerobic power, VO2max improvement, sustained speed work",
                    cycleteNotes: "5 minutes allows rhythm development at high power",
                    elliptigoNotes: "Find sustainable high resistance for full duration",
                    effort: {
                        heartRate: "Zone 5 (95-100% max HR)",
                        perceived: "Very hard but sustainable for 5 minutes"
                    },
                    roadConsiderations: "Flat section preferred to maintain consistent power output"
                },
                {
                    name: "Ladder Intervals",
                    duration: "70-90 minutes",
                    equipment: "both",
                    description: "Variable duration intervals ascending and descending",
                    structure: "15 min warmup + 2-3-4-5-4-3-2 min hard with equal recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Variable effort training, mental engagement, comprehensive stimulus",
                    cycleteNotes: "Varied durations prevent monotony",
                    elliptigoNotes: "Adjust pacing for different interval lengths",
                    effort: {
                        heartRate: "Zone 4-5 during intervals",
                        perceived: "Hard throughout, adjust effort for interval duration"
                    },
                    roadConsiderations: "Timer-based pyramid keeps mental focus high"
                },
                {
                    name: "Tabata-Style Power Blasts",
                    duration: "40-55 minutes",
                    equipment: "both",
                    description: "Ultra-short maximal efforts for neuromuscular power",
                    structure: "15 min warmup + 2-3 sets of 8 x 20 sec maximal with 10 sec easy (4 min recovery between sets) + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Explosive power, anaerobic capacity, neuromuscular recruitment",
                    cycleteNotes: "Explosive natural motion develops race finishing speed",
                    elliptigoNotes: "Maximum resistance and cadence for 20 seconds",
                    effort: {
                        heartRate: "Zone 5+ (maximal)",
                        perceived: "All-out effort, 10 seconds barely enough recovery"
                    },
                    roadConsiderations: "Need very safe road/path, minimal traffic, good surface"
                },
                {
                    name: "Long Intervals",
                    duration: "75-95 minutes",
                    equipment: "both",
                    description: "Extended hard efforts for sustained power",
                    structure: "15 min warmup + 4-5 x 8 min hard with 4 min recovery + 15 min cooldown",
                    intensity: "intervals",
                    benefits: "Sustained VO2max work, mental toughness, race-specific power",
                    cycleteNotes: "Long intervals build race-day sustained power",
                    elliptigoNotes: "Form maintenance critical over 8-minute efforts",
                    effort: {
                        heartRate: "Zone 4-5 (90-95% max HR)",
                        perceived: "Very hard, requires pacing discipline"
                    },
                    roadConsiderations: "8 minutes is long enough to use out-and-back landmarks"
                },
                {
                    name: "Pyramid Power",
                    duration: "60-75 minutes",
                    equipment: "both",
                    description: "Ascending and descending power intervals",
                    structure: "15 min warmup + 1-2-3-4-3-2-1 min hard with 1 min easy recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Variable power training, mental focus, comprehensive development",
                    cycleteNotes: "Varied efforts keep engagement high",
                    elliptigoNotes: "Manage effort across different durations",
                    effort: {
                        heartRate: "Zone 4-5",
                        perceived: "Hard throughout, short recoveries"
                    },
                    roadConsiderations: "Timer-based, works anywhere safe"
                },
                {
                    name: "Over-Under Intervals",
                    duration: "60-75 minutes",
                    equipment: "both",
                    description: "Alternating just below and just above threshold",
                    structure: "15 min warmup + 4 x 8 min (alternating 2 min @ threshold, 1 min @ VO2max) with 4 min recovery + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Lactate tolerance, recovery under duress, race simulation",
                    cycleteNotes: "Teaches power management and recovery while working",
                    elliptigoNotes: "Quick resistance changes between under/over efforts",
                    effort: {
                        heartRate: "Zone 3-4 during under, Zone 5 during over",
                        perceived: "Alternating hard and very hard within same interval"
                    },
                    roadConsiderations: "No true recovery during 8-min blocks, need good road surface"
                },
                {
                    name: "Fartlek Intervals",
                    duration: "50-70 minutes",
                    equipment: "both",
                    description: "Unstructured speed play using landmarks and feel",
                    structure: "15 min warmup + 20-30 min continuous riding with surges of varying duration (30 sec to 5 min) + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Variable pace training, mental freedom, responsive power",
                    cycleteNotes: "Natural motion allows spontaneous surges",
                    elliptigoNotes: "Use road features as surge cues",
                    effort: {
                        heartRate: "Variable Zone 2-5",
                        perceived: "Playful hard efforts based on feel"
                    },
                    roadConsiderations: "Use mailboxes, signs, hills, etc. as surge markers"
                },
                {
                    name: "30-30 Repeats",
                    duration: "50-65 minutes",
                    equipment: "both",
                    description: "Equal hard and recovery for sustained intensity",
                    structure: "15 min warmup + 3-4 sets of 10 x 30 sec hard / 30 sec easy (5 min recovery between sets) + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "VO2max development, anaerobic capacity, efficient recovery",
                    cycleteNotes: "Short recoveries develop resilience",
                    elliptigoNotes: "Quick rhythm changes improve responsiveness",
                    effort: {
                        heartRate: "Zone 5 during hard sections",
                        perceived: "Hard but repeatable, 30 sec recovery is enough"
                    },
                    roadConsiderations: "Timer-based, any safe stretch works"
                },
                {
                    name: "Descending Intervals",
                    duration: "65-80 minutes",
                    equipment: "both",
                    description: "Progressively shorter intervals at increasing intensity",
                    structure: "15 min warmup + 5-4-3-2-1 min with effort increasing each interval (3 min recovery) x 2 sets + 10 min cooldown",
                    intensity: "intervals",
                    benefits: "Progressive intensity training, mental toughness, finishing power",
                    cycleteNotes: "Teaches finishing speed when fatigued",
                    elliptigoNotes: "Max power on final 1-minute effort",
                    effort: {
                        heartRate: "Building from Zone 4 → Zone 5+",
                        perceived: "Each interval harder than previous"
                    },
                    roadConsiderations: "Final 1-minute effort is near-maximal"
                }
            ],

            // POWER/RESISTANCE WORKOUTS - Hill/Strength Work
            POWER_RESISTANCE: [
                {
                    name: "Hill Power Repeats",
                    duration: "55-70 minutes",
                    equipment: "both",
                    description: "Short explosive hill repeats for power development",
                    structure: "15 min warmup + 8-10 x 2 min hard uphill with easy coast down + 10 min cooldown",
                    intensity: "power",
                    benefits: "Power development, muscular strength, explosive capacity",
                    cycleteNotes: "Powerful natural motion up sustained grades",
                    elliptigoNotes: "High resistance, explosive stride pattern",
                    effort: {
                        heartRate: "Zone 4-5 (90-100% max HR)",
                        perceived: "Very hard uphill effort, easy coast down recovery"
                    },
                    roadConsiderations: "Need actual hill or sustained grade - 4-6% grade ideal, safe descent"
                },
                {
                    name: "Resistance Strength Intervals",
                    duration: "60-75 minutes",
                    equipment: "both",
                    description: "High resistance intervals on flat terrain",
                    structure: "15 min warmup + 6-8 x 3 min @ high resistance with 3 min easy + 10 min cooldown",
                    intensity: "power",
                    benefits: "Muscular strength, grinding power, force production",
                    cycleteNotes: "High resistance develops grinding strength",
                    elliptigoNotes: "Maximum resistance, controlled cadence",
                    effort: {
                        heartRate: "Zone 4 (muscular not cardiovascular limiter)",
                        perceived: "Legs burning, powerful effort"
                    },
                    roadConsiderations: "Works on flat roads - resistance creates difficulty"
                },
                {
                    name: "Long Strength Climbs",
                    duration: "70-90 minutes",
                    equipment: "both",
                    description: "Extended hill climbs for sustained power",
                    structure: "15 min warmup + 4-6 x 5 min sustained climb with full recovery down + 10 min cooldown",
                    intensity: "power",
                    benefits: "Sustained climbing power, mental toughness, muscular endurance",
                    cycleteNotes: "Extended natural motion on grades",
                    elliptigoNotes: "Maintain form quality through long climbs",
                    effort: {
                        heartRate: "Zone 4 (80-90% max HR)",
                        perceived: "Hard sustained uphill effort"
                    },
                    roadConsiderations: "Need sustained grade of 3-5%, safe descent for recovery"
                },
                {
                    name: "Resistance Pyramid",
                    duration: "65-80 minutes",
                    equipment: "both",
                    description: "Variable duration high-resistance intervals",
                    structure: "15 min warmup + 2-3-4-5-4-3-2 min @ high resistance with 2 min easy + 10 min cooldown",
                    intensity: "power",
                    benefits: "Variable strength training, muscular endurance, mental engagement",
                    cycleteNotes: "Varied durations with high resistance",
                    elliptigoNotes: "Maximum resistance, controlled cadence throughout",
                    effort: {
                        heartRate: "Zone 3-4 (muscular effort)",
                        perceived: "Powerful grinding effort"
                    },
                    roadConsiderations: "Resistance-based, works on any safe road"
                },
                {
                    name: "Mixed Terrain Circuit",
                    duration: "60-80 minutes",
                    equipment: "both",
                    description: "Repeated circuit with varied terrain challenges",
                    structure: "15 min warmup + 4-5 laps of circuit with hills, flats, descents + 10 min cooldown",
                    intensity: "power",
                    benefits: "Variable terrain adaptation, comprehensive power development",
                    cycleteNotes: "Natural motion adapts to terrain changes",
                    elliptigoNotes: "Resistance and stride adjustments for terrain",
                    effort: {
                        heartRate: "Variable Zones 3-5",
                        perceived: "Hard on climbs, recovery on descents"
                    },
                    roadConsiderations: "Find 2-3 mile circuit with varied terrain, good for repeats"
                },
                {
                    name: "Hill Blasts",
                    duration: "50-65 minutes",
                    equipment: "both",
                    description: "Short explosive hill repeats for power",
                    structure: "15 min warmup + 12-15 x 1 min maximal uphill with easy recovery down + 10 min cooldown",
                    intensity: "power",
                    benefits: "Explosive power, anaerobic capacity, neuromuscular training",
                    cycleteNotes: "Maximum power in natural motion",
                    elliptigoNotes: "Explosive stride, maximum resistance",
                    effort: {
                        heartRate: "Zone 5 (95-100% max HR)",
                        perceived: "Near-maximal effort, full recovery needed"
                    },
                    roadConsiderations: "Short steep hill ideal (6-8% grade), safe descent"
                },
                {
                    name: "Tempo Climb",
                    duration: "65-85 minutes",
                    equipment: "both",
                    description: "Sustained threshold effort on extended climb",
                    structure: "15 min warmup + 2-3 x 15 min sustained climb @ threshold with recovery descent + 10 min cooldown",
                    intensity: "power",
                    benefits: "Climbing endurance, sustained power, race-specific strength",
                    cycleteNotes: "Extended climbing in natural motion",
                    elliptigoNotes: "Maintain consistent rhythm on long climbs",
                    effort: {
                        heartRate: "Zone 3-4 (80-90% max HR)",
                        perceived: "Hard sustained climbing effort"
                    },
                    roadConsiderations: "Need long gradual climb (3-5% grade for 15 minutes)"
                },
                {
                    name: "Resistance Fartlek",
                    duration: "55-70 minutes",
                    equipment: "both",
                    description: "Playful variable resistance efforts",
                    structure: "15 min warmup + 25-35 min continuous with surges at varying resistance levels + 10 min cooldown",
                    intensity: "power",
                    benefits: "Variable power training, responsive strength, mental engagement",
                    cycleteNotes: "Quick resistance changes develop versatility",
                    elliptigoNotes: "Play with resistance and stride combinations",
                    effort: {
                        heartRate: "Variable Zones 2-5",
                        perceived: "Playful hard efforts with varying resistance"
                    },
                    roadConsiderations: "Use terrain features to vary resistance naturally"
                }
            ],

            // LONG ENDURANCE RIDES - Like Long Run Library
            LONG_ENDURANCE_RIDES: [
                {
                    name: "Progressive Long Ride",
                    duration: "90-180 minutes",
                    equipment: "both",
                    description: "Start easy, gradually build to moderate-hard finish",
                    structure: "First 70% @ easy conversational pace, final 30% @ moderate-hard effort",
                    intensity: "long",
                    benefits: "Progressive endurance, finishing strength, aerobic development",
                    cycleteNotes: "Natural motion allows smooth effort progression",
                    elliptigoNotes: "Gradually increase resistance through ride",
                    effort: {
                        heartRate: "Starting Zone 2, finishing Zone 3-4",
                        perceived: "Starting easy, finishing strong"
                    },
                    roadConsiderations: "Plan route with good roads for harder finish"
                },
                {
                    name: "Steady State Long Ride",
                    duration: "90-180 minutes",
                    equipment: "both",
                    description: "Maintain consistent aerobic pace throughout",
                    structure: "After warmup, maintain steady moderate effort for full duration",
                    intensity: "long",
                    benefits: "Aerobic endurance, consistent pacing, mental discipline",
                    cycleteNotes: "Excellent for building aerobic base",
                    elliptigoNotes: "Find sustainable rhythm and maintain it",
                    effort: {
                        heartRate: "Zone 2-3 (70-80% max HR)",
                        perceived: "Steady, sustainable, conversational"
                    },
                    roadConsiderations: "Longer rides need route planning, hydration, nutrition"
                },
                {
                    name: "Fast Finish Long Ride",
                    duration: "90-150 minutes",
                    equipment: "both",
                    description: "Easy-moderate ride with strong final portion",
                    structure: "First 80% @ easy-moderate, final 20% @ threshold effort",
                    intensity: "long",
                    benefits: "Finishing strength when fatigued, race simulation, mental toughness",
                    cycleteNotes: "Teaches racing speed when tired",
                    elliptigoNotes: "Strong finish requires full body engagement",
                    effort: {
                        heartRate: "Zone 2-3, finishing Zone 4",
                        perceived: "Comfortable becoming hard at finish"
                    },
                    roadConsiderations: "Plan route so final hard section is on good road"
                },
                {
                    name: "Negative Split Long Ride",
                    duration: "90-150 minutes",
                    equipment: "both",
                    description: "Second half faster than first half",
                    structure: "Ride out easy-moderate, return moderate-hard (same route out/back)",
                    intensity: "long",
                    benefits: "Pacing discipline, progressive endurance, race strategy practice",
                    cycleteNotes: "Natural motion allows controlled pace progression",
                    elliptigoNotes: "Monitor effort - start conservative",
                    effort: {
                        heartRate: "Zone 2-3 out, Zone 3-4 back",
                        perceived: "Starting controlled, finishing strong"
                    },
                    roadConsiderations: "Out-and-back route ideal for comparison"
                },
                {
                    name: "Variable Terrain Long Ride",
                    duration: "100-180 minutes",
                    equipment: "both",
                    description: "Extended ride over varied terrain",
                    structure: "Mix of flats, rollers, climbs at moderate overall effort",
                    intensity: "long",
                    benefits: "Terrain adaptation, comprehensive fitness, real-world preparation",
                    cycleteNotes: "Natural motion handles terrain changes well",
                    elliptigoNotes: "Adjust resistance and stride for terrain",
                    effort: {
                        heartRate: "Variable Zone 2-4 depending on terrain",
                        perceived: "Moderate overall with terrain-driven variations"
                    },
                    roadConsiderations: "Choose hilly or rolling route for natural variation"
                },
                {
                    name: "Out-and-Back Endurance",
                    duration: "90-180 minutes",
                    equipment: "both",
                    description: "Simple out-and-back at steady aerobic pace",
                    structure: "Ride to turnaround point, return at same effort level",
                    intensity: "long",
                    benefits: "Aerobic base, simple execution, mental simplicity",
                    cycleteNotes: "Straightforward endurance building",
                    elliptigoNotes: "Maintain consistent effort regardless of wind",
                    effort: {
                        heartRate: "Zone 2-3 (70-80% max HR)",
                        perceived: "Steady, sustainable throughout"
                    },
                    roadConsiderations: "Single good road with turnaround point, watch for wind direction"
                },
                {
                    name: "Long Ride with Tempo Finish",
                    duration: "100-180 minutes",
                    equipment: "both",
                    description: "Aerobic ride with sustained threshold finish",
                    structure: "Long easy-moderate ride + final 20-30 min @ threshold effort",
                    intensity: "long",
                    benefits: "Race-specific endurance, finishing power, mental toughness",
                    cycleteNotes: "Builds race-day finishing strength",
                    elliptigoNotes: "Strong finish after long aerobic work",
                    effort: {
                        heartRate: "Zone 2-3, finishing Zone 4",
                        perceived: "Comfortable becoming hard"
                    },
                    roadConsiderations: "Plan route for good finish roads"
                },
                {
                    name: "Exploration Ride",
                    duration: "90-180 minutes",
                    equipment: "both",
                    description: "Easy-moderate exploration of new routes",
                    structure: "Relaxed pace, enjoy scenery, build time on equipment",
                    intensity: "long",
                    benefits: "Aerobic base, mental freshness, route discovery",
                    cycleteNotes: "Great way to find new training routes",
                    elliptigoNotes: "Enjoy the ride quality and scenery",
                    effort: {
                        heartRate: "Zone 1-2 (60-75% max HR)",
                        perceived: "Easy, conversational, enjoyable"
                    },
                    roadConsiderations: "Explore new roads/paths, have phone/GPS for navigation"
                }
            ],

            AEROBIC_BASE: [
                {
                    name: "Conversational Pace Cruise",
                    duration: "45-120 minutes",
                    equipment: "both",
                    description: "Long steady effort at conversational intensity",
                    structure: "Maintain steady effort throughout, should be able to hold conversation",
                    intensity: "easy",
                    benefits: "Aerobic base building, fat adaptation, endurance",
                    cycleteNotes: "Excellent for long distance preparation, very running-like feel",
                    elliptigoNotes: "Use moderate stride length, focus on smooth rhythm",
                    effort: {
                        heartRate: "Zone 1-2 (65-75% max HR)",
                        perceived: "Easy, conversational effort"
                    }
                },
                {
                    name: "Recovery Ride",
                    duration: "30-60 minutes",
                    equipment: "both",
                    description: "Very easy effort for active recovery",
                    structure: "Easy riding, minimal resistance, focus on movement quality",
                    intensity: "recovery",
                    benefits: "Active recovery, blood flow, movement practice",
                    cycleteNotes: "Perfect for recovery days, gentle fluid motion",
                    elliptigoNotes: "Ideal for joint mobility and muscle activation",
                    effort: {
                        heartRate: "Zone 1 (60-70% max HR)",
                        perceived: "Very easy, relaxed effort"
                    }
                }
            ],


            TECHNIQUE_SPECIFIC: [
                {
                    name: "Movement Development",
                    duration: "35-50 minutes",
                    equipment: "both",
                    description: "Focus on optimal movement pattern and efficiency",
                    structure: "15 min warmup + 4-6 x 5 min varied effort focus + 10 min cooldown",
                    intensity: "easy to moderate", 
                    benefits: "Movement efficiency, technique improvement, neuromuscular training",
                    cycleteNotes: "Perfect natural motion at all efforts",
                    elliptigoNotes: "Practice stride length adjustments with effort changes",
                    effort: {
                        heartRate: "Zone 1-3 varied (65-85% max HR)",
                        perceived: "Easy to moderate varied efforts"
                    }
                },
                {
                    name: "Form Focus Session", 
                    duration: "40-60 minutes",
                    equipment: "both",
                    description: "Technical session emphasizing movement quality",
                    structure: "Extended warmup + form drills + easy-moderate effort with technique focus",
                    intensity: "easy to moderate",
                    benefits: "Movement quality, efficiency, injury prevention",
                    cycleteNotes: "Focus on smooth natural pattern, avoid bouncing",
                    elliptigoNotes: "Emphasize full stride extension and smooth upper body motion",
                    techniques: {
                        cyclete: ["Smooth natural motion", "Avoid upper body tension", "Focus on forward drive"],
                        elliptigo: ["Full stride extension", "Coordinated arm swing", "Stable core engagement"]
                    }
                }
            ],


            RECOVERY_SPECIFIC: [
                {
                    name: "Active Recovery Flow",
                    duration: "30-45 minutes",
                    equipment: "both",
                    description: "Gentle movement for recovery days",
                    structure: "Very easy effort throughout, focus on movement quality",
                    intensity: "recovery", 
                    benefits: "Blood flow, active recovery, movement maintenance",
                    cycleteNotes: "Gentle natural motion perfect for recovery",
                    elliptigoNotes: "Low-impact full body movement aids recovery",
                    effort: {
                        heartRate: "Zone 1 (60-70% max HR)",
                        perceived: "Very easy, relaxed recovery effort"
                    }
                },
                {
                    name: "Injury Prevention Session",
                    duration: "25-40 minutes",
                    equipment: "both",
                    description: "Low-intensity session for injury-prone periods", 
                    structure: "Extended warmup + very easy effort + extended cooldown",
                    intensity: "recovery",
                    benefits: "Maintains fitness while allowing healing, joint mobility",
                    cycleteNotes: "Zero-impact alternative when running not possible",
                    elliptigoNotes: "Gentle full-body movement without ground impact"
                }
            ]
        };
    }

    /**
     * Get workout prescription for specific equipment
     */
    prescribeStandUpBikeWorkout(workoutName, equipment, options = {}) {
        const { duration = null, experience = "intermediate", targetDistance = null, hasGarmin = true } = options;

        // Find the workout
        let workout = null;
        let category = null;

        for (const [cat, workouts] of Object.entries(this.workoutLibrary)) {
            const found = workouts.find(w =>
                (w.name.toLowerCase().includes(workoutName.toLowerCase()) ||
                workoutName.toLowerCase().includes(w.name.toLowerCase())) &&
                (w.equipment === equipment || w.equipment === "both")
            );
            if (found) {
                workout = found;
                category = cat;
                break;
            }
        }

        if (!workout) {
            throw new Error(`Workout "${workoutName}" not found for ${equipment}`);
        }

        // Get equipment-specific details
        const equipmentSpec = this.equipmentSpecs[equipment];

        // Prescribe distance - format depends on whether user has Garmin
        let updatedName = workout.name;
        let updatedDescription = workout.description;
        let prescribedRunEqMiles = null;

        if (targetDistance) {
            prescribedRunEqMiles = targetDistance;

            if (hasGarmin) {
                // Garmin users see RunEQ miles
                updatedName = `${prescribedRunEqMiles} RunEQ Miles - ${workout.name}`;
                updatedDescription = `Ride until your Garmin shows ${prescribedRunEqMiles} RunEQ miles - ${workout.description}`;
            } else {
                // Non-Garmin users see estimated time and distance
                // Estimate: ~3:1 ratio (bike miles to run equivalent)
                const estimatedBikeMiles = Math.round(prescribedRunEqMiles * 3);
                const estimatedMinutes = Math.round(prescribedRunEqMiles * 9); // Assuming ~9 min/RunEQ mile average
                updatedName = `${estimatedMinutes} min / ~${estimatedBikeMiles} mi - ${workout.name}`;
                updatedDescription = `Ride for approximately ${estimatedMinutes} minutes or ${estimatedBikeMiles} miles - ${workout.description}`;
            }
        }

        return {
            ...workout,
            name: updatedName,  // Override with distance-specific name
            description: updatedDescription,  // Override with distance-specific description
            category,
            equipmentSpec,
            prescribedRunEqMiles,  // The RunEQ miles to complete (measured by Garmin data field)
            garminNote: "Ride until your Garmin RunEQ data field shows the prescribed RunEQ miles. Your actual bike distance will vary based on your riding intensity.",
            equipmentSpecificNotes: this.getEquipmentNotes(workout, equipment),
            safetyGuidance: this.getSafetyGuidance(equipment, workout),
            alternatives: this.getAlternatives(equipment, workout),
            progressions: this.getProgressions(workout, experience)
        };
    }

    /**
     * Get note about Garmin Data Field for RunEQ conversion
     * The companion Garmin data field converts riding distance to RunEQ in real-time
     * based on the user's actual riding intensity
     */
    getGarminDataFieldNote() {
        return {
            title: "RunEQ Garmin Data Field",
            description: "Install the companion Garmin data field to see your RunEQ miles in real-time while riding",
            how_it_works: "The data field automatically converts your riding distance to running equivalency based on YOUR riding intensity",
            why_it_matters: "Everyone rides differently - prescribing actual bike miles would be inaccurate. RunEQ miles ensure equivalent training stimulus regardless of how hard you ride.",
            example: "If prescribed 5 RunEQ miles: A harder rider might complete it in 12 actual bike miles. An easier rider might need 14 actual bike miles. Both get the same training effect."
        };
    }

    getEquipmentNotes(workout, equipment) {
        if (equipment === "cyclete") {
            return {
                motion: "Focus on smooth natural motion pattern",
                strengths: workout.cycleteNotes || "Excellent running simulation",
                effort: workout.effort?.heartRate || "Monitor by heart rate or perceived effort"
            };
        } else {
            return {
                motion: "Utilize full stride length and upper body engagement",
                strengths: workout.elliptigoNotes || "Full-body workout with adjustable stride",
                effort: workout.effort?.heartRate || "Monitor by heart rate or perceived effort"
            };
        }
    }

    getSafetyGuidance(equipment, workout) {
        const baseGuidance = [
            "Start with proper warmup to prepare for stand-up motion",
            "Focus on smooth, controlled movement throughout",
            "Stay hydrated, especially during longer sessions"
        ];

        if (equipment === "cyclete") {
            baseGuidance.push(
                "Maintain natural natural motion, avoid forcing the pattern",
                "Keep upper body relaxed to allow efficient power transfer"
            );
        } else {
            baseGuidance.push(
                "Adjust stride length appropriately for intensity level", 
                "Coordinate upper and lower body movement smoothly",
                "Use handles for balance, not to pull yourself forward"
            );
        }

        if (workout.intensity === "interval" || workout.intensity === "tempo") {
            baseGuidance.push("Monitor effort level - equipment amplifies intensity compared to running");
        }

        return baseGuidance;
    }

    getAlternatives(equipment, workout) {
        return {
            weatherOptions: {
                indoor: equipment === "elliptigo" ? "elliptiGO can be used on indoor trainer" : "cyclete is outdoor-specific",
                outdoor: "Both excellent for outdoor training in various conditions"
            },
            intensityAdjustments: {
                tooHard: "Reduce resistance or effort level, maintain smooth motion",
                tooEasy: "Increase resistance or effort level, extend duration",
                injury: "Both are excellent low-impact alternatives to running"
            },
            durationMods: {
                timeConstraint: "Focus on quality intervals, maintain warmup/cooldown",
                extended: "Both platforms excel at longer endurance sessions"
            }
        };
    }

    getProgressions(workout, experience) {
        const baseProgression = {
            beginner: "Start conservative, focus on movement quality over intensity",
            intermediate: "Standard prescription as written",
            advanced: "Can extend duration or add complexity to intervals"
        };

        if (workout.intensity === "interval") {
            baseProgression.weeklyProgression = "Week 1: Shorter intervals, Week 2-3: Build, Week 4: Recovery";
        }

        return baseProgression[experience];
    }

    /**
     * Get workouts available for specific equipment
     */
    getWorkoutsForEquipment(equipment) {
        const availableWorkouts = [];
        
        for (const [category, workouts] of Object.entries(this.workoutLibrary)) {
            for (const workout of workouts) {
                if (workout.equipment === equipment || workout.equipment === "both") {
                    availableWorkouts.push({ ...workout, category });
                }
            }
        }
        
        return availableWorkouts;
    }

    /**
     * Get all categories
     */
    getCategories() {
        return Object.keys(this.workoutLibrary);
    }

    /**
     * Search workouts by equipment and criteria
     */
    searchWorkouts(query, equipment = null) {
        const results = [];
        const searchTerm = query.toLowerCase();
        
        for (const [category, workouts] of Object.entries(this.workoutLibrary)) {
            for (const workout of workouts) {
                // Check equipment compatibility
                if (equipment && workout.equipment !== equipment && workout.equipment !== "both") {
                    continue;
                }
                
                if (workout.name.toLowerCase().includes(searchTerm) ||
                    workout.description.toLowerCase().includes(searchTerm) ||
                    workout.benefits.toLowerCase().includes(searchTerm)) {
                    results.push({ ...workout, category });
                }
            }
        }
        
        return results;
    }
}