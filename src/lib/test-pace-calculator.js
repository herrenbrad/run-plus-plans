/**
 * Test script for new VDOT-based pace calculator
 */

import { PaceCalculator } from './pace-calculator.js';

const calculator = new PaceCalculator();

console.log('='.repeat(80));
console.log('PACE CALCULATOR TEST SUITE');
console.log('='.repeat(80));

// Test 1: Exact match - 3:30:00 marathon
console.log('\n[TEST 1] Exact Match: 3:30:00 Marathon');
console.log('-'.repeat(80));
try {
    const result1 = calculator.calculateFromGoal('Marathon', '3:30:00');
    console.log('Goal Time:', result1.goalTime);
    console.log('Interpolated:', result1.interpolated);
    console.log('Easy Pace:', result1.paces.easy.pace);
    console.log('Marathon Pace:', result1.paces.marathon.pace);
    console.log('Threshold Pace:', result1.paces.threshold.pace);
    console.log('Interval Pace:', result1.paces.interval.pace);
    console.log('Track Intervals (400m):', result1.trackIntervals.interval['400m']);
    console.log('✅ TEST PASSED');
} catch (error) {
    console.log('❌ TEST FAILED:', error.message);
}

// Test 2: Interpolated - 3:47:23 marathon (between 3:45:00 and 4:00:00)
console.log('\n[TEST 2] Interpolated: 3:47:23 Marathon');
console.log('-'.repeat(80));
try {
    const result2 = calculator.calculateFromGoal('Marathon', '3:47:23');
    console.log('Goal Time:', result2.goalTime);
    console.log('Interpolated:', result2.interpolated);
    if (result2.interpolated) {
        console.log('Between:', result2.interpolatedBetween.lower, 'and', result2.interpolatedBetween.upper);
    }
    console.log('Easy Pace:', result2.paces.easy.pace);
    console.log('Marathon Pace:', result2.paces.marathon.pace);
    console.log('Threshold Pace:', result2.paces.threshold.pace);
    console.log('Interval Pace:', result2.paces.interval.pace);
    console.log('✅ TEST PASSED');
} catch (error) {
    console.log('❌ TEST FAILED:', error.message);
}

// Test 3: Exact match - 4:00:00 marathon
console.log('\n[TEST 3] Exact Match: 4:00:00 Marathon');
console.log('-'.repeat(80));
try {
    const result3 = calculator.calculateFromGoal('Marathon', '4:00:00');
    console.log('Goal Time:', result3.goalTime);
    console.log('Interpolated:', result3.interpolated);
    console.log('Easy Pace:', result3.paces.easy.pace);
    console.log('Marathon Pace:', result3.paces.marathon.pace);
    console.log('Threshold Pace:', result3.paces.threshold.pace);
    console.log('Interval Pace:', result3.paces.interval.pace);
    console.log('✅ TEST PASSED');
} catch (error) {
    console.log('❌ TEST FAILED:', error.message);
}

// Test 4: Half Marathon - 1:45:00 exact match
console.log('\n[TEST 4] Exact Match: 1:45:00 Half Marathon');
console.log('-'.repeat(80));
try {
    const result4 = calculator.calculateFromGoal('Half Marathon', '1:45:00');
    console.log('Goal Time:', result4.goalTime);
    console.log('Interpolated:', result4.interpolated);
    console.log('Easy Pace:', result4.paces.easy.pace);
    console.log('Marathon Pace:', result4.paces.marathon.pace);
    console.log('Threshold Pace:', result4.paces.threshold.pace);
    console.log('Interval Pace:', result4.paces.interval.pace);
    console.log('✅ TEST PASSED');
} catch (error) {
    console.log('❌ TEST FAILED:', error.message);
}

