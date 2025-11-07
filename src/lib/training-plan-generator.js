/**
 * RunEq Comprehensive Training Plan Generator
 * Intelligently combines all workout libraries to create varied, progressive training plans
 * Addresses major limitations of repetitive training apps like Runna
 */

import { HillWorkoutLibrary } from './hill-workout-library.js';
import { TempoWorkoutLibrary } from './tempo-workout-library.js';
import { IntervalWorkoutLibrary } from './interval-workout-library.js';
import { LongRunWorkoutLibrary } from './long-run-workout-library.js';
import { StandUpBikeWorkoutLibrary } from './standup-bike-workout-library.js';
import { PaceCalculator } from './pace-calculator.js';

export class TrainingPlanGenerator {
    constructor() {
        // Initialize all workout libraries
        this.hillLibrary = new HillWorkoutLibrary();
        this.tempoLibrary = new TempoWorkoutLibrary();
        this.intervalLibrary = new IntervalWorkoutLibrary();
        this.longRunLibrary = new LongRunWorkoutLibrary();
        this.standUpBikeLibrary = new StandUpBikeWorkoutLibrary();
        this.paceCalculator = new PaceCalculator();

        // Training plan templates based on research from established coaches
        this.planTemplates = {
            "5K": {
                weeksRecommended: 8,
                runsPerWeek: [3, 4, 5],
                focusAreas: ["speed", "vo2max", "lactateThreshold"],
                workoutDistribution: {
                    intervals: 30,    // 30% interval work
                    tempo: 25,        // 25% tempo work  
                    hills: 20,        // 20% hill work
                    longRuns: 25      // 25% long runs
                },
                peakWeeklyMileage: [15, 25, 35], // by runs per week
                longRunMax: [8, 10, 12]          // by runs per week
            },
            "10K": {
                weeksRecommended: 10,
                runsPerWeek: [3, 4, 5, 6],
                focusAreas: ["vo2max", "lactateThreshold", "aerobicPower"],
                workoutDistribution: {
                    intervals: 25,
                    tempo: 30,
                    hills: 20, 
                    longRuns: 25
                },
                peakWeeklyMileage: [20, 30, 40, 50],
                longRunMax: [10, 12, 15, 18]
            },
            "Half": {
                weeksRecommended: 12,
                runsPerWeek: [4, 5, 6, 7],
                focusAreas: ["lactateThreshold", "aerobicPower", "endurance"],
                workoutDistribution: {
                    intervals: 20,
                    tempo: 35,
                    hills: 20,
                    longRuns: 25
                },
                peakWeeklyMileage: [25, 35, 45, 55],
                longRunMax: [13, 15, 18, 20]
            },
            "Marathon": {
                weeksRecommended: 16,
                runsPerWeek: [4, 5, 6, 7],
                focusAreas: ["endurance", "lactateThreshold", "aerobicPower"],
                workoutDistribution: {
                    intervals: 15,
                    tempo: 30,
                    hills: 20,
                    longRuns: 35
                },
                peakWeeklyMileage: [35, 45, 60, 70],
                longRunMax: [20, 22, 24, 26]
            }
        };

        // Periodization phases
        this.trainingPhases = {
            base: {
                name: "Base Building",
                focus: "Aerobic development, easy miles",
                workoutIntensity: "low",
                longRunEmphasis: "easy",
                hillFocus: "long_strength"
            },
            build: {
                name: "Build Phase", 
                focus: "Lactate threshold, tempo work",
                workoutIntensity: "moderate",
                longRunEmphasis: "progressive",
                hillFocus: "medium_vo2"
            },
            peak: {
                name: "Peak/Sharpening",
                focus: "Race-specific speed and power",
                workoutIntensity: "high",
                longRunEmphasis: "raceSimulation", 
                hillFocus: "short_power"
            },
            taper: {
                name: "Taper",
                focus: "Maintain fitness, reduce volume",
                workoutIntensity: "moderate",
                longRunEmphasis: "traditional_easy",
                hillFocus: "short_power"
            }
        };
    }

