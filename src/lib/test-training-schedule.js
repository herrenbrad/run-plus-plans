/**
 * Test script to verify training plan generator respects user schedule inputs
 */

import { TrainingPlanGenerator } from './training-plan-generator.js';

const generator = new TrainingPlanGenerator();

console.log('='.repeat(80));
console.log('TRAINING SCHEDULE TEST');
console.log('='.repeat(80));

// Test case: User trains 5 days/week on specific days
console.log('\n[TEST] User Schedule: 5 days/week');
console.log('Available Days: Monday, Wednesday, Friday, Saturday, Sunday');
console.log('Long Run Day: Saturday');
console.log('Hard Session Days: Wednesday, Friday');
console.log('Bike Days: Monday');
console.log('-'.repeat(80));

try {
    const plan = generator.generateTrainingPlan({
        raceDistance: 'Marathon',
        raceTime: '4:00:00',
        runsPerWeek: 5,
        experienceLevel: 'intermediate',
        standUpBikeType: null,  // Disable bike for now to test schedule logic
        runEqPreference: 0,
        // USER SCHEDULE
        availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
        hardSessionDays: ['Wednesday', 'Friday'],
        longRunDay: 'Saturday',
        preferredBikeDays: []  // No bike days for this test
    });

    console.log(`\n✅ Plan Generated: ${plan.weeks.length} weeks`);
    console.log(`\nWeek 1 Schedule:`);

    const week1 = plan.weeks[0];
    week1.workouts.forEach(workout => {
        const icon = workout.type === 'rest' ? '😴' :
                     workout.type === 'longRun' ? '🏃' :
                     workout.type === 'easy' ? '🚶' :
                     workout.type === 'bike' ? '🚴' : '💪';
        console.log(`  ${icon} ${workout.day.padEnd(10)} - ${workout.type.padEnd(12)} (${workout.workout.name || 'Rest Day'})`);
    });

    // Verify correctness
    console.log('\n[VERIFICATION]');
    const monday = week1.workouts.find(w => w.day === 'Monday');
    const tuesday = week1.workouts.find(w => w.day === 'Tuesday');
    const wednesday = week1.workouts.find(w => w.day === 'Wednesday');
    const thursday = week1.workouts.find(w => w.day === 'Thursday');
    const friday = week1.workouts.find(w => w.day === 'Friday');
    const saturday = week1.workouts.find(w => w.day === 'Saturday');
    const sunday = week1.workouts.find(w => w.day === 'Sunday');

    const checks = [
        { name: 'Monday should be easy run (available day)', pass: monday.type === 'easy' },
        { name: 'Tuesday should be rest (not available)', pass: tuesday.type === 'rest' },
        { name: 'Wednesday should be hard session', pass: wednesday.type !== 'rest' && wednesday.type !== 'easy' && wednesday.type !== 'longRun' },
        { name: 'Thursday should be rest (not available)', pass: thursday.type === 'rest' },
        { name: 'Friday should be hard session', pass: friday.type !== 'rest' && friday.type !== 'easy' && friday.type !== 'longRun' },
        { name: 'Saturday should be long run', pass: saturday.type === 'longRun' },
        { name: 'Sunday should be easy run (available day)', pass: sunday.type === 'easy' }
    ];

    checks.forEach(check => {
        console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);
    if (allPassed) {
        console.log('\n🎉 ALL TESTS PASSED! User schedule is correctly respected.');
    } else {
        console.log('\n❌ SOME TESTS FAILED! User schedule not fully respected.');
    }

} catch (error) {
    console.log('\n❌ TEST FAILED:', error.message);
    console.error(error);
}

console.log('\n' + '='.repeat(80));
console.log('TEST COMPLETE');
console.log('='.repeat(80));
