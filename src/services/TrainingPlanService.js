/**
 * TrainingPlanService - Deterministic Plan Structure Generator
 * 
 * This service generates training plan STRUCTURE deterministically using:
 * - PlanMathCalculator: Periodization math (mileage progression)
 * - TrainingPlanGenerator: Workout assignment and schedule compliance
 * 
 * AI is NOT involved in structure generation - only coaching text.
 * 
 * Architecture:
 * 1. Code generates plan structure (this service)
 * 2. AI adds coaching personality (TrainingPlanAIService)
 */

import { TrainingPlanGenerator } from '../lib/training-plan-generator.js';
import { generatePlanMath } from '../lib/plan-math/index.js';
import { PaceCalculator } from '../lib/pace-calculator.js';
import phaseCalculator from './ai/PhaseCalculator.js';
import logger from '../utils/logger.js';

class TrainingPlanService {
    constructor() {
        this.planGenerator = new TrainingPlanGenerator();
        this.paceCalculator = new PaceCalculator();
        this.currentProfile = null; // Store profile for helper methods
        
        // Initialize workout history for the generator (needed for workout selection)
        if (!this.planGenerator.workoutHistory) {
            this.planGenerator.workoutHistory = {
                intervals: [],
                tempo: [],
                hills: []
            };
        }
    }

    /**
     * Generate complete training plan structure deterministically
     * 
     * @param {Object} userProfile - User profile from onboarding
     * @returns {Object} Complete plan structure with weeks array
     */
    generatePlanStructure(userProfile) {
        logger.log('🏗️ Generating deterministic plan structure...');
        
        // Validate required fields - NO DEFAULTS
        this.validateProfile(userProfile);
        
        // CRITICAL: Reset workout history at start of plan generation for variety
        // This ensures each new plan starts fresh and avoids repetition
        this.planGenerator.workoutHistory = {
            intervals: [],
            tempo: [],
            hills: [],
            longRuns: [],
            easyRuns: [],
            bikeWorkouts: [] // Track bike workout variety
        };
        logger.log('  ✅ Workout history reset for variety tracking');
        
        // Calculate total weeks
        const totalWeeks = this.calculateTotalWeeks(userProfile.startDate, userProfile.raceDate);
        logger.log(`  Total weeks: ${totalWeeks}`);
        
        // Generate periodization math (deterministic mileage progression)
        const planMath = generatePlanMath({
            currentWeeklyMileage: userProfile.currentWeeklyMileage,
            currentLongRun: userProfile.currentLongRun,
            totalWeeks: totalWeeks,
            raceDistance: userProfile.raceDistance,
            experienceLevel: userProfile.experienceLevel || 'intermediate'
        });
        
        logger.log(`  Peak mileage: ${planMath.targets.peakWeeklyMileage} mpw`);
        logger.log(`  Long run max: ${planMath.targets.longRunMax} miles`);
        
        // Get phase plan
        const phasePlan = phaseCalculator.getPhasePlan(totalWeeks);
        
        // Calculate paces
        const paces = this.calculatePaces(userProfile);
        
        // Generate week-by-week structure
        const weeks = [];
        for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
            const weekMath = planMath.weeks.find(w => w.weekNumber === weekNum);
            const week = this.generateWeek(
                weekNum,
                userProfile,
                planMath,
                weekMath,
                phasePlan,
                paces,
                totalWeeks
            );
            weeks.push(week);
        }
        
        // Build plan overview
        const planOverview = {
            startDate: userProfile.startDate,
            raceDate: userProfile.raceDate,
            totalWeeks: totalWeeks,
            raceDistance: userProfile.raceDistance,
            goalTime: userProfile.raceTime,
            trainingPhilosophy: userProfile.trainingPhilosophy || 'practical_periodization',
            phasePlan: phasePlan
        };
        
        logger.log('✅ Plan structure generated deterministically');
        