// Test 5: Half Marathon - Interpolated 1:52:30 (between 1:45:00 and 2:00:00)
console.log('\n[TEST 5] Interpolated: 1:52:30 Half Marathon');
console.log('-'.repeat(80));
try {
    const result5 = calculator.calculateFromGoal('Half Marathon', '1:52:30');
    console.log('Goal Time:', result5.goalTime);
    console.log('Interpolated:', result5.interpolated);
    if (result5.interpolated) {
        console.log('Between:', result5.interpolatedBetween.lower, 'and', result5.interpolatedBetween.upper);
    }
    console.log('Easy Pace:', result5.paces.easy.pace);
    console.log('Marathon Pace:', result5.paces.marathon.pace);
    console.log('Threshold Pace:', result5.paces.threshold.pace);
    console.log('Interval Pace:', result5.paces.interval.pace);
    console.log('✅ TEST PASSED');
} catch (error) {
    console.log('❌ TEST FAILED:', error.message);
}

// Test 6: Out of range - Too slow (should show helpful error)
console.log('\n[TEST 6] Out of Range: 6:30:00 Marathon (too slow)');
console.log('-'.repeat(80));
try {
    const result6 = calculator.calculateFromGoal('Marathon', '6:30:00');
    console.log('❌ TEST FAILED: Should have thrown error for out-of-range time');
} catch (error) {
    console.log('Expected error message:');
    console.log(error.message);
    console.log('✅ TEST PASSED (correctly rejected out-of-range input)');
}

// Test 7: Out of range - Too fast (should show helpful error)
console.log('\n[TEST 7] Out of Range: 1:45:00 Marathon (too fast)');
console.log('-'.repeat(80));
try {
    const result7 = calculator.calculateFromGoal('Marathon', '1:45:00');
    console.log('❌ TEST FAILED: Should have thrown error for out-of-range time');
} catch (error) {
    console.log('Expected error message:');
    console.log(error.message);
    console.log('✅ TEST PASSED (correctly rejected out-of-range input)');
}

// Test 8: RunEq Distance Calculator (for stand-up bike)
console.log('\n[TEST 8] RunEq Distance: 5 mile easy run');
console.log('-'.repeat(80));
try {
    const result8 = calculator.calculateRunEqDistance(5);
    console.log('Run Distance:', result8.runDistance, 'miles');
    console.log('Bike Distance:', result8.bikeDistance, 'miles');
    console.log('Conversion Factor:', result8.factor + 'x');
    console.log('Description:', result8.description);
    console.log('✅ TEST PASSED');
} catch (error) {
    console.log('❌ TEST FAILED:', error.message);
}

// Test 9: Different distance input formats
console.log('\n[TEST 9] Distance Format Variations');
console.log('-'.repeat(80));
const formats = ['Marathon', 'marathon', 'MARATHON', 'Half Marathon', 'Half', 'half'];
let formatTestsPassed = 0;
for (const format of formats) {
    try {
        const result = calculator.calculateFromGoal(format, format.toLowerCase().includes('half') ? '1:45:00' : '3:30:00');
        console.log(`✓ "${format}" format accepted`);
        formatTestsPassed++;
    } catch (error) {
        console.log(`✗ "${format}" format failed:`, error.message);
    }
}
console.log(`${formatTestsPassed}/${formats.length} format tests passed`);
if (formatTestsPassed === formats.length) {
    console.log('✅ TEST PASSED');
} else {
    console.log('❌ TEST FAILED');
}

// Test 10: Available goal times
console.log('\n[TEST 10] Available Goal Times');
console.log('-'.repeat(80));
try {
    const marathonTimes = calculator.getAvailableGoalTimes('Marathon');
    const halfTimes = calculator.getAvailableGoalTimes('Half Marathon');
    console.log('Marathon goal times available:', marathonTimes.length);
    console.log('First 3:', marathonTimes.slice(0, 3).join(', '));
    console.log('Last 3:', marathonTimes.slice(-3).join(', '));
    console.log('Half Marathon goal times available:', halfTimes.length);
    console.log('First 3:', halfTimes.slice(0, 3).join(', '));
    console.log('Last 3:', halfTimes.slice(-3).join(', '));
    console.log('✅ TEST PASSED');
} catch (error) {
    console.log('❌ TEST FAILED:', error.message);
}

console.log('\n' + '='.repeat(80));
console.log('TEST SUITE COMPLETE');
console.log('='.repeat(80));