    /**
     * Generate a complete training plan
     */
    generateTrainingPlan(options = {}) {
        const {
            raceDistance = "10K",
            raceTime = null,
            raceDate = null,             // Race date for final week "Race Day" workout
            currentPaces = null,
            runsPerWeek = 4,
            runEqPreference = 0,
            weeksAvailable = null,
            experienceLevel, // beginner, intermediate, advanced - required
            standUpBikeType = null, // "cyclete", "elliptigo", or null for running-only
            runningStatus = 'active', // 'active', 'bikeOnly', or 'transitioning'
            currentWeeklyMileage = null, // Current weekly mileage for Week 1 starting point
            hasGarmin = true, // Whether user has Garmin device for RunEQ data field
            // USER SCHEDULE INPUTS - from onboarding
            availableDays = null,        // e.g., ['Monday', 'Wednesday', 'Friday', 'Saturday']
            hardSessionDays = null,      // e.g., ['Wednesday', 'Friday']
            longRunDay = null,           // e.g., 'Saturday'
            preferredBikeDays = null     // e.g., ['Monday']
        } = options;

        console.log('🏃 Training Plan Generator Options:');
        console.log('  runningStatus:', runningStatus);
        console.log('  currentWeeklyMileage:', currentWeeklyMileage);
        console.log('  availableDays:', availableDays);
        console.log('  hardSessionDays:', hardSessionDays);
        console.log('  longRunDay:', longRunDay);
        console.log('  preferredBikeDays:', preferredBikeDays);

        // Get plan template
        const template = this.planTemplates[raceDistance];
        if (!template) {
            throw new Error(`Race distance ${raceDistance} not supported`);
        }

        // Calculate training paces using PROGRESSIVE PACE SYSTEM
        // This fixes the critical bug where goal paces were used from Week 1
        let currentFitnessPaces = null;
        let goalPaces = null;
        let trainingPaces = null;

        if (currentPaces) {
            // User provided explicit current paces
            trainingPaces = currentPaces;
            console.log('📊 Using provided current paces');
        } else if (raceTime) {
            // Calculate GOAL paces from goal race time
            const distanceForGoal = options.currentRaceDistance || raceDistance;
            console.log(`🎯 Calculating GOAL paces: ${distanceForGoal} in ${raceTime}`);
            goalPaces = this.paceCalculator.calculateFromGoal(distanceForGoal, raceTime);
            console.log('  Goal paces:', goalPaces.paces);

            // Estimate CURRENT FITNESS paces from long run + weekly mileage
            if (currentWeeklyMileage || options.currentLongRunDistance) {
                const longRun = parseInt(options.currentLongRunDistance) || 0;
                const weeklyMiles = parseInt(currentWeeklyMileage) || 0;

                console.log(`📊 Estimating CURRENT fitness from:`);
                console.log(`   Long run: ${longRun} miles`);
                console.log(`   Weekly mileage: ${weeklyMiles} miles`);

                currentFitnessPaces = this.paceCalculator.calculateFromCurrentFitness(
                    longRun,
                    weeklyMiles,
                    distanceForGoal
                );
                console.log('  Current fitness paces:', currentFitnessPaces.paces);
                console.log(`  📈 Progressive training: Week 1 at current fitness → Final week at goal pace`);

                // Store both for progressive blending
                trainingPaces = {
                    current: currentFitnessPaces,
                    goal: goalPaces,
                    useProgression: true
                };
            } else {
                // No current fitness data - use goal paces (old behavior, but logged as warning)
                console.warn('⚠️ No current fitness data provided - using goal paces from Week 1');
                console.warn('   This may prescribe paces that are too fast for current fitness level');
                trainingPaces = goalPaces;
            }
        } else {
            throw new Error("Either currentPaces or raceTime must be provided");
        }

        // Determine plan length
        const planWeeks = weeksAvailable || template.weeksRecommended;

        // Calculate weekly structure using USER inputs
        const weeklyStructure = this.calculateWeeklyStructure(
            template,
            runsPerWeek,
            experienceLevel,
            availableDays,
            hardSessionDays,
            longRunDay,
            preferredBikeDays,
            currentWeeklyMileage
        );

        // Generate periodization
        const periodization = this.createPeriodization(planWeeks, raceDistance);

        // Generate week-by-week plan
        const weeklyPlans = [];
        for (let week = 1; week <= planWeeks; week++) {
            const weekPlan = this.generateWeekPlan(
                week,
                planWeeks,
                template,
                weeklyStructure,
                periodization,
                trainingPaces,
                runEqPreference,
                experienceLevel,
                standUpBikeType,
                runningStatus,
                hasGarmin
            );
            weeklyPlans.push(weekPlan);
        }

        // 🏁 RACE DAY FEATURE: Replace final long run with Race Day workout if user has a race date
        if (raceDate && weeklyPlans.length > 0) {
            const finalWeek = weeklyPlans[weeklyPlans.length - 1];
            const longRunDayName = weeklyStructure.longRunDay || 'Saturday';

            console.log('🏁 Race Day Feature:');
            console.log('  Race Date:', raceDate);
            console.log('  Long Run Day Name:', longRunDayName);
            console.log('  Final Week Workouts:', finalWeek.workouts.map(w => ({
                day: w.day,
                type: w.type,
                distance: w.distance,
                workoutName: w.workout?.name
            })));

            // Find the long run workout in the final week
            // Try multiple strategies:
            // 1. Find by type 'longRun'
            let longRunIndex = finalWeek.workouts.findIndex(w => w.type === 'longRun');
            console.log('  Strategy 1 (type=longRun): index =', longRunIndex);

            // 2. If not found, find by day name
            if (longRunIndex === -1) {
                longRunIndex = finalWeek.workouts.findIndex(w => w.day === longRunDayName);
                console.log('  Strategy 2 (day=' + longRunDayName + '): index =', longRunIndex);
            }

            // 3. If still not found, find the workout with the longest distance
            if (longRunIndex === -1) {
                let maxDistance = 0;
                finalWeek.workouts.forEach((w, idx) => {
                    if (w.type !== 'rest' && w.distance > maxDistance) {
                        maxDistance = w.distance;
                        longRunIndex = idx;
                    }
                });
                console.log('  Strategy 3 (longest distance): index =', longRunIndex);
            }

            if (longRunIndex !== -1) {
                // Generate the Race Day workout
                const raceDayWorkout = this.generateRaceDayWorkout(raceDistance, raceDate);

                console.log('  Replacing workout at index', longRunIndex, 'with Race Day');
                console.log('  Old workout:', finalWeek.workouts[longRunIndex]);

                // Replace the long run with Race Day workout
                // IMPORTANT: Wrap in 'workout' property to match expected structure
                finalWeek.workouts[longRunIndex] = {
                    day: finalWeek.workouts[longRunIndex].day,
                    type: raceDayWorkout.type,
                    distance: raceDayWorkout.distance,
                    focus: raceDayWorkout.focus,
                    workout: {
                        name: raceDayWorkout.name,
                        description: raceDayWorkout.description,
                        structure: raceDayWorkout.structure,
                        about: raceDayWorkout.about,
                        notes: raceDayWorkout.notes,
                        equipment: raceDayWorkout.equipment
                    }
                };

                console.log('  New workout:', finalWeek.workouts[longRunIndex]);
                console.log(`✅ Race Day workout added to final week on ${finalWeek.workouts[longRunIndex].day}`);
            } else {
                console.error('❌ Could not find suitable workout to replace with Race Day in final week!');
                console.error('   This is a bug - please report this issue');
            }
        } else {
            if (!raceDate) {
                console.log('ℹ️ No race date provided - skipping Race Day feature');
            }
        }

        return {
            planOverview: {
                raceDistance,
                raceTime,
                runsPerWeek,
                totalWeeks: planWeeks,
                runEqPreference,
                experienceLevel,
                standUpBikeType,
                // Add progression info to plan overview
                ...(trainingPaces.useProgression && {
                    paceProgression: {
                        currentFitnessPaces: trainingPaces.current.paces,
                        goalPaces: trainingPaces.goal.paces,
                        strategy: 'Progressive blending from current fitness to goal paces'
                    }
                })
            },
            trainingPaces: trainingPaces.useProgression
                ? trainingPaces.goal.paces  // Show goal paces in overview
                : (trainingPaces.paces || trainingPaces),
            currentFitnessPaces: trainingPaces.useProgression
                ? trainingPaces.current.paces
                : null,
            trackIntervals: trainingPaces.useProgression
                ? trainingPaces.goal.trackIntervals
                : (trainingPaces.trackIntervals || null),
            periodization,
            weeklyStructure,
            weeks: weeklyPlans,
            planSummary: this.generatePlanSummary(weeklyPlans, template)
        };
    }

