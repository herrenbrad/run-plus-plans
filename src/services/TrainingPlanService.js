/**
 * TrainingPlanService - Training Plan Generator
 *
 * REBUILT ARCHITECTURE (December 2024):
 * 1. Routes based on runningStatus FIRST (active, crossTrainingOnly, transitioning)
 * 2. Uses LibraryCatalog for all workout selection - no invented workout names
 * 3. AI selects from catalog for variety, but can ONLY pick valid names
 * 4. Paces injected from VDOT calculations
 *
 * This service generates training plan STRUCTURE by:
 * - Reading available workouts from LibraryCatalog
 * - Selecting appropriate workouts based on user schedule & equipment
 * - Fetching full workout details from libraries
 * - Injecting user-specific paces
 */

import { LibraryCatalog } from '../lib/LibraryCatalog.js';
import { generatePlanMath } from '../lib/plan-math/index.js';
import { PaceCalculator } from '../lib/pace-calculator.js';
import phaseCalculator from './ai/PhaseCalculator.js';
import logger from '../utils/logger.js';

class TrainingPlanService {
    constructor() {
        this.paceCalculator = new PaceCalculator();
        this.workoutHistory = {
            tempo: [],
            intervals: [],
            hills: [],
            longRun: [],
            crossTraining: {}
        };
    }

    /**
     * Generate complete training plan structure
     * Routes based on runningStatus FIRST
     */
    generatePlanStructure(userProfile) {
        logger.log('🏗️ Generating training plan...');
        logger.log(`  Running Status: ${userProfile.runningStatus || 'active'}`);

        this.validateProfile(userProfile);
        this.resetWorkoutHistory();

        const totalWeeks = this.calculateTotalWeeks(userProfile.startDate, userProfile.raceDate);
        const planMath = generatePlanMath({
            currentWeeklyMileage: userProfile.currentWeeklyMileage,
            currentLongRun: userProfile.currentLongRun,
            totalWeeks,
            raceDistance: userProfile.raceDistance,
            experienceLevel: userProfile.experienceLevel || 'intermediate'
        });

        const phasePlan = phaseCalculator.getPhasePlan(totalWeeks);
        const paces = this.calculatePaces(userProfile);

        // Get available workout catalog based on runningStatus and equipment
        const runningStatus = userProfile.runningStatus || 'active';
        const catalog = LibraryCatalog.getCatalogForAI(
            runningStatus,
            userProfile.crossTrainingEquipment || {},
            userProfile.standUpBikeType
        );

        logger.log(`  Catalog loaded: ${runningStatus === 'crossTrainingOnly' ? 'Cross-training only' : 'Running + cross-training'}`);

        // Generate weeks
        const weeks = [];
        for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
            const weekMath = planMath.weeks.find(w => w.weekNumber === weekNum);
            const week = this.generateWeek({
                weekNumber: weekNum,
                profile: userProfile,
                planMath,
                weekMath,
                phasePlan,
                paces,
                totalWeeks,
                catalog,
                runningStatus
            });
            weeks.push(week);
        }

        const planOverview = {
            startDate: userProfile.startDate,
            raceDate: userProfile.raceDate,
            totalWeeks,
            raceDistance: userProfile.raceDistance,
            goalTime: userProfile.raceTime,
            runningStatus,
            phasePlan
        };

        logger.log('✅ Plan structure generated');

