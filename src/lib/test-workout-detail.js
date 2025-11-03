/**
 * Test script to see detailed workout content
 */

import { TrainingPlanGenerator } from './training-plan-generator.js';

const generator = new TrainingPlanGenerator();

console.log('='.repeat(80));
console.log('WORKOUT DETAIL TEST');
console.log('='.repeat(80));

try {
    const plan = generator.generateTrainingPlan({
        raceDistance: 'Marathon',
        raceTime: '4:00:00',
        runsPerWeek: 5,
        experienceLevel: 'intermediate',
        standUpBikeType: null,
        runEqPreference: 0,
        availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
        hardSessionDays: ['Wednesday', 'Friday'],
        longRunDay: 'Saturday',
        preferredBikeDays: []
    });

    console.log(`\n✅ Plan Generated: ${plan.weeks.length} weeks\n`);

    // Show Week 1 detailed workout
    const week1 = plan.weeks[0];
    const wednesday = week1.workouts.find(w => w.day === 'Wednesday');
    const saturday = week1.workouts.find(w => w.day === 'Saturday');

    console.log('WEDNESDAY TEMPO WORKOUT:');
    console.log('-'.repeat(80));
    console.log('Type:', wednesday.type);
    console.log('Workout Name:', wednesday.workout.name);
    console.log('Description:', wednesday.workout.description);
    console.log('Structure:', wednesday.workout.structure);
    console.log('Benefits:', wednesday.workout.benefits);
    console.log('\nFull Workout Object:');
    console.log(JSON.stringify(wednesday.workout, null, 2));

    console.log('\n\nSATURDAY LONG RUN WORKOUT:');
    console.log('-'.repeat(80));
    console.log('Type:', saturday.type);
    console.log('Workout Name:', saturday.workout.name);
    console.log('Description:', saturday.workout.description);
    console.log('Structure:', saturday.workout.structure);
    console.log('Benefits:', saturday.workout.benefits);
    console.log('\nFull Workout Object:');
    console.log(JSON.stringify(saturday.workout, null, 2));

} catch (error) {
    console.log('\n❌ TEST FAILED:', error.message);
    console.error(error);
}

console.log('\n' + '='.repeat(80));
console.log('TEST COMPLETE');
console.log('='.repeat(80));
