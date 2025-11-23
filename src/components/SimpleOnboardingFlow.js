import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrainingPlanAIService from '../services/TrainingPlanAIService';
import logger from '../utils/logger';
import './SimpleOnboardingFlow.css';

/**
 * Simplified single-page onboarding flow
 * Clean, focused approach for AI plan generation
 */
export default function SimpleOnboardingFlow({ onComplete }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Goal race
    raceDistance: '',
    goalTime: '',
    raceDate: '',
    raceElevationProfile: '',

    // Recent race (for realistic assessment)
    recentRaceDistance: '',
    recentRaceTime: '',

    // Current fitness
    currentWeeklyMileage: '',
    currentLongRunDistance: '',
    experienceLevel: 'intermediate',

    // Schedule
    availableDays: [],
    longRunDay: 'Sunday',
    qualityDays: [],

    // Equipment
    standUpBikeType: 'none',
    preferredBikeDays: [],
    hasGarmin: false,

    // Training style - always adventure mode for workout variety
    trainingStyle: 'adventure'
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(day)
        ? prev[field].filter(d => d !== day)
        : [...prev[field], day]
    }));
  };

  // Check if a day is adjacent to any selected quality days
  const isAdjacentToQualityDay = (day) => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayIndex = dayOrder.indexOf(day);

    return formData.qualityDays.some(selectedDay => {
      const selectedIndex = dayOrder.indexOf(selectedDay);
      // Check if adjacent (previous or next day)
      return Math.abs(dayIndex - selectedIndex) === 1;
    });
  };

  const canSubmit = () => {
    return (
      formData.raceDistance &&
      formData.goalTime &&
      formData.raceDate &&
      formData.currentWeeklyMileage &&
      formData.currentLongRunDistance &&
      formData.availableDays.length >= 3 &&
      formData.qualityDays.length >= 1
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmit()) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    logger.log('🤖 Generating AI training plan...');

    try {
      // Build user profile for AI
      // Calculate rest days (days not in availableDays)
      const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const restDays = allDays.filter(day => !formData.availableDays.includes(day));

      const userProfile = {
        raceDistance: formData.raceDistance,
        raceTime: formData.goalTime,
        raceDate: formData.raceDate ? new Date(formData.raceDate).toISOString() : new Date().toISOString(),
        raceElevationProfile: formData.raceElevationProfile || '',
        currentWeeklyMileage: formData.currentWeeklyMileage,
        currentLongRun: formData.currentLongRunDistance,
        recentRaceTime: formData.recentRaceTime || formData.goalTime,
        recentRaceDistance: formData.recentRaceDistance || formData.raceDistance,
        runsPerWeek: formData.availableDays.length,
        availableDays: formData.availableDays,
        restDays: restDays,
        longRunDay: formData.longRunDay,
        qualityDays: formData.qualityDays,
        standUpBikeType: formData.standUpBikeType,
        preferredBikeDays: formData.preferredBikeDays,
        experienceLevel: formData.experienceLevel,
        units: 'imperial'
      };

      logger.log('👤 User profile:', userProfile);

      // Generate AI plan
      const planResult = await TrainingPlanAIService.generateTrainingPlan(userProfile);

      if (!planResult.success) {
        throw new Error('Failed to generate plan');
      }

      logger.log('✅ AI training plan created successfully');

      // Pass both form data and plan to parent
      await onComplete(formData, planResult.plan);

      // Navigate to welcome screen to show coaching analysis
      navigate('/welcome');
    } catch (error) {
      logger.error('Failed to generate plan:', error);
      alert('Failed to generate training plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const raceDistances = ['5K', '10K', 'Half', 'Marathon'];
  const bikeTypes = [
    { value: 'none', label: 'No bike equipment' },
    { value: 'cyclete', label: 'Cyclete' },
    { value: 'elliptigo', label: 'ElliptiGO' }
  ];

  if (loading) {
    return (
      <div className="onboarding-loading">
        <div className="loading-spinner"></div>
        <h2>🤖 Generating Your Personalized Training Plan...</h2>
        <p>Our AI coach is analyzing your goals and creating a custom plan just for you.</p>
        <p className="loading-subtext">This may take 10-15 seconds...</p>
      </div>
    );
  }

  return (
    <div className="simple-onboarding">
      <div className="onboarding-header">
        <h1>Let's Build Your Training Plan</h1>
        <p>Tell us about your goals and we'll create a personalized plan</p>
      </div>

      <form onSubmit={handleSubmit} className="onboarding-form">
        {/* Goal Race */}
        <section className="form-section">
          <h2>🎯 Goal Race</h2>

          <div className="form-group">
            <label>Race Distance *</label>
            <select value={formData.raceDistance} onChange={(e) => updateField('raceDistance', e.target.value)} required>
              <option value="">Select distance</option>
              {raceDistances.map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Goal Time *</label>
            <input
              type="text"
              value={formData.goalTime}
              onChange={(e) => updateField('goalTime', e.target.value)}
              placeholder="e.g., 2:00:00 or 54:23"
              required
            />
          </div>

          <div className="form-group">
            <label>Race Date *</label>
            <input
              type="date"
              value={formData.raceDate}
              onChange={(e) => updateField('raceDate', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Course Terrain</label>
            <select value={formData.raceElevationProfile} onChange={(e) => updateField('raceElevationProfile', e.target.value)}>
              <option value="">Select terrain (optional)</option>
              <option value="flat">Flat - Minimal elevation change</option>
              <option value="rolling">Rolling - Moderate hills throughout</option>
              <option value="hilly">Hilly - Significant elevation gain</option>
            </select>
          </div>
        </section>

        {/* Recent Race (Optional but Recommended) */}
        <section className="form-section">
          <h2>📊 Recent Race Result (Recommended)</h2>
          <p className="section-help">Helps us assess your current fitness and set realistic paces</p>

          <div className="form-group">
            <label>Recent Race Distance</label>
            <select value={formData.recentRaceDistance} onChange={(e) => updateField('recentRaceDistance', e.target.value)}>
              <option value="">Skip this section</option>
              {raceDistances.map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>

          {formData.recentRaceDistance && (
            <div className="form-group">
              <label>Your {formData.recentRaceDistance} Finish Time</label>
              <input
                type="text"
                value={formData.recentRaceTime}
                onChange={(e) => updateField('recentRaceTime', e.target.value)}
                placeholder="e.g., 1:07:35"
              />
            </div>
          )}
        </section>

        {/* Current Fitness */}
        <section className="form-section">
          <h2>🏃 Current Fitness</h2>

          <div className="form-group">
            <label>Current Weekly Mileage *</label>
            <input
              type="number"
              value={formData.currentWeeklyMileage}
              onChange={(e) => updateField('currentWeeklyMileage', e.target.value)}
              placeholder="miles per week"
              required
            />
          </div>

          <div className="form-group">
            <label>Current Long Run Distance *</label>
            <input
              type="number"
              value={formData.currentLongRunDistance}
              onChange={(e) => updateField('currentLongRunDistance', e.target.value)}
              placeholder="miles"
              required
            />
          </div>

          <div className="form-group">
            <label>Experience Level</label>
            <select value={formData.experienceLevel} onChange={(e) => updateField('experienceLevel', e.target.value)}>
              <option value="beginner">Beginner (New to running)</option>
              <option value="intermediate">Intermediate (1-3 years)</option>
              <option value="advanced">Advanced (3+ years)</option>
            </select>
          </div>
        </section>

        {/* Training Schedule */}
        <section className="form-section">
          <h2>📅 Training Schedule</h2>

          <div className="form-group">
            <label>Available Training Days * (select at least 3)</label>
            <div className="day-grid">
              {days.map(day => (
                <button
                  key={day}
                  type="button"
                  className={`day-button ${formData.availableDays.includes(day) ? 'selected' : ''}`}
                  onClick={() => toggleDay(day, 'availableDays')}
                >
                  {day}
                </button>
              ))}
            </div>
            <p className="field-help">Selected: {formData.availableDays.length} days</p>
          </div>

          <div className="form-group">
            <label>Long Run Day *</label>
            <select value={formData.longRunDay} onChange={(e) => updateField('longRunDay', e.target.value)} required>
              {formData.availableDays.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Hard Session Days * (select 1-2)</label>
            <div className="day-grid">
              {formData.availableDays.filter(d => d !== formData.longRunDay).map(day => {
                const isSelected = formData.qualityDays.includes(day);
                const isAdjacent = !isSelected && isAdjacentToQualityDay(day);
                const isDisabled = isAdjacent;

                return (
                  <button
                    key={day}
                    type="button"
                    className={`day-button ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => !isDisabled && toggleDay(day, 'qualityDays')}
                    disabled={isDisabled}
                    title={isDisabled ? 'Cannot select back-to-back hard days' : ''}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className="field-help">Selected: {formData.qualityDays.length} hard days. No back-to-back days allowed.</p>
          </div>
        </section>

        {/* Equipment (Optional) */}
        <section className="form-section">
          <h2>⚡ Equipment (Optional)</h2>

          <div className="form-group">
            <label>Stand-Up Bike</label>
            <select value={formData.standUpBikeType} onChange={(e) => updateField('standUpBikeType', e.target.value)}>
              {bikeTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {formData.standUpBikeType !== 'none' && (
            <div className="form-group">
              <label>Preferred Bike Days</label>
              <div className="day-grid">
                {formData.availableDays
                  .filter(d => d !== formData.longRunDay && !formData.qualityDays.includes(d))
                  .map(day => (
                    <button
                      key={day}
                      type="button"
                      className={`day-button ${formData.preferredBikeDays.includes(day) ? 'selected' : ''}`}
                      onClick={() => toggleDay(day, 'preferredBikeDays')}
                    >
                      {day}
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.hasGarmin}
                onChange={(e) => updateField('hasGarmin', e.target.checked)}
              />
              I have a Garmin device (for RunEQ data field)
            </label>
          </div>
        </section>

        <div className="form-actions">
          <button
            type="submit"
            className="submit-button"
            disabled={!canSubmit()}
          >
            Generate My Training Plan
          </button>
        </div>
      </form>
    </div>
  );
}
