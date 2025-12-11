import React, { useState } from 'react';
import TrainingPlanAIService from '../services/TrainingPlanAIService';
import FirestoreService from '../services/FirestoreService';
import { auth } from '../firebase/config';
import logger from '../utils/logger';
import { useToast } from './Toast';

/**
 * Modal for entering recent race time to update fitness assessment
 */
function EnterRaceTimeModal({ isOpen, onClose, userProfile, trainingPlan, onPlanUpdated }) {
  const toast = useToast();
  const [recentRaceDistance, setRecentRaceDistance] = useState(userProfile?.recentRaceDistance || '');
  const [recentRaceTime, setRecentRaceTime] = useState(userProfile?.recentRaceTime || '');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!recentRaceDistance || !recentRaceTime) {
      toast.error('Please enter both race distance and time');
      return;
    }

    setIsUpdating(true);
    try {
      logger.log('🔄 Updating profile with recent race time and regenerating plan...');
      logger.log('📋 Original userProfile keys:', userProfile ? Object.keys(userProfile) : 'null');
      
      // Update user profile with new race time
      // CRITICAL: Preserve ALL fields from original profile - the spread should preserve everything
      // But we need to ensure required fields exist
      const updatedProfile = {
        ...userProfile, // Spread ALL existing fields first
        recentRaceDistance,
        recentRaceTime,
        isEstimatedFitness: false, // Clear the estimated flag
        // Ensure critical fields are preserved (fallbacks for backward compatibility)
        raceTime: userProfile.raceTime || userProfile.currentRaceTime || userProfile.goalTime,
        raceDistance: userProfile.raceDistance || userProfile.raceDistance,
        raceDate: userProfile.raceDate || userProfile.raceDate,
        currentWeeklyMileage: userProfile.currentWeeklyMileage || userProfile.currentWeeklyMileage,
        currentLongRun: userProfile.currentLongRun || userProfile.currentLongRunDistance,
        workoutsPerWeek: userProfile.workoutsPerWeek || userProfile.runsPerWeek || userProfile.workoutsPerWeek,
        longRunDay: userProfile.longRunDay || userProfile.longRunDay,
        experienceLevel: userProfile.experienceLevel || userProfile.experienceLevel,
        availableDays: userProfile.availableDays || userProfile.availableDays || [],
        hardSessionDays: userProfile.hardSessionDays || userProfile.qualityDays || userProfile.hardSessionDays || [],
        units: userProfile.units || 'imperial'
      };
      
      logger.log('📋 Updated profile keys:', Object.keys(updatedProfile));
      logger.log('🔍 Required fields check:', {
        hasRaceTime: !!updatedProfile.raceTime,
        hasRaceDistance: !!updatedProfile.raceDistance,
        hasRaceDate: !!updatedProfile.raceDate,
        hasCurrentWeeklyMileage: !!updatedProfile.currentWeeklyMileage,
        hasCurrentLongRun: !!updatedProfile.currentLongRun,
        hasWorkoutsPerWeek: !!updatedProfile.workoutsPerWeek,
        hasLongRunDay: !!updatedProfile.longRunDay,
        hasExperienceLevel: !!updatedProfile.experienceLevel
      });

      // Validate required fields before proceeding
      const missingFields = [];
      if (!updatedProfile.raceTime) missingFields.push('raceTime');
      if (!updatedProfile.raceDistance) missingFields.push('raceDistance');
      if (!updatedProfile.raceDate) missingFields.push('raceDate');
      if (!updatedProfile.currentWeeklyMileage) missingFields.push('currentWeeklyMileage');
      if (!updatedProfile.currentLongRun) missingFields.push('currentLongRun');
      if (!updatedProfile.workoutsPerWeek && !updatedProfile.runsPerWeek) missingFields.push('workoutsPerWeek');
      if (!updatedProfile.longRunDay) missingFields.push('longRunDay');
      if (!updatedProfile.experienceLevel) missingFields.push('experienceLevel');

      if (missingFields.length > 0) {
        logger.error('❌ Missing required profile fields:', missingFields);
        logger.error('📋 Available profile fields:', Object.keys(updatedProfile));
        logger.error('📋 Original userProfile:', userProfile);
        throw new Error(`Missing required profile fields: ${missingFields.join(', ')}. Please complete onboarding first.`);
      }

      // Save updated profile
      await FirestoreService.saveUserProfile(auth.currentUser.uid, updatedProfile);
      logger.log('✅ Profile updated with recent race time');

      // Regenerate training plan with new fitness data
      toast.info('Regenerating your plan with updated fitness data...', 5000);
      const result = await TrainingPlanAIService.generateTrainingPlan(updatedProfile);

      if (!result.success || !result.plan) {
        throw new Error(result.error || 'Failed to regenerate plan');
      }

      // CRITICAL: Validate plan structure before proceeding
      if (!result.plan.weeks || !Array.isArray(result.plan.weeks) || result.plan.weeks.length === 0) {
        logger.error('❌ Regenerated plan has no weeks array!', {
          planKeys: Object.keys(result.plan),
          hasWeeks: !!result.plan.weeks,
          weeksType: typeof result.plan.weeks
        });
        throw new Error('Plan regeneration failed - weeks array is missing');
      }

      // Save updated plan
      await FirestoreService.saveTrainingPlan(auth.currentUser.uid, result.plan);
      logger.log('✅ Plan regenerated with updated fitness data', {
        weeksCount: result.plan.weeks.length,
        hasCoaching: !!(result.plan.aiCoachingAnalysis || result.plan.fullPlanText)
      });

      toast.success('Plan updated! Your training paces have been recalibrated.', 5000);
      
      // Notify parent component to refresh data (this will update state in App.js)
      // CRITICAL: Pass the plan first, then the profile
      if (onPlanUpdated) {
        await onPlanUpdated(result.plan, updatedProfile);
      }
      
      // Close modal after update completes
      onClose();
    } catch (error) {
      logger.error('❌ Error updating plan:', error);
      toast.error('Failed to update plan. Please try again. ' + error.message, 8000);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
          border: '1px solid #333',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          padding: '32px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          margin: '0 0 16px 0',
          fontSize: '1.5rem',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📊 Enter Recent Race Time
        </h2>
        
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '1rem',
          color: '#E5E7EB',
          lineHeight: '1.6'
        }}>
          Adding a recent race result helps us calculate your exact training paces. We'll instantly regenerate your plan with updated paces.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            Race Distance
          </label>
          <select
            value={recentRaceDistance}
            onChange={(e) => setRecentRaceDistance(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '1rem',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#fff'
            }}
          >
            <option value="">Select distance</option>
            <option value="5K">5K</option>
            <option value="10K">10K</option>
            <option value="Half">Half Marathon</option>
            <option value="Marathon">Marathon</option>
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            Finish Time
          </label>
          <input
            type="text"
            value={recentRaceTime}
            onChange={(e) => setRecentRaceTime(e.target.value)}
            placeholder="e.g., 1:07:35 or 25:30"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '1rem',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#fff'
            }}
          />
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '0.85rem',
            color: '#999'
          }}>
            Enter your finish time in any format (e.g., "1:07:35" or "25:30")
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="btn btn-secondary"
            style={{ minWidth: '100px' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUpdating || !recentRaceDistance || !recentRaceTime}
            className="btn btn-primary"
            style={{ minWidth: '160px' }}
          >
            {isUpdating ? 'Updating...' : 'Update Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EnterRaceTimeModal;

