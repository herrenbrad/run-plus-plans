import React, { useState } from 'react';
import TrainingPlanAIService from '../services/TrainingPlanAIService';
import FirestoreService from '../services/FirestoreService';
import { auth } from '../firebase/config';
import logger from '../utils/logger';
import { useToast } from './Toast';

/**
 * Plan Debug Tool - Allows testing and regenerating plan components without full re-onboarding
 * 
 * Features:
 * - Regenerate coaching analysis only
 * - Regenerate plan structure only
 * - Test parser on sample output
 * - Fix corrupted plans
 */
function PlanDebugTool({ userProfile, trainingPlan, onClose }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // Helper function to enrich userProfile with all required fields
  const enrichProfile = (profile, plan) => {
    // Get available days count if workoutsPerWeek is missing (with backward compatibility)
    const workoutsPerWeek = profile.workoutsPerWeek || profile.runsPerWeek || (profile.availableDays?.length || 5);
    
    // Calculate currentLongRun from Week 1 if missing
    let currentLongRun = profile.currentLongRun || profile.currentLongRunDistance;
    if (!currentLongRun && plan?.weeks?.[0]?.workouts) {
      // Find the long run in Week 1
      const week1Workouts = plan.weeks[0].workouts;
      for (const workout of week1Workouts) {
        const allWorkouts = Array.isArray(workout.workouts) ? workout.workouts : [workout];
        for (const w of allWorkouts) {
          if (w.type === 'longRun' || w.type === 'long-run' || 
              (w.workout?.name && w.workout.name.toLowerCase().includes('long run'))) {
            const distanceMatch = w.workout?.name?.match(/(\d+(?:\.\d+)?)\s*(mile|miles|mi)/i) ||
                                 w.description?.match(/(\d+(?:\.\d+)?)\s*(mile|miles|mi)/i);
            if (distanceMatch) {
              currentLongRun = parseFloat(distanceMatch[1]);
              break;
            }
          }
        }
        if (currentLongRun) break;
      }
    }
    
    // Calculate currentWeeklyMileage from Week 1 if missing
    let currentWeeklyMileage = profile.currentWeeklyMileage;
    if (!currentWeeklyMileage && plan?.weeks?.[0]?.totalMileage) {
      currentWeeklyMileage = plan.weeks[0].totalMileage;
    }
    
    // Calculate availableDays if missing
    const availableDays = profile.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].slice(0, workoutsPerWeek);
    
    // Calculate restDays if missing
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const restDays = profile.restDays || allDays.filter(day => !availableDays.includes(day));
    
    return {
      ...profile,
      // Race info from planOverview
      raceTime: profile.raceTime || plan?.planOverview?.goalTime,
      raceDistance: profile.raceDistance || plan?.planOverview?.raceDistance,
      raceDate: profile.raceDate || plan?.planOverview?.raceDate,
      startDate: profile.startDate || plan?.planOverview?.startDate,
      // Training info
      currentWeeklyMileage: currentWeeklyMileage || profile.currentWeeklyMileage,
      currentLongRun: currentLongRun || profile.currentLongRunDistance,
      workoutsPerWeek: workoutsPerWeek,
      runsPerWeek: workoutsPerWeek, // Backward compatibility
      longRunDay: profile.longRunDay || 'Sunday',
      experienceLevel: profile.experienceLevel || 'intermediate',
      // Ensure units is set
      units: profile.units || 'imperial',
      // Ensure availableDays is an array
      availableDays: availableDays,
      // Ensure hardSessionDays is an array - if missing, auto-generate sensible defaults
      // For a typical training week, hard days should be Tuesday and Thursday (or similar spread)
      hardSessionDays: profile.hardSessionDays || profile.qualityDays || (() => {
        // Auto-generate hard days if none exist (CRITICAL for fixing corrupted plans)
        const available = availableDays.filter(d => d !== (profile.longRunDay || 'Sunday'));
        if (available.length >= 2) {
          // Pick 2 spread-out hard days: typically Tue/Thu or similar
          const preferredHardDays = ['Tuesday', 'Thursday'];
          const hardDays = preferredHardDays.filter(d => available.includes(d));
          if (hardDays.length >= 2) return hardDays;
          // Fallback: pick first two non-long-run available days
          return available.slice(0, 2);
        }
        return available.length > 0 ? [available[0]] : [];
      })(),
      // Ensure restDays is calculated
      restDays: restDays
    };
  };

  const handleRegenerateCoaching = async () => {
    if (!userProfile || !trainingPlan) {
      toast.error('Missing user profile or training plan');
      return;
    }

    setLoading(true);
    setStatus('Regenerating coaching analysis...');
    
    try {
      // Enrich userProfile with all required fields
      const enrichedProfile = enrichProfile(userProfile, trainingPlan);
      
      // Regenerate just the coaching analysis
      const coachingResult = await TrainingPlanAIService.generateCoachingAnalysis(enrichedProfile);
      
      if (coachingResult.success) {
        // Update the plan with new coaching
        const updatedPlan = {
          ...trainingPlan,
          aiCoachingAnalysis: coachingResult.analysis
        };
        
        await FirestoreService.saveTrainingPlan(auth.currentUser.uid, updatedPlan);
        setStatus('✅ Coaching analysis regenerated and saved!');
        toast.success('Coaching analysis regenerated!');
        
        // Reload page to see changes
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error(coachingResult.error || 'Failed to regenerate coaching');
      }
    } catch (error) {
      logger.error('Error regenerating coaching:', error);
      setStatus(`❌ Error: ${error.message}`);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegeneratePlanStructure = async () => {
    if (!userProfile || !trainingPlan) {
      toast.error('Missing user profile or training plan');
      return;
    }

    if (!window.confirm('This will regenerate the entire plan structure. Continue?')) {
      return;
    }

    setLoading(true);
    setStatus('Regenerating plan structure...');
    
    try {
      // Enrich userProfile with all required fields
      const enrichedProfile = enrichProfile(userProfile, trainingPlan);
      
      // Validate critical required fields are present
      if (!enrichedProfile.raceTime || !enrichedProfile.raceDistance || !enrichedProfile.raceDate) {
        throw new Error('Missing required plan data. Please ensure raceTime, raceDistance, and raceDate are set.');
      }
      if (!enrichedProfile.currentWeeklyMileage || !enrichedProfile.currentLongRun) {
        throw new Error('Missing required fitness data. Please ensure currentWeeklyMileage and currentLongRun are set.');
      }
      
      // Regenerate the full plan structure
      const planResult = await TrainingPlanAIService.generateTrainingPlan(enrichedProfile);
      
      if (planResult.success && planResult.plan) {
        // Save the new plan
        await FirestoreService.saveTrainingPlan(auth.currentUser.uid, planResult.plan);
        setStatus('✅ Plan structure regenerated and saved!');
        toast.success('Plan structure regenerated!');
        
        // Reload page to see changes
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(planResult.error || 'Failed to regenerate plan structure');
      }
    } catch (error) {
      logger.error('Error regenerating plan structure:', error);
      setStatus(`❌ Error: ${error.message}`);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFixCorruptedPlan = async () => {
    if (!userProfile || !trainingPlan) {
      toast.error('Missing user profile or training plan');
      return;
    }

    if (!window.confirm('This will regenerate the plan structure from Week 1. Continue?')) {
      return;
    }

    setLoading(true);
    setStatus('Fixing corrupted plan...');
    
    try {
      // Enrich userProfile with all required fields
      const enrichedProfile = enrichProfile(userProfile, trainingPlan);
      
      // Regenerate from current week (which is Week 1 for corrupted plans)
      const currentWeek = 1;
      const result = await TrainingPlanAIService.regeneratePlanStructureFromCurrentWeek(
        trainingPlan,
        enrichedProfile,
        currentWeek
      );

      if (result.success && result.newWeeks) {
        // Merge with existing plan (preserving any valid weeks)
        const updatedPlan = {
          ...trainingPlan,
          weeks: result.newWeeks,
          planOverview: {
            ...trainingPlan.planOverview,
            totalWeeks: result.newWeeks.length
          }
        };
        
        await FirestoreService.saveTrainingPlan(auth.currentUser.uid, updatedPlan);
        setStatus('✅ Plan fixed and saved!');
        toast.success('Plan fixed!');
        
        // Reload page to see changes
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(result.error || 'Failed to fix plan');
      }
    } catch (error) {
      logger.error('Error fixing plan:', error);
      setStatus(`❌ Error: ${error.message}`);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '600px',
        width: '100%',
        border: '2px solid #00D4FF',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#00D4FF', margin: 0 }}>🔧 Plan Debug Tool</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#AAAAAA',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '30px',
              height: '30px'
            }}
          >
            ×
          </button>
        </div>

        <p style={{ color: '#AAAAAA', marginBottom: '24px', fontSize: '0.9rem' }}>
          Test and regenerate plan components without full re-onboarding
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleRegenerateCoaching}
            disabled={loading}
            style={{
              padding: '14px 20px',
              background: loading ? '#333' : 'rgba(0, 212, 255, 0.2)',
              border: '1px solid rgba(0, 212, 255, 0.5)',
              borderRadius: '8px',
              color: '#00D4FF',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              textAlign: 'left'
            }}
          >
            📝 Regenerate Coaching Analysis Only
            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px', fontWeight: '400' }}>
              Updates the coach's opening paragraph and analysis
            </div>
          </button>

          <button
            onClick={handleRegeneratePlanStructure}
            disabled={loading}
            style={{
              padding: '14px 20px',
              background: loading ? '#333' : 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.5)',
              borderRadius: '8px',
              color: '#8b5cf6',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              textAlign: 'left'
            }}
          >
            🏗️ Regenerate Plan Structure Only
            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px', fontWeight: '400' }}>
              Regenerates all weeks and workouts (keeps coaching analysis)
            </div>
          </button>

          <button
            onClick={handleFixCorruptedPlan}
            disabled={loading}
            style={{
              padding: '14px 20px',
              background: loading ? '#333' : 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '8px',
              color: '#ef4444',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              textAlign: 'left'
            }}
          >
            🔧 Fix Corrupted Plan
            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px', fontWeight: '400' }}>
              Regenerates plan structure from Week 1 (fixes null weeks, missing workouts)
            </div>
          </button>
        </div>

        {status && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            color: '#AAAAAA',
            fontSize: '0.9rem'
          }}>
            {status}
          </div>
        )}

        {loading && (
          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            color: '#00D4FF',
            fontSize: '0.9rem'
          }}>
            ⏳ Processing...
          </div>
        )}
      </div>
    </div>
  );
}

export default PlanDebugTool;

