import React, { useState, useEffect } from 'react';
import { preserveAndMergeWeeks } from '../services/PlanMergeUtils';
import TrainingPlanAIService from '../services/TrainingPlanAIService';
import FirestoreService from '../services/FirestoreService';
import { auth } from '../firebase/config';
import logger from '../utils/logger';
import { useToast } from './Toast';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function ManagePlanModal({ isOpen, onClose, userProfile, trainingPlan, currentWeek }) {
  const toast = useToast();
  
  // Initialize state from current plan settings
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(5); // Total training sessions per week
  const [trainingDays, setTrainingDays] = useState([]);
  const [hardDays, setHardDays] = useState([]);
  const [longRunDay, setLongRunDay] = useState('Saturday');
  const [bikeDays, setBikeDays] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null); // Track current step: 'regenerating', 'analyzing', 'saving'
  const [errorMessage, setErrorMessage] = useState(null);

  // Ensure longRunDay is always in trainingDays
  useEffect(() => {
    if (trainingDays.length > 0 && !trainingDays.includes(longRunDay)) {
      setLongRunDay(trainingDays[0]);
    } else if (trainingDays.length === 0 && longRunDay) {
      setLongRunDay('Sunday');
    }
  }, [trainingDays, longRunDay]);

  // Load current settings when modal opens
  useEffect(() => {
    if (isOpen && auth.currentUser) {
      // Fetch fresh data from Firestore
      const loadSettings = async () => {
        try {
          logger.log('⚙️ ManagePlanModal: Loading fresh data from Firestore...');
          const userData = await FirestoreService.getUserData(auth.currentUser.uid);

          logger.log('  userData:', userData);
          logger.log('  userData.data keys:', userData?.data ? Object.keys(userData.data) : 'no data');

          if (userData?.success && userData?.data) {
            const profile = userData.data.profile;
            const plan = userData.data.trainingPlan;

            logger.log('  Profile keys:', profile ? Object.keys(profile) : 'no profile');
            logger.log('  Plan keys:', plan ? Object.keys(plan) : 'no plan');
            logger.log('  Plan overview:', plan?.planOverview);

            // Get settings from profile (that's where onboarding saves them)
            const settings = profile || {};

            logger.log('  Loading settings:');
            logger.log('    workoutsPerWeek:', settings.workoutsPerWeek || settings.runsPerWeek);
            logger.log('    availableDays:', settings.availableDays);
            logger.log('    hardSessionDays:', settings.hardSessionDays);
            logger.log('    longRunDay:', settings.longRunDay);
            logger.log('    preferredBikeDays:', settings.preferredBikeDays);

            const loadedTrainingDays = settings.availableDays || [];
            const loadedLongRunDay = settings.longRunDay || 'Sunday';
            
            setWorkoutsPerWeek(settings.workoutsPerWeek || settings.runsPerWeek || 5);
            setTrainingDays(loadedTrainingDays);
            // CRITICAL: Check both field names - older profiles use 'qualityDays', newer use 'hardSessionDays'
            setHardDays(settings.hardSessionDays || settings.qualityDays || []);
            // Ensure longRunDay is in the training days, otherwise use first training day or Sunday
            setLongRunDay(
              loadedTrainingDays.includes(loadedLongRunDay) 
                ? loadedLongRunDay 
                : (loadedTrainingDays.length > 0 ? loadedTrainingDays[0] : 'Sunday')
            );
            setBikeDays(settings.preferredBikeDays || []);
            setErrorMessage(null); // Clear any previous errors

            logger.log('  ✅ Settings loaded successfully');
          }
        } catch (error) {
          logger.error('❌ Error loading settings:', error);
          setErrorMessage('Failed to load current settings. Please try again.');
        }
      };

      loadSettings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDayToggle = (day) => {
    if (trainingDays.includes(day)) {
      // Remove day
      const newDays = trainingDays.filter(d => d !== day);
      setTrainingDays(newDays);

      // If we removed a hard day, remove it from hardDays
      if (hardDays.includes(day)) {
        setHardDays(hardDays.filter(d => d !== day));
      }

      // If we removed a bike day, remove it from bikeDays
      if (bikeDays.includes(day)) {
        setBikeDays(bikeDays.filter(d => d !== day));
      }

      // If we removed the long run day, reset it to the first remaining day
      if (longRunDay === day && newDays.length > 0) {
        setLongRunDay(newDays[0]); // Default to first selected day
      } else if (newDays.length === 0) {
        // If no days left, reset longRunDay
        setLongRunDay('Sunday');
      }
    } else {
      // Add day
      const newDays = [...trainingDays, day].sort((a, b) =>
        DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b)
      );
      setTrainingDays(newDays);
      
      // If longRunDay is not in any training days, set it to the first one
      if (!newDays.includes(longRunDay) && newDays.length > 0) {
        setLongRunDay(newDays[0]);
      }
    }
  };

  const handleHardDayToggle = (day) => {
    if (!trainingDays.includes(day)) return; // Can't be a hard day if not a training day

    if (hardDays.includes(day)) {
      setHardDays(hardDays.filter(d => d !== day));
    } else {
      setHardDays([...hardDays, day]);
    }
  };

  const handleBikeDayToggle = (day) => {
    if (!trainingDays.includes(day)) return; // Can't be a bike day if not a training day

    if (bikeDays.includes(day)) {
      setBikeDays(bikeDays.filter(d => d !== day));
    } else {
      setBikeDays([...bikeDays, day]);
    }
  };

  // Determine which workouts per week options are supported for this race distance
  const raceDistance = trainingPlan?.planOverview?.raceDistance || 'Half';
  const supportedWorkoutsPerWeek = {
    '5K': [3, 4, 5, 6],
    '10K': [3, 4, 5, 6],
    'Half': [4, 5, 6, 7],
    'Marathon': [4, 5, 6, 7]
  };
  const availableOptions = supportedWorkoutsPerWeek[raceDistance] || [4, 5, 6];

  const handleUpdate = async () => {
    try {
      // Validation
      setErrorMessage(null);
      
      if (!trainingDays || trainingDays.length === 0) {
        setErrorMessage('Please select at least one training day.');
        toast.error('Please select at least one training day.');
        return;
      }

      if (trainingDays.length !== workoutsPerWeek) {
        setErrorMessage(`You selected ${trainingDays.length} days but chose ${workoutsPerWeek} workouts per week. Please match them.`);
        toast.error(`You selected ${trainingDays.length} days but chose ${workoutsPerWeek} workouts per week.`);
        return;
      }

      if (!trainingDays.includes(longRunDay)) {
        setErrorMessage(`Long run day (${longRunDay}) must be one of your selected training days.`);
        toast.error(`Long run day must be one of your selected training days.`);
        return;
      }

      // Filter out hard days and bike days that are no longer in trainingDays
      const validHardDays = hardDays.filter(day => trainingDays.includes(day));
      const validBikeDays = bikeDays.filter(day => trainingDays.includes(day));

      setIsUpdating(true);
      setUpdateStatus('regenerating');
      logger.log('⚙️ Updating training plan...');
      logger.log('  Current week:', currentWeek);
      logger.log('  New settings:', { workoutsPerWeek, trainingDays, hardDays: validHardDays, longRunDay, bikeDays: validBikeDays });

      // Get units from profile or training plan (for backward compatibility with older profiles)
      let units = userProfile.units;
      if (!units && trainingPlan?.planOverview?.units) {
        units = trainingPlan.planOverview.units;
        logger.log('📏 Units not in profile, using from training plan:', units);
      }
      if (!units) {
        // Default to imperial for backward compatibility (onboarding uses 'imperial')
        // This is expected for legacy profiles created before units field was added
        units = 'imperial';
        logger.log('📏 Units not found in profile or plan, defaulting to imperial (legacy data - this is normal)');
      }

      // Create updated profile with new settings
      // Map local state names to Firestore field names
      // CRITICAL: Include all required fields from userProfile (especially units, raceDistance, raceTime, etc.)
      const updatedProfile = {
        ...userProfile, // Spread all existing profile fields first
        units: units, // Ensure units is set
        workoutsPerWeek,
        runsPerWeek: workoutsPerWeek, // Backward compatibility
        availableDays: trainingDays,      // Firestore uses 'availableDays'
        hardSessionDays: validHardDays,    // Firestore uses 'hardSessionDays' - use filtered version
        longRunDay,
        preferredBikeDays: validBikeDays   // Firestore uses 'preferredBikeDays' - use filtered version
      };

      // Regenerate plan structure using AI (no defaults!)
      logger.log('  🤖 Using AI to regenerate plan structure...');
      const aiResult = await TrainingPlanAIService.regeneratePlanStructureFromCurrentWeek(
        trainingPlan,
        updatedProfile,
        currentWeek
      );

      if (!aiResult.success || !aiResult.newWeeks) {
        throw new Error(aiResult.error || 'Failed to regenerate plan with AI');
      }

      logger.log('  ✅ AI plan structure regenerated');

      // Use utility function to preserve completed weeks and merge
      const mergedWeeks = preserveAndMergeWeeks(
        trainingPlan,
        aiResult.newWeeks,
        currentWeek
      );

      // Build updated plan with merged weeks
      const updatedPlan = {
        ...trainingPlan,
        weeks: mergedWeeks,
        planOverview: {
          ...trainingPlan.planOverview,
          // Update settings in plan overview
          workoutsPerWeek: updatedProfile.workoutsPerWeek || updatedProfile.runsPerWeek,
          runsPerWeek: updatedProfile.workoutsPerWeek || updatedProfile.runsPerWeek // Backward compatibility
        }
      };

      logger.log('  ✅ Plan regenerated successfully (AI + utility merge)');

      // Generate AI coaching analysis for plan adjustments
      setUpdateStatus('analyzing');
      logger.log('  🤖 Generating AI coaching analysis...');
      try {
        const oldSettings = {
          workoutsPerWeek: userProfile.workoutsPerWeek || userProfile.runsPerWeek,
          runsPerWeek: userProfile.workoutsPerWeek || userProfile.runsPerWeek, // Backward compatibility
          availableDays: userProfile.availableDays || [],
          hardSessionDays: userProfile.hardSessionDays || userProfile.qualityDays || [],
          longRunDay: userProfile.longRunDay,
          preferredBikeDays: userProfile.preferredBikeDays || []
        };

        const newSettings = {
          workoutsPerWeek,
          runsPerWeek: workoutsPerWeek, // Backward compatibility
          availableDays: trainingDays,
          hardSessionDays: validHardDays,
          longRunDay,
          preferredBikeDays: validBikeDays
        };

        const adjustmentContext = {
          oldSettings,
          newSettings,
          currentWeek
          // Could add reason field later if user provides it
        };
        
        const coachingAnalysis = await TrainingPlanAIService.generatePlanAdjustmentCoaching(
          adjustmentContext,
          userProfile,
          trainingPlan
        );
        
        // Add coaching analysis to the plan
        updatedPlan.planAdjustmentCoaching = coachingAnalysis;
        logger.log('  ✅ AI coaching analysis generated');
      } catch (error) {
        logger.error('  ⚠️ Could not generate AI coaching (non-critical):', error);
        // Continue without coaching - plan is still valid
      }

      // Save updated plan to Firestore
      setUpdateStatus('saving');
      await FirestoreService.saveTrainingPlan(auth.currentUser.uid, updatedPlan);

      // Save updated profile to Firestore
      await FirestoreService.saveUserProfile(auth.currentUser.uid, updatedProfile);

      logger.log('  ✅ Saved to Firestore');

      // Reload page to show updated plan
      toast.success('Plan updated successfully! Your AI coach has regenerated your training plan.');
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Give toast time to show
    } catch (error) {
      logger.error('❌ Error updating plan:', error);
      const errorMsg = error.message || 'Failed to update plan. Please try again.';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      setIsUpdating(false);
      setUpdateStatus(null);
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
        // Close modal when clicking backdrop
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
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '24px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        {/* Header */}
        <div style={{
          borderBottom: '1px solid #333',
          paddingBottom: '16px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⚙️ Manage Plan
          </h2>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '0.9rem',
            color: '#999'
          }}>
            Adjust your training schedule. Your completed weeks will be preserved.
          </p>
        </div>

        {/* Runs Per Week */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            Workouts per week
          </label>
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            {[3, 4, 5, 6].map(num => {
              const isSupported = availableOptions.includes(num);
              return (
                <button
                  key={num}
                  onClick={() => isSupported && setWorkoutsPerWeek(num)}
                  disabled={!isSupported}
                  title={!isSupported ? `${num} days not supported for ${raceDistance} training` : ''}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    border: workoutsPerWeek === num ? '2px solid #3b82f6' : '1px solid #333',
                    background: !isSupported ? '#0a0a0a' : (workoutsPerWeek === num ? 'rgba(59, 130, 246, 0.1)' : '#1a1a1a'),
                    color: !isSupported ? '#444' : (workoutsPerWeek === num ? '#3b82f6' : '#999'),
                    borderRadius: '6px',
                    cursor: isSupported ? 'pointer' : 'not-allowed',
                    opacity: !isSupported ? 0.4 : 1
                  }}
                >
                  {num}
                </button>
              );
            })}
          </div>
          {!availableOptions.includes(3) && (
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '0.8rem',
              color: '#666'
            }}>
              {raceDistance} training requires minimum 4 workouts per week
            </p>
          )}
        </div>

        {/* Training Days */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            Training days
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day}
                onClick={() => handleDayToggle(day)}
                style={{
                  padding: '10px',
                  fontSize: '0.9rem',
                  border: trainingDays.includes(day) ? '2px solid #22c55e' : '1px solid #333',
                  background: trainingDays.includes(day) ? 'rgba(34, 197, 94, 0.1)' : '#1a1a1a',
                  color: trainingDays.includes(day) ? '#22c55e' : '#999',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {trainingDays.includes(day) ? '✓ ' : ''}{day.substring(0, 3)}
              </button>
            ))}
          </div>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '0.8rem',
            color: '#666'
          }}>
            Selected: {trainingDays.length} days
          </p>
        </div>

        {/* Hard Days */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            Hard workout days
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {trainingDays.filter(day => day !== longRunDay).map(day => (
              <button
                key={day}
                onClick={() => handleHardDayToggle(day)}
                style={{
                  padding: '10px',
                  fontSize: '0.9rem',
                  border: hardDays.includes(day) ? '2px solid #f97316' : '1px solid #333',
                  background: hardDays.includes(day) ? 'rgba(249, 115, 22, 0.1)' : '#1a1a1a',
                  color: hardDays.includes(day) ? '#f97316' : '#999',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {hardDays.includes(day) ? '⚡ ' : ''}{day.substring(0, 3)}
              </button>
            ))}
          </div>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '0.8rem',
            color: '#666'
          }}>
            Tempo runs, intervals, or hill workouts
          </p>
        </div>

        {/* Long Run Day */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            Long run day
          </label>
          <select
            value={trainingDays.includes(longRunDay) ? longRunDay : (trainingDays.length > 0 ? trainingDays[0] : 'Sunday')}
            onChange={(e) => setLongRunDay(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '0.9rem',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {trainingDays.length > 0 ? (
              trainingDays.map(day => (
                <option key={day} value={day}>{day}</option>
              ))
            ) : (
              <option value="Sunday">Select training days first</option>
            )}
          </select>
        </div>

        {/* Bike Days (if user has stand-up bike) */}
        {userProfile?.standUpBikeType && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: '500',
              marginBottom: '12px'
            }}>
              {userProfile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'} days (optional)
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px'
            }}>
              {trainingDays.map(day => (
                <button
                  key={day}
                  onClick={() => handleBikeDayToggle(day)}
                  style={{
                    padding: '10px',
                    fontSize: '0.9rem',
                    border: bikeDays.includes(day) ? '2px solid #8b5cf6' : '1px solid #333',
                    background: bikeDays.includes(day) ? 'rgba(139, 92, 246, 0.1)' : '#1a1a1a',
                    color: bikeDays.includes(day) ? '#8b5cf6' : '#999',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {bikeDays.includes(day) ? '🚴 ' : ''}{day.substring(0, 3)}
                </button>
              ))}
            </div>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '0.8rem',
              color: '#666'
            }}>
              Cross-training alternative to running
            </p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && !isUpdating && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '12px',
            color: '#fca5a5'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <strong style={{ color: '#ef4444' }}>Error</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#fca5a5' }}>
              {errorMessage}
            </p>
          </div>
        )}

        {/* AI Coach Progress Indicator */}
        {isUpdating && updateStatus && (
          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid rgba(59, 130, 246, 0.3)',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <h3 style={{
                margin: 0,
                fontSize: '1.1rem',
                color: '#60a5fa',
                fontWeight: '600'
              }}>
                {updateStatus === 'regenerating' && '🤖 AI Coach is regenerating your plan...'}
                {updateStatus === 'analyzing' && '💡 AI Coach is analyzing your adjustments...'}
                {updateStatus === 'saving' && '💾 Saving your updated plan...'}
              </h3>
            </div>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '0.9rem',
              color: '#93c5fd',
              lineHeight: '1.5'
            }}>
              {updateStatus === 'regenerating' && 'Jason is restructuring your training plan based on your new preferences. Your completed workouts are being preserved.'}
              {updateStatus === 'analyzing' && 'Jason is reviewing your changes and preparing personalized coaching insights for your plan adjustments.'}
              {updateStatus === 'saving' && 'Almost done! Your updated plan is being saved...'}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #333'
        }}>
          <button
            onClick={onClose}
            disabled={isUpdating}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '1rem',
              fontWeight: '500',
              background: '#1a1a1a',
              color: '#999',
              border: '1px solid #333',
              borderRadius: '8px',
              cursor: isUpdating ? 'not-allowed' : 'pointer',
              opacity: isUpdating ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '1rem',
              fontWeight: '500',
              background: isUpdating 
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: isUpdating ? 'not-allowed' : 'pointer',
              opacity: isUpdating ? 0.7 : 1,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {isUpdating ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  display: 'inline-block'
                }}></span>
                {updateStatus === 'regenerating' && 'Regenerating Plan...'}
                {updateStatus === 'analyzing' && 'Coach Analyzing...'}
                {updateStatus === 'saving' && 'Saving...'}
              </span>
            ) : 'Update Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManagePlanModal;