        return {
            planOverview,
            weeks,
            _planMathTargets: planMath.targets,
            _planMath: planMath // Store for reference
        };
    }

    /**
     * Generate a single week's structure
     */
    generateWeek(weekNumber, profile, planMath, weekMath, phasePlan, paces, totalWeeks) {
        const currentPhase = phasePlan.find(p => 
            weekNumber >= p.startWeek && weekNumber <= p.endWeek
        );
        
        // PhaseCalculator returns capitalized phase names ('Base', 'Build'), but workout libraries expect lowercase
        const phaseName = currentPhase ? currentPhase.phase.toLowerCase() : 'base';
        const phase = { phase: phaseName }; // Format expected by workout libraries
        
        // Get workouts for each day based on schedule
        const workouts = this.generateWeekWorkouts(
            weekNumber,
            profile,
            weekMath,
            phasePlan,
            totalWeeks
        );
        
        // Calculate week dates
        const weekDates = this.calculateWeekDates(weekNumber, profile.startDate);
        
        return {
            weekNumber,
            totalMileage: weekMath.weeklyMileage,
            workouts,
            phase: phaseName, // Store as string for display
            weeklyFocus: this.getWeeklyFocus(phaseName),
            motivation: this.getMotivation(phaseName, weekNumber, totalWeeks),
            weekDates
        };
    }

    /**
     * Generate workouts for a week based on user schedule
     */
    generateWeekWorkouts(weekNumber, profile, weekMath, phasePlan, totalWeeks) {
        const workouts = [];
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        // Store profile for helper methods
        this.currentProfile = profile;

        // CRITICAL: Check if user is in cross-training only mode (injured/can't run)
        const isCrossTrainingOnly = profile.runningStatus === 'crossTrainingOnly';
        if (isCrossTrainingOnly) {
            logger.log(`  🚴 Week ${weekNumber}: CROSS-TRAINING ONLY mode (no running workouts)`);
        }

        // Get current phase (convert to lowercase for workout libraries)
        const phaseBlock = phasePlan.find(p =>
            weekNumber >= p.startWeek && weekNumber <= p.endWeek
        );
        const currentPhase = phaseBlock ? { phase: phaseBlock.phase.toLowerCase() } : { phase: 'base' };

        // Get schedule from profile
        const restDays = profile.restDays || [];
        const availableDays = profile.availableDays || [];
        const qualityDays = profile.qualityDays || profile.hardSessionDays || [];
        const longRunDay = profile.longRunDay || 'Sunday';
        const preferredBikeDays = profile.preferredBikeDays || [];
        const standUpBikeType = profile.standUpBikeType;
        
        // Calculate which days are actually in this week (for partial weeks)
        const weekDates = this.calculateWeekDates(weekNumber, profile.startDate);
        const weekStartDate = new Date(weekDates.start);
        const weekEndDate = new Date(weekDates.end);
        const startDayOfWeek = weekStartDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Map day names to day indices (Monday = 1, Sunday = 0)
        const dayToIndex = {
            'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
            'Thursday': 4, 'Friday': 5, 'Saturday': 6
        };
        const indexToDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // For Week 1, only include days from startDate onwards (including Sunday if in same week)
        const daysInWeek = weekNumber === 1 
            ? allDays.filter(day => {
                const dayIndex = dayToIndex[day];
                const startDayIndex = weekStartDate.getDay();
                // Include days from start day to Saturday, and always include Sunday (index 0) if start is not Sunday
                if (startDayIndex === 0) {
                    // Week starts on Sunday, only include Sunday
                    return dayIndex === 0;
                } else {
                    // Week starts Mon-Sat, include from start day to Sunday (0)
                    return dayIndex >= startDayIndex || dayIndex === 0;
                }
            })
            : allDays; // Full weeks use all 7 days
        
        // Calculate workout distances
        const longRunDistance = weekMath.longRun;
        const remainingMileage = weekMath.weeklyMileage - longRunDistance;
        
        // Count ALL workout days (running + bike) that are actually in this week
        // This ensures proper mileage distribution, especially for partial weeks
        const runningDays = daysInWeek.filter(day =>
            availableDays.includes(day) &&
            !restDays.includes(day) &&
            !preferredBikeDays.includes(day) &&
            day !== longRunDay &&
            qualityDays.includes(day) // Quality days are running workouts
        );
        
        const easyRunDays = daysInWeek.filter(day =>
            availableDays.includes(day) &&
            !restDays.includes(day) &&
            !preferredBikeDays.includes(day) &&
            day !== longRunDay &&
            !qualityDays.includes(day) // Easy run days
        );
        
        const bikeDays = daysInWeek.filter(day =>
            availableDays.includes(day) &&
            !restDays.includes(day) &&
            preferredBikeDays.includes(day) &&
            day !== longRunDay
        );
        
        // Total workout count includes running days AND bike days (both count towards mileage distribution)
        // But exclude long run day from the count since it has its own distance
        const totalWorkoutCount = runningDays.length + easyRunDays.length + bikeDays.length;
        const avgRunningDistance = totalWorkoutCount > 0 ? remainingMileage / totalWorkoutCount : 0;
        
        // Track hard session index for workout rotation
        let hardSessionIndex = 0;
        
        // Generate workout for each day (only process days that are in this week)
        allDays.forEach(day => {
            // For Week 1, skip days before the start date (but always include Sunday)
            if (weekNumber === 1) {
                const dayIndex = dayToIndex[day];
                const startDayIndex = weekStartDate.getDay();
                if (startDayIndex === 0) {
                    // Week starts on Sunday, only process Sunday
                    if (dayIndex !== 0) return;
                } else {
                    // Week starts Mon-Sat, skip days before start, but always include Sunday
                    if (dayIndex < startDayIndex && dayIndex !== 0) {
                        // Day is before start date (and not Sunday), skip it
                        return;
                    }
                }
            }
            if (restDays.includes(day)) {
                workouts.push(this.createRestWorkout(day));
            } else if (day === longRunDay) {
                // Race week always gets race day (even in cross-training only mode - goal is to race!)
                const isRaceWeek = weekNumber === totalWeeks;
                if (isRaceWeek) {
                    // Race day - always show regardless of running status
                    workouts.push(this.createLongRunWorkout(
                        day,
                        longRunDistance,
                        true, // isRaceWeek
                        profile,
                        currentPhase,
                        weekNumber,
                        totalWeeks
                    ));
                } else if (isCrossTrainingOnly && standUpBikeType) {
                    // CRITICAL: In cross-training only mode, replace long run with long bike ride
                    workouts.push(this.createBikeWorkout(
                        day,
                        standUpBikeType,
                        true, // isHardDay - long sessions are quality sessions
                        weekMath,
                        currentPhase,
                        weekNumber,
                        totalWeeks,
                        hardSessionIndex,
                        longRunDistance // Use long run distance for the bike workout
                    ));
                    hardSessionIndex++;
                } else if (isCrossTrainingOnly) {
                    // Cross-training only but no bike - rest day (can't run)
                    workouts.push(this.createRestWorkout(day));
                } else {
                    // Normal mode - running long run
                    workouts.push(this.createLongRunWorkout(
                        day,
                        longRunDistance,
                        false, // not race week
                        profile,
                        currentPhase,
                        weekNumber,
                        totalWeeks
                    ));
                }
            } else if (preferredBikeDays.includes(day) && standUpBikeType) {
                // Bike day - check if it's also a quality day
                const isHardBikeDay = qualityDays.includes(day);
                if (isHardBikeDay) {
                    // Hard bike day - increment hard session index
                    workouts.push(this.createBikeWorkout(
                        day,
                        standUpBikeType,
                        true, // isHardDay
                        weekMath,
                        currentPhase,
                        weekNumber,
                        totalWeeks,
                        hardSessionIndex,
                        avgRunningDistance
                    ));
                    hardSessionIndex++; // Increment for next hard session
                } else {
                    // Easy bike day - use library for variety
                    workouts.push(this.createBikeWorkout(
                        day,
                        standUpBikeType,
                        false, // isHardDay
                        weekMath,
                        currentPhase,
                        weekNumber,
                        totalWeeks,
                        0, // hardSessionIndex (not used for easy days)
                        avgRunningDistance
                    ));
                }
            } else if (qualityDays.includes(day)) {
                // CRITICAL: In cross-training only mode, replace hard runs with hard bike workouts
                if (isCrossTrainingOnly && standUpBikeType) {
                    workouts.push(this.createBikeWorkout(
                        day,
                        standUpBikeType,
                        true, // isHardDay
                        weekMath,
                        currentPhase,
                        weekNumber,
                        totalWeeks,
                        hardSessionIndex,
                        avgRunningDistance
                    ));
                    hardSessionIndex++;
                } else if (isCrossTrainingOnly) {
                    // Cross-training only but no bike - rest day (can't run)
                    workouts.push(this.createRestWorkout(day));
                } else {
                    // Normal mode - hard running day
                    workouts.push(this.createHardRunWorkout(
                        day,
                        avgRunningDistance,
                        currentPhase,
                        weekNumber,
                        totalWeeks,
                        profile,
                        hardSessionIndex
                    ));
                    hardSessionIndex++; // Increment for next hard day
                }
            } else if (availableDays.includes(day)) {
                // CRITICAL: In cross-training only mode, replace easy runs with easy bike workouts
                if (isCrossTrainingOnly && standUpBikeType) {
                    workouts.push(this.createBikeWorkout(
                        day,
                        standUpBikeType,
                        false, // isHardDay (easy day)
                        weekMath,
                        currentPhase,
                        weekNumber,
                        totalWeeks,
                        0,
                        avgRunningDistance
                    ));
                } else if (isCrossTrainingOnly) {
                    // Cross-training only but no bike - rest day (can't run)
                    workouts.push(this.createRestWorkout(day));
                } else {
                    // Normal mode - easy run day
                    workouts.push(this.createEasyRunWorkout(day, avgRunningDistance));
                }
            } else {
                // Not an available day - rest
                workouts.push(this.createRestWorkout(day));
            }
        });
        
        return workouts;
    }

    /**
     * Create rest day workout
     */
    createRestWorkout(day) {
        return {
            day,
            type: 'rest',
            name: 'Rest',
            description: 'Rest',
            distance: 0,
            focus: 'Recovery',
            workout: { name: 'Rest', description: 'Rest' },
            metadata: { aiGenerated: false, deterministic: true }
        };
    }

    /**
     * Create long run workout
     */
    createLongRunWorkout(day, distance, isRaceWeek, profile, phase, weekNumber, totalWeeks) {
        if (isRaceWeek) {
            // Race day - calculate correct distance
            const raceDistance = this.getRaceDistance(profile.raceDistance);
            return {
                day,
                type: 'race',
                name: `🏁 Race Day: ${profile.raceDistance}`,
                description: `Race Day - ${profile.raceDistance}`,
                distance: raceDistance,
                focus: 'Race Day',
                workout: { 
                    name: `🏁 Race Day: ${profile.raceDistance}`, 
                    description: `Your ${profile.raceDistance} race! Execute your race plan and trust your training.` 
                },
                metadata: { 
                    isRaceDay: true, 
                    raceDistance: profile.raceDistance,
                    goalTime: profile.raceTime,
                    aiGenerated: false, 
                    deterministic: true 
                }
            };
        }
        
        // Use library to select appropriate long run workout
        const paces = this.calculatePaces(profile);
        const paceData = paces.paces || paces;
        
        // selectLongRunWorkout expects phase object with .phase property
        const phaseObj = typeof phase === 'string' ? { phase } : phase;
        
        const longRunWorkout = this.planGenerator.selectLongRunWorkout(
            phaseObj,
            distance,
            0, // runEqPreference
            paceData
        );
        
        return {
            day,
            type: 'longRun',
            name: longRunWorkout.name || `Long Run ${distance} miles`,
            description: longRunWorkout.description || `Long Run ${distance} miles`,
            distance: distance,
            focus: 'Endurance',
            workout: longRunWorkout,
            metadata: { 
                workoutId: longRunWorkout.workoutId,
                aiGenerated: false, 
                deterministic: true 
            }
        };
    }

    /**
     * Create bike workout
     * FULL LIBRARY INTEGRATION: All bike workouts come from StandUpBikeWorkoutLibrary
     * Uses prescribeStandUpBikeWorkout to get rich workout details with biomechanical notes
     */
    createBikeWorkout(day, bikeType, isHardDay, weekMath, phase, weekNumber, totalWeeks, hardSessionIndex = 0, avgRunningDistance = 4) {
        const library = this.planGenerator.standUpBikeLibrary;
        const targetDistance = Math.round(avgRunningDistance);
        
        let category;
        let focus;
        
        if (isHardDay) {
            // Hard bike day: Rotate TEMPO_BIKE, INTERVAL_BIKE, POWER_RESISTANCE
            const hardCategories = ['TEMPO_BIKE', 'INTERVAL_BIKE', 'POWER_RESISTANCE'];
            category = hardCategories[hardSessionIndex % hardCategories.length];
            focus = category === 'TEMPO_BIKE' ? 'Lactate Threshold' : 'Speed & Power';
        } else {
            // Easy bike day: Rotate AEROBIC_BASE, RECOVERY_SPECIFIC
            const easyCategories = ['AEROBIC_BASE', 'RECOVERY_SPECIFIC'];
            category = easyCategories[weekNumber % easyCategories.length];
            focus = 'Cross-Training';
        }
        
        // Get workouts from library for this category
        const allWorkouts = library.workoutLibrary[category] || [];
        const availableWorkouts = allWorkouts.filter(w =>
            w.equipment === bikeType || w.equipment === "both"
        );
        
        if (availableWorkouts.length === 0) {
            // Fallback: try other categories of same intensity
            const fallbackCategories = isHardDay 
                ? ['TEMPO_BIKE', 'INTERVAL_BIKE', 'POWER_RESISTANCE']
                : ['AEROBIC_BASE', 'RECOVERY_SPECIFIC'];
            
            for (const fallbackCategory of fallbackCategories) {
                if (fallbackCategory === category) continue;
                const fallbackWorkouts = (library.workoutLibrary[fallbackCategory] || []).filter(w =>
                    w.equipment === bikeType || w.equipment === "both"
                );
                if (fallbackWorkouts.length > 0) {
                    const selectedWorkout = this.planGenerator.selectWorkoutAvoidingRepetition(fallbackWorkouts, 'bikeWorkouts');
                    const prescribedWorkout = library.prescribeStandUpBikeWorkout(
                        selectedWorkout.name,
                        bikeType,
                        { targetDistance, hasGarmin: true }
                    );
                    
                    return {
                        day,
                        type: 'bike',
                        name: prescribedWorkout.name, // Use library-formatted name (e.g., "4 RunEQ Miles - Conversational Pace Cruise")
                        description: prescribedWorkout.description, // Use library description with full details
                        distance: targetDistance,
                        focus: focus,
                        workout: prescribedWorkout, // Pass full prescribed workout object
                        metadata: { 
                            aiGenerated: false, 
                            deterministic: true,
                            equipmentSpecific: true,
                            bikeWorkoutType: isHardDay ? 'hard' : 'easy',
                            category: fallbackCategory
                        }
                    };
                }
            }
            
            // Ultimate fallback: generic workout if library is empty
            logger.warn(`No ${category} workouts available for ${bikeType}, using generic fallback`);
            return {
                day,
                type: 'bike',
                name: `Ride ${targetDistance} RunEQ miles`,
                description: `Ride ${targetDistance} RunEQ miles on your ${bikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'} (${isHardDay ? 'hard' : 'easy'} effort)`,
                distance: targetDistance,
                focus: focus,
                workout: {
                    name: `Ride ${targetDistance} RunEQ miles`,
                    description: `Ride ${targetDistance} RunEQ miles on your ${bikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'}`
                },
                metadata: { 
                    aiGenerated: false, 
                    deterministic: true,
                    equipmentSpecific: true,
                    bikeWorkoutType: isHardDay ? 'hard' : 'easy',
                    fallback: true
                }
            };
        }
        
        // Select workout with variety tracking
        const selectedWorkout = this.planGenerator.selectWorkoutAvoidingRepetition(availableWorkouts, 'bikeWorkouts');
        
        // Prescribe the workout (formats name with distance, adds equipment-specific notes)
        const prescribedWorkout = library.prescribeStandUpBikeWorkout(
            selectedWorkout.name,
            bikeType,
            { targetDistance, hasGarmin: true }
        );
        
        return {
            day,
            type: 'bike',
            name: prescribedWorkout.name, // Use library-formatted name (e.g., "4 RunEQ Miles - Sustained Threshold Effort")
            description: prescribedWorkout.description, // Use library description with full details
            distance: targetDistance,
            focus: focus,
            workout: prescribedWorkout, // Pass full prescribed workout object with all biomechanical notes
            metadata: { 
                aiGenerated: false, 
                deterministic: true,
                equipmentSpecific: true,
                bikeWorkoutType: isHardDay ? 'hard' : 'easy',
                category: category
            }
        };
    }

    /**
     * Create hard running workout
     */
    createHardRunWorkout(day, distance, phase, weekNumber, totalWeeks, profile, hardSessionIndex) {
        // Select workout type based on phase, week, AND hard session index (for variety within week)
        const workoutType = this.selectHardWorkoutType(phase, weekNumber, hardSessionIndex);
        
        // Use library to select appropriate workout
        const paces = this.calculatePaces(profile);
        const paceData = paces.paces || paces;
        
        // selectQualityWorkout expects phase object with .phase property
        const phaseObj = typeof phase === 'string' ? { phase } : phase;
        
        const qualityWorkout = this.planGenerator.selectQualityWorkout(
            workoutType,
            phaseObj,
            distance,
            0, // runEqPreference
            paceData,
            weekNumber,
            totalWeeks
        );
        
        return {
            day,
            type: workoutType,
            name: qualityWorkout.name || `${this.getWorkoutTypeName(workoutType)} ${distance} miles`,
            description: qualityWorkout.description || `${this.getWorkoutTypeName(workoutType)} ${distance} miles`,
            distance: distance,
            focus: this.getWorkoutFocus(workoutType),
            workout: qualityWorkout,
            metadata: { 
                workoutId: qualityWorkout.workoutId,
                aiGenerated: false, 
                deterministic: true 
            }
        };
    }

    /**
     * Create easy run workout
     */
    createEasyRunWorkout(day, distance) {
        return {
            day,
            type: 'easy',
            name: `Easy Run ${distance} miles`,
            description: `Easy Run ${distance} miles`,
            distance: distance,
            focus: 'Aerobic Base',
            workout: {
                name: `Easy Run ${distance} miles`,
                description: `Easy Run ${distance} miles`
            },
            metadata: { aiGenerated: false, deterministic: true }
        };
    }

    /**
     * Select hard workout type based on phase, week, and hard session index
     * This ensures variety both across weeks AND within a week (if multiple hard days)
     */
    selectHardWorkoutType(phase, weekNumber, hardSessionIndex = 0) {
        // Base rotation pattern for the week (primary workout type)
        const weekCycle = weekNumber % 3;
        
        // Within-week rotation (if multiple hard days, alternate types)
        const sessionOffset = hardSessionIndex % 3;
        
        // Combine week cycle and session offset for variety
        const combinedCycle = (weekCycle + sessionOffset) % 3;
        
        if (phase === 'base') {
            // Base phase: More tempo and hills, less intervals
            const baseTypes = ['tempo', 'hills', 'intervals'];
            return baseTypes[combinedCycle];
        } else if (phase === 'build' || phase === 'peak') {
            // Build/Peak: More intervals and tempo, hills for strength
            const buildTypes = ['intervals', 'tempo', 'hills'];
            return buildTypes[combinedCycle];
        } else {
            // Taper: Mostly tempo, occasional intervals
            return combinedCycle === 0 ? 'tempo' : 'intervals';
        }
    }

    /**
     * Get workout type display name
     */
    getWorkoutTypeName(type) {
        const names = {
            tempo: 'Tempo Run',
            intervals: 'Interval Run',
            hills: 'Hill Repeats',
            easy: 'Easy Run'
        };
        return names[type] || 'Run';
    }

    /**
     * Get workout focus
     */
    getWorkoutFocus(type) {
        const focuses = {
            tempo: 'Lactate Threshold',
            intervals: 'Speed & VO2 Max',
            hills: 'Strength & Power',
            easy: 'Aerobic Base'
        };
        return focuses[type] || 'Aerobic Base';
    }

    /**
     * Get weekly focus based on phase
     */
    getWeeklyFocus(phase) {
        const focuses = {
            base: 'Aerobic foundation & durability',
            build: 'Strength & speed development',
            peak: 'Race-specific sharpening',
            taper: 'Freshen up & execute'
        };
        return focuses[phase] || 'Training';
    }

    /**
     * Get motivation message
     */
    getMotivation(phase, weekNumber, totalWeeks) {
        if (weekNumber === totalWeeks) {
            return 'Visualize success - you\'ve earned this 💫';
        }
        const messages = {
            base: 'Consistency right now builds race-day confidence 💪',
            build: 'This phase teaches you to love the grind 🔁',
            peak: 'Trust your legs - they know what to do 👣',
            taper: 'Nothing new. Stay sharp, stay calm 🎯'
        };
        return messages[phase] || 'Keep showing up 🏃';
    }

    /**
     * Calculate total weeks between start and race date
     */
    calculateTotalWeeks(startDate, raceDate) {
        const start = new Date(startDate);
        const race = new Date(raceDate);
        const diffTime = race - start;
        const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
        return Math.max(8, diffWeeks); // Minimum 8 weeks
    }

    /**
     * Calculate week dates
     */
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

    /**
     * Calculate paces from profile
     */
    calculatePaces(profile) {
        // Use PaceCalculator to get paces from recent race time
        if (profile.recentRaceTime && profile.recentRaceDistance) {
            try {
                // Use getPaceData to get paces from race time
                const paceData = this.paceCalculator.getPaceData(
                    profile.recentRaceDistance,
                    profile.recentRaceTime
                );
                
                // Format for workout library consumption
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
        
        // Fallback if no recent race - estimate from current fitness
        if (profile.currentWeeklyMileage && profile.currentLongRun) {
            try {
                const estimatedVDOT = this.paceCalculator.estimateCurrentVDOT(
                    profile.currentLongRun,
                    profile.currentWeeklyMileage
                );
                // Use goal race distance for pace calculation
                const goalPaceData = this.paceCalculator.getPaceData(
                    profile.raceDistance,
                    profile.raceTime || '2:00:00' // Fallback goal time
                );
                return {
                    paces: goalPaceData.paces,
                    trackIntervals: goalPaceData.trackIntervals,
                    easy: `${goalPaceData.paces.easy.min}-${goalPaceData.paces.easy.max}/mile`,
                    tempo: `${goalPaceData.paces.threshold.pace}/mile`,
                    interval: `${goalPaceData.paces.interval.pace}/mile`
                };
            } catch (error) {
                logger.warn('Could not estimate paces:', error.message);
            }
        }
        
        // Final fallback - generic paces
        return {
            easy: '11:30-12:30/mile',
            tempo: '9:50-10:10/mile',
            interval: '9:00-9:20/mile',
            paces: {
                easy: { min: '11:30', max: '12:30' },
                threshold: { pace: '9:50' },
                interval: { pace: '9:00' }
            },
            trackIntervals: {
                threshold: {},
                interval: {}
            }
        };
    }

    /**
     * Get race distance in miles
     */
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

    /**
     * Validate profile - NO DEFAULTS
     */
    validateProfile(profile) {
        const required = [
            'raceDistance',
            'raceTime',
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

