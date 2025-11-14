import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrainingPlanService from '../services/TrainingPlanService.js';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { formatEquipmentName } from '../utils/typography';
import logger from '../utils/logger';

// Modern Date Picker Component
function ModernDatePicker({ selected, onChange, minDate, maxDate, placeholder }) {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      minDate={minDate}
      maxDate={maxDate}
      placeholderText={placeholder}
      className="modern-date-input"
      wrapperClassName="modern-date-wrapper"
      calendarClassName="modern-calendar"
      popperClassName="modern-popper"
      showPopperArrow={false}
      dateFormat="MMMM d, yyyy"
      popperPlacement="bottom-start"
      style={{
        fontSize: '1.1rem',
        padding: '14px 16px',
        minWidth: '220px',
        border: '2px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '8px',
        background: 'rgba(255, 255, 255, 0.05)',
        color: '#fff',
        cursor: 'pointer'
      }}
    />
  );
}

// Training Dial Component - Mobile-first circular input
function TrainingDial({ value, onChange, maxValue, unit, zones }) {
  const [isDragging, setIsDragging] = useState(false);
  const dialRef = React.useRef(null);

  // Calculate angle based on value (270° range, starting at 225° from top)
  const minAngle = 225; // Start at bottom-left
  const valueAngle = minAngle + ((value / maxValue) * 270);

  // Convert angle to radians for positioning
  const angleRad = (valueAngle * Math.PI) / 180;
  const centerX = 150; // Half of 300px dial
  const centerY = 150;
  const radius = 120;

  // Calculate handle position
  const handleX = centerX + radius * Math.cos(angleRad);
  const handleY = centerY + radius * Math.sin(angleRad);

  // Get current zone info
  const currentZone = zones.find(zone => value >= zone.min && value <= zone.max) || zones[0];

  // Handle mouse/touch events
  const handleStart = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMove = React.useCallback((e) => {
    if (!isDragging || !dialRef.current) return;

    e.preventDefault(); // Prevent scrolling on mobile

    const rect = dialRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;

    // Calculate angle from center
    let angle = Math.atan2(y, x) * 180 / Math.PI;

    // Normalize angle to 0-360
    if (angle < 0) angle += 360;

    // Convert to value within our 270° range
    let normalizedAngle;
    if (angle >= 225 || angle <= 135) {
      // Within our active range
      if (angle >= 225) {
        normalizedAngle = angle - 225; // 0-135°
      } else {
        normalizedAngle = angle + 135; // 135-270°
      }
      const newValue = Math.round((normalizedAngle / 270) * maxValue);
      onChange(Math.max(0, Math.min(maxValue, newValue)));
    }
  }, [isDragging, centerX, centerY, maxValue, onChange]);

  const handleEnd = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for mouse/touch move and end
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false }); // passive: false allows preventDefault
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      margin: '20px 0',
      userSelect: 'none'
    }}>
      {/* Dial Container */}
      <div
        ref={dialRef}
        style={{
          position: 'relative',
          width: '300px',
          height: '300px',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none' // Prevent browser touch gestures
        }}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
      >
        {/* Background Circle */}
        <svg width="300" height="300" style={{ position: 'absolute' }}>
          {/* Zone Arcs */}
          {zones.map((zone, i) => {
            const startAngle = minAngle + ((zone.min / maxValue) * 270);
            const endAngle = minAngle + ((zone.max / maxValue) * 270);
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = centerX + radius * Math.cos(startRad);
            const y1 = centerY + radius * Math.sin(startRad);
            const x2 = centerX + radius * Math.cos(endRad);
            const y2 = centerY + radius * Math.sin(endRad);

            const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;

            return (
              <path
                key={i}
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
                stroke={zone.color}
                strokeWidth="20"
                fill="none"
                opacity={0.3}
              />
            );
          })}

          {/* Active Arc */}
          {value > 0 && (
            <path
              d={`M ${centerX + radius * Math.cos((minAngle * Math.PI) / 180)} ${centerY + radius * Math.sin((minAngle * Math.PI) / 180)} A ${radius} ${radius} 0 ${((value / maxValue) * 270) > 180 ? 1 : 0} 1 ${handleX} ${handleY}`}
              stroke={currentZone.color}
              strokeWidth="8"
              fill="none"
            />
          )}
        </svg>

        {/* Handle */}
        <div
          style={{
            position: 'absolute',
            left: handleX - 15,
            top: handleY - 15,
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: currentZone.color,
            border: '3px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            cursor: 'grab',
            zIndex: 10
          }}
        />

        {/* Center Display */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: currentZone.color }}>
            {value}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#D1D5DB', marginTop: '4px' }}>
            {unit}
          </div>
          <div style={{ fontSize: '0.8rem', color: currentZone.color, marginTop: '8px', fontWeight: '500' }}>
            {currentZone.label}
          </div>
        </div>
      </div>

      {/* Quick Set Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '16px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {zones.map((zone, i) => (
          <button
            key={i}
            onClick={() => onChange(Math.floor((zone.min + zone.max) / 2))}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: `2px solid ${zone.color}`,
              backgroundColor: value >= zone.min && value <= zone.max ? zone.color : 'transparent',
              color: value >= zone.min && value <= zone.max ? 'white' : zone.color,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {zone.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OnboardingFlow({ onComplete }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Info (Steps 1-4 - Similar to Runna)
    goal: '',
    raceDistance: '',
    raceElevationProfile: '',
    experienceLevel: '',
    currentRaceTime: '',
    currentWeeklyMileage: '',
    currentLongRunDistance: '',

    // Schedule (Steps 5-7 - Enhanced from Runna)
    runsPerWeek: '',
    availableDays: [],
    preferredBikeDays: [],
    longRunDay: '',
    hardSessionsPerWeek: '',
    hardSessionDays: [],
    startDate: '',
    raceDate: '',
    missedWorkoutPreference: 'modify', // Default: modify plan when workouts are missed

    // Our Competitive Advantages (Steps 8-12)
    standUpBikeType: null,
    runningStatus: 'active', // 'active', 'bikeOnly', or 'transitioning'
    location: '',
    climate: '',
    trainingStyle: 'adventure', // Always use adventure mode - our core differentiator!
    trainingPhilosophy: 'practical_periodization', // Default: Real World Training
    hasGarmin: null // true, false, or null (not answered yet)
  });

  const totalSteps = 7;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Check if a step should be shown
  const shouldShowStep = (stepNumber) => {
    // Skip Step 5 (Training Philosophy & Missed Workout Handling) - not ready yet
    if (stepNumber === 5) {
      return false;
    }
    return true;
  };

  // Determine next step with conditional logic
  const getNextStep = (current) => {
    let next = current + 1;
    
    // Skip steps that shouldn't be shown
    while (next <= totalSteps && !shouldShowStep(next)) {
      next++;
    }
    
    return next;
  };

  const nextStep = () => {
    const nextStepNumber = getNextStep(currentStep);
    if (nextStepNumber <= totalSteps) {
      setCurrentStep(nextStepNumber);
      // Scroll to top when moving to next step
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleComplete();
    }
  };

  // Determine previous step with conditional logic
  const getPrevStep = (current) => {
    let prev = current - 1;
    
    // Skip steps that shouldn't be shown
    while (prev >= 1 && !shouldShowStep(prev)) {
      prev--;
    }
    
    return prev;
  };

  const prevStep = () => {
    const prevStepNumber = getPrevStep(currentStep);
    if (prevStepNumber >= 1) {
      setCurrentStep(prevStepNumber);
      // Scroll to top when moving to previous step
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };


  // Helper method to extract goal race time from user input
  const extractGoalRaceTimeFromUserInput = (formData) => {
    const goalTime = {};

    if (formData.currentRaceTime) {
      // Parse the format: "distance-time" e.g., "5K-22:00" or "Marathon-3:45:00"
      const [distance, time] = formData.currentRaceTime.split('-');
      if (distance && time) {
        // Map UI distance names to goal object keys
        const distanceMap = {
          '5K': '5K',
          '10K': '10K',
          'Half': 'halfMarathon',
          'Marathon': 'marathon'
        };

        const goalKey = distanceMap[distance];
        if (goalKey) {
          goalTime[goalKey] = time;
        }
      }
    }

    // If no goal race time provided, we cannot generate training paces
    if (Object.keys(goalTime).length === 0) {
      throw new Error('Goal race time is required to calculate training paces. Please select your target race time.');
    }

    return goalTime;
  };

  // Helper function to adjust start date to next available training day if needed
  const adjustStartDateIfNeeded = (startDate, availableDays) => {
    if (!startDate || !availableDays || availableDays.length === 0) {
      return { adjustedDate: startDate, wasAdjusted: false };
    }

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(startDate + 'T00:00:00');
    const originalDate = new Date(date);
    let daysChecked = 0;
    const maxDaysToCheck = 7;

    while (daysChecked < maxDaysToCheck) {
      const dayOfWeek = daysOfWeek[date.getDay()];

      if (availableDays.includes(dayOfWeek)) {
        // Found an available training day
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const adjustedDate = `${year}-${month}-${day}`;

        const wasAdjusted = date.getTime() !== originalDate.getTime();

        if (wasAdjusted) {
          logger.log(`📅 Start date adjusted from ${startDate} (${daysOfWeek[originalDate.getDay()]}) to ${adjustedDate} (${dayOfWeek}) - original date was a rest day`);
        }

        return { adjustedDate, wasAdjusted, originalDayName: daysOfWeek[originalDate.getDay()], newDayName: dayOfWeek };
      }

      // Move to next day
      date.setDate(date.getDate() + 1);
      daysChecked++;
    }

    // Shouldn't happen unless availableDays is empty
    return { adjustedDate: startDate, wasAdjusted: false };
  };

  const handleComplete = async () => {
    try {
      // Validate required fields first - safety check!
      if (!formData.currentRaceTime) {
        alert('Goal race time is required to calculate your training paces. Please select your target race time.');
        return;
      }

      // Adjust start date if it falls on a rest day
      const dateAdjustment = adjustStartDateIfNeeded(formData.startDate, formData.availableDays);

      if (dateAdjustment.wasAdjusted) {
        // Update formData with adjusted date
        formData.startDate = dateAdjustment.adjustedDate;

        // Notify user about the adjustment
        const message = `Your start date has been automatically adjusted from ${dateAdjustment.originalDayName} to ${dateAdjustment.newDayName} because ${dateAdjustment.originalDayName} is marked as a rest day in your schedule.`;
        logger.log(`⚠️ ${message}`);
        alert(message);
      }

      // Generate training plan using TrainingPlanService
      logger.log('🔧 Creating training plan service...');
      const trainingPlanService = new TrainingPlanService();

      logger.log('📋 Converting form data to training plan profile...', formData);

      // Calculate rest days (days not in availableDays)
      const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const restDays = allDays.filter(day => !formData.availableDays.includes(day));

      // Use the exact hard session days selected by user
      const hardDays = formData.hardSessionDays;

      logger.log('🔍 User selections:');
      logger.log('   📅 Available training days:', formData.availableDays);
      logger.log('   😴 Rest days:', restDays);
      logger.log('   🚴 Cyclete days:', formData.preferredBikeDays);
      logger.log('   💪 Hard session days:', hardDays);
      logger.log('   🏃 Long run day:', formData.longRunDay);
      logger.log('   📏 Current weekly mileage:', parseInt(formData.currentWeeklyMileage) || 'NOT PROVIDED', 'miles');

      logger.log('🚀 Generating training plan with user profile');
      // Generate plan using working service
      const planResult = await trainingPlanService.generatePlanFromOnboarding(formData);
      logger.log('✅ Training plan created successfully');

      if (planResult && planResult.plan) {
        logger.log('Generated training plan:', planResult);
        await onComplete(formData, planResult.plan);
        logger.log('✅ Plan saved successfully, navigating to dashboard...');
        navigate('/dashboard');
      } else {
        console.error('Failed to generate plan');
        // Fall back to the mock plan
        const mockPlan = generateMockPlan(formData);
        await onComplete(formData, mockPlan);
        logger.log('✅ Mock plan saved successfully, navigating to dashboard...');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error in plan generation or saving:', error);
      alert('There was a problem creating or saving your plan. Please try again. Error: ' + error.message);
      // Don't navigate if there was an error - let user retry
    }
  };

  const generateMockPlan = (data) => {
    return {
      planOverview: {
        raceDistance: data.raceDistance,
        raceDate: data.raceDate,
        startDate: data.startDate,
        totalWeeks: data.raceDate && data.startDate ? Math.ceil((new Date(data.raceDate) - new Date(data.startDate)) / (1000 * 60 * 60 * 24 * 7)) : 12,
        runsPerWeek: data.runsPerWeek,
        standUpBikeType: data.standUpBikeType,
        location: data.location
      },
      weeks: [
        {
          week: 1,
          phase: 'base',
          totalMileage: 15,
          workouts: [
            { day: 'Tuesday', type: 'tempo', workout: { name: 'Sandwich Tempo' }, focus: 'Lactate Threshold' },
            { day: 'Thursday', type: 'easy', workout: { name: 'Easy Run' }, focus: 'Recovery' },
            { day: 'Sunday', type: 'longRun', workout: { name: 'Conversational Long Run' }, focus: 'Endurance' }
          ]
        }
      ]
    };
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px 0' }}>
      <div className="container">
        {/* Progress Bar */}
        <div className="progress-bar" style={{ marginBottom: '20px' }}>
          <div 
            className="progress-fill" 
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          ></div>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ color: '#E5E7EB', margin: 0 }}>
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <div className="card fade-in">
          {renderStep()}
          
          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', gap: '16px' }}>
            {currentStep > 1 && (
              <button className="btn btn-secondary" onClick={prevStep}>
                ← Back
              </button>
            )}
            
            <button 
              className="btn btn-primary" 
              onClick={nextStep}
              style={{ marginLeft: 'auto' }}
            >
              {currentStep === totalSteps ? '🎉 Create My Plan' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function renderStep() {
    switch (currentStep) {
      case 1:
        // New Step 1: Training Goals & Background (combines old steps 1, 2, 3, 4)
        return (
          <div>
            <h2 style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '1.75rem', marginBottom: '16px' }}>Training Goals & Background</h2>
            <p><strong>🎯 Let's understand your running journey!</strong> We'll collect your basic info to create the perfect plan.</p>
            
            {/* Goal Selection */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>What's your main training goal?</h3>
              <div className="card-grid">
                {[
                  { id: 'race', name: 'Train for a race', icon: '🏆' },
                  { id: 'distance', name: 'Run a specific distance', icon: '📏' },
                  { id: 'fitness', name: 'General fitness', icon: '💪' },
                  { id: 'return', name: 'Return to running', icon: '🔄' }
                ].map(goal => (
                  <div 
                    key={goal.id}
                    className={`equipment-card ${formData.goal === goal.id ? 'selected' : ''}`}
                    onClick={() => updateFormData('goal', goal.id)}
                  >
                    <div className="equipment-icon">{goal.icon}</div>
                    <p className="equipment-name">{goal.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Race Distance */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>What distance are you training for?</h3>
              <div className="card-grid">
                {[
                  { id: '5K', name: '5K', popular: true },
                  { id: '10K', name: '10K', popular: true },
                  { id: 'Half', name: 'Half Marathon', popular: true },
                  { id: 'Marathon', name: 'Marathon', popular: true },
                  { id: 'Ultra', name: 'Ultra Marathon', badge: 'We support 50K+!' },
                  { id: 'Custom', name: 'Custom Distance', badge: 'Any distance!' }
                ].map(distance => (
                  <div 
                    key={distance.id}
                    className={`equipment-card ${formData.raceDistance === distance.id ? 'selected' : ''}`}
                    onClick={() => updateFormData('raceDistance', distance.id)}
                  >
                    <p className="equipment-name">{distance.name}</p>
                    {distance.popular && <div className="badge badge-success">Popular</div>}
                    {distance.badge && <div className="badge badge-info">{distance.badge}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Race Elevation Profile */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>What's the elevation profile of your race?</h3>
              <p>This helps us customize your hill training for your specific race demands!</p>
              <div className="card-grid">
                {[
                  { id: 'flat', name: '🏙️ Flat', desc: 'Minimal elevation change', badge: 'Speed Focus' },
                  { id: 'rolling', name: '🌊 Rolling', desc: 'Gentle hills throughout', badge: 'Balanced' },
                  { id: 'moderate', name: '⛰️ Moderate', desc: 'Some significant hills', badge: 'Hill Training' },
                  { id: 'hilly', name: '🏔️ Hilly', desc: 'Major elevation challenges', badge: 'Power Focus' }
                ].map(profile => (
                  <div 
                    key={profile.id}
                    className={`card ${formData.raceElevationProfile === profile.id ? 'selected' : ''}`}
                    onClick={() => updateFormData('raceElevationProfile', profile.id)}
                    style={{ cursor: 'pointer', padding: '16px', textAlign: 'center' }}
                  >
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{profile.name}</h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#ccc' }}>{profile.desc}</p>
                    <div className="badge badge-info" style={{ fontSize: '0.75rem' }}>{profile.badge}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)', marginTop: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  <strong>🎯 Smart Training:</strong> We'll adjust your hill workout frequency based on your race profile. 
                  Flat races get speed focus, hilly races get power development!
                </p>
              </div>
            </div>

            {/* Experience Level */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>How would you rate your running ability?</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                {[
                  { id: 'beginner', name: 'Beginner', desc: 'New to running or returning after a break' },
                  { id: 'intermediate', name: 'Intermediate', desc: 'Running regularly, some race experience' },
                  { id: 'advanced', name: 'Advanced', desc: 'Experienced with structured training' },
                  { id: 'elite', name: 'Elite', desc: 'Competitive athlete with advanced training needs' }
                ].map(level => (
                  <div 
                    key={level.id}
                    className={`card ${formData.experienceLevel === level.id ? 'selected' : ''}`}
                    onClick={() => updateFormData('experienceLevel', level.id)}
                    style={{ cursor: 'pointer', padding: '20px' }}
                  >
                    <h4 style={{ margin: '0 0 8px 0' }}>{level.name}</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{level.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Goal Race Time */}
            <div>
              <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>What's your GOAL race time?</h3>
              <p style={{ fontSize: '0.95rem', color: '#D1D5DB', marginBottom: '16px' }}>
                💪 Be ambitious! We'll build your training paces around your target finish time.
              </p>

              {/* Input method selection */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    className={`btn ${!formData.customTimeEntry ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      updateFormData('customTimeEntry', false);
                      updateFormData('currentRaceTime', '');
                    }}
                    type="button"
                  >
                    📋 Quick Pick
                  </button>
                  <button
                    className={`btn ${formData.customTimeEntry ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      updateFormData('customTimeEntry', true);
                      updateFormData('currentRaceTime', '');
                    }}
                    type="button"
                  >
                    ⌨️ Enter My Goal
                  </button>
                </div>
              </div>

              {!formData.customTimeEntry ? (
                // Smart dropdown - only shows times for selected race distance
                <div className="form-group">
                  <label className="form-label">Select Your Goal {formData.raceDistance || 'Race'} Time</label>
                  <select
                    className="form-input form-select"
                    value={formData.currentRaceTime}
                    onChange={(e) => updateFormData('currentRaceTime', e.target.value)}
                    required
                    disabled={!formData.raceDistance}
                  >
                    <option value="">{formData.raceDistance ? `Select your ${formData.raceDistance} goal time` : 'Select race distance first'}</option>

                    {formData.raceDistance === '5K' && (
                      <>
                        <option value="5K-15:00">15:00 (Elite)</option>
                        <option value="5K-18:00">18:00 (Fast)</option>
                        <option value="5K-20:00">20:00 (Strong)</option>
                        <option value="5K-22:00">22:00 (Solid)</option>
                        <option value="5K-25:00">25:00 (Good)</option>
                        <option value="5K-28:00">28:00 (Steady)</option>
                        <option value="5K-30:00">30:00 (Building)</option>
                        <option value="5K-35:00">35:00 (Developing)</option>
                        <option value="5K-40:00">40:00 (Starting)</option>
                      </>
                    )}

                    {formData.raceDistance === '10K' && (
                      <>
                        <option value="10K-32:00">32:00 (Elite)</option>
                        <option value="10K-38:00">38:00 (Fast)</option>
                        <option value="10K-42:00">42:00 (Strong)</option>
                        <option value="10K-45:00">45:00 (Solid)</option>
                        <option value="10K-50:00">50:00 (Good)</option>
                        <option value="10K-55:00">55:00 (Steady)</option>
                        <option value="10K-60:00">60:00 (Building)</option>
                        <option value="10K-70:00">70:00 (Developing)</option>
                        <option value="10K-80:00">80:00 (Starting)</option>
                      </>
                    )}

                    {formData.raceDistance === 'Half' && (
                      <>
                        <option value="Half-1:10:00">1:10:00 (Elite)</option>
                        <option value="Half-1:25:00">1:25:00 (Fast)</option>
                        <option value="Half-1:35:00">1:35:00 (Strong)</option>
                        <option value="Half-1:45:00">1:45:00 (Solid)</option>
                        <option value="Half-2:00:00">2:00:00 (Good)</option>
                        <option value="Half-2:15:00">2:15:00 (Steady)</option>
                        <option value="Half-2:30:00">2:30:00 (Building)</option>
                        <option value="Half-2:45:00">2:45:00 (Developing)</option>
                        <option value="Half-3:00:00">3:00:00 (Starting)</option>
                      </>
                    )}

                    {formData.raceDistance === 'Marathon' && (
                      <>
                        <option value="Marathon-2:30:00">2:30:00 (Elite)</option>
                        <option value="Marathon-3:00:00">3:00:00 (Fast)</option>
                        <option value="Marathon-3:30:00">3:30:00 (Strong)</option>
                        <option value="Marathon-4:00:00">4:00:00 (Solid)</option>
                        <option value="Marathon-4:30:00">4:30:00 (Good)</option>
                        <option value="Marathon-5:00:00">5:00:00 (Steady)</option>
                        <option value="Marathon-5:30:00">5:30:00 (Building)</option>
                        <option value="Marathon-6:00:00">6:00:00 (Developing)</option>
                        <option value="Marathon-6:30:00">6:30:00 (Starting)</option>
                      </>
                    )}
                  </select>
                  {!formData.raceDistance && (
                    <p style={{ fontSize: '0.85rem', color: '#FFB366', marginTop: '8px' }}>
                      ⬆️ Please select your race distance first
                    </p>
                  )}
                </div>
              ) : (
                // Custom time entry
                <div>
                  <div className="form-group">
                    <label className="form-label">Race Distance</label>
                    <select
                      className="form-input form-select"
                      value={formData.customRaceDistance || ''}
                      onChange={(e) => updateFormData('customRaceDistance', e.target.value)}
                    >
                      <option value="">Select distance</option>
                      <option value="5K">5K</option>
                      <option value="10K">10K</option>
                      <option value="15K">15K</option>
                      <option value="Half">Half Marathon</option>
                      <option value="25K">25K</option>
                      <option value="30K">30K</option>
                      <option value="Marathon">Marathon</option>
                      <option value="50K">50K</option>
                      <option value="Other">Other Distance</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Your Goal Time (HH:MM:SS or MM:SS)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., 1:45:30 or 25:45"
                      value={formData.customRaceTime || ''}
                      onChange={(e) => {
                        updateFormData('customRaceTime', e.target.value);
                        // Combine distance and time for processing
                        if (formData.customRaceDistance && e.target.value) {
                          updateFormData('currentRaceTime', `${formData.customRaceDistance}-${e.target.value}`);
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {formData.currentRaceTime && (
                <div className="card" style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', marginTop: '16px' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    <strong>🎯 Goal set!</strong> All your training paces will be calculated to help you achieve this time.
                    <br />
                    <span style={{ fontSize: '0.85rem', color: '#D1D5DB' }}>
                      💡 Workouts feeling too hard? You can always adjust your goal later!
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Current Training Assessment */}
            <div style={{ marginBottom: '32px', marginTop: '40px' }}>
              <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>Current Training Assessment</h3>
              <p>Tell us about your current training so we can create a safe, progressive plan.</p>
              
              {/* Current Weekly Mileage - Training Dial */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#F8F9FA', fontWeight: '600', fontSize: '1.1rem', marginBottom: '10px' }}>What's your current weekly mileage?</h4>
                <p style={{ fontSize: '0.9rem', margin: '0 0 24px 0', color: '#ccc' }}>
                  Include all running and running-equivalent activities (cycling at 3:1 ratio, elliptical at 2:1)
                </p>
                <TrainingDial
                  value={parseInt(formData.currentWeeklyMileage) || 0}
                  onChange={(value) => updateFormData('currentWeeklyMileage', value.toString())}
                  maxValue={80}
                  unit="miles/week"
                  zones={[
                    { min: 0, max: 10, label: 'Building Base', color: '#4CAF50' },
                    { min: 11, max: 25, label: 'Light Base', color: '#2196F3' },
                    { min: 26, max: 40, label: 'Solid Base', color: '#FF9800' },
                    { min: 41, max: 60, label: 'High Volume', color: '#F44336' },
                    { min: 61, max: 80, label: 'Elite Volume', color: '#9C27B0' }
                  ]}
                />
              </div>

              {/* Current Long Run Distance - Training Dial */}
              <div>
                <h4 style={{ color: '#F8F9FA', fontWeight: '600', fontSize: '1.1rem', marginBottom: '10px' }}>What's your current long run distance?</h4>
                <p style={{ fontSize: '0.9rem', margin: '0 0 24px 0', color: '#ccc' }}>
                  Your longest single run in the past 4 weeks
                </p>
                <TrainingDial
                  value={parseInt(formData.currentLongRunDistance) || 0}
                  onChange={(value) => updateFormData('currentLongRunDistance', value.toString())}
                  maxValue={26}
                  unit="miles"
                  zones={[
                    { min: 0, max: 3, label: 'Building Base', color: '#4CAF50' },
                    { min: 4, max: 8, label: '5K-10K Ready', color: '#2196F3' },
                    { min: 9, max: 13, label: 'Half Base', color: '#FF9800' },
                    { min: 14, max: 18, label: 'Strong Endurance', color: '#F44336' },
                    { min: 19, max: 26, label: 'Marathon Ready', color: '#9C27B0' }
                  ]}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        // New Step 2: Training Schedule & Frequency (combines old steps 5, 6, 12)
        return (
          <div>
            <h2 style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '1.75rem', marginBottom: '16px' }}>Training Schedule & Frequency</h2>
            <p><strong>🗓️ Let's plan your training week!</strong> Tell us about your schedule and preferences.</p>

            {/* Runs Per Week */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>How many days per week would you like to train?</h3>
              <p><strong>🚀 Unlike other apps, we don't restrict your choices!</strong> Pick what works for your schedule.</p>
              <div className="card-grid">
                {[
                  { 
                    days: 3, 
                    desc: 'Minimal time commitment', 
                    good: 'Busy schedules, recovery focus',
                    recommended: formData.experienceLevel === 'beginner'
                  },
                  { 
                    days: 4, 
                    desc: 'Balanced approach', 
                    good: 'Most popular, sustainable',
                    recommended: formData.experienceLevel === 'intermediate'
                  },
                  { 
                    days: 5, 
                    desc: 'Serious training', 
                    good: 'Race goals, fitness gains',
                    recommended: formData.experienceLevel === 'advanced'
                  },
                  { 
                    days: 6, 
                    desc: 'High volume', 
                    good: 'Perfect for stand-up bike integration',
                    recommended: false
                  },
                  { 
                    days: 7, 
                    desc: 'Maximum frequency', 
                    good: 'Elite athletes, varied intensities',
                    recommended: formData.experienceLevel === 'elite'
                  }
                ].map(option => (
                  <div 
                    key={option.days}
                    className={`card ${formData.runsPerWeek === option.days ? 'selected' : ''}`}
                    onClick={() => updateFormData('runsPerWeek', option.days)}
                    style={{ cursor: 'pointer', textAlign: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '6px' }}>
                      <h4 style={{ fontSize: '1.4rem', margin: 0, color: '#00D4FF' }}>{option.days}</h4>
                      {option.recommended && <span style={{ fontSize: '0.8rem' }}>⭐</span>}
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>{option.desc}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#D1D5DB' }}>Good for: {option.good}</p>
                    {option.recommended && (
                      <div className="badge badge-success" style={{ marginTop: '8px' }}>
                        Recommended for {formData.experienceLevel === 'advanced' ? 'advanced runners' : `${formData.experienceLevel} runners`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Available Days */}
            {formData.runsPerWeek && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>Which days are you available to train?</h3>
                <p>Select {formData.runsPerWeek} days that work best for your schedule.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', maxWidth: '500px', margin: '0 auto' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                    const isSelected = formData.availableDays.includes(day);
                    const isAtLimit = formData.availableDays.length >= formData.runsPerWeek;
                    const isDisabled = !isSelected && isAtLimit;
                    
                    return (
                    <div 
                      key={day}
                      className={`equipment-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                      onClick={() => {
                        const isCurrentlySelected = formData.availableDays.includes(day);
                        
                        if (isCurrentlySelected) {
                          // Always allow deselection
                          const newDays = formData.availableDays.filter(d => d !== day);
                          updateFormData('availableDays', newDays);
                        } else {
                          // Only allow selection if under the limit
                          if (formData.availableDays.length < formData.runsPerWeek) {
                            const newDays = [...formData.availableDays, day];
                            updateFormData('availableDays', newDays);
                          }
                        }
                      }}
                      style={{ 
                        opacity: isDisabled ? 0.4 : 1,
                        cursor: isDisabled ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <p className="equipment-name">{day}</p>
                      {isDisabled && (
                        <span style={{ fontSize: '0.7rem', color: '#D1D5DB' }}>Limit reached</span>
                      )}
                    </div>
                    );
                  })}
                </div>
                <div className="card" style={{ 
                  background: formData.availableDays.length === formData.runsPerWeek 
                    ? 'rgba(0, 255, 136, 0.1)' 
                    : 'rgba(255, 184, 0, 0.1)', 
                  border: formData.availableDays.length === formData.runsPerWeek 
                    ? '1px solid rgba(0, 255, 136, 0.3)'
                    : '1px solid rgba(255, 184, 0, 0.3)',
                  marginTop: '16px'
                }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    {formData.availableDays.length === formData.runsPerWeek 
                      ? `✅ Perfect! Selected all ${formData.runsPerWeek} training days.`
                      : `Selected: ${formData.availableDays.length}/${formData.runsPerWeek} days ${formData.availableDays.length < formData.runsPerWeek ? '(select more)' : ''}`
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Long Run Day */}
            {formData.availableDays.length === formData.runsPerWeek && (
              <div>
                <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>Which day do you prefer for your long run?</h3>
                <p><strong>🏃‍♂️ Personal preference matters!</strong> Pick the day that works best for your schedule.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', maxWidth: '500px', margin: '0 auto' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    .filter(day => formData.availableDays.includes(day))
                    .map(day => (
                    <div 
                      key={day}
                      className={`equipment-card ${formData.longRunDay === day ? 'selected' : ''}`}
                      onClick={() => updateFormData('longRunDay', day)}
                    >
                      <p className="equipment-name">{day}</p>
                      {(day === 'Saturday' || day === 'Sunday') && (
                        <div className="badge badge-success" style={{ marginTop: '4px', fontSize: '0.7rem' }}>
                          Popular choice
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {formData.longRunDay && (
                  <div className="card" style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', marginTop: '16px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      <strong>🎯 Great choice!</strong> Your long runs will be scheduled on {formData.longRunDay}s.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Hard Session Frequency */}
            {formData.longRunDay && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>Let's talk about your hard sessions!</h3>
                <p><strong>🏃‍♂️ Coach's question:</strong> In addition to your long run, how many hard sessions (speed, tempo, hills) would you like per week?</p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  {[1, 2].map(count => (
                    <div 
                      key={count}
                      className={`card ${formData.hardSessionsPerWeek === count ? 'selected' : ''}`}
                      onClick={() => updateFormData('hardSessionsPerWeek', count)}
                      style={{ cursor: 'pointer', textAlign: 'center', minWidth: '120px' }}
                    >
                      <h4 style={{ fontSize: '2rem', margin: '0 0 8px 0', color: '#00D4FF' }}>{count}</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        {count === 1 ? 'One hard session' : 'Two hard sessions'}
                      </p>
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: '#D1D5DB' }}>
                        {count === 1 ? 'Focus & recovery' : 'Balanced training'}
                      </p>
                    </div>
                  ))}
                </div>
                
                {formData.hardSessionsPerWeek && (
                  <div className="card" style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', marginTop: '16px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      <strong>🎯 Perfect!</strong> You'll get {formData.hardSessionsPerWeek} quality {formData.hardSessionsPerWeek === 1 ? 'session' : 'sessions'} per week, 
                      plus your long run for a total of {formData.hardSessionsPerWeek + 1} focused training days.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Hard Session Days */}
            {formData.hardSessionsPerWeek && (
              <div>
                <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>What days do you want your hard sessions?</h3>
                <p><strong>💪 Your preference matters!</strong> Pick the days that work best for your energy and schedule.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', maxWidth: '500px', margin: '0 auto' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    .filter(day => formData.availableDays.includes(day) && day !== formData.longRunDay)
                    .map(day => {
                      const isSelected = formData.hardSessionDays.includes(day);
                      const isAtLimit = formData.hardSessionDays.length >= formData.hardSessionsPerWeek;

                      // Check if this day is adjacent to any selected hard session day
                      const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day);
                      const isAdjacentToHardDay = formData.hardSessionDays.some(selectedDay => {
                        const selectedIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(selectedDay);
                        return Math.abs(dayIndex - selectedIndex) === 1;
                      });

                      const isDisabled = (!isSelected && isAtLimit) || (!isSelected && isAdjacentToHardDay);
                      const disabledReason = !isSelected && isAdjacentToHardDay ? 'Hard sessions need recovery days between them' : null;
                      
                      return (
                        <div 
                          key={day}
                          className={`equipment-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                          onClick={() => {
                            const isCurrentlySelected = formData.hardSessionDays.includes(day);
                            
                            if (isCurrentlySelected) {
                              // Always allow deselection
                              const newDays = formData.hardSessionDays.filter(d => d !== day);
                              updateFormData('hardSessionDays', newDays);
                            } else {
                              // Only allow selection if under the limit and not adjacent
                              if (formData.hardSessionDays.length < formData.hardSessionsPerWeek && !isAdjacentToHardDay) {
                                const newDays = [...formData.hardSessionDays, day];
                                updateFormData('hardSessionDays', newDays);
                              }
                            }
                          }}
                          style={{
                            opacity: isDisabled ? 0.4 : 1,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            position: 'relative'
                          }}
                          title={disabledReason || ''}
                        >
                          <p className="equipment-name">{day}</p>
                          {disabledReason && (
                            <div style={{
                              position: 'absolute',
                              bottom: '2px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              fontSize: '0.65rem',
                              color: '#FF6B6B',
                              textAlign: 'center',
                              lineHeight: '1.1',
                              whiteSpace: 'nowrap'
                            }}>
                              ⚠️ Need recovery
                            </div>
                          )}
                          {isDisabled && !disabledReason && (
                            <span style={{ fontSize: '0.7rem', color: '#D1D5DB' }}>Limit reached</span>
                          )}
                        </div>
                      );
                    })}
                </div>
                
                <div className="card" style={{ 
                  background: formData.hardSessionDays.length === formData.hardSessionsPerWeek 
                    ? 'rgba(0, 255, 136, 0.1)' 
                    : 'rgba(255, 184, 0, 0.1)', 
                  border: formData.hardSessionDays.length === formData.hardSessionsPerWeek 
                    ? '1px solid rgba(0, 255, 136, 0.3)'
                    : '1px solid rgba(255, 184, 0, 0.3)',
                  marginTop: '16px'
                }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    {formData.hardSessionDays.length === formData.hardSessionsPerWeek 
                      ? `✅ Excellent! Your hard sessions will be on ${formData.hardSessionDays.join(' and ')}, with your long run on ${formData.longRunDay}.`
                      : `Selected: ${formData.hardSessionDays.length}/${formData.hardSessionsPerWeek} hard session days ${formData.hardSessionDays.length < formData.hardSessionsPerWeek ? '(select more)' : ''}`
                    }
                  </p>
                </div>
                
                {formData.hardSessionDays.length === formData.hardSessionsPerWeek && (
                  <div className="card" style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)', marginTop: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      <strong>🎯 Smart scheduling!</strong> This gives you proper recovery between hard efforts and sets you up for training success.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        // New Step 3: Training Dates (combines old steps 7, 8)
        return (
          <div>
            <h2 style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '1.75rem', marginBottom: '16px' }}>Training Dates</h2>
            <p><strong>📅 Real dates, real planning!</strong> Unlike other apps, we give you actual calendar dates.</p>

            {/* Start Date */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>When would you like to start training?</h3>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <ModernDatePicker
                  selected={formData.startDate ? new Date(formData.startDate + 'T00:00:00') : null}
                  onChange={(date) => {
                    if (date) {
                      // Use local timezone date formatting to avoid off-by-one errors
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      updateFormData('startDate', `${year}-${month}-${day}`);
                    } else {
                      updateFormData('startDate', '');
                    }
                  }}
                  minDate={new Date()}
                  placeholder="Select your training start date"
                />
              </div>
              
              {formData.startDate && (
                <div className="card" style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    <strong>🎯 Perfect!</strong> Your training will begin on {new Date(formData.startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
                    <br />We'll schedule workouts on your selected days starting from this date.
                  </p>
                </div>
              )}
            </div>

            {/* Race Date */}
            <div>
              <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>When is your race?</h3>
              <p><strong>🏁 Goal-oriented training!</strong> We'll work backwards from your race date to optimize your preparation.</p>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Race Date</label>
                <ModernDatePicker
                  selected={formData.raceDate ? new Date(formData.raceDate + 'T00:00:00') : null}
                  onChange={(date) => {
                    if (date) {
                      // Use local timezone date formatting to avoid off-by-one errors
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      updateFormData('raceDate', `${year}-${month}-${day}`);
                    } else {
                      updateFormData('raceDate', '');
                    }
                  }}
                  minDate={formData.startDate ? new Date(formData.startDate + 'T00:00:00') : new Date()}
                  placeholder="Select your race date"
                />
              </div>
              
              <div style={{ minHeight: '120px', marginTop: '16px' }}>
                {formData.raceDate && formData.startDate && (() => {
                  const weeks = Math.ceil((new Date(formData.raceDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24 * 7));
                  const raceDistance = formData.raceDistance;

                  // Define minimum recommended weeks by race distance
                  const minWeeks = {
                    '5K': 6,
                    '10K': 8,
                    'Half': 10,
                    'Marathon': 12
                  };

                  const recommendedWeeks = {
                    '5K': 8,
                    '10K': 10,
                    'Half': 12,
                    'Marathon': 16
                  };

                  const minRequired = minWeeks[raceDistance] || 12;
                  const recommended = recommendedWeeks[raceDistance] || 16;

                  let cardStyle, message;

                  if (weeks < minRequired) {
                    // Dangerously short
                    cardStyle = { background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.5)' };
                    message = (
                      <>
                        <strong>⚠️ That's quite ambitious!</strong> Your race is on {new Date(formData.raceDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
                        <br />With only {weeks} weeks, you'll need an aggressive plan. Most coaches recommend at least {minRequired} weeks for a {raceDistance}.
                        <br /><em style={{ color: '#FFB366' }}>💡 Consider moving your start date earlier or choosing a later race for safer preparation.</em>
                      </>
                    );
                  } else if (weeks < recommended) {
                    // Short but doable
                    cardStyle = { background: 'rgba(255, 179, 102, 0.1)', border: '1px solid rgba(255, 179, 102, 0.5)' };
                    message = (
                      <>
                        <strong>💪 Challenging timeline!</strong> Your race is on {new Date(formData.raceDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
                        <br />With {weeks} weeks, it's doable but you'll need to stay consistent. Most coaches prefer {recommended} weeks for optimal {raceDistance} preparation.
                      </>
                    );
                  } else {
                    // Good timeline
                    cardStyle = { background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)' };
                    message = (
                      <>
                        <strong>🎯 Perfect timeline!</strong> Your race is on {new Date(formData.raceDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
                        <br />With {weeks} weeks to prepare, you'll have time for proper base building and peak training!
                      </>
                    );
                  }

                  return (
                    <div className="card" style={cardStyle}>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>{message}</p>
                    </div>
                  );
                })()}
              </div>
              
              <div className="card" style={{ background: 'rgba(255, 165, 0, 0.1)', border: '1px solid rgba(255, 165, 0, 0.3)', marginTop: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  <strong>💡 Pro tip:</strong> Don't have a specific race yet? Pick a target date 12-16 weeks out - you can always adjust later!
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        // New Step 4: Equipment & Training Preferences (combines old steps 10, 11, 13)
        return (
          <div>
            <h2 style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '1.75rem', marginBottom: '16px' }}>Equipment & Training Preferences</h2>
            <p><strong>🚀 Unique to Run+ Plans!</strong> We're the only app with equipment-specific training.</p>

            {/* Garmin Device Question */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>Do you have a Garmin device?</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '400px', margin: '0 auto' }}>
                <div
                  className={`card ${formData.hasGarmin === true ? 'selected' : ''}`}
                  onClick={() => updateFormData('hasGarmin', true)}
                  style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }}
                >
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Yes</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#D1D5DB' }}>I have a Garmin</p>
                </div>
                <div
                  className={`card ${formData.hasGarmin === false ? 'selected' : ''}`}
                  onClick={() => updateFormData('hasGarmin', false)}
                  style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }}
                >
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>No</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#D1D5DB' }}>I don't have one</p>
                </div>
              </div>

              {/* Show RunEQ Data Field info if they have a Garmin */}
              {formData.hasGarmin === true && (
                <div className="card" style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#FFFFFF', fontWeight: '600', fontSize: '1.1rem' }}>
                    Download the RunEQ Data Field
                  </h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#E5E7EB' }}>
                    Track your bike workouts with RunEQ miles on your Garmin device.
                  </p>
                  <a
                    href="https://apps.garmin.com/apps/2327f1b2-a481-4c9e-b529-852e9989cf55"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '12px 24px',
                      background: 'rgba(0, 212, 255, 0.2)',
                      border: '2px solid #00D4FF',
                      borderRadius: '8px',
                      color: '#00D4FF',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '1rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(0, 212, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(0, 212, 255, 0.2)';
                    }}
                  >
                    Get RunEQ Data Field
                  </a>
                  <p style={{ margin: '12px 0 0 0', fontSize: '0.85rem', color: '#D1D5DB' }}>
                    Your bike workouts will show RunEQ miles in the training plan
                  </p>
                </div>
              )}

              {/* Show info for non-Garmin users */}
              {formData.hasGarmin === false && (
                <div className="card" style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)', marginTop: '16px' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    <strong>No problem!</strong> Your bike workouts will show time and distance instead.
                  </p>
                </div>
              )}
            </div>

            {/* Stand-up Bike Equipment */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>Do you have any stand-up bikes?</h3>
              <div className="equipment-grid">
                {[
                  {
                    id: 'cyclete',
                    name: 'Cyclete',
                    desc: 'Teardrop motion, excellent for distance training',
                    badge: 'Running-like motion'
                  },
                  {
                    id: 'elliptigo',
                    name: 'ElliptiGO',
                    desc: 'Elliptical motion, great for full-body workouts',
                    badge: 'Full body engagement'
                  },
                  {
                    id: null,
                    name: 'Neither',
                    desc: 'Pure running training with basic cross-training options',
                    badge: 'Traditional approach'
                  }
                ].map(equipment => (
                  <div
                    key={equipment.id || 'none'}
                    className={`card ${formData.standUpBikeType === equipment.id ? 'selected' : ''}`}
                    onClick={() => updateFormData('standUpBikeType', equipment.id)}
                    style={{
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: '140px'
                    }}
                  >
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--runeq-primary)', fontSize: '1.2rem', minHeight: '28px' }}>{equipment.name}</h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', flex: '1', minHeight: '40px' }}>{equipment.desc}</p>
                    <div className="badge badge-info" style={{ alignSelf: 'center' }}>{equipment.badge}</div>
                  </div>
                ))}
              </div>
              {formData.standUpBikeType && (
                <div className="card" style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    <strong>🎯 Great choice!</strong> You'll get {formatEquipmentName(formData.standUpBikeType)}-specific workouts with
                    motion-optimized training and equipment-specific conversion factors.
                  </p>
                </div>
              )}
            </div>

            {/* Running Status - only show if they have equipment */}
            {formData.standUpBikeType && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.3rem', marginBottom: '12px' }}>Can you run right now?</h3>
                <p><strong>🏥 We support injured runners too!</strong> Tell us about your current running status.</p>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    {
                      id: 'active',
                      name: 'Yes - I can run',
                      icon: '🏃',
                      desc: 'Mix running with stand-up bike cross-training'
                    },
                    {
                      id: 'bikeOnly',
                      name: 'No - Bike only for now',
                      icon: '🚴',
                      desc: 'Injured or transitioning - bike workouts only until ready to run'
                    },
                    {
                      id: 'transitioning',
                      name: 'Transitioning back',
                      icon: '🔄',
                      desc: 'Returning from injury - gradually add running to bike base'
                    }
                  ].map(status => (
                    <div
                      key={status.id}
                      className={`card ${formData.runningStatus === status.id ? 'selected' : ''}`}
                      onClick={() => updateFormData('runningStatus', status.id)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', padding: '16px' }}
                    >
                      <div style={{ fontSize: '1.5rem' }}>{status.icon}</div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 4px 0' }}>{status.name}</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#D1D5DB' }}>{status.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {formData.runningStatus === 'bikeOnly' && (
                  <div className="card" style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', marginTop: '16px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      <strong>💪 Perfect for injury recovery!</strong> You'll get a complete {formatEquipmentName(formData.standUpBikeType)} training plan
                      with tempo rides, intervals, long rides, and recovery days - all the training stimulus without the impact stress.
                      When you're ready to run again, just update your profile!
                    </p>
                  </div>
                )}

                {formData.runningStatus === 'transitioning' && (
                  <div className="card" style={{ background: 'rgba(255, 179, 102, 0.1)', border: '1px solid rgba(255, 179, 102, 0.3)', marginTop: '16px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      <strong>🔄 Smart transition approach!</strong> We'll start with mostly {formatEquipmentName(formData.standUpBikeType)} training
                      and gradually reintroduce running over the first 4 weeks. This gives your body time to adapt safely.
                    </p>
                  </div>
                )}

                {formData.runningStatus === 'active' && (
                  <div className="card" style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)', marginTop: '16px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      <strong>🎯 Best of both worlds!</strong> You'll get a mix of running and {formatEquipmentName(formData.standUpBikeType)} training
                      for maximum aerobic development with reduced impact stress.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Preferred Bike Days - only show if they have equipment AND can run (active or transitioning) */}
            {formData.standUpBikeType && formData.runningStatus !== 'bikeOnly' && formData.availableDays.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3>Which days do you prefer for {formatEquipmentName(formData.standUpBikeType)} rides?</h3>
                <p><strong>🚴‍♂️ Smart scheduling!</strong> Perfect for road closures, traffic patterns, or personal preference.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', maxWidth: '500px', margin: '0 auto' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <div 
                      key={day}
                      className={`equipment-card ${formData.preferredBikeDays.includes(day) ? 'selected' : ''} ${!formData.availableDays.includes(day) ? 'disabled' : ''}`}
                      onClick={() => {
                        if (!formData.availableDays.includes(day)) return;
                        const newDays = formData.preferredBikeDays.includes(day) 
                          ? formData.preferredBikeDays.filter(d => d !== day)
                          : [...formData.preferredBikeDays, day];
                        updateFormData('preferredBikeDays', newDays);
                      }}
                      style={{ 
                        opacity: !formData.availableDays.includes(day) ? 0.3 : 1,
                        cursor: !formData.availableDays.includes(day) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <p className="equipment-name">
                        {day}
                        {!formData.availableDays.includes(day) && <span style={{ fontSize: '0.7rem', display: 'block' }}>(Not available)</span>}
                      </p>
                    </div>
                  ))}
                </div>
                
                {formData.preferredBikeDays.length > 0 && (
                  <div className="card" style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', marginTop: '16px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      <strong>🎯 Perfect!</strong> Selected {formData.preferredBikeDays.length} {formatEquipmentName(formData.standUpBikeType)} days: {formData.preferredBikeDays.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        );

      case 5:
        // New Step 5: Training Philosophy & Missed Workout Handling (combines old steps 9, 15)
        return (
          <div>
            <h2>Training Philosophy & Missed Workout Handling</h2>
            <p><strong>🎯 Let's customize your training approach!</strong> We'll adapt to your philosophy and real life.</p>

            {/* Missed Workout Handling */}
            <div style={{ marginBottom: '32px' }}>
              <h3>What happens when you miss a workout?</h3>
              <p><strong>🔥 This is where other apps fail!</strong> We adapt to your real life.</p>
              <div style={{ display: 'grid', gap: '16px' }}>
                {[
                  { id: 'reschedule', name: 'Reschedule it', desc: 'Move the workout to another day this week', icon: '🔄' },
                  { id: 'modify', name: 'Modify the plan', desc: 'Adjust upcoming workouts to keep me on track', icon: '⚡' },
                  { id: 'skip', name: 'Skip and continue', desc: 'Move on with the original schedule', icon: '⏭️' }
                ].map(option => (
                  <div 
                    key={option.id}
                    className={`card ${formData.missedWorkoutPreference === option.id ? 'selected' : ''}`}
                    onClick={() => updateFormData('missedWorkoutPreference', option.id)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
                  >
                    <div style={{ fontSize: '1.5rem' }}>{option.icon}</div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 4px 0' }}>{option.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>{option.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Training Philosophy */}
            <div>
              <h3 style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '1.5rem', marginBottom: '12px' }}>Choose Your Training System</h3>
              <p style={{ color: '#E5E7EB', fontSize: '1rem' }}><strong style={{ color: '#F8F9FA' }}>🎯 Run+ Plans Advantage:</strong> Multiple proven methodologies coming soon!</p>
              <div style={{ display: 'grid', gap: '16px' }}>
                {[
                  {
                    id: 'practical_periodization',
                    name: 'Real World Training',
                    desc: 'Life-first approach with clear phases and injury prevention focus',
                    good: 'Perfect for busy runners, proven results, real-world flexibility',
                    icon: '🏠',
                    available: true
                  },
                  {
                    id: '80_20',
                    name: '80/20 Training',
                    desc: '80% easy running, 20% hard - sustainable approach',
                    good: 'Injury prevention, long-term development, elite-proven',
                    icon: '🛡️',
                    available: false
                  },
                  {
                    id: 'zone_based',
                    name: 'Zone-Based Training',
                    desc: 'Scientific approach using 5 intensity zones and pace targets',
                    good: 'Precise, data-driven, works for all distances',
                    icon: '🔬',
                    available: false
                  },
                  {
                    id: 'high_mileage',
                    name: 'High Mileage System',
                    desc: 'Build endurance through volume and strength runs',
                    good: 'Marathon-focused, builds durability and speed',
                    icon: '💪',
                    available: false
                  },
                  {
                    id: 'time_trial',
                    name: 'Fitness Test Driven',
                    desc: 'Monthly time trials guide all your training paces',
                    good: 'Real-time fitness tracking, highly responsive',
                    icon: '🎯',
                    available: false
                  },
                ].map(philosophy => (
                  <div
                    key={philosophy.id}
                    className={`card ${formData.trainingPhilosophy === philosophy.id ? 'selected' : ''}`}
                    onClick={() => philosophy.available && updateFormData('trainingPhilosophy', philosophy.id)}
                    style={{
                      cursor: philosophy.available ? 'pointer' : 'not-allowed',
                      padding: '20px',
                      opacity: philosophy.available ? 1 : 0.6,
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.5rem' }}>{philosophy.icon}</span>
                      <h4 style={{ margin: 0, color: '#FFFFFF', fontWeight: '600' }}>{philosophy.name}</h4>
                      {!philosophy.available && (
                        <div style={{
                          marginLeft: 'auto',
                          padding: '4px 8px',
                          background: 'rgba(255, 179, 102, 0.2)',
                          border: '1px solid rgba(255, 179, 102, 0.4)',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          color: '#FFB366'
                        }}>
                          🚀 Coming Soon
                        </div>
                      )}
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#E5E7EB' }}>{philosophy.desc}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#D1D5DB' }}>
                      <strong style={{ color: '#F8F9FA' }}>Good for:</strong> {philosophy.good}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        // New Step 6: Location & Climate (keeps old step 14 unchanged)
        return (
          <div>
            <h2>Location & Climate</h2>
            <p><strong>🌡️ Climate-smart training!</strong> We adjust paces for your local conditions.</p>
            <div className="form-group">
              <label className="form-label">City, State/Country <span style={{ color: '#D1D5DB', fontWeight: '400' }}>(optional)</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Darwin, Australia or Phoenix, Arizona"
                value={formData.location}
                onChange={(e) => updateFormData('location', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Climate Type</label>
              <select 
                className="form-input form-select"
                value={formData.climate}
                onChange={(e) => updateFormData('climate', e.target.value)}
              >
                <option value="">Select your climate</option>
                <option value="temperate">Temperate (mild seasons)</option>
                <option value="hot_dry">Hot & Dry (desert-like)</option>
                <option value="hot_humid">Hot & Humid (tropical/subtropical)</option>
                <option value="cold">Cold (long winters)</option>
                <option value="variable">Variable (extreme seasons)</option>
              </select>
            </div>
            
            {/* Dynamic climate explanation based on selection */}
            {formData.climate && (
              <div className="card" style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', marginTop: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#FFFFFF', fontWeight: '600' }}>
                  {formData.climate === 'temperate' && '🌤️ Temperate Climate Adjustments'}
                  {formData.climate === 'hot_dry' && '🏜️ Hot & Dry Climate Adjustments'}
                  {formData.climate === 'hot_humid' && '🌴 Hot & Humid Climate Adjustments'}
                  {formData.climate === 'cold' && '❄️ Cold Climate Adjustments'}
                  {formData.climate === 'variable' && '🌦️ Variable Climate Adjustments'}
                </h4>
                <div style={{ fontSize: '0.9rem', color: '#E5E7EB' }}>
                  {formData.climate === 'temperate' && (
                    <>
                      <p style={{ margin: '0 0 8px 0' }}>✓ <strong>Seasonal pace adjustments</strong> for spring/summer heat and winter cold</p>
                      <p style={{ margin: '0 0 8px 0' }}>✓ <strong>Moderate hydration guidance</strong> during warmer months</p>
                      <p style={{ margin: 0 }}>✓ <strong>Gear recommendations</strong> for changing conditions</p>
                    </>
                  )}
                  {formData.climate === 'hot_dry' && (
                    <>
                      <p style={{ margin: '0 0 8px 0' }}>✓ <strong>Aggressive pace reductions</strong> during peak heat hours (10am-4pm)</p>
                      <p style={{ margin: '0 0 8px 0' }}>✓ <strong>Enhanced hydration protocols</strong> with electrolyte guidance</p>
                      <p style={{ margin: 0 }}>✓ <strong>Early morning scheduling</strong> to avoid dangerous temperatures</p>
                    </>
                  )}
                  {formData.climate === 'hot_humid' && (
                    <>
                      <p style={{ margin: '0 0 8px 0' }}>✓ <strong>Heat index calculations</strong> - humidity makes 80°F feel like 95°F</p>
                      <p style={{ margin: '0 0 8px 0' }}>✓ <strong>Sweat rate adjustments</strong> for reduced cooling efficiency</p>
                      <p style={{ margin: 0 }}>✓ <strong>Recovery-focused pacing</strong> to prevent heat exhaustion</p>
                    </>
                  )}
                  {formData.climate === 'cold' && (
                    <>
                      <p style={{ margin: '0 0 8px 0' }}>✓ <strong>Extended warm-up protocols</strong> for muscle activation</p>
                      <p style={{ margin: '0 0 8px 0' }}>✓ <strong>Layering strategies</strong> for temperature regulation</p>
                      <p style={{ margin: 0 }}>✓ <strong>Ice/snow safety</strong> adjustments for footing and pace</p>
                    </>
                  )}
                  {formData.climate === 'variable' && (
                    <>
                      <p style={{ margin: '0 0 8px 0' }}>✓ <strong>Adaptive training plans</strong> that flex with seasonal extremes</p>
                      <p style={{ margin: '0 0 8px 0' }}>✓ <strong>Multi-season gear guidance</strong> for year-round training</p>
                      <p style={{ margin: 0 }}>✓ <strong>Weather-based workout swaps</strong> when conditions are unsafe</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {!formData.climate && (
              <div className="card" style={{ background: 'rgba(255, 184, 0, 0.1)', border: '1px solid rgba(255, 184, 0, 0.3)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#E5E7EB' }}>
                  <strong>💡 Why this matters:</strong> A runner in Darwin, Australia complained that other apps
                  gave "ridiculous paces" for tropical heat. We automatically adjust for your climate!
                </p>
              </div>
            )}
          </div>
        );

      case 7:
        // New Step 7: Plan Summary (keeps old step 18 unchanged)
        return (
          <div>
            <h2>🎉 Your Personalized Plan is Ready!</h2>
            <p>Based on your preferences, here's what makes your plan unique:</p>
            
            <div className="card" style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
              <h3>Your Run+ Plans Profile</h3>
              <div style={{ display: 'grid', gap: '12px', textAlign: 'left' }}>
                <div><strong>Goal:</strong> {formData.raceDistance} race training</div>
                {formData.raceElevationProfile && (
                  <div><strong>Race Profile:</strong> {formData.raceElevationProfile.charAt(0).toUpperCase() + formData.raceElevationProfile.slice(1)} course</div>
                )}
                {formData.raceDate && (
                  <div><strong>Race Date:</strong> {new Date(formData.raceDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                )}
                {formData.startDate && formData.raceDate && (
                  <div><strong>Training Duration:</strong> {Math.ceil((new Date(formData.raceDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24 * 7))} weeks</div>
                )}
                <div><strong>Experience:</strong> {formData.experienceLevel}</div>
                {formData.currentWeeklyMileage && (
                  <div><strong>Current weekly mileage:</strong> {formData.currentWeeklyMileage} miles</div>
                )}
                {formData.currentLongRunDistance && (
                  <div><strong>Current long run:</strong> {formData.currentLongRunDistance} miles</div>
                )}
                <div><strong>Schedule:</strong> {formData.runsPerWeek} days/week</div>
                {formData.hardSessionsPerWeek && (
                  <div><strong>Hard Sessions:</strong> {formData.hardSessionsPerWeek} per week{formData.hardSessionDays.length > 0 ? ` (${formData.hardSessionDays.join(', ')})` : ''}</div>
                )}
                {formData.standUpBikeType && (
                  <div><strong>Equipment:</strong> {formatEquipmentName(formData.standUpBikeType)} specific workouts</div>
                )}
                <div><strong>Climate:</strong> {formData.climate} adapted paces</div>
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)' }}>
              <h3>🚀 What You Get</h3>
              <div style={{ display: 'grid', gap: '8px', textAlign: 'left' }}>
                <div>✓ <strong>80+ workout varieties</strong> vs repetitive formats</div>
                <div>✓ <strong>Climate-adjusted paces</strong> for your location</div>
                <div>✓ <strong>Equipment-specific training</strong> for your gear</div>
                <div>✓ <strong>Flexible schedule</strong> that adapts to missed workouts</div>
                <div>✓ <strong>Cross-platform access</strong> - phone, tablet, web</div>
                <div>✓ <strong>Smart workout substitution</strong> that counts properly</div>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#E5E7EB' }}>
              Click "Create My Plan" to see your complete training plan preview - no payment required!
            </p>
          </div>
        );

      default:
        return <div>Step not found</div>;
    }
  }
}

export default OnboardingFlow;