    /**
     * Calculate optimal weekly structure using USER schedule inputs
     */
    calculateWeeklyStructure(template, runsPerWeek, experienceLevel, availableDays, hardSessionDays, longRunDay, preferredBikeDays, currentWeeklyMileage) {
        const runIndex = template.runsPerWeek.indexOf(runsPerWeek);
        if (runIndex === -1) {
            throw new Error(`${runsPerWeek} runs per week not supported for this distance`);
        }

        console.log('📊 calculateWeeklyStructure received:');
        console.log('  hardSessionDays:', hardSessionDays);
        console.log('  availableDays:', availableDays);
        console.log('  longRunDay:', longRunDay);
        console.log('  preferredBikeDays:', preferredBikeDays);
        console.log('  currentWeeklyMileage:', currentWeeklyMileage);

        // Use USER inputs instead of hardcoded schedules
        const structure = {
            runsPerWeek,
            peakMileage: template.peakWeeklyMileage[runIndex],
            longRunMax: template.longRunMax[runIndex],
            currentWeeklyMileage: currentWeeklyMileage, // Store for Week 1 calculation
            // USER SCHEDULE - not hardcoded!
            availableDays: availableDays || this.getDefaultAvailableDays(runsPerWeek),
            hardSessionDays: hardSessionDays || [],
            longRunDay: longRunDay || 'Saturday',
            preferredBikeDays: preferredBikeDays || [],
            restDays: 7 - runsPerWeek
        };

        // Calculate easy days = available days that aren't hard days, bike days, or long run day
        structure.easyDays = structure.availableDays.filter(day =>
            !structure.hardSessionDays.includes(day) &&
            !structure.preferredBikeDays.includes(day) &&
            day !== structure.longRunDay
        );

        // Adjust for experience level
        if (experienceLevel === "beginner") {
            structure.peakMileage *= 0.8;
            structure.longRunMax *= 0.9;
        } else if (experienceLevel === "advanced") {
            structure.peakMileage *= 1.15;
            structure.longRunMax *= 1.1;
        }

        return structure;
    }