        return {
            planOverview,
            weeks,
            paces,
            _planMath: planMath
        };
    }

    /**
     * Generate a single week
     */
    generateWeek({ weekNumber, profile, planMath, weekMath, phasePlan, paces, totalWeeks, catalog, runningStatus }) {
        const currentPhase = phasePlan.find(p =>
            weekNumber >= p.startWeek && weekNumber <= p.endWeek
        );
        const phaseName = currentPhase ? currentPhase.phase.toLowerCase() : 'base';

        // Route to appropriate generator based on runningStatus
        let workouts;

        switch (runningStatus) {
            case 'crossTrainingOnly':
                workouts = this.generateCrossTrainingWeek({
                    weekNumber, profile, weekMath, phaseName, paces, totalWeeks, catalog
                });
                break;

            case 'transitioning':
                workouts = this.generateTransitionWeek({
                    weekNumber, profile, weekMath, phaseName, paces, totalWeeks, catalog
                });
                break;

            case 'active':
            default:
                workouts = this.generateRunningWeek({
                    weekNumber, profile, weekMath, phaseName, paces, totalWeeks, catalog
                });
                break;
        }

        const weekDates = this.calculateWeekDates(weekNumber, profile.startDate);

        return {
            weekNumber,
            totalMileage: weekMath.weeklyMileage,
            workouts,
            phase: phaseName,
            weeklyFocus: this.getWeeklyFocus(phaseName),
            motivation: this.getMotivation(phaseName, weekNumber, totalWeeks),
            weekDates
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RUNNING WEEK GENERATION (runningStatus === 'active')
    // ═══════════════════════════════════════════════════════════════════════════

    generateRunningWeek({ weekNumber, profile, weekMath, phaseName, paces, totalWeeks, catalog }) {
        const workouts = [];
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        const restDays = profile.restDays || [];
        const availableDays = profile.availableDays || [];
        const qualityDays = profile.qualityDays || profile.hardSessionDays || [];
        const longRunDay = profile.longRunDay || 'Sunday';
        const preferredBikeDays = profile.preferredBikeDays || [];
        const standUpBikeType = profile.standUpBikeType;

        // Calculate distances
        const longRunDistance = weekMath.longRun;
        const workoutDays = availableDays.filter(d =>
            !restDays.includes(d) && d !== longRunDay && !preferredBikeDays.includes(d)
        );
        const remainingMileage = weekMath.weeklyMileage - longRunDistance;
        const avgDistance = workoutDays.length > 0 ? remainingMileage / workoutDays.length : 4;

        let hardSessionIndex = 0;

        allDays.forEach(day => {
            if (restDays.includes(day)) {
                workouts.push(this.createRestDay(day));
            } else if (day === longRunDay) {
                workouts.push(this.createLongRun(day, longRunDistance, phaseName, paces, profile, weekNumber, totalWeeks));
            } else if (preferredBikeDays.includes(day) && standUpBikeType) {
                const isHard = qualityDays.includes(day);
                workouts.push(this.createBikeWorkout(day, standUpBikeType, isHard, phaseName, avgDistance, paces, isHard ? hardSessionIndex : null));
                if (isHard) hardSessionIndex++; // Increment only for hard bike days
            } else if (qualityDays.includes(day)) {
                workouts.push(this.createHardWorkout(day, phaseName, avgDistance, paces, hardSessionIndex, weekNumber));
                hardSessionIndex++;
            } else if (availableDays.includes(day)) {
                workouts.push(this.createEasyRun(day, avgDistance, paces));
            } else {
                workouts.push(this.createRestDay(day));
            }
        });

        return workouts;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CROSS-TRAINING WEEK GENERATION (runningStatus === 'crossTrainingOnly')
    // ═══════════════════════════════════════════════════════════════════════════

    generateCrossTrainingWeek({ weekNumber, profile, weekMath, phaseName, paces, totalWeeks, catalog }) {
        const workouts = [];
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        const restDays = profile.restDays || [];
        const availableDays = profile.availableDays || [];
        const qualityDays = profile.qualityDays || profile.hardSessionDays || [];
        const longRunDay = profile.longRunDay || 'Sunday';

        // Get available equipment
        const availableEquipment = LibraryCatalog.getAvailableEquipment(profile);

        if (availableEquipment.length === 0) {
            logger.warn('No cross-training equipment available, falling back to walking');
            // Generate walking-only plan
            return this.generateWalkingWeek({ weekNumber, profile, weekMath, phaseName, restDays, availableDays, longRunDay });
        }

        // Distribute equipment across workout days for variety
        let equipmentIndex = 0;
        let hardSessionIndex = 0;

        allDays.forEach(day => {
            if (restDays.includes(day)) {
                workouts.push(this.createRestDay(day));
            } else if (day === longRunDay) {
                // Long session on cross-training equipment
                const equipment = availableEquipment[equipmentIndex % availableEquipment.length];
                workouts.push(this.createCrossTrainingLong(day, equipment, phaseName, weekMath.longRun));
                equipmentIndex++;
            } else if (qualityDays.includes(day)) {
                // Hard cross-training session
                const equipment = availableEquipment[equipmentIndex % availableEquipment.length];
                workouts.push(this.createCrossTrainingHard(day, equipment, phaseName, hardSessionIndex));
                equipmentIndex++;
                hardSessionIndex++;
            } else if (availableDays.includes(day)) {
                // Easy cross-training session
                const equipment = availableEquipment[equipmentIndex % availableEquipment.length];
                workouts.push(this.createCrossTrainingEasy(day, equipment));
                equipmentIndex++;
            } else {
                workouts.push(this.createRestDay(day));
            }
        });

        return workouts;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TRANSITION WEEK GENERATION (runningStatus === 'transitioning')
    // ═══════════════════════════════════════════════════════════════════════════

    generateTransitionWeek({ weekNumber, profile, weekMath, phaseName, paces, totalWeeks, catalog }) {
        // Transition schedule:
        // Weeks 1-2: 100% cross-training
        // Weeks 3-4: 25% running, 75% cross-training
        // Weeks 5-6: 50% running, 50% cross-training
        // Weeks 7+: 75% running, 25% cross-training

        if (weekNumber <= 2) {
            logger.log(`  Week ${weekNumber}: 100% cross-training (transition phase 1)`);
            return this.generateCrossTrainingWeek({ weekNumber, profile, weekMath, phaseName, paces, totalWeeks, catalog });
        }

        // For weeks 3+, blend running and cross-training
        const workouts = [];
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        const restDays = profile.restDays || [];
        const availableDays = profile.availableDays || [];
        const qualityDays = profile.qualityDays || profile.hardSessionDays || [];
        const longRunDay = profile.longRunDay || 'Sunday';

        const availableEquipment = LibraryCatalog.getAvailableEquipment(profile);

        // Calculate running percentage based on week
        let runningPercentage;
        if (weekNumber <= 4) {
            runningPercentage = 0.25;
        } else if (weekNumber <= 6) {
            runningPercentage = 0.50;
        } else {
            runningPercentage = 0.75;
        }

        logger.log(`  Week ${weekNumber}: ${Math.round(runningPercentage * 100)}% running`);

        // Count workout days (excluding rest and long run)
        const workoutDays = availableDays.filter(d => !restDays.includes(d) && d !== longRunDay);
        const runningDayCount = Math.round(workoutDays.length * runningPercentage);

        // First N days are running, rest are cross-training
        let runningDaysAssigned = 0;
        let equipmentIndex = 0;
        let hardSessionIndex = 0;

        // Calculate distances
        const longRunDistance = weekMath.longRun * runningPercentage; // Reduce long run during transition
        const remainingMileage = weekMath.weeklyMileage - longRunDistance;
        const avgDistance = workoutDays.length > 0 ? remainingMileage / workoutDays.length : 4;

        allDays.forEach(day => {
            if (restDays.includes(day)) {
                workouts.push(this.createRestDay(day));
            } else if (day === longRunDay) {
                if (runningPercentage >= 0.5) {
                    // Running long run
                    workouts.push(this.createLongRun(day, longRunDistance, phaseName, paces, profile, weekNumber, totalWeeks));
                } else {
                    // Cross-training long session
                    const equipment = availableEquipment[equipmentIndex % availableEquipment.length];
                    workouts.push(this.createCrossTrainingLong(day, equipment, phaseName, weekMath.longRun));
                    equipmentIndex++;
                }
            } else if (availableDays.includes(day)) {
                const isHard = qualityDays.includes(day);

                // Assign running days first (prioritize quality days)
                if (runningDaysAssigned < runningDayCount && (isHard || runningDaysAssigned < runningDayCount - 1)) {
                    if (isHard) {
                        workouts.push(this.createHardWorkout(day, phaseName, avgDistance, paces, hardSessionIndex, weekNumber));
                        hardSessionIndex++;
                    } else {
                        workouts.push(this.createEasyRun(day, avgDistance, paces));
                    }
                    runningDaysAssigned++;
                } else {
                    // Cross-training day
                    const equipment = availableEquipment[equipmentIndex % availableEquipment.length];
                    if (isHard) {
                        workouts.push(this.createCrossTrainingHard(day, equipment, phaseName, hardSessionIndex));
                        hardSessionIndex++;
                    } else {
                        workouts.push(this.createCrossTrainingEasy(day, equipment));
                    }
                    equipmentIndex++;
                }
            } else {
                workouts.push(this.createRestDay(day));
            }
        });

        return workouts;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // WORKOUT CREATION METHODS (using LibraryCatalog)
    // ═══════════════════════════════════════════════════════════════════════════

    createRestDay(day) {
        return {
            day,
            type: 'rest',
            ...LibraryCatalog.getRestDay()
        };
    }

    createEasyRun(day, distance, paces) {
        const workout = LibraryCatalog.getEasyRunWorkout({ distance, paces: paces?.paces });
        return {
            day,
            ...workout
        };
    }

    createHardWorkout(day, phase, distance, paces, hardSessionIndex, weekNumber) {
        // Rotate through workout types based on phase and index
        const workoutTypes = this.getHardWorkoutRotation(phase);
        const workoutType = workoutTypes[hardSessionIndex % workoutTypes.length];

        // Select workout from library using rotation for variety
        const workout = this.selectFromLibrary(workoutType, phase, weekNumber, paces);

        return {
            day,
            type: workoutType,
            focus: this.getWorkoutFocus(workoutType),
            distance,
            ...workout
        };
    }

    createLongRun(day, distance, phase, paces, profile, weekNumber, totalWeeks) {
        // Check if this is race week
        if (weekNumber === totalWeeks) {
            return this.createRaceDay(day, profile);
        }

        // Select long run workout from library
        const workout = this.selectFromLibrary('longRun', phase, weekNumber, paces, { distance });

        return {
            day,
            type: 'longRun',
            focus: 'Endurance',
            distance,
            ...workout
        };
    }

    createRaceDay(day, profile) {
        const raceDistance = this.getRaceDistance(profile.raceDistance);
        return {
            day,
            type: 'race',
            name: `🏁 Race Day: ${profile.raceDistance}`,
            description: `Your ${profile.raceDistance} race! Execute your race plan and trust your training.`,
            distance: raceDistance,
            focus: 'Race Day',
            isRaceDay: true
        };
    }

    createBikeWorkout(day, bikeType, isHard, phase, distance, paces, hardSessionIndex = null) {
        const bikeLabel = bikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';
        const runEqMiles = Math.round(distance);

        // EASY BIKE DAY: Simple "Ride X RunEQ miles" - replacement for easy run
        if (!isHard) {
            return {
                day,
                type: 'bike',
                name: `Ride ${runEqMiles} RunEQ Miles`,
                description: `Easy effort on your ${bikeLabel}. Ride until your Garmin shows ${runEqMiles} RunEQ miles.`,
                structure: `Ride at conversational pace until you reach ${runEqMiles} RunEQ miles`,
                equipmentSpecific: true,
                standUpBikeType: bikeType,
                crossTrainingType: 'standUpBike',
                focus: 'Aerobic Base',
                distance: runEqMiles,
                intensity: 'Easy'
            };
        }

        // HARD BIKE DAY: Pull structured workout from library (same type as running would have been)
        // Map running workout rotation to bike categories
        const workoutRotation = this.getHardWorkoutRotation(phase);
        const runningWorkoutType = workoutRotation[hardSessionIndex % workoutRotation.length];

        // Map running type → bike category (these match getWorkoutByDuration's typeMapping)
        const bikeCategoryMap = {
            'tempo': 'TEMPO',
            'intervals': 'INTERVALS',
            'hills': 'HILLS'
        };
        const bikeCategory = bikeCategoryMap[runningWorkoutType] || 'TEMPO';

        // Get structured workout from library
        const workout = LibraryCatalog.getCrossTrainingByDuration('standUpBike', bikeCategory, distance * 10);

        if (workout) {
            return {
                day,
                type: 'bike',
                name: workout.name,
                description: workout.description,
                structure: workout.structure,
                equipmentSpecific: true,
                standUpBikeType: bikeType,
                crossTrainingType: 'standUpBike',
                focus: this.getBikeFocus(runningWorkoutType),
                distance: runEqMiles,
                ...workout
            };
        }

        // Fallback if library doesn't have matching workout
        return {
            day,
            type: 'bike',
            name: `${runningWorkoutType === 'tempo' ? 'Tempo' : runningWorkoutType === 'intervals' ? 'Interval' : 'Power'} ${bikeLabel} Workout`,
            description: `${this.getBikeFocus(runningWorkoutType)} workout on your ${bikeLabel}`,
            equipmentSpecific: true,
            standUpBikeType: bikeType,
            crossTrainingType: 'standUpBike',
            focus: this.getBikeFocus(runningWorkoutType),
            distance: runEqMiles,
            duration: `${Math.round(distance * 10)} minutes`
        };
    }

    getBikeFocus(runningWorkoutType) {
        const focusMap = {
            'tempo': 'Lactate Threshold',
            'intervals': 'VO2 Max & Speed',
            'hills': 'Power & Strength'
        };
        return focusMap[runningWorkoutType] || 'Aerobic Power';
    }

    createCrossTrainingEasy(day, equipment) {
        const workout = LibraryCatalog.getCrossTrainingByDuration(equipment.key, 'EASY', 45);

        if (workout) {
            return {
                day,
                type: 'cross-training',
                crossTrainingType: equipment.key,
                equipmentLabel: equipment.label,
                focus: 'Aerobic Base',
                ...workout
            };
        }

        return {
            day,
            type: 'cross-training',
            name: `Easy ${equipment.label} Session`,
            description: `Easy effort cross-training on ${equipment.label}`,
            crossTrainingType: equipment.key,
            equipmentLabel: equipment.label,
            focus: 'Aerobic Base',
            duration: '30-45 minutes',
            intensity: 'Easy'
        };
    }

    createCrossTrainingHard(day, equipment, phase, hardSessionIndex) {
        // Rotate through TEMPO and INTERVALS for variety
        const types = ['TEMPO', 'INTERVALS'];
        const workoutType = types[hardSessionIndex % types.length];

        const workout = LibraryCatalog.getCrossTrainingByDuration(equipment.key, workoutType, 50);

        if (workout) {
            return {
                day,
                type: 'cross-training',
                crossTrainingType: equipment.key,
                equipmentLabel: equipment.label,
                focus: workoutType === 'TEMPO' ? 'Lactate Threshold' : 'VO2 Max',
                ...workout
            };
        }

        return {
            day,
            type: 'cross-training',
            name: `${workoutType === 'TEMPO' ? 'Threshold' : 'Interval'} ${equipment.label} Session`,
            description: `Hard effort cross-training on ${equipment.label}`,
            crossTrainingType: equipment.key,
            equipmentLabel: equipment.label,
            focus: workoutType === 'TEMPO' ? 'Lactate Threshold' : 'VO2 Max',
            duration: '45-60 minutes',
            intensity: 'Hard'
        };
    }

    createCrossTrainingLong(day, equipment, phase, targetDistance) {
        const durationMinutes = targetDistance * 10; // Approximate conversion
        const runEqMiles = Math.round(targetDistance);
        const workout = LibraryCatalog.getCrossTrainingByDuration(equipment.key, 'LONG', durationMinutes);

        if (workout) {
            return {
                day,
                type: 'cross-training',
                crossTrainingType: equipment.key,
                equipmentLabel: equipment.label,
                focus: 'Endurance',
                distance: runEqMiles, // RunEQ miles for progressive training
                ...workout
            };
        }

        return {
            day,
            type: 'cross-training',
            name: `Long ${equipment.label} Session`,
            description: `Extended cross-training session on ${equipment.label}`,
            crossTrainingType: equipment.key,
            equipmentLabel: equipment.label,
            focus: 'Endurance',
            distance: runEqMiles, // RunEQ miles for progressive training
            duration: `${durationMinutes}-${durationMinutes + 15} minutes`,
            intensity: 'Easy to Moderate'
        };
    }

    generateWalkingWeek({ weekNumber, profile, weekMath, phaseName, restDays, availableDays, longRunDay }) {
        const workouts = [];
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        allDays.forEach(day => {
            if (restDays.includes(day)) {
                workouts.push(this.createRestDay(day));
            } else if (day === longRunDay) {
                workouts.push({
                    day,
                    type: 'walking',
                    name: 'Long Walk',
                    description: 'Extended easy walk for aerobic base building',
                    focus: 'Aerobic Base',
                    duration: '60-90 minutes',
                    intensity: 'Easy'
                });
            } else if (availableDays.includes(day)) {
                workouts.push({
                    day,
                    type: 'walking',
                    name: 'Easy Walk',
                    description: 'Easy walk for recovery and base building',
                    focus: 'Recovery',
                    duration: '30-45 minutes',
                    intensity: 'Easy'
                });
            } else {
                workouts.push(this.createRestDay(day));
            }
        });

        return workouts;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LIBRARY SELECTION HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    selectFromLibrary(workoutType, phase, weekNumber, paces, options = {}) {
        const libraryType = this.mapWorkoutTypeToLibrary(workoutType);

        // Get workout names for this type
        const library = LibraryCatalog.running[libraryType];
        if (!library || !library.workoutLibrary) {
            return { name: `${workoutType} Workout`, description: 'Complete as prescribed' };
        }

        // Collect all workout names from all categories
        const allWorkouts = [];
        for (const [category, workouts] of Object.entries(library.workoutLibrary)) {
            if (Array.isArray(workouts)) {
                workouts.forEach(w => allWorkouts.push({ ...w, category }));
            }
        }

        if (allWorkouts.length === 0) {
            return { name: `${workoutType} Workout`, description: 'Complete as prescribed' };
        }

        // Select workout avoiding recent repeats
        const history = this.workoutHistory[libraryType] || [];
        const available = allWorkouts.filter(w => !history.includes(w.name));
        const selected = available.length > 0
            ? available[weekNumber % available.length]
            : allWorkouts[weekNumber % allWorkouts.length];

        // Track history
        if (!this.workoutHistory[libraryType]) this.workoutHistory[libraryType] = [];
        this.workoutHistory[libraryType].push(selected.name);
        if (this.workoutHistory[libraryType].length > 4) {
            this.workoutHistory[libraryType].shift();
        }

        // Get full workout with pace injection
        try {
            const fullWorkout = LibraryCatalog.getRunningWorkout(libraryType, selected.name, {
                paces: paces?.paces,
                weekNumber,
                ...options
            });

            if (fullWorkout) {
                return fullWorkout;
            }
        } catch (error) {
            logger.warn(`Could not get full workout for ${selected.name}:`, error.message);
        }

        return selected;
    }

    mapWorkoutTypeToLibrary(workoutType) {
        const mapping = {
            'tempo': 'tempo',
            'intervals': 'intervals',
            'hills': 'hills',
            'longRun': 'longRun',
            'long-run': 'longRun'
        };
        return mapping[workoutType] || workoutType;
    }

    getHardWorkoutRotation(phase) {
        // Different workout mix based on training phase
        switch (phase) {
            case 'base':
                return ['tempo', 'hills', 'tempo'];
            case 'build':
                return ['tempo', 'intervals', 'hills'];
            case 'peak':
                return ['intervals', 'tempo', 'intervals'];
            case 'taper':
                return ['tempo', 'intervals'];
            default:
                return ['tempo', 'intervals', 'hills'];
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY METHODS (kept from original)
    // ═══════════════════════════════════════════════════════════════════════════

    resetWorkoutHistory() {
        this.workoutHistory = {
            tempo: [],
            intervals: [],
            hills: [],
            longRun: [],
            crossTraining: {}
        };
    }

    getWorkoutFocus(type) {
        const focusMap = {
            tempo: 'Lactate Threshold',
            intervals: 'VO2 Max & Speed',
            hills: 'Power & Strength',
            longRun: 'Endurance',
            easy: 'Aerobic Base'
        };
        return focusMap[type] || 'General Fitness';
    }

    getWeeklyFocus(phase) {
        const focusMap = {
            base: 'Building aerobic foundation',
            build: 'Increasing training load',
            peak: 'Race-specific sharpening',
            taper: 'Recovery and freshness'
        };
        return focusMap[phase] || 'Consistent training';
    }

    getMotivation(phase, weekNumber, totalWeeks) {
        const remaining = totalWeeks - weekNumber;
        if (remaining <= 1) return 'Race week! Trust your training.';
        if (remaining <= 3) return 'Almost there! Stay focused.';
        if (phase === 'base') return 'Building your foundation. Every mile counts.';
        if (phase === 'build') return 'Getting stronger each week!';
        if (phase === 'peak') return 'Fine-tuning for race day.';
        return 'Keep up the great work!';
    }

    calculateTotalWeeks(startDate, raceDate) {
        const start = new Date(startDate);
        const race = new Date(raceDate);
        const diffTime = race - start;
        const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
        return Math.max(8, diffWeeks);
    }

    calculateWeekDates(weekNumber, startDate) {
        const start = new Date(startDate);
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (weekNumber - 1) * 7);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const formatDate = (date) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]} ${date.getDate()}`;
        };

        return {
            start: weekStart.toISOString().split('T')[0],
            end: weekEnd.toISOString().split('T')[0],
            displayText: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
        };
    }

    calculatePaces(profile) {
        if (profile.recentRaceTime && profile.recentRaceDistance) {
            try {
                const paceData = this.paceCalculator.getPaceData(
                    profile.recentRaceDistance,
                    profile.recentRaceTime
                );
                return {
                    paces: paceData.paces,
                    trackIntervals: paceData.trackIntervals,
                    easy: `${paceData.paces.easy.min}-${paceData.paces.easy.max}/mile`,
                    tempo: `${paceData.paces.threshold.pace}/mile`,
                    interval: `${paceData.paces.interval.pace}/mile`
                };
            } catch (error) {
                logger.warn('Could not calculate paces from race time:', error.message);
            }
        }

        if (profile.currentWeeklyMileage && profile.currentLongRun && profile.raceTime) {
            try {
                const goalPaceData = this.paceCalculator.getPaceData(
                    profile.raceDistance,
                    profile.raceTime
                );
                return {
                    paces: goalPaceData.paces,
                    trackIntervals: goalPaceData.trackIntervals,
                    easy: `${goalPaceData.paces.easy.min}-${goalPaceData.paces.easy.max}/mile`,
                    tempo: `${goalPaceData.paces.threshold.pace}/mile`,
                    interval: `${goalPaceData.paces.interval.pace}/mile`
                };
            } catch (error) {
                logger.warn('Could not calculate paces from goal:', error.message);
            }
        }

        return {
            easy: '11:30-12:30/mile',
            tempo: '9:50-10:10/mile',
            interval: '9:00-9:20/mile',
            paces: {
                easy: { min: '11:30', max: '12:30' },
                threshold: { pace: '9:50' },
                interval: { pace: '9:00' }
            }
        };
    }

    getRaceDistance(raceDistance) {
        const distances = {
            '5K': 3.1,
            '10K': 6.2,
            'Half Marathon': 13.1,
            'Half': 13.1,
            'Marathon': 26.2
        };
        return distances[raceDistance] || 13.1;
    }

    validateProfile(profile) {
        const required = [
            'raceDistance',
            'raceDate',
            'startDate',
            'currentWeeklyMileage',
            'currentLongRun',
            'availableDays',
            'longRunDay'
        ];

        const missing = required.filter(field => !profile[field]);
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
    }
}

export default new TrainingPlanService();
