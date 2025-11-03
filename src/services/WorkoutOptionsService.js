/**
 * WorkoutOptionsService - Provides multiple workout options for "Choose Your Adventure" training
 * Each method returns 3-4 workout options that target the same training system
 */

class WorkoutOptionsService {
    
    /**
     * Get speed workout options (VO2 max, neuromuscular power)
     */
    getSpeedOptions(weekNumber, userProfile) {
        return [
            {
                id: 'classic-track',
                name: '🏃‍♂️ Classic Track Session',
                shortName: 'Track Intervals',
                description: '6x800m @ 5K pace (2min rest)',
                duration: '45-55 minutes',
                intensity: 'Hard',
                structure: '2mi warmup + 6x800m @ 5K pace (2min rest) + 2mi cooldown',
                focus: 'VO2 Max Development',
                location: 'Track preferred',
                equipment: 'None',
                difficulty: 'High',
                timeRequired: '45-55 minutes',
                benefits: 'Improves oxygen uptake, running economy, speed endurance'
            },
            {
                id: 'hill-sprints',
                name: '🏔️ Hill Sprint Power',
                shortName: 'Hill Sprints',
                description: '8x30sec uphill @ max effort (jog down recovery)',
                duration: '35-45 minutes',
                intensity: 'Very Hard',
                structure: '2mi warmup + 8x30sec uphill sprints (jog down) + 2mi cooldown',
                focus: 'Neuromuscular Power',
                location: 'Hills required',
                equipment: 'None',
                difficulty: 'Very High',
                timeRequired: '35-45 minutes',
                benefits: 'Builds power, strength, running economy, mental toughness'
            },
            {
                id: 'fartlek-fun',
                name: '⚡ Fartlek Freedom',
                shortName: 'Fartlek',
                description: '20min fartlek: fast when you feel it, easy when you need it',
                duration: '40-50 minutes',
                intensity: 'Variable',
                structure: '2mi easy + 20min fartlek (surge when you feel good, recover when you need) + 2mi easy',
                focus: 'Speed Endurance',
                location: 'Anywhere',
                equipment: 'None',
                difficulty: 'Moderate-High',
                timeRequired: '40-50 minutes',
                benefits: 'Improves speed, teaches pacing, mentally engaging'
            },
            {
                id: 'pyramid-power',
                name: '🔄 Pyramid Progression',
                shortName: 'Pyramid',
                description: '400-800-1200-800-400m @ 5K pace (90sec rest)',
                duration: '50-60 minutes',
                intensity: 'Hard',
                structure: '2mi warmup + 400-800-1200-800-400m @ 5K pace (90sec rest) + 2mi cooldown',
                focus: 'Progressive Speed',
                location: 'Track or measured route',
                equipment: 'None',
                difficulty: 'High',
                timeRequired: '50-60 minutes',
                benefits: 'Progressive challenge, mental focus, speed development'
            }
        ];
    }

    /**
     * Get tempo workout options (lactate threshold)
     */
    getTempoOptions(weekNumber, userProfile) {
        return [
            {
                id: 'classic-tempo',
                name: '🎯 Classic Tempo Run',
                shortName: 'Tempo Run',
                description: '4 miles @ comfortably hard pace',
                duration: '45-55 minutes',
                intensity: 'Medium-Hard',
                structure: '2mi easy warmup + 4mi @ tempo pace + 1mi easy cooldown',
                focus: 'Lactate Threshold',
                location: 'Flat, measured route',
                equipment: 'None',
                difficulty: 'Moderate-High',
                timeRequired: '45-55 minutes',
                benefits: 'Improves lactate clearance, race pace fitness'
            },
            {
                id: 'cruise-intervals',
                name: '🔀 Cruise Intervals',
                shortName: 'Cruise Intervals',
                description: '3x1 mile @ tempo pace (90sec rest)',
                duration: '45-50 minutes',
                intensity: 'Medium-Hard',
                structure: '2mi warmup + 3x1mi @ tempo pace (90sec jog) + 2mi cooldown',
                focus: 'Threshold Power',
                location: 'Any measured route',
                equipment: 'None',
                difficulty: 'Moderate-High',
                timeRequired: '45-50 minutes',
                benefits: 'Mental break during rest, maintains pace discipline'
            },
            {
                id: 'progressive-build',
                name: '📈 Progressive Tempo Build',
                shortName: 'Progressive',
                description: '5 miles: start easy, finish at tempo pace',
                duration: '50-55 minutes',
                intensity: 'Progressive',
                structure: '1mi easy + 5mi progressive (easy to tempo) + 1mi easy cooldown',
                focus: 'Progressive Effort',
                location: 'Any route',
                equipment: 'None',
                difficulty: 'Moderate',
                timeRequired: '50-55 minutes',
                benefits: 'Teaches effort progression, confidence building'
            },
            {
                id: 'tempo-sandwich',
                name: '🥪 Tempo Sandwich',
                shortName: 'Sandwich',
                description: '2mi easy + 3mi tempo + 2mi easy',
                duration: '50-60 minutes',
                intensity: 'Medium-Hard',
                structure: '2mi easy + 3mi @ tempo pace + 2mi easy',
                focus: 'Sustained Threshold',
                location: 'Any route',
                equipment: 'None',
                difficulty: 'Moderate-High',
                timeRequired: '50-60 minutes',
                benefits: 'Practices running fast when tired, mental toughness'
            }
        ];
    }