    /**
     * Fallback for when user doesn't provide specific available days
     * Only used if availableDays is not provided
     */
    getDefaultAvailableDays(runsPerWeek) {
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        // Default to first N days that make sense for training
        const defaultSchedules = {
            3: ['Monday', 'Wednesday', 'Saturday'],
            4: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
            5: ['Monday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            6: ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
            7: allDays
        };
        return defaultSchedules[runsPerWeek] || defaultSchedules[4];
    }

    /**
     * Create periodization plan
     */
    createPeriodization(totalWeeks, raceDistance) {
        const phases = [];
        
        if (totalWeeks <= 8) {
            // Short plan
            phases.push({ phase: "base", weeks: Math.ceil(totalWeeks * 0.4) });
            phases.push({ phase: "build", weeks: Math.ceil(totalWeeks * 0.4) });
            phases.push({ phase: "peak", weeks: Math.floor(totalWeeks * 0.2) });
        } else if (totalWeeks <= 12) {
            // Medium plan
            phases.push({ phase: "base", weeks: Math.ceil(totalWeeks * 0.4) });
            phases.push({ phase: "build", weeks: Math.ceil(totalWeeks * 0.35) });
            phases.push({ phase: "peak", weeks: Math.ceil(totalWeeks * 0.15) });
            phases.push({ phase: "taper", weeks: Math.floor(totalWeeks * 0.1) });
        } else {
            // Long plan (marathon)
            phases.push({ phase: "base", weeks: Math.ceil(totalWeeks * 0.4) });
            phases.push({ phase: "build", weeks: Math.ceil(totalWeeks * 0.35) });
            phases.push({ phase: "peak", weeks: Math.ceil(totalWeeks * 0.15) });
            phases.push({ phase: "taper", weeks: Math.floor(totalWeeks * 0.1) });
        }

        // Add cumulative week tracking
        let cumulativeWeeks = 0;
        phases.forEach(phase => {
            phase.startWeek = cumulativeWeeks + 1;
            phase.endWeek = cumulativeWeeks + phase.weeks;
            cumulativeWeeks += phase.weeks;
        });

        return phases;
    }

    /**
     * Generate individual week plan
     * FIXED: Now uses progressive pace blending
     */
    generateWeekPlan(weekNumber, totalWeeks, template, structure, periodization, paces, runEqPreference, experienceLevel, standUpBikeType, runningStatus = 'active', hasGarmin = true) {
        // Initialize workout history if not exists
        if (!this.workoutHistory) {
            this.workoutHistory = {
                intervals: [],
                tempo: [],
                hills: []
            };
        }

        // Determine current phase
        const currentPhase = periodization.find(p =>
            weekNumber >= p.startWeek && weekNumber <= p.endWeek
        );

        // Calculate week-specific paces using PROGRESSIVE BLENDING
        let weekPaces;
        if (paces.useProgression) {
            // Blend current → goal paces based on week number
            weekPaces = this.paceCalculator.blendPaces(
                paces.current,
                paces.goal,
                weekNumber,
                totalWeeks
            );
            console.log(`🎯 Week ${weekNumber} pace blend: ${Math.round(weekPaces.progressionRatio * 100)}% toward goal`);
        } else {
            // No progression - use static paces
            weekPaces = paces;
        }

        // Calculate week progression - START FROM CURRENT MILEAGE
        const isRestWeek = weekNumber % 4 === 0 && weekNumber < totalWeeks - 2;

        // NEW FORMULA: Start at currentWeeklyMileage and build to peakMileage
        const startingMileage = structure.currentWeeklyMileage || Math.round(structure.peakMileage * 0.5);
        const buildWeeks = totalWeeks - 2; // Leave 2 weeks for taper

        console.log(`📐 Week ${weekNumber} mileage calculation:`, {
            weekNumber,
            weekNumberType: typeof weekNumber,
            startingMileage,
            peakMileage: structure.peakMileage,
            buildWeeks,
            checkWeek1: weekNumber === 1,
            currentWeeklyMileage: structure.currentWeeklyMileage
        });

        let weeklyMileage;
        if (weekNumber === 1) {
            // Week 1: Start at current mileage
            weeklyMileage = startingMileage;
            console.log(`   ✅ Week 1 detected - using startingMileage: ${weeklyMileage}`);
        } else if (weekNumber >= totalWeeks - 1) {
            // Taper weeks: reduce to 60-70% of peak
            weeklyMileage = Math.round(structure.peakMileage * (weekNumber === totalWeeks ? 0.6 : 0.7));
        } else if (isRestWeek) {
            // Recovery week: 75% of current progression
            const normalMileage = startingMileage + ((structure.peakMileage - startingMileage) * (weekNumber / buildWeeks));
            weeklyMileage = Math.round(normalMileage * 0.75);
        } else {
            // Normal build: linear progression from starting to peak
            weeklyMileage = Math.round(startingMileage + ((structure.peakMileage - startingMileage) * (weekNumber / buildWeeks)));
        }

        console.log(`📅 Week ${weekNumber}: ${weeklyMileage} miles (start: ${startingMileage}, peak: ${structure.peakMileage}, isRest: ${isRestWeek})`);

        // Generate workouts for each day using USER schedule
        const workouts = this.generateWeekWorkouts(
            structure.runsPerWeek,
            weeklyMileage,
            currentPhase,
            template,
            weekPaces,  // FIXED: Use week-specific blended paces, not static paces
            runEqPreference,
            experienceLevel,
            weekNumber,
            totalWeeks,
            standUpBikeType,
            structure,  // Pass the full structure with user's schedule
            runningStatus,  // Pass running status for bike-only mode
            hasGarmin  // Pass hasGarmin preference for workout formatting
        );

        return {
            week: weekNumber,
            phase: currentPhase.phase,
            isRestWeek,
            totalMileage: weeklyMileage,
            workouts,
            weekFocus: this.getWeekFocus(currentPhase.phase, template.focusAreas),
            notes: this.generateWeekNotes(currentPhase.phase, isRestWeek, weekNumber, totalWeeks)
        };
    }

    /**
     * Generate workouts for a specific week using USER schedule inputs
     */
    generateWeekWorkouts(runsPerWeek, weeklyMileage, phase, template, paces, runEqPreference, experienceLevel, weekNumber, totalWeeks, standUpBikeType, structure, runningStatus = 'active', hasGarmin = true) {
        const workouts = [];
        const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        // Get user schedule from structure
        const {
            availableDays,
            hardSessionDays,
            longRunDay,
            preferredBikeDays,
            easyDays
        } = structure;

        console.log(`\n🗓️ Week ${weekNumber} Workout Generation:`);
        console.log('  runningStatus:', runningStatus);
        console.log('  availableDays:', availableDays);
        console.log('  hardSessionDays:', hardSessionDays);
        console.log('  longRunDay:', longRunDay);
        console.log('  preferredBikeDays:', preferredBikeDays);
        console.log('  easyDays:', easyDays);

        // Distribute mileage across runs
        const longRunMiles = this.calculateLongRunDistance(weeklyMileage, runsPerWeek);
        const remainingMiles = weeklyMileage - longRunMiles;
        const baseOtherMiles = Math.round(remainingMiles / (runsPerWeek - 1));

        // Helper function to calculate workout-specific distance
        const calculateWorkoutDistance = (workoutType) => {
            switch(workoutType) {
                case 'tempo':
                    // Tempo needs warmup + tempo work + cooldown
                    return Math.round(baseOtherMiles * 1.4);
                case 'intervals':
                    // Intervals need warmup + work + cooldown
                    return Math.round(baseOtherMiles * 1.25);
                case 'hills':
                    // Hills take longer with climbs
                    return Math.round(baseOtherMiles * 1.2);
                case 'bike':
                case 'recovery':
                    // Bike/recovery days are shorter
                    return Math.round(baseOtherMiles * 0.8);
                case 'easy':
                default:
                    // Easy runs are base distance
                    return baseOtherMiles;
            }
        };

        // Track which hard session we're on
        let hardSessionIndex = 0;

        // Generate workouts for ALL days
        allDays.forEach(day => {
            console.log(`\n  📍 Processing ${day}:`);
            console.log(`     availableDays.includes('${day}'):`, availableDays.includes(day));
            console.log(`     hardSessionDays.includes('${day}'):`, hardSessionDays.includes(day));
            console.log(`     preferredBikeDays.includes('${day}'):`, preferredBikeDays.includes(day));
            console.log(`     day === longRunDay ('${longRunDay}'):`, day === longRunDay);

            // Check if this is a training day
            if (!availableDays.includes(day)) {
                // REST DAY - not in user's available days
                console.log(`     ⛔ Result: REST DAY (not in availableDays)`);
                workouts.push({
                    day,
                    type: "rest",
                    workout: { name: "Rest Day", description: "Complete rest or light cross-training" },
                    distance: 0,
                    focus: "Recovery"
                });
                return;
            }

            // This is a training day - determine workout type
            if (day === longRunDay) {
                // LONG RUN DAY (or long ride for bike-only users)
                if (runningStatus === 'bikeOnly') {
                    console.log(`     ✅ Result: LONG BIKE RIDE (bike-only mode)`);
                    workouts.push({
                        day,
                        type: "bike",
                        workout: this.selectStandUpBikeWorkout('long_endurance', phase, standUpBikeType, longRunMiles, hasGarmin),
                        distance: longRunMiles, // Already in RunEQ miles for bike-only users
                        focus: "Endurance",
                        equipmentSpecific: true
                    });
                } else {
                    console.log(`     ✅ Result: LONG RUN`);
                    const paceData = paces.paces || paces;
                    workouts.push({
                        day,
                        type: "longRun",
                        workout: this.selectLongRunWorkout(phase, longRunMiles, runEqPreference, paceData),
                        distance: longRunMiles,
                        focus: "Endurance"
                    });
                }
            } else if (hardSessionDays.includes(day) && preferredBikeDays.includes(day) && standUpBikeType) {
                // HARD BIKE DAY (user wants BOTH hard work AND bike day)
                console.log(`     ✅ Result: HARD BIKE SESSION (hard day + bike day, hardSessionIndex: ${hardSessionIndex})`);
                const bikeWorkoutTypes = ['tempo', 'intervals', 'aerobic_power'];
                const bikeWorkoutType = bikeWorkoutTypes[hardSessionIndex % bikeWorkoutTypes.length];
                const workoutDistance = calculateWorkoutDistance(bikeWorkoutType);
                workouts.push({
                    day,
                    type: 'bike',
                    workout: this.selectStandUpBikeWorkout(bikeWorkoutType, phase, standUpBikeType, workoutDistance, hasGarmin),
                    distance: workoutDistance,
                    focus: bikeWorkoutType === 'tempo' ? 'Lactate Threshold' : 'Speed & Power',
                    equipmentSpecific: true
                });
                hardSessionIndex++;
            } else if (hardSessionDays.includes(day)) {
                // HARD RUN DAY (user specified, but NOT a bike day)
                if (runningStatus === 'bikeOnly') {
                    // Bike-only mode: use bike intervals/tempo instead of running
                    console.log(`     ✅ Result: HARD BIKE SESSION (bike-only mode, hardSessionIndex: ${hardSessionIndex})`);
                    const bikeWorkoutTypes = ['tempo', 'intervals', 'aerobic_power'];
                    const bikeWorkoutType = bikeWorkoutTypes[hardSessionIndex % bikeWorkoutTypes.length];
                    const workoutDistance = calculateWorkoutDistance(bikeWorkoutType);
                    workouts.push({
                        day,
                        type: 'bike',
                        workout: this.selectStandUpBikeWorkout(bikeWorkoutType, phase, standUpBikeType, workoutDistance, hasGarmin),
                        distance: workoutDistance, // Already in RunEQ miles for bike-only users
                        focus: bikeWorkoutType === 'tempo' ? 'Lactate Threshold' : 'Speed & Power',
                        equipmentSpecific: true
                    });
                    hardSessionIndex++;
                } else {
                    // Normal running hard sessions
                    console.log(`     ✅ Result: HARD RUN SESSION (hardSessionIndex: ${hardSessionIndex})`);
                    const workoutType = this.selectWorkoutType(hardSessionIndex, phase, template);
                    const workoutDistance = calculateWorkoutDistance(workoutType);
                    workouts.push({
                        day,
                        type: workoutType,
                        workout: this.selectQualityWorkout(workoutType, phase, workoutDistance, runEqPreference, paces, weekNumber, totalWeeks),
                        distance: workoutDistance,
                        focus: this.getWorkoutFocus(workoutType)
                    });
                    hardSessionIndex++;
                }
            } else if (preferredBikeDays.includes(day) && standUpBikeType) {
                // BIKE DAY (user prefers bike on this day)
                console.log(`     ✅ Result: BIKE DAY`);
                const bikeWorkoutType = 'aerobic_base';
                const workoutDistance = calculateWorkoutDistance('bike');
                workouts.push({
                    day,
                    type: 'bike',
                    workout: this.selectStandUpBikeWorkout(bikeWorkoutType, phase, standUpBikeType, workoutDistance),
                    distance: workoutDistance,
                    focus: "Aerobic Base",
                    equipmentSpecific: true
                });
            } else {
                // EASY DAY (everything else that's an available day)
                if (runningStatus === 'bikeOnly') {
                    // Bike-only mode: use easy bike rides
                    console.log(`     ✅ Result: EASY BIKE RIDE (bike-only mode)`);
                    const workoutDistance = calculateWorkoutDistance('recovery');
                    workouts.push({
                        day,
                        type: 'bike',
                        workout: this.selectStandUpBikeWorkout('recovery', phase, standUpBikeType, workoutDistance),
                        distance: workoutDistance, // Already in RunEQ miles for bike-only users
                        focus: "Recovery",
                        equipmentSpecific: true
                    });
                } else {
                    // Normal easy runs
                    console.log(`     ✅ Result: EASY RUN`);
                    const paceData = paces.paces || paces;
                    const workoutDistance = calculateWorkoutDistance('easy');
                    workouts.push({
                        day,
                        type: "easy",
                        workout: this.generateEasyRun(workoutDistance, runEqPreference, paceData),
                        distance: workoutDistance,
                        focus: "Recovery"
                    });
                }
            }
        });

        return workouts; // Already in day order
    }

    /**
     * Intelligently select workout types based on phase and training focus
     */
    selectWorkoutType(workoutIndex, phase, template) {
        const phaseInfo = this.trainingPhases[phase.phase];
        
        // Rotate workout types based on training phase emphasis
        const workoutRotation = {
            base: ["tempo", "hills", "easy"],
            build: ["tempo", "intervals", "hills"],
            peak: ["intervals", "tempo", "hills"], 
            taper: ["tempo", "easy", "intervals"]
        };

        const rotation = workoutRotation[phase.phase];
        return rotation[workoutIndex % rotation.length];
    }

    /**
     * Select specific workout from appropriate library with USER-SPECIFIC PACES
     */
    selectQualityWorkout(workoutType, phase, targetDistance, runEqPreference, paces, weekNumber, totalWeeks) {
        const phaseInfo = this.trainingPhases[phase.phase];

        // Extract pace data and track intervals from full pace object
        const paceData = paces.paces || paces; // Handle both formats
        const trackIntervals = paces.trackIntervals || null;

        switch (workoutType) {
            case "hills":
                return this.selectHillWorkout(phase, runEqPreference, paceData, weekNumber, totalWeeks);
            case "tempo":
                return this.selectTempoWorkout(phase, runEqPreference, paceData, weekNumber, totalWeeks);
            case "intervals":
                return this.selectIntervalWorkout(phase, runEqPreference, paceData, trackIntervals, weekNumber, totalWeeks);
            default:
                return this.generateEasyRun(targetDistance, runEqPreference, paceData);
        }
    }

    selectHillWorkout(phase, runEqPreference, paces, weekNumber, totalWeeks) {
        const phaseInfo = this.trainingPhases[phase.phase];
        const category = phaseInfo.hillFocus;

        const workouts = this.hillLibrary.getWorkoutsByCategory(category);
        if (workouts.length === 0) {
            // Fallback to any hill workout
            const allWorkouts = Object.values(this.hillLibrary.workoutLibrary).flat();
            const selectedWorkout = this.selectWorkoutAvoidingRepetition(allWorkouts, 'hills');
            return this.hillLibrary.prescribeHillWorkout(selectedWorkout.name, { runEqPreference, paces });
        }

        const selectedWorkout = this.selectWorkoutAvoidingRepetition(workouts, 'hills');
        return this.hillLibrary.prescribeHillWorkout(selectedWorkout.name, { runEqPreference, paces });
    }

    selectTempoWorkout(phase, runEqPreference, paces, weekNumber, totalWeeks) {
        const phaseInfo = this.trainingPhases[phase.phase];

        // Select tempo category based on phase
        const categoryMap = {
            base: "TRADITIONAL_TEMPO",
            build: "TEMPO_INTERVALS",
            peak: "RACE_SPECIFIC",
            taper: "ALTERNATING_TEMPO"
        };

        const category = categoryMap[phase.phase];
        const workouts = this.tempoLibrary.getWorkoutsByCategory(category);
        const selectedWorkout = this.selectWorkoutAvoidingRepetition(workouts, 'tempo');
        return this.tempoLibrary.prescribeTempoWorkout(selectedWorkout.name, { runEqPreference, paces });
    }

    selectIntervalWorkout(phase, runEqPreference, paces, trackIntervals, weekNumber, totalWeeks) {
        const phaseInfo = this.trainingPhases[phase.phase];

        // Select interval category based on phase
        const categoryMap = {
            base: "LONG_INTERVALS",
            build: "VO2_MAX",
            peak: "SHORT_SPEED",
            taper: "MIXED_INTERVALS"
        };

        const category = categoryMap[phase.phase];
        const workouts = this.intervalLibrary.getWorkoutsByCategory(category);
        const selectedWorkout = this.selectWorkoutAvoidingRepetition(workouts, 'intervals');

        // Calculate specific rep count based on progression
        const specificReps = this.calculateSpecificReps(selectedWorkout.repetitions, weekNumber, totalWeeks);

        return this.intervalLibrary.prescribeIntervalWorkout(selectedWorkout.name, {
            runEqPreference,
            paces,
            trackIntervals,
            specificReps  // Pass the calculated specific rep count
        });
    }

    selectLongRunWorkout(phase, distance, runEqPreference, paces) {
        const phaseInfo = this.trainingPhases[phase.phase];
        const emphasis = phaseInfo.longRunEmphasis;

        // Map emphasis to long run categories
        const categoryMap = {
            easy: "TRADITIONAL_EASY",
            progressive: "PROGRESSIVE_RUNS",
            raceSimulation: "RACE_SIMULATION",
            traditional_easy: "TRADITIONAL_EASY"
        };

        const category = categoryMap[emphasis] || "TRADITIONAL_EASY";
        const workouts = this.longRunLibrary.getWorkoutsByCategory(category);
        const selectedWorkout = workouts[Math.floor(Math.random() * workouts.length)];
        return this.longRunLibrary.prescribeLongRunWorkout(selectedWorkout.name, { runEqPreference, distance, paces });
    }

    generateEasyRun(distance, runEqPreference, paces = null) {
        const runEqOptions = {
            optionA: "Full easy running",
            optionB: "First half running, second half stand-up bike",
            optionC: "Full stand-up bike (2x time conversion)",
            recommendation: runEqPreference >= 50 ? "Split or full bike workout" : "Full running"
        };

        let structure = `${distance} miles at easy pace`;
        let description = "Conversational pace, aerobic base building";

        // Inject user-specific paces if provided
        if (paces && paces.easy) {
            structure = `${distance} miles at easy pace (${paces.easy.min}-${paces.easy.max}/mile)`;
            description = `Conversational pace (${paces.easy.min}-${paces.easy.max}/mile), aerobic base building`;
        }

        return {
            name: "Easy Run",
            description,
            structure,
            intensity: "easy",
            benefits: "Aerobic development, recovery, base building",
            runEqOptions,
            paces,
            notes: "Should feel refreshed after this run, not fatigued"
        };
    }

    calculateLongRunDistance(weeklyMileage, runsPerWeek) {
        // Long run should be 25-35% of weekly mileage
        const longRunPercentage = runsPerWeek <= 4 ? 0.35 : 0.30;
        return Math.round(weeklyMileage * longRunPercentage);
    }

    getWorkoutFocus(workoutType) {
        const focusMap = {
            hills: "Power & Strength",
            tempo: "Lactate Threshold",
            intervals: "VO2 Max & Speed",
            easy: "Aerobic Base",
            longRun: "Endurance"
        };
        return focusMap[workoutType] || "General Fitness";
    }

    getWeekFocus(phase, focusAreas) {
        const phaseInfo = this.trainingPhases[phase];
        return `${phaseInfo.name}: ${phaseInfo.focus}`;
    }

    generateWeekNotes(phase, isRestWeek, weekNumber, totalWeeks) {
        const notes = [];
        
        if (isRestWeek) {
            notes.push("RECOVERY WEEK: Reduced volume to allow adaptation and recovery");
        }
        
        const phaseInfo = this.trainingPhases[phase];
        notes.push(`Focus: ${phaseInfo.focus}`);
        
        if (phase === "peak" && weekNumber > totalWeeks - 4) {
            notes.push("Peak phase: Focus on race-specific workouts and maintaining sharpness");
        }
        
        if (phase === "taper") {
            notes.push("Taper phase: Maintain intensity but reduce volume for race readiness");
        }

        return notes;
    }

    generatePlanSummary(weeklyPlans, template) {
        const totalWorkouts = weeklyPlans.reduce((sum, week) => 
            sum + week.workouts.filter(w => w.type !== "rest").length, 0
        );
        
        const workoutTypes = weeklyPlans.reduce((counts, week) => {
            week.workouts.forEach(workout => {
                counts[workout.type] = (counts[workout.type] || 0) + 1;
            });
            return counts;
        }, {});

        const totalMiles = weeklyPlans.reduce((sum, week) => sum + week.totalMileage, 0);

        return {
            totalWorkouts,
            totalMiles,
            workoutBreakdown: workoutTypes,
            averageWeeklyMiles: Math.round(totalMiles / weeklyPlans.length),
            peakWeekMiles: Math.max(...weeklyPlans.map(w => w.totalMileage)),
            varietyScore: Object.keys(workoutTypes).length // More variety = higher score
        };
    }

    /**
     * Select workout avoiding recent repetition
     * Uses a "recently used" tracking system to ensure variety
     */
    selectWorkoutAvoidingRepetition(workouts, workoutType) {
        if (!workouts || workouts.length === 0) {
            throw new Error(`No workouts available for type: ${workoutType}`);
        }

        // If only 1-2 workouts available, just alternate
        if (workouts.length <= 2) {
            const lastUsed = this.workoutHistory[workoutType][this.workoutHistory[workoutType].length - 1];
            const available = workouts.filter(w => w.name !== lastUsed);
            if (available.length > 0) {
                const selected = available[Math.floor(Math.random() * available.length)];
                this.workoutHistory[workoutType].push(selected.name);
                return selected;
            }
            // If all filtered out, just use any
            const selected = workouts[Math.floor(Math.random() * workouts.length)];
            this.workoutHistory[workoutType].push(selected.name);
            return selected;
        }

        // For 3+ workouts: avoid the last 2 used workouts
        const recentlyUsed = this.workoutHistory[workoutType].slice(-2);
        const available = workouts.filter(w => !recentlyUsed.includes(w.name));

        if (available.length === 0) {
            // All workouts recently used (shouldn't happen with 3+), reset history
            this.workoutHistory[workoutType] = [];
            const selected = workouts[Math.floor(Math.random() * workouts.length)];
            this.workoutHistory[workoutType].push(selected.name);
            return selected;
        }

        // Select randomly from available workouts
        const selected = available[Math.floor(Math.random() * available.length)];
        this.workoutHistory[workoutType].push(selected.name);

        // Keep history manageable (last 5 workouts)
        if (this.workoutHistory[workoutType].length > 5) {
            this.workoutHistory[workoutType].shift();
        }

        return selected;
    }

    /**
     * Calculate specific rep count from a range like "4-8 x 800m"
     * Progresses from low end early in plan to high end later
     */
    calculateSpecificReps(repetitionsString, weekNumber, totalWeeks) {
        // Extract the range (e.g., "4-8" from "4-8 x 800m")
        const rangeMatch = repetitionsString.match(/(\d+)-(\d+)/);

        if (!rangeMatch) {
            // No range found, return original (e.g., "5 x 1K + 3 x 800m")
            return repetitionsString;
        }

        const minReps = parseInt(rangeMatch[1], 10);
        const maxReps = parseInt(rangeMatch[2], 10);

        // Calculate progression percentage (0.0 to 1.0)
        // Early weeks = closer to minReps, later weeks = closer to maxReps
        const progression = Math.min(1.0, weekNumber / (totalWeeks * 0.75)); // Peak at 75% of plan

        // Calculate specific rep count
        const specificReps = Math.round(minReps + (progression * (maxReps - minReps)));

        // Replace the range with specific number
        return repetitionsString.replace(/(\d+)-(\d+)/, specificReps.toString());
    }

    /**
     * Select workout type for stand-up bike specific sessions
     */
    selectStandUpBikeWorkoutType(workoutIndex, phase, template) {
        const phaseInfo = this.trainingPhases[phase.phase];
        
        // Stand-up bike rotation emphasizes what the equipment does best
        const workoutRotation = {
            base: ["aerobic_base", "tempo_efforts", "recovery_specific"],
            build: ["tempo_efforts", "high_intensity", "technique_specific"],
            peak: ["high_intensity", "race_specific", "tempo_efforts"], 
            taper: ["technique_specific", "recovery_specific", "race_specific"]
        };

        const rotation = workoutRotation[phase.phase];
        return rotation[workoutIndex % rotation.length];
    }

    /**
     * Select specific stand-up bike workout
     */
    selectStandUpBikeWorkout(workoutType, phase, standUpBikeType, targetDistance, hasGarmin = true) {
        // Map workout types to stand-up bike categories
        const categoryMap = {
            // New categories with full workout libraries
            tempo: "TEMPO_BIKE",
            intervals: "INTERVAL_BIKE",
            aerobic_power: "POWER_RESISTANCE",
            long_endurance: "LONG_ENDURANCE_RIDES",
            recovery: "RECOVERY_SPECIFIC",
            // Original categories
            aerobic_base: "AEROBIC_BASE",
            technique_specific: "TECHNIQUE_SPECIFIC"
        };

        const category = categoryMap[workoutType] || "AEROBIC_BASE";
        const workouts = this.standUpBikeLibrary.workoutLibrary[category];

        if (!workouts || workouts.length === 0) {
            // Fallback to any available workout
            const allWorkouts = Object.values(this.standUpBikeLibrary.workoutLibrary).flat();
            const availableWorkouts = allWorkouts.filter(w =>
                w.equipment === standUpBikeType || w.equipment === "both"
            );

            if (availableWorkouts.length > 0) {
                const selectedWorkout = availableWorkouts[Math.floor(Math.random() * availableWorkouts.length)];
                return this.standUpBikeLibrary.prescribeStandUpBikeWorkout(
                    selectedWorkout.name,
                    standUpBikeType,
                    { targetDistance, hasGarmin }  // Pass targetDistance for RunEQ conversion and hasGarmin preference
                );
            }
        }

        // Filter workouts available for this equipment
        const availableWorkouts = workouts.filter(w =>
            w.equipment === standUpBikeType || w.equipment === "both"
        );

        if (availableWorkouts.length === 0) {
            // If no equipment-specific workouts, use any "both" workouts
            const bothWorkouts = workouts.filter(w => w.equipment === "both");
            if (bothWorkouts.length > 0) {
                const selectedWorkout = bothWorkouts[Math.floor(Math.random() * bothWorkouts.length)];
                return this.standUpBikeLibrary.prescribeStandUpBikeWorkout(
                    selectedWorkout.name,
                    standUpBikeType,
                    { targetDistance, hasGarmin }  // Pass targetDistance for RunEQ conversion and hasGarmin preference
                );
            }
        }

        const selectedWorkout = availableWorkouts[Math.floor(Math.random() * availableWorkouts.length)];
        return this.standUpBikeLibrary.prescribeStandUpBikeWorkout(
            selectedWorkout.name,
            standUpBikeType,
            { targetDistance, hasGarmin }  // Pass targetDistance for RunEQ conversion and hasGarmin preference
        );
    }

    /**
     * Generate Race Day workout with coaching advice
     */
    generateRaceDayWorkout(raceDistance, raceDate) {
        // Distance conversions
        const distanceMap = {
            '5K': { miles: 3.1, name: '5K' },
            '10K': { miles: 6.2, name: '10K' },
            'Half': { miles: 13.1, name: 'Half Marathon' },
            'Marathon': { miles: 26.2, name: 'Marathon' }
        };

        const distance = distanceMap[raceDistance] || { miles: parseFloat(raceDistance) || 13.1, name: raceDistance };

        // Race-specific coaching advice
        const coachingAdvice = {
            '5K': [
                '🎯 Race Strategy: Start controlled, hit race pace by mile 1, build through mile 2, empty the tank in the final 800m',
                '⏱️ Pacing: This is a fast race - don\'t go out too hard, but don\'t be afraid to hurt',
                '💪 Mental Game: Pain is temporary, your PR time is forever',
                '🔥 The last mile is where races are won - stay strong and finish fast!'
            ],
            '10K': [
                '🎯 Race Strategy: First 5K controlled at goal pace, second 5K at effort (pace will feel harder but stay consistent)',
                '⏱️ Pacing: Even splits are your friend - negative splits are magic',
                '💪 Mental Game: The middle miles (2-4) are where mental toughness counts',
                '🏁 Final kilometer: Give everything you\'ve got left!'
            ],
            'Half': [
                '🎯 Race Strategy: Miles 1-6 feel easy, 7-10 at goal pace, 11-13 dig deep',
                '⏱️ Pacing: First half should feel controlled - if you\'re working hard before mile 8, you went too fast',
                '💪 Mental Game: Mile 10 is the real start of the race - this is where your training pays off',
                '🔥 The final 5K is all guts - trust your training and push through',
                '💧 Hydration: Take water at every aid station, even if just a sip'
            ],
            'Marathon': [
                '🎯 Race Strategy: Miles 1-16 should feel easy and controlled, 17-20 maintain focus, 21-26 is the real race',
                '⏱️ Pacing: The first 20 miles are the warmup for the last 6 miles',
                '💪 Mental Game: "The wall" at mile 20 is real - but your training prepared you for this',
                '🔥 When it gets hard around mile 20, remember: this is why you trained',
                '💧 Hydration & Fuel: Take water/electrolytes at every station, fuel every 45min starting at mile 6',
                '🧠 Break it down: Focus on one mile at a time, not the distance remaining',
                '✨ You\'ve got this - you\'ve already done the hard work in training!'
            ]
        };

        const advice = coachingAdvice[raceDistance] || [
            '🎯 Race Strategy: Start controlled, settle into your pace, finish strong',
            '⏱️ Pacing: Even effort throughout, trust your training',
            '💪 Mental Game: Stay present, stay strong, stay focused',
            '🔥 This is your day - go get it!'
        ];

        // Format race date
        const raceDateFormatted = raceDate
            ? new Date(raceDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : 'Race Day';

        return {
            name: `🏁 RACE DAY - ${distance.name}`,
            type: 'race',
            distance: distance.miles,
            structure: `Your ${distance.name} race - ${distance.miles} miles`,
            description: advice.join('\n\n'),
            about: `Today is what you've been training for! Trust your preparation, execute your race plan, and leave it all out there. You're ready for this.`,
            focus: 'Race Performance',
            notes: `Race Date: ${raceDateFormatted}`,
            equipment: 'running'
        };
    }
}