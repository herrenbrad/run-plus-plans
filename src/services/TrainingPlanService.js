/**
 * Service to connect UI onboarding data to the core training plan generator
 */

// Import the working workout libraries from lib directory
import { TempoWorkoutLibrary } from '../lib/tempo-workout-library.js';
import { IntervalWorkoutLibrary } from '../lib/interval-workout-library.js';
import { HillWorkoutLibrary } from '../lib/hill-workout-library.js';
import { LongRunWorkoutLibrary } from '../lib/long-run-workout-library.js';
import { TrainingPlanGenerator } from '../lib/training-plan-generator.js';
import BrickWorkoutService from './brickWorkoutService.js';

class TrainingPlanService {
    constructor() {
        // Initialize the main training plan generator
        this.trainingPlanGenerator = new TrainingPlanGenerator();

        // Initialize workout libraries for fallback
        this.tempoLibrary = new TempoWorkoutLibrary();
        this.intervalLibrary = new IntervalWorkoutLibrary();
        this.hillLibrary = new HillWorkoutLibrary();
        this.longRunLibrary = new LongRunWorkoutLibrary();
        this.brickWorkoutService = new BrickWorkoutService();

        // Plan templates - now using TrainingPlanGenerator's templates
        this.planTemplates = {
            "5K": { weeks: 8, focusAreas: ["speed", "vo2max"] },
            "10K": { weeks: 10, focusAreas: ["vo2max", "lactateThreshold"] },
            "Half": { weeks: 12, focusAreas: ["lactateThreshold", "endurance"] },
            "Marathon": { weeks: 16, focusAreas: ["endurance", "lactateThreshold"] }
        };
    }

    /**
     * Convert onboarding form data to training plan generator options
     */
    convertOnboardingToOptions(formData) {
        // Parse race time from the form format "10K-70:00" or "Marathon-3:45:00"
        const { distance, time } = this.parseRaceTimeWithDistance(formData.currentRaceTime);

        // Convert experience level to runEqPreference
        const runEqPreference = this.calculateRunEqPreference(formData);

        // Calculate weeks available if start and race dates provided
        let weeksAvailable = null;
        if (formData.startDate && formData.raceDate) {
            const msPerWeek = 7 * 24 * 60 * 60 * 1000;
            weeksAvailable = Math.ceil((new Date(formData.raceDate) - new Date(formData.startDate)) / msPerWeek);
        }

        console.log('🔍 Converting onboarding to options:');
        console.log('  currentRaceTime:', formData.currentRaceTime);
        console.log('  parsedDistance:', distance);
        console.log('  parsedTime:', time);
        console.log('  currentWeeklyMileage:', formData.currentWeeklyMileage);
        console.log('  currentLongRunDistance:', formData.currentLongRunDistance);
        console.log('  availableDays:', formData.availableDays);
        console.log('  hardSessionDays:', formData.hardSessionDays);
        console.log('  longRunDay:', formData.longRunDay);
        console.log('  preferredBikeDays:', formData.preferredBikeDays);

        return {
            raceDistance: formData.raceDistance, // Goal race distance (e.g., "Half")
            currentRaceDistance: distance,        // Current fitness distance (e.g., "10K")
            raceTime: time,                       // Goal race time (e.g., "2:00:00")
            raceDate: formData.raceDate,          // Race date for final week "Race Day" workout
            currentPaces: null, // Will calculate from raceTime
            runsPerWeek: formData.runsPerWeek,
            runEqPreference: runEqPreference,
            weeksAvailable: weeksAvailable,
            experienceLevel: formData.experienceLevel,
            standUpBikeType: formData.standUpBikeType,
            runningStatus: formData.runningStatus || 'active', // 'active', 'bikeOnly', or 'transitioning'
            // CURRENT FITNESS - critical for pace progression calculation
            currentWeeklyMileage: parseInt(formData.currentWeeklyMileage) || null,
            currentLongRunDistance: parseInt(formData.currentLongRunDistance) || null,
            // USER SCHEDULE INPUTS - pass to generator
            availableDays: formData.availableDays,
            hardSessionDays: formData.hardSessionDays,
            longRunDay: formData.longRunDay,
            preferredBikeDays: formData.preferredBikeDays
        };
    }

    /**
     * Parse race time from "Distance-Time" format
     * Returns both distance and time
     */
    parseRaceTimeWithDistance(raceTimeString) {
        if (!raceTimeString) return { distance: null, time: null };

        const parts = raceTimeString.split('-');
        if (parts.length !== 2) return { distance: null, time: null };

        return {
            distance: parts[0], // e.g., "10K" or "Marathon"
            time: parts[1]      // e.g., "70:00" or "3:45:00"
        };
    }

    /**
     * Parse race time from "Distance-Time" format
     * DEPRECATED: Use parseRaceTimeWithDistance instead
     */
    parseRaceTime(raceTimeString) {
        if (!raceTimeString) return null;

        const parts = raceTimeString.split('-');
        if (parts.length !== 2) return null;

        return parts[1]; // Return just the time part "3:45:00"
    }

    /**
     * Calculate RunEQ preference based on user choices
     */
    calculateRunEqPreference(formData) {
        // Base preference on equipment and training days
        let preference = 0;
        
        // If they have stand-up bike equipment, increase preference
        if (formData.standUpBikeType) {
            preference += 30; // Base bike preference
            
            // More days = more opportunity for bike integration
            if (formData.runsPerWeek >= 5) {
                preference += 20;
            }
            if (formData.runsPerWeek >= 6) {
                preference += 20;
            }
        }

        // Experience level affects integration comfort
        if (formData.experienceLevel === 'advanced' || formData.experienceLevel === 'elite') {
            preference += 10;
        }

        return Math.min(preference, 80); // Cap at 80% max bike integration
    }

    /**
     * Generate a complete training plan from onboarding data
     */
    async generatePlanFromOnboarding(formData) {
        try {
            console.log('Generating training plan for:', formData);

            // Convert onboarding data to TrainingPlanGenerator options
            const generatorOptions = this.convertOnboardingToOptions(formData);

            // Use the proper TrainingPlanGenerator
            const generatedPlan = this.trainingPlanGenerator.generateTrainingPlan(generatorOptions);

            console.log('✅ TrainingPlanGenerator created plan with', generatedPlan.weeks.length, 'weeks');

            const trainingPlan = {
                planOverview: {
                    raceDistance: formData.raceDistance,
                    raceTime: formData.currentRaceTime,
                    totalWeeks: generatedPlan.planOverview.totalWeeks,
                    runsPerWeek: formData.runsPerWeek,
                    standUpBikeType: formData.standUpBikeType,
                    runningStatus: formData.runningStatus || 'active',
                    experienceLevel: formData.experienceLevel,
                    runEqPreference: this.calculateRunEqPreference(formData),
                    startDate: formData.startDate,
                    raceDate: formData.raceDate,
                    trainingPhilosophy: formData.trainingPhilosophy || 'Zone-Based Training'
                },
                weeks: generatedPlan.weeks,
                trainingPaces: generatedPlan.trainingPaces,
                periodization: generatedPlan.periodization,
                planSummary: {
                    ...generatedPlan.planSummary,
                    workoutVariety: "80+ different workouts with proper periodization",
                    equipmentIntegration: formData.standUpBikeType ? `${formData.standUpBikeType} specific with smart brick integration` : "Running focused with optional equipment integration",
                    coachingPhilosophy: "Research-based training with 4 ways to complete every workout",
                    runeqAdvantage: "Every workout offers 4 ways to complete it - pure running, brick combinations, mixed segments, or full equipment",
                    ageBasedGuidance: this.getAgeBasedGuidance(formData),
                    flexibilityMessage: "Remember: it's pretty much impossible to follow any plan exactly - life gets in the way, and that's completely okay. This serves as your guide that you can build around your life."
                }
            };

            return {
                success: true,
                plan: trainingPlan,
                userProfile: formData
            };
        } catch (error) {
            console.error('Error generating training plan:', error);
            return {
                success: false,
                error: error.message,
                plan: this.generateFallbackPlan(formData)
            };
        }
    }