    /**
     * Get long run workout options (endurance, aerobic development)
     */
    getLongRunOptions(weekNumber, userProfile, targetDistance = 10) {
        return [
            {
                id: 'conversational-long',
                name: '🏃‍♂️ Classic Conversational',
                shortName: 'Easy Long Run',
                description: `${targetDistance} miles @ easy, conversational pace`,
                duration: `${Math.round(targetDistance * 9)}-${Math.round(targetDistance * 10.5)} minutes`,
                intensity: 'Easy',
                structure: `${targetDistance} miles @ conversational pace throughout`,
                focus: 'Aerobic Base',
                location: 'Any route',
                equipment: 'None',
                difficulty: 'Low-Moderate',
                timeRequired: `${Math.round(targetDistance * 9)}-${Math.round(targetDistance * 10.5)} minutes`,
                benefits: 'Builds aerobic capacity, fat burning, mental endurance'
            },
            {
                id: 'negative-split-long',
                name: '📈 Negative Split Challenge',
                shortName: 'Negative Split',
                description: `${targetDistance} miles: second half faster than first`,
                duration: `${Math.round(targetDistance * 8.5)}-${Math.round(targetDistance * 10)} minutes`,
                intensity: 'Easy-Moderate',
                structure: `${targetDistance/2}mi easy + ${targetDistance/2}mi moderate (30-45sec/mi faster)`,
                focus: 'Pacing Discipline',
                location: 'Measured route preferred',
                equipment: 'None',
                difficulty: 'Moderate',
                timeRequired: `${Math.round(targetDistance * 8.5)}-${Math.round(targetDistance * 10)} minutes`,
                benefits: 'Teaches pacing control, finishes strong, race simulation'
            },
            {
                id: 'long-with-pickups',
                name: '⚡ Long Run + Pickups',
                shortName: 'Long + Pickups',
                description: `${targetDistance-1} miles easy + 4x30sec pickups in final mile`,
                duration: `${Math.round(targetDistance * 9)}-${Math.round(targetDistance * 10)} minutes`,
                intensity: 'Easy with surges',
                structure: `${targetDistance-1}mi easy + 4x30sec @ 5K pace (30sec recovery) + easy finish`,
                focus: 'Neuromuscular Readiness',
                location: 'Any route',
                equipment: 'None',
                difficulty: 'Moderate',
                timeRequired: `${Math.round(targetDistance * 9)}-${Math.round(targetDistance * 10)} minutes`,
                benefits: 'Keeps legs sharp, practices running fast when tired'
            },
            {
                id: 'progressive-long',
                name: '🎯 Marathon Pace Progression',
                shortName: 'Progressive',
                description: `${Math.round(targetDistance * 0.6)}mi easy + ${Math.round(targetDistance * 0.4)}mi @ marathon pace`,
                duration: `${Math.round(targetDistance * 8.5)}-${Math.round(targetDistance * 9.5)} minutes`,
                intensity: 'Easy-Moderate',
                structure: `${Math.round(targetDistance * 0.6)}mi easy + ${Math.round(targetDistance * 0.4)}mi @ marathon pace`,
                focus: 'Race Pace Practice',
                location: 'Flat, measured route',
                equipment: 'None',
                difficulty: 'Moderate-High',
                timeRequired: `${Math.round(targetDistance * 8.5)}-${Math.round(targetDistance * 9.5)} minutes`,
                benefits: 'Practices goal race pace, builds confidence'
            }
        ];
    }

