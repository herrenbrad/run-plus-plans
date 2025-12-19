/**
 * DashboardHeader Component
 * Extracted from Dashboard.js to reduce component size and improve maintainability
 * Displays week title, navigation, stats, phase banner, and action buttons
 */

import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getWeekDateRange } from '../utils/weekCalculations';
import { calculateMileageBreakdown, calculateRollingDistance } from '../utils/statsCalculations';
import { formatPhase } from '../utils/typography';
import FirestoreService from '../services/FirestoreService';
import logger from '../utils/logger';
import useStrava from '../hooks/useStrava';
import StravaService from '../services/StravaService';

export default function DashboardHeader({
  currentWeek,
  setCurrentWeek,
  trainingPlan,
  currentWeekData,
  workoutCompletions,
  getWorkouts,
  userProfile,
  setShowManagePlanModal,
  setShowInjuryRecoveryModal,
  clearAllData,
  toast
}) {
  const navigate = useNavigate();
  const { isSyncing: stravaSyncing, syncActivities, disconnectStrava } = useStrava(userProfile);

  // Wrap sync and disconnect for compatibility with existing code
  const handleManualStravaSync = async () => {
    await syncActivities(trainingPlan);
  };
  const handleDisconnectStrava = disconnectStrava;

  const dateRange = getWeekDateRange(currentWeek, trainingPlan);
  const mileageBreakdown = calculateMileageBreakdown(currentWeekData, getWorkouts);
  const hasEquivalentMiles = mileageBreakdown.equivalentMiles > 0 || mileageBreakdown.runEqMiles > 0;
  const rollingDistance = calculateRollingDistance(trainingPlan, workoutCompletions, getWorkouts);
  const hasCompletedWorkouts = rollingDistance.allTime > 0;
  const phase = currentWeekData.phase || 'base';

  const phaseConfig = {
    base: {
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.15)',
      borderColor: 'rgba(59, 130, 246, 0.4)',
      icon: '🏃',
      message: 'Building your aerobic foundation - consistency over intensity'
    },
    build: {
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      icon: '🏗️',
      message: 'Building strength and speed - time to push harder'
    },
    peak: {
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.4)',
      icon: '🏔️',
      message: 'Peak fitness - your hardest workouts are here'
    },
    taper: {
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.15)',
      borderColor: 'rgba(139, 92, 246, 0.4)',
      icon: '⚡',
      message: 'Tapering for race day - trust your training'
    },
    recovery: {
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.15)',
      borderColor: 'rgba(34, 197, 94, 0.4)',
      icon: '🌱',
      message: 'Recovery week - let your body adapt and rebuild'
    }
  };

  const config = phaseConfig[phase] || phaseConfig.base;

  const handleCancelRecovery = async () => {
    if (window.confirm('Cancel injury recovery protocol and restore your original training plan?')) {
      try {
        console.log('🏥 Canceling injury recovery...');
        console.log('  trainingPlan.injuryRecoveryActive:', trainingPlan?.injuryRecoveryActive);
        console.log('  trainingPlan.originalPlanBeforeInjury exists:', !!trainingPlan?.originalPlanBeforeInjury);
        console.log('  originalPlanBeforeInjury.weeks count:', trainingPlan?.originalPlanBeforeInjury?.weeks?.length);
        console.log('  auth.currentUser.uid:', auth.currentUser?.uid);

        if (!trainingPlan.originalPlanBeforeInjury) {
          const errorMsg = 'Cannot restore original plan - backup not found';
          console.error('❌', errorMsg);
          alert(errorMsg);
          return;
        }
        if (!trainingPlan.originalPlanBeforeInjury.weeks) {
          const errorMsg = 'Cannot restore original plan - backup weeks not found';
          console.error('❌', errorMsg);
          alert(errorMsg);
          return;
        }

        // Check if backup weeks have null entries (data corruption)
        const backupWeeks = trainingPlan.originalPlanBeforeInjury.weeks;
        const nullWeekIndices = backupWeeks
          .map((w, i) => (!w || !w.workouts || w.workouts.length === 0) ? i + 1 : null)
          .filter(Boolean);

        if (nullWeekIndices.length > 0) {
          console.warn('⚠️ Original plan backup has null weeks:', nullWeekIndices);
          // Try to use current plan's weeks for the null positions
          // This preserves the current injury weeks but clears the recovery flags
          const repairedWeeks = backupWeeks.map((week, index) => {
            if (!week || !week.workouts || week.workouts.length === 0) {
              // Use current plan's week if backup is null
              const currentWeek = trainingPlan.weeks[index];
              if (currentWeek && currentWeek.workouts && currentWeek.workouts.length > 0) {
                console.log(`  Repairing week ${index + 1} from current plan`);
                return currentWeek;
              }
            }
            return week;
          });

          const stillNullCount = repairedWeeks.filter(w => !w || !w.workouts || w.workouts.length === 0).length;
          if (stillNullCount > 0) {
            alert(`Cannot restore plan - ${stillNullCount} weeks are corrupted in both backup and current plan. Please use "Manage Plan" to regenerate your training plan instead.`);
            return;
          }

          const restoredPlan = {
            ...trainingPlan,
            weeks: repairedWeeks,
            injuryRecoveryActive: false,
            injuryRecoveryInfo: null,
            injuryRecoveryCoaching: null,
            originalPlanBeforeInjury: null
          };

          console.log('  Restored plan weeks count:', restoredPlan.weeks?.length);
          console.log('  Saving repaired plan to Firestore...');

          const result = await FirestoreService.saveTrainingPlan(auth.currentUser.uid, restoredPlan);
          if (!result.success) {
            alert(`Error saving: ${result.error}`);
            return;
          }

          console.log('  ✅ Saved successfully, reloading...');
          window.location.reload();
          return;
        }

        // Normal case - backup is clean
        const restoredPlan = {
          ...trainingPlan,
          weeks: backupWeeks,
          injuryRecoveryActive: false,
          injuryRecoveryInfo: null,
          injuryRecoveryCoaching: null,
          originalPlanBeforeInjury: null
        };

        console.log('  Restored plan weeks count:', restoredPlan.weeks?.length);
        console.log('  Saving to Firestore...');

        const result = await FirestoreService.saveTrainingPlan(auth.currentUser.uid, restoredPlan);
        if (!result.success) {
          alert(`Error saving: ${result.error}`);
          return;
        }

        console.log('  ✅ Saved successfully, reloading...');
        window.location.reload();
      } catch (error) {
        console.error('❌ Error canceling injury recovery:', error);
        alert(`Error restoring plan: ${error.message}`);
      }
    }
  };

  return (
    <div style={{ color: '#AAAAAA', padding: '20px 0' }}>
      <div className="container">
        {/* Title Row */}
        <div style={{ marginBottom: '12px' }}>
          <h1 className="dashboard-week-title" style={{ margin: '0', lineHeight: '1.2' }}>
            Week {currentWeek}
          </h1>
          {dateRange && (
            <div style={{
              fontSize: '0.9rem',
              color: '#AAAAAA',
              marginTop: '4px'
            }}>
              Week of {dateRange}
            </div>
          )}
        </div>

        {/* Navigation Row */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <button
            onClick={() => navigate('/welcome')}
            style={{
              padding: '8px 16px',
              background: 'rgba(0, 245, 212, 0.1)',
              border: '1px solid rgba(0, 245, 212, 0.3)',
              borderRadius: '6px',
              color: '#00f5d4',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(0, 245, 212, 0.2)';
              e.target.style.borderColor = '#00f5d4';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(0, 245, 212, 0.1)';
              e.target.style.borderColor = 'rgba(0, 245, 212, 0.3)';
            }}
          >
            ← Coach's Analysis
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div className="dashboard-stats-badge" style={{ 
            background: 'rgba(0, 212, 255, 0.2)', 
            color: '#00D4FF', 
            padding: '8px 14px', 
            borderRadius: '10px',
            fontWeight: '600',
            fontSize: '1.1rem',
            border: '1px solid rgba(0, 212, 255, 0.3)'
          }}>
            📊 {mileageBreakdown.totalMiles} Miles This Week
            {hasEquivalentMiles && (
              <div className="stats-subtext" style={{
                fontSize: '0.85rem',
                fontWeight: '500',
                marginTop: '4px',
                color: '#66E8FF'
              }}>
                {mileageBreakdown.runMiles > 0 && `${mileageBreakdown.runMiles}mi running`}
                {mileageBreakdown.runEqMiles > 0 && (mileageBreakdown.runMiles > 0 ? ` + ${mileageBreakdown.runEqMiles}mi RunEQ` : `${mileageBreakdown.runEqMiles}mi RunEQ`)}
                {mileageBreakdown.bikeMiles > 0 && ` + ${mileageBreakdown.bikeMiles}mi bike`}
                {mileageBreakdown.ellipticalMiles > 0 && ` + ${mileageBreakdown.ellipticalMiles}mi elliptical`}
                {mileageBreakdown.equivalentMiles > 0 && (
                  <span style={{ fontSize: '0.75rem', opacity: 0.8, display: 'block', marginTop: '2px' }}>
                    ({mileageBreakdown.equivalentMiles}mi equivalent activity)
                  </span>
                )}
              </div>
            )}
          </div>
          
          {hasCompletedWorkouts && (
            <div className="dashboard-stats-badge" style={{
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#22c55e',
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '1.1rem',
              border: '1px solid rgba(34, 197, 94, 0.3)'
            }}>
              🏃 {rollingDistance.last7Days} Miles (7 days)
              <div style={{
                fontSize: '0.8rem',
                fontWeight: '500',
                marginTop: '4px',
                color: '#4ade80'
              }}>
                {rollingDistance.last30Days}mi last 30 days • {rollingDistance.allTime}mi total
              </div>
            </div>
          )}
        </div>

        {/* Training Phase Banner */}
        <div style={{
          background: config.bgColor,
          border: `2px solid ${config.borderColor}`,
          borderRadius: '12px',
          padding: '14px 18px',
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div className="dashboard-phase-icon" style={{ fontSize: '1.8rem', lineHeight: '1' }}>{config.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{
              color: config.color,
              fontSize: '1rem',
              fontWeight: '700',
              marginBottom: '2px'
            }}>
              {formatPhase(phase)}
            </div>
            <div style={{
              color: '#CCCCCC',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}>
              {config.message}
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="dashboard-button-row" style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="dashboard-nav-button dashboard-nav-button-prev"
            onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
            disabled={currentWeek <= 1}
          >
            ← Prev
          </button>

          <select
            className="dashboard-week-select"
            value={currentWeek}
            onChange={(e) => setCurrentWeek(parseInt(e.target.value, 10))}
          >
            {Array.from({ length: trainingPlan?.planOverview?.totalWeeks || 12 }, (_, i) => i + 1).map(week => (
              <option key={week} value={week}>
                Week {week}
              </option>
            ))}
          </select>

          <button
            className="dashboard-nav-button dashboard-nav-button-next"
            onClick={() => setCurrentWeek(Math.min(trainingPlan?.planOverview?.totalWeeks || 12, currentWeek + 1))}
            disabled={currentWeek === (trainingPlan?.planOverview?.totalWeeks || 12)}
          >
            Next →
          </button>

          <button
            className="dashboard-nav-button dashboard-nav-button-manage"
            onClick={() => setShowManagePlanModal(true)}
            title="Adjust training schedule, days, and preferences"
          >
            ⚙️ Manage Plan
          </button>

          {/* Show either Report Injury or Cancel Recovery based on status */}
          {trainingPlan?.injuryRecoveryActive ? (
            <button
              className="dashboard-nav-button dashboard-nav-button-recovery"
              onClick={handleCancelRecovery}
              title="Cancel injury recovery and restore original plan"
            >
              ✓ Cancel Recovery Protocol
            </button>
          ) : (
            <button
              className="dashboard-nav-button dashboard-nav-button-injury"
              onClick={() => setShowInjuryRecoveryModal(true)}
              title="Modify plan for injury recovery with cross-training"
            >
              🏥 Report Injury
            </button>
          )}

          <button
            className="dashboard-nav-button dashboard-nav-button-reset"
            onClick={() => {
              if (window.confirm('Clear all data and start over? This will reset your profile and training plan.')) {
                clearAllData();
              }
            }}
            title="Clear all data and restart onboarding"
          >
            🗑️ Reset
          </button>

          {/* Strava Connection */}
          {userProfile?.stravaConnected ? (
            <>
              <button
                className="dashboard-nav-button dashboard-nav-button-strava"
                title={`Connected as ${userProfile.stravaAthleteName || 'Strava athlete'}`}
              >
                ✓ Strava Connected
              </button>
              <button
                className="dashboard-nav-button dashboard-nav-button-strava"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleManualStravaSync();
                }}
                disabled={stravaSyncing}
                title="Manually sync your Strava activities"
              >
                {stravaSyncing ? '⏳ Syncing...' : '🔄 Sync Now'}
              </button>
              <button
                className="dashboard-nav-button dashboard-nav-button-strava"
                onClick={handleDisconnectStrava}
                title="Disconnect Strava account"
                style={{ opacity: 0.7 }}
              >
                ✕ Disconnect
              </button>
            </>
          ) : (
            <button
              className="dashboard-nav-button dashboard-nav-button-strava strava-brand-button"
              onClick={() => {
                const authUrl = StravaService.getAuthorizationUrl();
                window.location.href = authUrl;
              }}
              title="Connect with Strava"
            >
              <img
                src="/images/strava/btn_strava_connect_with_orange_x2.png"
                alt="Connect with Strava"
                className="strava-connect-img"
              />
            </button>
          )}

          <button
            className="dashboard-nav-button dashboard-nav-button-logout"
            onClick={async () => {
              if (window.confirm('Logout? Your data is saved and will be here when you log back in.')) {
                await signOut(auth);
              }
            }}
            title="Logout (your data is saved)"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
}