    /**
     * Generate weeks of training
     */
    generateWeeks(template, formData, actualWeeks = null) {
        const weeks = [];
        const totalWeeks = actualWeeks || template.weeks;
        
        for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
            const workouts = this.generateWeekWorkouts(weekNumber, template, formData, totalWeeks);
            const weekDates = this.getWeekDateRange(formData.startDate, weekNumber);
            
            weeks.push({
                week: weekNumber,
                weekDates: weekDates,
                phase: this.getPhase(weekNumber, totalWeeks),
                totalMileage: this.calculateWeeklyMileage(weekNumber, template, formData),
                workouts: workouts,
                isRestWeek: weekNumber % 4 === 0 && weekNumber < totalWeeks - 2,
                coachingNote: this.generateCoachingNote(weekNumber, template, formData),
                weeklyFocus: this.getWeeklyFocus(weekNumber, totalWeeks),
                motivation: this.getWeeklyMotivation(weekNumber, totalWeeks)
            });
        }
        
        return weeks;
    }

    /**
     * Get date range for a specific training week
     * FIXED: Handles mid-week start dates properly - Week 1 can be partial
     */
    getWeekDateRange(startDate, weekNumber) {
        if (!startDate) {
            return {
                start: `Week ${weekNumber}`,
                end: `Week ${weekNumber}`,
                displayText: `Week ${weekNumber}`
            };
        }

        const start = new Date(startDate);

        if (weekNumber === 1) {
            // Week 1 special handling - start on actual start date, end on Sunday
            const actualStart = new Date(start);

            // Find the Sunday at or after the start date
            const dayOfWeek = actualStart.getDay(); // 0=Sunday, 6=Saturday
            const daysUntilSunday = dayOfWeek === 0 ? 0 : (7 - dayOfWeek);
            const sunday = new Date(actualStart);
            sunday.setDate(actualStart.getDate() + daysUntilSunday);

            return {
                start: actualStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                end: sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                displayText: `${actualStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                weekNumber: weekNumber,
                isPartialWeek: dayOfWeek !== 1 // True if doesn't start on Monday
            };
        }

        // Week 2+ - standard Monday-Sunday weeks
        // Calculate from the Monday after Week 1 ended
        const week1Start = new Date(start);
        const week1Day = week1Start.getDay(); // 0=Sunday, 6=Saturday
        const daysUntilSunday = week1Day === 0 ? 0 : (7 - week1Day);

        // Monday after Week 1's Sunday
        const week2MondayStart = new Date(week1Start);
        week2MondayStart.setDate(week1Start.getDate() + daysUntilSunday + 1);

        // Calculate the Monday for this specific week
        const weekStart = new Date(week2MondayStart);
        weekStart.setDate(week2MondayStart.getDate() + (weekNumber - 2) * 7);

        // Get Sunday (end of the week)
        const sunday = new Date(weekStart);
        sunday.setDate(weekStart.getDate() + 6);

        return {
            start: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            end: sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            displayText: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            weekNumber: weekNumber
        };
    }

    /**
     * Calculate actual calendar dates for workout schedule
     * FIXED: Handles mid-week start dates - Week 1 can be partial
     */
    calculateCalendarDates(startDate, availableDays, weekNumber) {
        if (!startDate || !availableDays || availableDays.length === 0) {
            // Fallback to generic day names
            return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        }

        const start = new Date(startDate);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const calendarDates = [];

        if (weekNumber === 1) {
            // Week 1 special handling - start on actual start date, end on Sunday
            const actualStart = new Date(start);
            const startDayOfWeek = actualStart.getDay(); // 0=Sunday, 6=Saturday

            // Calculate days from start date to end of week (Sunday)
            const daysUntilSunday = startDayOfWeek === 0 ? 0 : (7 - startDayOfWeek);

            // Generate only days from start date through Sunday
            for (let i = 0; i <= daysUntilSunday; i++) {
                const date = new Date(actualStart);
                date.setDate(actualStart.getDate() + i);

                const currentDayOfWeek = date.getDay();
                const dayName = dayNames[currentDayOfWeek];

                calendarDates.push({
                    dayName: dayName,
                    date: date,
                    dateString: date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    }),
                    fullDate: date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    isAvailable: availableDays.includes(dayName)
                });
            }

            return calendarDates;
        }

        // Week 2+ - standard Monday-Sunday weeks
        // Calculate from the Monday after Week 1 ended
        const week1Start = new Date(start);
        const week1Day = week1Start.getDay();
        const daysUntilSunday = week1Day === 0 ? 0 : (7 - week1Day);

        // Monday after Week 1's Sunday
        const week2MondayStart = new Date(week1Start);
        week2MondayStart.setDate(week1Start.getDate() + daysUntilSunday + 1);

        // Calculate the Monday for this specific week
        const weekStart = new Date(week2MondayStart);
        weekStart.setDate(week2MondayStart.getDate() + (weekNumber - 2) * 7);

        const standardDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);

            calendarDates.push({
                dayName: standardDayNames[i],
                date: date,
                dateString: date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                }),
                fullDate: date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                isAvailable: availableDays.includes(standardDayNames[i])
            });
        }

        return calendarDates;
    }

    /**
     * Generate workouts for a specific week
     * FIXED: Properly maps partial Week 1 days to workout pattern
     */
    generateWeekWorkouts(weekNumber, template, formData, totalWeeks = null) {
        const workouts = [];
        const calendarDates = this.calculateCalendarDates(formData.startDate, formData.availableDays, weekNumber);

        // Create workout pattern based on user preferences
        const workoutPattern = this.getWorkoutPattern(formData);

        // Map day names to indices in the standard Monday-Sunday pattern
        const dayNameToIndex = {
            'Monday': 0,
            'Tuesday': 1,
            'Wednesday': 2,
            'Thursday': 3,
            'Friday': 4,
            'Saturday': 5,
            'Sunday': 6
        };

        calendarDates.forEach((dateInfo) => {
            // Get the correct index in the workout pattern for this day
            const patternIndex = dayNameToIndex[dateInfo.dayName];

            if (workoutPattern[patternIndex] === 'rest' || !dateInfo.isAvailable) {
                workouts.push({
                    day: dateInfo.dayName,
                    date: dateInfo.dateString,
                    fullDate: dateInfo.fullDate,
                    actualDate: dateInfo.date,
                    type: 'rest',
                    workout: { 
                        name: dateInfo.isAvailable ? 'Rest Day' : 'Scheduled Rest', 
                        description: dateInfo.isAvailable ? 'Complete rest or light cross-training' : 'Rest day - not available for training'
                    },
                    focus: 'Recovery',
                    completed: false
                });
            } else {
                const workoutType = workoutPattern[patternIndex];
                
                // Check if this day is a preferred bike day for cyclete workouts
                // BUT preserve Sunday brick workouts - don't convert Sunday long runs to pure cyclete
                const isBikeDay = formData.preferredBikeDays && 
                                 formData.preferredBikeDays.includes(dateInfo.dayName) &&
                                 dateInfo.dayName !== 'Sunday';
                
                if (isBikeDay && formData.standUpBikeType) {
                    // Generate cyclete workout instead of running workout
                    const cycleteWorkout = this.generateCycleteWorkout(workoutType, formData);
                    
                    workouts.push({
                        day: dateInfo.dayName,
                        date: dateInfo.dateString,
                        fullDate: dateInfo.fullDate,
                        actualDate: dateInfo.date,
                        type: 'bike',
                        workout: cycleteWorkout,
                        focus: this.getCycleteWorkoutFocus(workoutType),
                        completed: false,
                        equipmentSpecific: true,
                        workoutDetails: cycleteWorkout,
                        coachingGuidance: this.getCycleteCoachingGuidance(workoutType, formData),
                        runEqOptions: this.generateCycleteRunEqOptions(workoutType, cycleteWorkout, formData)
                    });
                } else {
                    // Generate normal running workout
                    const workout = this.selectWorkout(workoutType, weekNumber, formData);
                    
                    workouts.push({
                        day: dateInfo.dayName,
                        date: dateInfo.dateString,
                        fullDate: dateInfo.fullDate,
                        actualDate: dateInfo.date,
                        type: workoutType,
                        workout: workout,
                        focus: this.getWorkoutFocus(workoutType),
                        completed: false,
                        equipmentSpecific: formData.standUpBikeType && this.shouldUseEquipment(workoutType, formData),
                        workoutDetails: workout,
                        coachingGuidance: this.getWorkoutCoachingGuidance(workoutType, formData),
                        runEqOptions: this.generateRunEqOptions(workoutType, workout, formData)
                    });
                }
            }
        });
        
        return workouts;
    }

    /**
     * Get workout pattern based on user preferences and runs per week
     */
    getWorkoutPattern(formData) {
        const { runsPerWeek, availableDays, preferredBikeDays = [], longRunDay } = formData;
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        // Initialize all days as rest
        let pattern = dayNames.map(() => 'rest');
        
        // Start with basic workout requirements
        let requiredWorkouts = [];
        
        // Add base workouts based on runs per week and elevation profile
        if (runsPerWeek >= 3) {
            requiredWorkouts = ['tempo', 'intervals', 'longRun'];
        }
        if (runsPerWeek >= 4) {
            requiredWorkouts.push('easy');
        }
        if (runsPerWeek >= 5) {
            // Adjust 5th workout based on race elevation profile
            const fifthWorkout = this.getElevationSpecificWorkout(formData.raceElevationProfile);
            requiredWorkouts.push(fifthWorkout);
        }
        if (runsPerWeek >= 6) {
            requiredWorkouts.push('easy');
        }
        if (runsPerWeek >= 7) {
            requiredWorkouts.push('easy');
        }
        
        // Adjust workout distribution based on elevation profile
        if (formData.raceElevationProfile && runsPerWeek >= 4) {
            requiredWorkouts = this.adjustForElevationProfile(requiredWorkouts, formData.raceElevationProfile);
        }
        
        // Handle long run day - check if it's also a bike day
        if (longRunDay && availableDays.includes(longRunDay)) {
            const longRunIndex = dayNames.indexOf(longRunDay);
            
            // Always use regular long run - user can choose brick on the day itself
            pattern[longRunIndex] = 'longRun';
            requiredWorkouts = requiredWorkouts.filter(w => w !== 'longRun');
        }
        
        
        // Place pure bike workouts on bike days
        if (preferredBikeDays.length > 0) {
            const pureBikeDays = preferredBikeDays.filter(day => 
                availableDays.includes(day) && 
                pattern[dayNames.indexOf(day)] === 'rest'
            );
            
            for (const bikeDay of pureBikeDays) {
                const dayIndex = dayNames.indexOf(bikeDay);
                if (pattern[dayIndex] === 'rest' && requiredWorkouts.length > 0) {
                    // Use pure bike workouts for non-brick days
                    const workoutForBikeDay = requiredWorkouts[0];
                    if (workoutForBikeDay) {
                        pattern[dayIndex] = workoutForBikeDay;
                        requiredWorkouts = requiredWorkouts.filter(w => w !== workoutForBikeDay);
                    }
                }
            }
        }
        
        // Place remaining workouts on available days
        const remainingDays = availableDays.filter(day => 
            pattern[dayNames.indexOf(day)] === 'rest'
        ).sort(() => Math.random() - 0.5); // Randomize for variety
        
        for (let i = 0; i < Math.min(remainingDays.length, requiredWorkouts.length); i++) {
            const dayIndex = dayNames.indexOf(remainingDays[i]);
            pattern[dayIndex] = requiredWorkouts[i];
        }
        
        return pattern;
    }

    /**
     * Select specific workout from libraries
     */
    selectWorkout(workoutType, weekNumber, formData) {
        switch (workoutType) {
            case 'tempo':
                return this.tempoLibrary.getRandomWorkout('TRADITIONAL_TEMPO');
            case 'intervals':
                return this.intervalLibrary.getRandomWorkout('VO2_MAX');
            case 'hills':
                return this.hillLibrary.getRandomWorkout('short_power');
            case 'longRun':
                return this.selectProgressiveLongRun(weekNumber, formData);
            case 'bike':
                return this.selectBikeWorkout(weekNumber, formData);
            case 'brick':
                return this.selectBrickWorkout(weekNumber, formData);
            case 'brickLongRun':
                return this.selectBrickLongRun(weekNumber, formData);
            case 'easy':
                return {
                    name: 'Easy Run',
                    description: 'Conversational pace, aerobic base building',
                    duration: '30-45 minutes',
                    intensity: 'Easy'
                };
            default:
                return {
                    name: 'Recovery Run',
                    description: 'Very easy pace, active recovery',
                    duration: '20-30 minutes',
                    intensity: 'Recovery'
                };
        }
    }

    /**
     * Select appropriate brick workout based on training phase and user preferences
     */
    selectBrickWorkout(weekNumber, formData) {
        const phase = this.getPhase(weekNumber, this.planTemplates[formData.raceDistance]?.weeks || 12);
        let brickType = 'aerobic'; // default
        
        // Select brick type based on training phase
        switch (phase) {
            case 'Base':
                brickType = Math.random() < 0.7 ? 'aerobic' : 'recovery';
                break;
            case 'Build':
                brickType = Math.random() < 0.5 ? 'tempo' : 'aerobic';
                break;
            case 'Peak':
                brickType = Math.random() < 0.4 ? 'speed' : 'tempo';
                break;
            case 'Taper':
                brickType = 'recovery';
                break;
            default:
                brickType = 'aerobic';
                break;
        }
        
        return this.brickWorkoutService.generateBrickWorkout({
            type: brickType,
            equipment: formData.standUpBikeType || 'cyclete',
            difficulty: this.mapExperienceTodifficulty(formData.experienceLevel)
        });
    }

    /**
     * Select brick long run workout (run + bike combination for long run days)
     */
    selectBrickLongRun(weekNumber, formData) {
        const baseDistance = this.calculateBaseDistance(weekNumber, formData.raceDistance, formData.experienceLevel);
        const runDistance = Math.round(baseDistance * 0.6); // 60% running
        const bikeDistance = Math.round(baseDistance * 0.4 * 2.5); // 40% converted to bike miles
        
        return {
            name: `Brick Long Run`,
            description: `${runDistance} mile run + ${bikeDistance} mile ${formData.standUpBikeType || 'bike'}`,
            duration: `${Math.round(runDistance * 9)} minutes total`,
            intensity: 'Easy-Moderate',
            segments: [
                {
                    type: 'run',
                    distance: runDistance,
                    description: 'Steady aerobic run'
                },
                {
                    type: 'transition',
                    duration: '2-3 minutes',
                    description: 'Equipment change and setup'
                },
                {
                    type: 'bike',
                    distance: bikeDistance,
                    description: `Moderate effort ${formData.standUpBikeType || 'bike'} ride`
                }
            ],
            safetyNotes: [
                'Take your time with the transition',
                'Keep both portions conversational',
                'Stay hydrated throughout'
            ],
            equipmentSpecific: true
        };
    }

    /**
     * Calculate base distance for brick workouts
     */
    calculateBaseDistance(weekNumber, raceDistance, experienceLevel) {
        // Progressive distance based on week and race distance
        let baseDistance = 6;
        
        if (raceDistance === 'marathon') {
            baseDistance = Math.min(8 + Math.floor(weekNumber / 2), 16);
        } else if (raceDistance === 'halfMarathon') {
            baseDistance = Math.min(6 + Math.floor(weekNumber / 2), 12);
        }
        
        // Adjust for experience
        if (experienceLevel === 'beginner') {
            baseDistance = Math.max(4, baseDistance - 2);
        } else if (experienceLevel === 'elite') {
            baseDistance = Math.min(baseDistance + 2, 16);
        }
        
        return baseDistance;
    }

    /**
     * Map experience level to brick workout difficulty
     */
    mapExperienceTodifficulty(experienceLevel) {
        const mapping = {
            'beginner': 'beginner',
            'recreational': 'intermediate',
            'competitive': 'advanced',
            'elite': 'advanced'
        };
        if (!mapping[experienceLevel]) {
            throw new Error(`Invalid experience level: ${experienceLevel}. Must be one of: ${Object.keys(mapping).join(', ')}`);
        }
        return mapping[experienceLevel];
    }

    /**
     * Select progressive long run with proper distance progression
     * Real coaching with specific distances, not time ranges
     */
    selectProgressiveLongRun(weekNumber, formData) {
        const raceDistance = formData.raceDistance;
        const experienceLevel = formData.experienceLevel;
        const totalWeeks = this.planTemplates[raceDistance]?.weeks || 12;
        const phase = this.getPhase(weekNumber, totalWeeks);
        const isRestWeek = weekNumber % 4 === 0 && weekNumber < totalWeeks - 2;
        
        // Base distances by experience level and race distance
        const baseDistances = {
            '5K': {
                beginner: { min: 3, max: 6, peak: 8 },
                recreational: { min: 4, max: 8, peak: 10 },
                competitive: { min: 5, max: 10, peak: 12 },
                elite: { min: 6, max: 12, peak: 15 }
            },
            '10K': {
                beginner: { min: 4, max: 8, peak: 10 },
                recreational: { min: 5, max: 10, peak: 12 },
                competitive: { min: 6, max: 12, peak: 15 },
                elite: { min: 7, max: 15, peak: 18 }
            },
            'Half': {
                beginner: { min: 5, max: 10, peak: 13 },
                recreational: { min: 6, max: 12, peak: 15 },
                competitive: { min: 7, max: 14, peak: 16 },
                elite: { min: 8, max: 16, peak: 16 }
            },
            'Marathon': {
                beginner: { min: 6, max: 12, peak: 16 },
                recreational: { min: 7, max: 14, peak: 16 },
                competitive: { min: 8, max: 16, peak: 16 },
                elite: { min: 10, max: 16, peak: 16 }
            }
        };
        
        const distances = baseDistances[raceDistance]?.[experienceLevel] || baseDistances['Marathon']['recreational'];
        
        // Calculate progressive distance
        let targetDistance;
        
        if (isRestWeek) {
            // Rest week - shorter long run
            targetDistance = Math.max(distances.min, Math.round(this.getPreviousLongRunDistance(weekNumber, distances) * 0.7));
        } else {
            // Progressive build based on phase
            const percentProgress = weekNumber / totalWeeks;
            
            switch (phase) {
                case 'Base':
                    // Gradual build from min to 75% of peak
                    const baseTarget = distances.min + (distances.peak * 0.75 - distances.min) * (percentProgress / 0.4);
                    targetDistance = Math.round(baseTarget);
                    break;
                    
                case 'Build':
                    // Build to peak distance
                    const buildProgress = (percentProgress - 0.4) / 0.3; // 0.4 to 0.7 range
                    targetDistance = Math.round(distances.peak * 0.75 + (distances.peak - distances.peak * 0.75) * buildProgress);
                    break;
                    
                case 'Peak':
                    // Peak distances with some variation
                    targetDistance = weekNumber % 2 === 0 ? distances.peak : Math.round(distances.peak * 0.85);
                    break;
                    
                case 'Taper':
                    // Taper down
                    const taperProgress = (percentProgress - 0.9) / 0.1; // 0.9 to 1.0 range
                    targetDistance = Math.round(distances.peak * (0.6 - 0.3 * taperProgress));
                    break;
                    
                default:
                    targetDistance = distances.min + 2;
            }
        }
        
        // Ensure reasonable bounds
        targetDistance = Math.max(distances.min, Math.min(distances.peak, targetDistance));
        
        // Generate appropriate long run workout
        return this.generateSpecificLongRun(targetDistance, phase, weekNumber, formData);
    }
    
    /**
     * Get the previous week's long run distance for rest week calculation
     */
    getPreviousLongRunDistance(weekNumber, distances) {
        if (weekNumber <= 1) return distances.min;
        
        // Simple calculation - in a real system we'd track actual previous distances
        const prevWeekProgress = (weekNumber - 1) / 16; // Assume 16-week plan
        return distances.min + (distances.peak - distances.min) * prevWeekProgress * 0.8;
    }
    
    /**
     * Generate specific long run workout with proper distance and coaching
     */
    generateSpecificLongRun(distance, phase, weekNumber, formData) {
        const paceGuidance = this.getLongRunPaceGuidance(distance, phase);
        const coachingNotes = this.getLongRunCoaching(distance, phase, weekNumber);
        
        return {
            name: `${distance}-Mile Long Run`,
            distance: `${distance} miles`,
            duration: `${Math.round(distance * 8.5)}-${Math.round(distance * 11)} minutes`, // 8:30-11:00 pace range
            description: `${distance} mile long run - ${paceGuidance.effort}`,
            structure: `${coachingNotes.warmup} + ${distance} miles @ ${paceGuidance.pace} + ${coachingNotes.cooldown}`,
            intensity: 'Easy to Moderate',
            paceGuidance: paceGuidance,
            coachingNotes: coachingNotes.notes,
            phase: phase,
            weekNumber: weekNumber,
            benefits: this.getLongRunBenefits(distance, phase),
            fuelingGuidance: distance >= 10 ? "Practice race fueling every 45-60 minutes" : "Water as needed",
            runEqOptions: this.generateLongRunRunEqOptions(distance, formData)
        };
    }
    
    /**
     * Get pace guidance for long runs
     */
    getLongRunPaceGuidance(distance, phase) {
        if (distance <= 6) {
            return {
                pace: "Easy conversational pace",
                effort: "should feel comfortable throughout",
                heartRate: "Zone 1-2 (65-75% max HR)"
            };
        } else if (distance <= 12) {
            return {
                pace: "Easy pace with optional faster finish",
                effort: "conversational for 80%, can build last 2-3 miles",  
                heartRate: "Zone 1-2, building to Zone 3 if feeling strong"
            };
        } else {
            return {
                pace: "Marathon pace practice in middle miles",
                effort: "easy start, marathon pace middle, easy finish",
                heartRate: "Zone 1-2 building to Zone 3 for middle segment"
            };
        }
    }
    
    /**
     * Get specific coaching for long runs
     */
    getLongRunCoaching(distance, phase, weekNumber) {
        const isLongDistance = distance >= 12;
        
        return {
            warmup: isLongDistance ? "10-15 min easy" : "5-10 min easy",
            cooldown: "10 min easy + stretching",
            notes: [
                `Week ${weekNumber}: ${distance} miles is perfect for your current fitness level`,
                isLongDistance ? 
                    "This is a key workout - focus on steady effort and fueling practice" :
                    "Build your aerobic base with relaxed, comfortable running",
                phase === 'Peak' && distance >= 14 ? 
                    "Practice your race day routine - gear, fueling, pacing" : 
                    "Stay relaxed and enjoy the longer effort",
                distance >= 16 ? 
                    "Smart 16-mile cap - gets all endurance benefits without the injury risk of 20+ mile runs" :
                    ""
            ].filter(Boolean)
        };
    }
    
    /**
     * Get benefits of specific long run distance
     */
    getLongRunBenefits(distance, phase) {
        if (distance <= 8) {
            return "Aerobic base building, fat adaptation, capillary development";
        } else if (distance <= 12) {
            return "Endurance building, mental toughness, glycogen storage improvement";
        } else {
            return "Race-specific endurance, fueling practice, confidence building";
        }
    }
    
    /**
     * Generate RunEQ options for long runs
     */
    generateLongRunRunEqOptions(distance, formData) {
        const equipmentType = formData.standUpBikeType;
        const bikeDistance = Math.round(distance * 2.2); // Conservative conversion for long efforts
        
        return {
            optionA: {
                name: "Full Run",
                description: `Complete ${distance} mile run as planned`,
                approach: "Traditional long run approach"
            },
            optionB: {
                name: "Run/Bike Brick",
                description: equipmentType ?
                    `${Math.round(distance * 0.6)} mile run + ${Math.round(bikeDistance * 0.4)} miles ${equipmentType}` :
                    `${Math.round(distance * 0.6)} mile run + bike portion`,
                approach: "Build endurance while saving legs"
            },
            optionC: {
                name: "Alternating Segments",
                description: equipmentType ?
                    `Alternate running and ${equipmentType} every 20-30 minutes` :
                    "Alternate running and biking every 20-30 minutes",
                approach: "Maximum freshness with full training benefit"
            },
            optionD: {
                name: equipmentType ? `Full ${equipmentType}` : "Full Bike",
                description: equipmentType ?
                    `${bikeDistance} miles on ${equipmentType}` :
                    `${bikeDistance} miles biking`,
                approach: "Zero impact endurance - perfect for recovery or tired legs"
            }
        };
    }

    /**
     * Helper methods
     */
    getPhase(weekNumber, totalWeeks) {
        const percentComplete = weekNumber / totalWeeks;
        if (percentComplete <= 0.4) return 'Base';
        if (percentComplete <= 0.7) return 'Build';
        if (percentComplete <= 0.9) return 'Peak';
        return 'Taper';
    }

    calculateWeeklyMileage(weekNumber, template, formData) {
        const baseMileage = formData.runsPerWeek * 4; // Base 4 miles per run
        const peakMileage = baseMileage * 1.5;
        const percentComplete = weekNumber / template.weeks;
        
        // Progressive build to peak, then taper
        if (percentComplete <= 0.7) {
            return Math.round(baseMileage + (peakMileage - baseMileage) * (percentComplete / 0.7));
        } else {
            return Math.round(peakMileage * (1 - (percentComplete - 0.7) * 0.5));
        }
    }

    getWorkoutFocus(workoutType) {
        const focuses = {
            tempo: 'Lactate Threshold',
            intervals: 'Speed & Power', 
            hills: 'Strength & Power',
            longRun: 'Endurance',
            bike: 'Equipment Training',
            brick: 'RunEQ Brick Training',
            brickLongRun: 'Brick Endurance',
            easy: 'Recovery'
        };
        return focuses[workoutType] || 'Aerobic Base';
    }

    shouldUseEquipment(workoutType, formData) {
        if (!formData.standUpBikeType) return false;
        
        // Bike and brick workouts always use equipment
        if (workoutType === 'bike' || workoutType === 'brick' || workoutType === 'brickLongRun') return true;
        
        // Use equipment for some tempo and easy workouts
        const equipmentPreference = this.calculateRunEqPreference(formData);
        return equipmentPreference > 30 && (workoutType === 'tempo' || workoutType === 'easy');
    }

    calculateTrainingPaces(raceTimeString) {
        // Simple pace calculation - would be enhanced with your pace calculator
        return {
            easy: "8:30-9:00 min/mile",
            tempo: "7:00-7:30 min/mile", 
            intervals: "6:00-6:30 min/mile",
            recovery: "9:00-9:30 min/mile"
        };
    }

    /**
     * World-Class Coaching Methods - Ben Parkes/McMillan/Higdon Approach
     */
    
    generateCoachingNote(weekNumber, template, formData) {
        const phase = this.getPhase(weekNumber, template.weeks);
        const percentComplete = weekNumber / template.weeks;
        const isRestWeek = weekNumber % 4 === 0 && weekNumber < template.weeks - 2;
        const equipmentType = formData.standUpBikeType;
        
        if (weekNumber === 1) {
            return `Here we go - week 1 of your training journey! We're laying down the base and preparing you for what's to come. ${equipmentType ? `Since you have a ${equipmentType}, we'll use it strategically to keep you fresh while building fitness.` : ''} Remember, it's pretty much impossible to follow any plan exactly - life gets in the way, and that's completely okay. This serves as your guide that you can build around your life.`;
        }
        
        if (isRestWeek) {
            return `This week is a recovery week where we see a reduction in overall training. This lets your body adapt and rebuild stronger. Listen to your body - these easier weeks are where the magic happens. You can achieve way more than you think, and this foundation week will set you up perfectly for what's ahead.`;
        }
        
        switch (phase) {
            case 'Base':
                if (weekNumber <= 3) {
                    return `We're building your aerobic foundation - think of this as constructing the base of your fitness pyramid. Your long runs at the weekend are so important for building the endurance you'll need. ${equipmentType ? 'Your stand-up bike isn\'t just cross-training, it\'s performance training that counts just as much as pure running.' : ''} Focus on effort over pace right now.`;
                } else {
                    return `Your body is adapting beautifully to the training! You should be feeling stronger and more comfortable with the weekly rhythm. ${equipmentType ? 'Those brick workouts are your secret weapon - your body gets more benefit from mixed training than pure running alone.' : ''} Keep building that strong foundation.`;
                }
            
            case 'Build':
                if (percentComplete <= 0.55) {
                    return `Time to step things up! Your body is ready to handle more challenge. You'll notice some harder workouts creeping in - this is where we start sharpening that speed and power. There will be tough moments over the next few weeks, but many more highs as you get fitter and stronger.`;
                } else {
                    return `The biggest weeks are coming! Your fitness is really developing now. ${weekNumber >= template.weeks * 0.6 ? 'Time to start fueling during your long runs - around every 30-45 minutes is a good starting point.' : ''} Trust the process, you've got this.`;
                }
            
            case 'Peak':
                return `These are the biggest weeks - trust the process, you've got this! Your body has been preparing for this volume. Remember to stay flexible with your schedule and listen to your body. Every workout doesn't have to be perfect - consistency over perfection wins every time.`;
            
            case 'Taper':
                if (percentComplete >= 0.95) {
                    return `Here we go - race week is here! Time to shine and show what you're made of. The hard work is done, now we trust in all that training. Stay relaxed, get good sleep, and remember - you're so much stronger than when you started this journey.`;
                } else {
                    return `The hard work is done! Now we're letting your body absorb all that training and get ready to perform. It might feel weird to do less, but this is how we peak properly. Your legs will feel fresh and fast by race day.`;
                }
            
            default:
                return `I'm here to help you on your journey to get where you want to be. Every week builds on the last, and you're making great progress even when it doesn't feel like it.`;
        }
    }

    getWeeklyFocus(weekNumber, totalWeeks) {
        const phase = this.getPhase(weekNumber, totalWeeks);
        const isRestWeek = weekNumber % 4 === 0 && weekNumber < totalWeeks - 2;
        
        if (isRestWeek) {
            return "Recovery & Adaptation";
        }
        
        switch (phase) {
            case 'Base':
                return weekNumber <= 2 ? "Foundation Building" : "Aerobic Development";
            case 'Build':
                return "Strength & Speed Development";
            case 'Peak':
                return "Race Simulation & Peak Fitness";
            case 'Taper':
                return weekNumber >= totalWeeks - 1 ? "Race Preparation" : "Recovery & Sharpening";
            default:
                return "Balanced Training";
        }
    }

    getWeeklyMotivation(weekNumber, totalWeeks) {
        const phase = this.getPhase(weekNumber, totalWeeks);
        const percentComplete = weekNumber / totalWeeks;
        
        const motivations = {
            'Base': [
                "Every mile is building your foundation 💪",
                "Consistency is your superpower right now ⚡",
                "Your future racing self will thank you for this base work 🙏",
                "Strong foundations create breakthrough performances 🏗️"
            ],
            'Build': [
                "Time to discover what you're capable of! 🚀",
                "Challenge accepted - your body is ready for this 💪",
                "Every hard workout is making you stronger 📈",
                "You're building the fitness that will carry you to your goal 🎯"
            ],
            'Peak': [
                "This is what all that base work was preparing you for! ⛰️",
                "Your biggest weeks - embrace the challenge 💪",
                "Peak fitness is within reach - trust the process 🎯",
                "You're stronger than you think you are 💪"
            ],
            'Taper': [
                "The hard work is done - time to sharpen up! ✨",
                "Your body is absorbing all that training magic 🪄",
                "Race day confidence is building with every easy step 😊",
                "You've earned this taper - enjoy feeling fresh! 🌟"
            ]
        };
        
        const phaseMotivations = motivations[phase] || motivations['Base'];
        return phaseMotivations[weekNumber % phaseMotivations.length];
    }

    getWorkoutCoachingGuidance(workoutType, formData) {
        const equipmentType = formData.standUpBikeType;
        
        const guidanceMap = {
            'tempo': {
                purpose: "This tempo workout builds your lactate threshold - the pace you can hold for about an hour.",
                encouragement: "Aim for 'comfortably hard' - you should be breathing rhythmically but able to speak in short sentences.",
                equipment: equipmentType ? `Your ${equipmentType} is perfect for tempo work - the smooth motion lets you focus on sustained effort without impact stress.` : ""
            },
            'intervals': {
                purpose: "These intervals develop your VO2 max and speed - this is where we build your top-end power.",
                encouragement: "These will feel challenging, but that's exactly what makes you faster. Focus on form and smooth breathing.",
                equipment: equipmentType ? `Short, intense efforts translate beautifully to your ${equipmentType} - you'll maintain the same training effect with less impact.` : ""
            },
            'hills': {
                purpose: "Hill training builds power, strength, and mental toughness - the complete package for better running.",
                encouragement: "Think 'power up, float down' - drive with your arms going up, then relax and let gravity help on the way down.",
                equipment: equipmentType ? `Hill repeats on your ${equipmentType} let you focus purely on power without worrying about footing or downhill impact.` : ""
            },
            'longRun': {
                purpose: "Your long run builds the endurance foundation everything else sits on - this is your most important weekly workout.",
                encouragement: "Keep it conversational - you should be able to chat with a training partner throughout most of this run.",
                equipment: equipmentType ? `Long efforts on your ${equipmentType} give you the same endurance benefits while keeping your legs fresher for the week ahead.` : ""
            },
            'brick': {
                purpose: "Brick workouts teach your body to transition between activities while maintaining effort - pure RunEQ magic.",
                encouragement: "The transitions might feel weird at first, but this is where you develop true fitness versatility. Take your time with equipment changes.",
                equipment: equipmentType ? `This is what your ${equipmentType} was made for - seamless run/bike combinations that no traditional plan can offer.` : ""
            },
            'easy': {
                purpose: "Easy runs build your aerobic base and promote recovery - they're harder to pace correctly than they seem!",
                encouragement: "Truly easy - err on the side of too slow rather than too fast. This is active recovery that makes you stronger.",
                equipment: equipmentType ? `Perfect recovery day for your ${equipmentType} - get the blood flowing without the impact stress.` : ""
            }
        };

        const guidance = guidanceMap[workoutType] || guidanceMap['easy'];
        return {
            purpose: guidance.purpose,
            encouragement: guidance.encouragement,
            equipmentNote: guidance.equipment
        };
    }

    generateRunEqOptions(workoutType, workout, formData) {
        const equipmentType = formData.standUpBikeType;
        
        const baseOptions = {
            optionA: {
                name: "Full Run",
                description: `Complete the workout as a traditional run`,
                approach: "Pure running - stick to the classic approach"
            },
            optionB: {
                name: "Run/Bike Brick", 
                description: equipmentType ? 
                    `Start running, switch to ${equipmentType} mid-workout, finish running` :
                    "Start running, switch to bike mid-workout, finish running",
                approach: "Best of both worlds - get variety while hitting your training zones"
            },
            optionC: {
                name: "Mixed Segments",
                description: equipmentType ?
                    `Alternate between running and ${equipmentType} every 10-15 minutes` :
                    "Alternate between running and biking every 10-15 minutes", 
                approach: "Keep it fresh - your body adapts better to variety"
            },
            optionD: {
                name: equipmentType ? `Full ${equipmentType}` : "Full Bike",
                description: equipmentType ?
                    `Complete the entire workout on your ${equipmentType}` :
                    "Complete the entire workout on bike",
                approach: "Low impact, high benefit - perfect for recovery or when your legs need a break"
            }
        };

        // Add workout-specific coaching for each option
        if (workoutType === 'tempo') {
            baseOptions.coachingNote = "Today's workout gives you four ways to get it done - pick what works for your body and schedule.";
        } else if (workoutType === 'intervals') {
            baseOptions.coachingNote = "Want to switch things up? All four options deliver the same speed benefits - choose what feels right today.";
        } else if (workoutType === 'brick') {
            baseOptions.coachingNote = "This is pure RunEQ training - experiment with different transitions to find your rhythm.";
        } else {
            baseOptions.coachingNote = "Feeling tired? Options B, C, or D give you the same training benefit while being kinder to your legs.";
        }

        return baseOptions;
    }

    getAgeBasedGuidance(formData) {
        // For now, use a simple age estimation based on experience level
        // In a full implementation, this would use actual age from user input
        const ageGuidanceMap = {
            'beginner': {
                guidance: "Starting your running journey at any age is something to celebrate! Focus on consistency over intensity.",
                longRunCap: "Long runs should feel comfortable and conversational - quality over extreme distance."
            },
            'recreational': {
                guidance: "Your experience gives you great body awareness - trust those instincts about when to push and when to back off.",
                longRunCap: "Smart long run approach - we cap at 16 miles to protect your joints while building the endurance you need."
            },
            'competitive': {
                guidance: "Your competitive experience is a huge asset - you know the difference between discomfort and danger.",
                longRunCap: "At your level, we focus on quality over quantity - 16-mile long runs with smart pacing beats body-destroying 20+ mile slogs."
            },
            'elite': {
                guidance: "Your advanced fitness allows for higher training loads, but smart recovery remains crucial.",
                longRunCap: "Elite-level training with RunEQ intelligence - even at your level, 16-mile caps with brick options provide superior training stimulus."
            }
        };

        const guidance = ageGuidanceMap[formData.experienceLevel] || ageGuidanceMap['recreational'];
        return {
            message: guidance.guidance,
            longRunPhilosophy: guidance.longRunCap,
            recoveryFocus: "Recovery weeks are where the magic happens - your body adapts and gets stronger during these easier periods."
        };
    }

    /**
     * Generate a basic fallback plan if the main generator fails
     */
    generateFallbackPlan(formData) {
        return {
            planOverview: {
                raceDistance: formData.raceDistance,
                totalWeeks: 12,
                runsPerWeek: formData.runsPerWeek,
                standUpBikeType: formData.standUpBikeType,
                experienceLevel: formData.experienceLevel
            },
            weeks: [],
            message: "Using simplified plan - full generator temporarily unavailable"
        };
    }

    /**
     * Select pure bike workout (non-brick) based on training phase
     */
    selectBikeWorkout(weekNumber, formData) {
        const phase = this.getPhase(weekNumber, this.planTemplates[formData.raceDistance]?.weeks || 12);
        const equipmentType = formData.standUpBikeType || 'bike';
        
        // Determine workout intensity based on phase
        let intensity = 'Easy';
        let duration = '45-60 minutes';
        let description = `Conversational pace ${equipmentType} ride`;
        
        switch (phase) {
            case 'Base':
                intensity = 'Easy';
                duration = '45-75 minutes';
                description = `Long aerobic ${equipmentType} ride, building endurance`;
                break;
            case 'Build':
                intensity = 'Easy-Moderate';
                duration = '60-90 minutes';
                description = `Steady ${equipmentType} ride with some moderate efforts`;
                break;
            case 'Peak':
                intensity = 'Moderate';
                duration = '45-60 minutes';
                description = `Race-pace ${equipmentType} ride for sharpening`;
                break;
        }
        
        return {
            name: `${equipmentType === 'cyclete' ? 'Cyclete' : equipmentType === 'elliptigo' ? 'ElliptiGO' : 'Bike'} Long Ride`,
            description: description,
            duration: duration,
            intensity: intensity,
            equipmentSpecific: true,
            safetyNotes: [
                `Focus on smooth ${equipmentType === 'cyclete' ? 'teardrop motion' : equipmentType === 'elliptigo' ? 'elliptical motion' : 'pedaling technique'}`,
                'Maintain steady effort throughout',
                'Stay hydrated and fuel as needed for longer sessions',
                'Practice race-day equipment setup'
            ],
            technique: equipmentType === 'cyclete' ? 
                'Focus on forward drive phase of teardrop motion, maintain 70-85 RPM' :
                equipmentType === 'elliptigo' ?
                'Use full stride extension with coordinated upper body movement' :
                'Standard cycling technique'
        };
    }

    /**
     * Generate cyclete-specific workout based on running workout type
     */
    generateCycleteWorkout(workoutType, formData) {
        const equipmentType = formData.standUpBikeType || 'cyclete';
        const phase = this.getPhase(1, this.planTemplates[formData.raceDistance]?.weeks || 12); // Default to week 1 for now
        
        // Convert running workout types to cyclete equivalents
        const cycleteWorkouts = {
            'tempo': {
                name: `${equipmentType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'} Tempo Ride`,
                description: `20-25 minutes @ comfortably hard sustained effort`,
                duration: '45-50 minutes',
                intensity: 'Medium-Hard',
                structure: `10min easy warmup + 20-25min @ tempo effort + 10min easy cooldown`,
                focus: 'Lactate Threshold',
                safetyNotes: [
                    'Maintain consistent cadence throughout tempo segment',
                    'Focus on smooth motion pattern',
                    'Keep core engaged for stability'
                ]
            },
            'intervals': {
                name: `${equipmentType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'} Speed Intervals`,
                description: `6x3min @ hard effort (90sec easy recovery)`,
                duration: '40-45 minutes',
                intensity: 'Hard',
                structure: `10min easy warmup + 6x3min @ hard effort (90sec easy) + 10min easy cooldown`,
                focus: 'VO2 Max Development',
                safetyNotes: [
                    'Focus on power through the drive phase',
                    'Keep smooth motion even at high intensity',
                    'Recover fully between intervals'
                ]
            },
            'hills': {
                name: `${equipmentType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'} Power Intervals`,
                description: `8x90sec @ high resistance/power (jog/coast recovery)`,
                duration: '40-45 minutes',
                intensity: 'Hard',
                structure: `10min easy warmup + 8x90sec @ high resistance (90sec easy) + 10min easy cooldown`,
                focus: 'Power Development',
                safetyNotes: [
                    'Increase resistance/incline for power work',
                    'Drive hard through full motion range',
                    'Focus on form over pure speed'
                ]
            },
            'longRun': {
                name: `${equipmentType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'} Long Ride`,
                description: `60-90 minutes @ conversational effort`,
                duration: '60-90 minutes',
                intensity: 'Easy',
                structure: `60-90min @ steady conversational effort`,
                focus: 'Aerobic Endurance',
                safetyNotes: [
                    'Maintain conversational effort throughout',
                    'Practice nutrition timing for longer efforts',
                    'Focus on efficient motion pattern'
                ]
            },
            'easy': {
                name: `${equipmentType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'} Recovery Ride`,
                description: `30-40 minutes @ very easy effort`,
                duration: '30-40 minutes',
                intensity: 'Very Easy',
                structure: `30-40min @ recovery effort`,
                focus: 'Active Recovery',
                safetyNotes: [
                    'Keep effort truly easy',
                    'Focus on smooth, relaxed motion',
                    'Perfect for recovery days'
                ]
            },
            'brick': {
                name: `${equipmentType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'}/Run Brick`,
                description: `20min bike + 15min run @ steady effort`,
                duration: '45-50 minutes',
                intensity: 'Medium',
                structure: `20min ${equipmentType} @ steady + quick transition + 15min run @ steady`,
                focus: 'Transition Training',
                safetyNotes: [
                    'Practice quick equipment transitions',
                    'Start run portion slightly easier',
                    'Focus on form during transition'
                ]
            }
        };
        
        const baseWorkout = cycleteWorkouts[workoutType] || cycleteWorkouts['easy'];
        
        return {
            ...baseWorkout,
            type: 'bike',
            equipmentSpecific: true,
            equipment: equipmentType,
            technique: equipmentType === 'cyclete' ? 
                'Focus on forward drive phase of teardrop motion, maintain 70-85 RPM' :
                'Use full stride extension with coordinated upper body movement'
        };
    }

    /**
     * Get training focus for cyclete workouts
     */
    getCycleteWorkoutFocus(workoutType) {
        const focuses = {
            tempo: 'Lactate Threshold',
            intervals: 'VO2 Max Development', 
            hills: 'Power Development',
            longRun: 'Aerobic Endurance',
            easy: 'Active Recovery',
            brick: 'Transition Training'
        };
        return focuses[workoutType] || 'Aerobic Base';
    }

    /**
     * Get coaching guidance for cyclete workouts
     */
    getCycleteCoachingGuidance(workoutType, formData) {
        const equipmentType = formData.standUpBikeType || 'cyclete';
        
        const guidanceMap = {
            'tempo': {
                purpose: `This tempo workout builds your lactate threshold using your ${equipmentType} - same training benefit with less impact stress.`,
                encouragement: "Focus on sustained effort and smooth motion. Your breathing should be rhythmic but controlled.",
                equipment: `The ${equipmentType}'s smooth motion is perfect for tempo work - you can maintain consistent effort without worrying about ground impact.`
            },
            'intervals': {
                purpose: `These intervals develop your VO2 max and power on the ${equipmentType} - high-intensity training with smart recovery.`,
                encouragement: "Push hard during the work intervals, then truly recover. Focus on maintaining form even at high intensity.",
                equipment: `Your ${equipmentType} lets you hit these intensities while protecting your legs for the rest of the week.`
            },
            'hills': {
                purpose: `Power intervals on your ${equipmentType} build strength and neuromuscular power - the same benefits as hill running without the downhill impact.`,
                encouragement: "Drive hard through the power phase, focusing on full range of motion. This builds real running strength.",
                equipment: `Increase resistance or incline to simulate hill work - your ${equipmentType} gives you perfect control over the training stimulus.`
            },
            'longRun': {
                purpose: `This long ride builds the same endurance foundation as a long run while keeping your legs fresher for the week ahead.`,
                encouragement: "Keep it conversational and enjoy the longer effort. This is building your aerobic engine.",
                equipment: `Long efforts on your ${equipmentType} give you all the endurance benefits while reducing weekly impact load - smart training.`
            },
            'easy': {
                purpose: `Easy recovery ride promotes blood flow and adaptation while giving your running muscles a break.`,
                encouragement: "Keep this truly easy - it's active recovery that makes you stronger for tomorrow's workout.",
                equipment: `Perfect recovery day use of your ${equipmentType} - get the movement benefits without impact stress.`
            },
            'brick': {
                purpose: `Brick training teaches your body to transition between activities while maintaining effort - this is pure RunEQ methodology.`,
                encouragement: "Take your time with transitions and expect the run to feel different at first. This builds real fitness versatility.",
                equipment: `This is what your ${equipmentType} was designed for - seamless training combinations that traditional plans can't offer.`
            }
        };

        const guidance = guidanceMap[workoutType] || guidanceMap['easy'];
        return {
            purpose: guidance.purpose,
            encouragement: guidance.encouragement,
            equipmentNote: guidance.equipment
        };
    }

    /**
     * Generate RunEQ options for cyclete workouts
     */
    generateCycleteRunEqOptions(workoutType, cycleteWorkout, formData) {
        const equipmentType = formData.standUpBikeType || 'cyclete';
        
        return {
            optionA: {
                name: `Full ${equipmentType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'}`,
                description: `Complete the workout entirely on your ${equipmentType}`,
                approach: "Pure equipment training - maximum impact reduction while maintaining training effect"
            },
            optionB: {
                name: `${equipmentType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'}/Run Brick`,
                description: `Start on ${equipmentType}, transition to running for final portion`,
                approach: "Best of both worlds - equipment benefits plus running specificity"
            },
            optionC: {
                name: "Mixed Segments",
                description: `Alternate between ${equipmentType} and running every 10-15 minutes`,
                approach: "Maximum variety - keeps workout fresh and engaging"
            },
            optionD: {
                name: "Traditional Run",
                description: "Convert to equivalent running workout if preferred",
                approach: "Classic approach - pure running with traditional structure"
            },
            coachingNote: `Your ${equipmentType} gives you training options that no traditional plan can offer - choose what feels right for your body today.`
        };
    }

    /**
     * Get workout type for 5th training day based on race elevation profile
     */
    getElevationSpecificWorkout(elevationProfile) {
        switch (elevationProfile) {
            case 'flat':
                return 'intervals'; // Extra speed work for flat races
            case 'rolling':
                return 'hills'; // Some hill training for rolling races
            case 'moderate':
                return 'intervals'; // Still need speed work, hills come from other adjustments
            case 'hilly':
                return 'hills'; // Essential hill training for very hilly races
            default:
                return 'intervals'; // Default to speed work
        }
    }

    /**
     * Adjust workout distribution based on race elevation profile
     * Always maintains tempo + intervals + long run core, adjusts proportions
     */
    adjustForElevationProfile(requiredWorkouts, elevationProfile) {
        const intervalCount = requiredWorkouts.filter(w => w === 'intervals').length;
        const tempoCount = requiredWorkouts.filter(w => w === 'tempo').length;
        const hillCount = requiredWorkouts.filter(w => w === 'hills').length;
        const easyCount = requiredWorkouts.filter(w => w === 'easy').length;
        
        switch (elevationProfile) {
            case 'flat':
                // Flat races: Maximum speed work, minimal hills
                // Target: 2 intervals, 1 tempo, 0-1 hills, rest easy
                if (hillCount > 0 && intervalCount < 2 && easyCount > 0) {
                    // Replace hills with intervals, or easy with intervals
                    const replaceIndex = requiredWorkouts.findIndex(w => w === 'hills' || w === 'easy');
                    if (replaceIndex !== -1) {
                        requiredWorkouts[replaceIndex] = 'intervals';
                    }
                }
                break;
                
            case 'rolling':
                // Rolling races: Balanced with light hill emphasis  
                // Target: 1 intervals, 1 tempo, 1 hills, rest easy
                // Keep natural balance - this is the "standard" distribution
                break;
                
            case 'moderate':
                // Moderate races: Equal speed and hill work
                // Target: 1 intervals, 1 tempo, 1-2 hills, rest easy
                if (hillCount === 0 && easyCount > 0) {
                    // Replace one easy with hills
                    const easyIndex = requiredWorkouts.findIndex(w => w === 'easy');
                    if (easyIndex !== -1) {
                        requiredWorkouts[easyIndex] = 'hills';
                    }
                }
                break;
                
            case 'hilly':
                // Hilly races: Hill emphasis but maintain speed work
                // Target: 1 intervals, 1 tempo, 2+ hills, minimal easy
                if (hillCount < 2 && easyCount > 0) {
                    // Replace easy runs with hills, but keep at least 1 interval and 1 tempo
                    const easyIndex = requiredWorkouts.findIndex(w => w === 'easy');
                    if (easyIndex !== -1) {
                        requiredWorkouts[easyIndex] = 'hills';
                    }
                }
                // If still need more hills and have multiple easy runs
                if (hillCount < 2 && requiredWorkouts.filter(w => w === 'easy').length > 1) {
                    const secondEasyIndex = requiredWorkouts.findLastIndex(w => w === 'easy');
                    if (secondEasyIndex !== -1) {
                        requiredWorkouts[secondEasyIndex] = 'hills';
                    }
                }
                break;
        }

        return requiredWorkouts;
    }
}

export default TrainingPlanService;