    /**
     * Get hill workout options (strength, power)
     */
    getHillOptions(weekNumber, userProfile) {
        return [
            {
                id: 'classic-hills',
                name: '🏔️ Classic Hill Repeats',
                shortName: 'Hill Repeats',
                description: '6x90sec uphill @ hard effort (jog down recovery)',
                duration: '40-50 minutes',
                intensity: 'Hard',
                structure: '2mi warmup + 6x90sec uphill @ 5K effort (jog down) + 2mi cooldown',
                focus: 'Hill Strength',
                location: 'Steady 4-6% grade hill',
                equipment: 'None',
                difficulty: 'High',
                timeRequired: '40-50 minutes',
                benefits: 'Builds leg strength, power, running economy'
            },
            {
                id: 'variable-hills',
                name: '🎢 Variable Hill Circuit',
                shortName: 'Variable Hills',
                description: '4x(30sec hard + 60sec moderate + 30sec hard) uphill',
                duration: '45-50 minutes',
                intensity: 'Variable Hard',
                structure: '2mi warmup + 4x(30sec hard + 60sec moderate + 30sec hard) + jog down + 2mi cooldown',
                focus: 'Power Endurance',
                location: 'Long hill or multiple hills',
                equipment: 'None',
                difficulty: 'Very High',
                timeRequired: '45-50 minutes',
                benefits: 'Varied stimulus, mental toughness, power development'
            },
            {
                id: 'rolling-hills',
                name: '🌊 Rolling Hill Tempo',
                shortName: 'Rolling Tempo',
                description: '25min tempo effort on rolling hills',
                duration: '45-55 minutes',
                intensity: 'Medium-Hard',
                structure: '2mi easy + 25min @ tempo effort on rolling terrain + 2mi easy',
                focus: 'Hill Endurance',
                location: 'Rolling hills course',
                equipment: 'None',
                difficulty: 'Moderate-High',
                timeRequired: '45-55 minutes',
                benefits: 'Teaches effort management on varied terrain'
            }
        ];
    }

    /**
     * Get recovery/easy run options
     */
    getEasyOptions(weekNumber, userProfile, targetDistance = 4) {
        return [
            {
                id: 'classic-easy',
                name: '😌 Classic Recovery Run',
                shortName: 'Easy Run',
                description: `${targetDistance} miles @ easy, conversational pace`,
                duration: `${Math.round(targetDistance * 9.5)}-${Math.round(targetDistance * 11)} minutes`,
                intensity: 'Very Easy',
                structure: `${targetDistance} miles @ recovery pace throughout`,
                focus: 'Active Recovery',
                location: 'Any route',
                equipment: 'None',
                difficulty: 'Low',
                timeRequired: `${Math.round(targetDistance * 9.5)}-${Math.round(targetDistance * 11)} minutes`,
                benefits: 'Promotes recovery, maintains aerobic fitness'
            },
            {
                id: 'easy-with-strides',
                name: '⚡ Easy + Strides',
                shortName: 'Easy + Strides',
                description: `${targetDistance} miles easy + 4x20sec strides`,
                duration: `${Math.round(targetDistance * 9.5)}-${Math.round(targetDistance * 10.5)} minutes`,
                intensity: 'Easy with pickups',
                structure: `${targetDistance-0.5}mi easy + 4x20sec strides (40sec recovery) + 0.5mi easy`,
                focus: 'Neuromuscular Activation',
                location: 'Any route with straight section',
                equipment: 'None',
                difficulty: 'Low-Moderate',
                timeRequired: `${Math.round(targetDistance * 9.5)}-${Math.round(targetDistance * 10.5)} minutes`,
                benefits: 'Maintains speed while recovering, improves running form'
            }
        ];
    }
}

export default WorkoutOptionsService;