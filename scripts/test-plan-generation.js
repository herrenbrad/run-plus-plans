/**
 * Test Script for Training Plan Generation
 * 
 * Usage: node scripts/test-plan-generation.js --profile scripts/test-profile.json [--expected scripts/expected-results.json]
 * 
 * This script:
 * 1. Reads a user profile from JSON
 * 2. Generates a training plan using TrainingPlanAIService
 * 3. Outputs full plan structure
 * 4. Compares against expected results (if provided)
 * 5. Writes results to test-results/ directory
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let profilePath = null;
let expectedPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--profile' && args[i + 1]) {
    profilePath = args[i + 1];
    i++;
  } else if (args[i] === '--expected' && args[i + 1]) {
    expectedPath = args[i + 1];
    i++;
  }
}

if (!profilePath) {
  console.error('❌ Error: --profile argument required');
  console.log('\nUsage: node scripts/test-plan-generation.js --profile <profile.json> [--expected <expected.json>]');
  console.log('\nExample: node scripts/test-plan-generation.js --profile scripts/test-profile.json');
  process.exit(1);
}

// Read profile
let profile;
try {
  const profileContent = fs.readFileSync(profilePath, 'utf8');
  profile = JSON.parse(profileContent);
  console.log('✅ Profile loaded from:', profilePath);
} catch (error) {
  console.error('❌ Error reading profile:', error.message);
  process.exit(1);
}

// Read expected results (optional)
let expected = null;
if (expectedPath) {
  try {
    const expectedContent = fs.readFileSync(expectedPath, 'utf8');
    expected = JSON.parse(expectedContent);
    console.log('✅ Expected results loaded from:', expectedPath);
  } catch (error) {
    console.warn('⚠️  Warning: Could not read expected results:', error.message);
  }
}

// Import TrainingPlanAIService (we'll need to set up the environment)
// For now, we'll use a dynamic import approach
async function runTest() {
  try {
    console.log('\n🚀 Starting plan generation...\n');
    
    // Note: This script needs to run in a Node environment that can import ES modules
    // You may need to use a tool like ts-node or babel-node, or convert to CommonJS
    // For now, this is a template - you'll need to adjust based on your build setup
    
    console.log('📋 Profile Summary:');
    console.log(`   Race: ${profile.raceDistance} in ${profile.raceTime}`);
    console.log(`   Start: ${profile.startDate} → Race: ${profile.raceDate}`);
    console.log(`   Current: ${profile.currentWeeklyMileage} mpw, ${profile.currentLongRun} mile long run`);
    console.log(`   Days: ${profile.availableDays.join(', ')}`);
    console.log(`   Hard days: ${profile.qualityDays.join(', ')}`);
    if (profile.standUpBikeType) {
      console.log(`   Bike days: ${profile.preferredBikeDays.join(', ')} (${profile.standUpBikeType})`);
    }
    
    console.log('\n⚠️  NOTE: This script requires ES module support.');
    console.log('   You may need to:');
    console.log('   1. Use ts-node: npx ts-node scripts/test-plan-generation.js --profile ...');
    console.log('   2. Or convert to CommonJS and use require()');
    console.log('   3. Or run in browser dev mode instead\n');
    
    // Create test-results directory
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Save profile for reference
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const profileOutputPath = path.join(resultsDir, `profile-${timestamp}.json`);
    fs.writeFileSync(profileOutputPath, JSON.stringify(profile, null, 2));
    console.log(`💾 Profile saved to: ${profileOutputPath}`);
    
    if (expected) {
      const expectedOutputPath = path.join(resultsDir, `expected-${timestamp}.json`);
      fs.writeFileSync(expectedOutputPath, JSON.stringify(expected, null, 2));
      console.log(`💾 Expected results saved to: ${expectedOutputPath}`);
    }
    
    console.log('\n📝 Next steps:');
    console.log('   1. Use the Dev Mode UI at /dev to generate plans visually');
    console.log('   2. Or modify this script to work with your build setup');
    console.log('   3. Or use the browser console to call TrainingPlanAIService.generateTrainingPlan(profile)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runTest();



