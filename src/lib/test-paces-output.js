/**
 * Test to see what paces are calculated and if they make it to workouts
 */

import { PaceCalculator } from './pace-calculator.js';
import { TrainingPlanGenerator } from './training-plan-generator.js';

console.log('='.repeat(80));
console.log('PACE INTEGRATION TEST');
console.log('='.repeat(80));

// Test 1: Verify pace calculator output
console.log('\n[TEST 1] Pace Calculator Output for 4:00:00 Marathon');
console.log('-'.repeat(80));

const paceCalc = new PaceCalculator();
const paceData = paceCalc.calculateFromGoal('Marathon', '4:00:00');

console.log('Calculated Paces:');
console.log(JSON.stringify(paceData, null, 2));

// Test 2: Check if paces make it into the training plan
console.log('\n\n[TEST 2] Training Plan - Do Workouts Have Specific Paces?');
console.log('-'.repeat(80));

const generator = new TrainingPlanGenerator();
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

console.log('\nPaces stored in plan.trainingPaces:');
console.log(JSON.stringify(plan.trainingPaces, null, 2));

const week1 = plan.weeks[0];
const wednesday = week1.workouts.find(w => w.day === 'Wednesday');

console.log('\n\n[TEST 3] Wednesday Tempo Workout - Does it have specific paces?');
console.log('-'.repeat(80));
console.log('Workout Name:', wednesday.workout.name);
console.log('Workout Structure:', wednesday.workout.structure);
console.log('\nSearching for pace data in workout object...');

// Check if paces field exists
if (wednesday.workout.paces) {
    console.log('✅ Found workout.paces:', JSON.stringify(wednesday.workout.paces, null, 2));
} else {
    console.log('❌ workout.paces does NOT exist');
}

// Check if specific pace numbers appear in structure
if (wednesday.workout.structure.includes('8:32') || wednesday.workout.structure.includes('8:')) {
    console.log('✅ Specific pace numbers found in workout structure');
} else {
    console.log('❌ NO specific pace numbers in workout structure - still generic!');
}

console.log('\nFull workout object keys:', Object.keys(wednesday.workout));

console.log('\n' + '='.repeat(80));
console.log('CONCLUSION:');
if (!wednesday.workout.paces && !wednesday.workout.structure.includes('8:32')) {
    console.log('❌ PACES ARE NOT BEING INJECTED INTO WORKOUTS');
    console.log('   The pace calculator works, but workouts still show generic descriptions.');
    console.log('   This is the bug that needs fixing in Task 3!');
} else {
    console.log('✅ Paces are correctly integrated into workouts');
}
console.log('='.repeat(80));
