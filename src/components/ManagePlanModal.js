import React, { useState, useEffect } from 'react';
import TrainingPlanService from '../services/TrainingPlanService';
import FirestoreService from '../services/FirestoreService';
import { auth } from '../firebase/config';
import logger from '../utils/logger';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function ManagePlanModal({ isOpen, onClose, userProfile, trainingPlan, currentWeek }) {
  // Initialize state from current plan settings
  const [runsPerWeek, setRunsPerWeek] = useState(5);
  const [trainingDays, setTrainingDays] = useState([]);
  const [hardDays, setHardDays] = useState([]);
  const [longRunDay, setLongRunDay] = useState('Saturday');
  const [bikeDays, setBikeDays] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

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
            logger.log('    runsPerWeek:', settings.runsPerWeek);
            logger.log('    availableDays:', settings.availableDays);
            logger.log('    hardSessionDays:', settings.hardSessionDays);
            logger.log('    longRunDay:', settings.longRunDay);
            logger.log('    preferredBikeDays:', settings.preferredBikeDays);

            setRunsPerWeek(settings.runsPerWeek || 5);
            setTrainingDays(settings.availableDays || []);
            setHardDays(settings.hardSessionDays || []);
            setLongRunDay(settings.longRunDay || 'Sunday');
            setBikeDays(settings.preferredBikeDays || []);

            logger.log('  ✅ Settings loaded successfully');
          }
        } catch (error) {
          logger.error('❌ Error loading settings:', error);
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

      // If we removed the long run day, reset it
      if (longRunDay === day && newDays.length > 0) {
        setLongRunDay(newDays[newDays.length - 1]); // Default to last day
      }
    } else {
      // Add day
      setTrainingDays([...trainingDays, day].sort((a, b) =>
        DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b)
      ));
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

  // Determine which runs per week options are supported for this race distance
  const raceDistance = trainingPlan?.planOverview?.raceDistance || 'Half';
  const supportedRunsPerWeek = {
    '5K': [3, 4, 5, 6],
    '10K': [3, 4, 5, 6],
    'Half': [4, 5, 6, 7],
    'Marathon': [4, 5, 6, 7]
  };
  const availableOptions = supportedRunsPerWeek[raceDistance] || [4, 5, 6];

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      logger.log('⚙️ Updating training plan...');
      logger.log('  Current week:', currentWeek);
      logger.log('  New settings:', { runsPerWeek, trainingDays, hardDays, longRunDay, bikeDays });

      const trainingPlanService = new TrainingPlanService();

      // Create updated profile with new settings
      // Map local state names to Firestore field names
      const updatedProfile = {
        ...userProfile,
        runsPerWeek,
        availableDays: trainingDays,      // Firestore uses 'availableDays'
        hardSessionDays: hardDays,         // Firestore uses 'hardSessionDays'
        longRunDay,
        preferredBikeDays: bikeDays        // Firestore uses 'preferredBikeDays'
      };

      // Regenerate plan from current week with new settings
      const updatedPlan = await trainingPlanService.regeneratePlanFromCurrentWeek(
        trainingPlan,
        updatedProfile,
        currentWeek
      );

      logger.log('  ✅ Plan regenerated successfully');

      // Save updated plan to Firestore
      await FirestoreService.saveTrainingPlan(auth.currentUser.uid, updatedPlan);

      // Save updated profile to Firestore
      await FirestoreService.saveUserProfile(auth.currentUser.uid, updatedProfile);

      logger.log('  ✅ Saved to Firestore');

      // Reload page to show updated plan
      window.location.reload();
    } catch (error) {
      logger.error('❌ Error updating plan:', error);
      alert('Error updating plan. Please try again.');
      setIsUpdating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
        border: '1px solid #333',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px'
      }}>
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
            Runs per week
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
                  onClick={() => isSupported && setRunsPerWeek(num)}
                  disabled={!isSupported}
                  title={!isSupported ? `${num} days not supported for ${raceDistance} training` : ''}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    border: runsPerWeek === num ? '2px solid #3b82f6' : '1px solid #333',
                    background: !isSupported ? '#0a0a0a' : (runsPerWeek === num ? 'rgba(59, 130, 246, 0.1)' : '#1a1a1a'),
                    color: !isSupported ? '#444' : (runsPerWeek === num ? '#3b82f6' : '#999'),
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
              {raceDistance} training requires minimum 4 runs per week
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
            value={longRunDay}
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
            {trainingDays.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
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
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: isUpdating ? 'not-allowed' : 'pointer',
              opacity: isUpdating ? 0.5 : 1
            }}
          >
            {isUpdating ? 'Updating...' : 'Update Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManagePlanModal;
