import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import TrainingPlanAIService from '../services/TrainingPlanAIService';

/**
 * Admin component to migrate all training plans with new phase calculation
 * 
 * This recalculates Base, Build, Peak, and Taper phases for all users' plans
 * using the updated phase calculation logic.
 */
function PhaseMigrationAdmin() {
  const [status, setStatus] = useState('idle'); // idle, running, complete, error
  const [progress, setProgress] = useState({ total: 0, migrated: 0, skipped: 0, errors: 0 });
  const [logs, setLogs] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is admin
  useEffect(() => {
    try {
      console.log('PhaseMigrationAdmin: Checking admin status...');
      const checkAdmin = () => {
        // Allow if user is logged in (you can add email check here)
        const user = auth.currentUser;
        console.log('PhaseMigrationAdmin: Current user:', user ? user.email : 'Not logged in');
        if (user) {
          // For now, allow all logged-in users
          // To restrict: if (user.email === 'your-admin@email.com')
          console.log('PhaseMigrationAdmin: User is admin');
          setIsAdmin(true);
        } else {
          console.log('PhaseMigrationAdmin: User not logged in');
        }
        setLoading(false);
      };
      checkAdmin();
    } catch (err) {
      console.error('PhaseMigrationAdmin: Error checking admin status:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  /**
   * Recalculate phases for a training plan
   */
  const recalculatePhases = (trainingPlan) => {
    if (!trainingPlan) {
      console.warn('recalculatePhases: No training plan provided');
      return null;
    }

    if (!trainingPlan.weeks || !Array.isArray(trainingPlan.weeks)) {
      console.warn('recalculatePhases: Invalid weeks array', {
        hasWeeks: !!trainingPlan.weeks,
        weeksType: typeof trainingPlan.weeks,
        weeksLength: trainingPlan.weeks?.length
      });
      return null;
    }

    const totalWeeks = trainingPlan.weeks.length;
    if (totalWeeks <= 0) {
      console.warn('recalculatePhases: Plan has no weeks');
      return null;
    }

    // TrainingPlanAIService is already an instance, use it directly
    // Phase focus and motivation maps
    const phaseFocusMap = {
      Base: 'Aerobic foundation & durability',
      Build: 'Strength & speed development',
      Peak: 'Race-specific sharpening',
      Taper: 'Freshen up & execute'
    };
    
    const motivationMap = {
      Base: [
        'Consistency right now builds race-day confidence 💪',
        'Aerobic base today = faster workouts later ⚙️',
        'Keep stacking easy miles – durability wins 🧱',
        'Recovery matters as much as the miles 😴'
      ],
      Build: [
        'Dial in effort – smooth, fast, controlled 🚀',
        'This phase teaches you to love the grind 🔁',
        'Every quality day is sharpening your edge ✂️',
        'Fuel, sleep, repeat – you\'re in the work zone 🧪'
      ],
      Peak: [
        'Race-specific work now = calm on race day 🏁',
        'Trust your legs – they know what to do 👣',
        'Two words: race rehearsals 🧠',
        'Your engine is built. Now we fine tune 🔧'
      ],
      Taper: [
        'Less work, more readiness – let freshness build 🌱',
        'Nothing new. Stay sharp, stay calm 🎯',
        'Visualize success – you\'ve earned this 💫',
        'Rest is training. Really. 😴'
      ]
    };
    
    const getMotivation = (phase, weekNumber) => {
      const options = motivationMap[phase] || motivationMap.Base;
      return options[(weekNumber - 1) % options.length];
    };

    // Recalculate phase for each week
    const updatedWeeks = trainingPlan.weeks.map((week, index) => {
      // Try multiple ways to get week number
      const weekNumber = week.weekNumber || week.week || (index + 1);
      
      if (!weekNumber || weekNumber <= 0) {
        console.warn(`recalculatePhases: Invalid week number for week at index ${index}`, week);
        // Fallback to index + 1
        const fallbackWeekNumber = index + 1;
        const phaseLabel = TrainingPlanAIService.getPhaseForWeek(fallbackWeekNumber, totalWeeks);
        const phaseKey = phaseLabel.toLowerCase();
        
        return {
          ...week,
          weekNumber: fallbackWeekNumber, // Ensure weekNumber is set
          phase: phaseKey,
          weeklyFocus: phaseFocusMap[phaseLabel] || 'Periodized training',
          motivation: getMotivation(phaseLabel, fallbackWeekNumber)
        };
      }
      
      const phaseLabel = TrainingPlanAIService.getPhaseForWeek(weekNumber, totalWeeks);
      const phaseKey = phaseLabel.toLowerCase();
      
      return {
        ...week,
        phase: phaseKey,
        weeklyFocus: phaseFocusMap[phaseLabel] || 'Periodized training',
        motivation: getMotivation(phaseLabel, weekNumber)
      };
    });

    return {
      ...trainingPlan,
      weeks: updatedWeeks,
      phaseMigrationCompleted: true,
      phaseMigrationDate: new Date().toISOString()
    };
  };

  /**
   * Run migration for all users
   */
  const runMigration = async () => {
    if (!isAdmin) {
      addLog('❌ Access denied. Admin privileges required.', 'error');
      return;
    }

    setStatus('running');
    setProgress({ total: 0, migrated: 0, skipped: 0, errors: 0 });
    setLogs([]);

    try {
      addLog('🚀 Starting phase migration for all users...', 'info');

      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);

      let totalUsers = 0;
      let plansMigrated = 0;
      let plansSkipped = 0;
      let errors = 0;

      setProgress({ total: querySnapshot.size, migrated: 0, skipped: 0, errors: 0 });

      for (const userDoc of querySnapshot.docs) {
        totalUsers++;
        const userId = userDoc.id;
        const userData = userDoc.data();
        const trainingPlan = userData.trainingPlan;

        // Skip if no training plan
        if (!trainingPlan) {
          addLog(`⏭️  User ${userId}: No training plan, skipping`, 'info');
          plansSkipped++;
          setProgress(prev => ({ ...prev, skipped: prev.skipped + 1 }));
          continue;
        }

        // Skip if already migrated
        if (trainingPlan.phaseMigrationCompleted) {
          addLog(`✅ User ${userId}: Already migrated, skipping`, 'info');
          plansSkipped++;
          setProgress(prev => ({ ...prev, skipped: prev.skipped + 1 }));
          continue;
        }

        try {
          addLog(`📝 Migrating plan for user ${userId}...`, 'info');
          
          const updatedPlan = recalculatePhases(trainingPlan);
          
          if (!updatedPlan) {
            // Log more details about why it failed
            const hasWeeks = !!trainingPlan.weeks;
            const weeksIsArray = Array.isArray(trainingPlan.weeks);
            const weeksLength = trainingPlan.weeks?.length;
            addLog(`⚠️  User ${userId}: Failed to recalculate phases (hasWeeks: ${hasWeeks}, isArray: ${weeksIsArray}, length: ${weeksLength})`, 'error');
            errors++;
            setProgress(prev => ({ ...prev, errors: prev.errors + 1 }));
            continue;
          }

          // Update in Firestore
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            trainingPlan: updatedPlan,
            updatedAt: serverTimestamp()
          });

          // Log phase distribution
          const phaseCounts = {};
          updatedPlan.weeks.forEach(week => {
            const phase = week.phase || 'unknown';
            phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
          });

          addLog(`✅ User ${userId}: Migrated (${updatedPlan.weeks.length} weeks) - Phases: ${JSON.stringify(phaseCounts)}`, 'success');
          plansMigrated++;
          setProgress(prev => ({ ...prev, migrated: prev.migrated + 1 }));

        } catch (error) {
          const errorMsg = error.message || 'Unknown error';
          const errorCode = error.code || 'no-code';
          addLog(`❌ Error migrating user ${userId}: ${errorMsg} (code: ${errorCode})`, 'error');
          
          // If it's a permissions error, suggest solution
          if (error.code === 'permission-denied' || errorMsg.includes('permission')) {
            addLog(`   💡 Note: This is a Firestore security rules issue. Admin needs permission to update other users' plans.`, 'info');
          }
          
          errors++;
          setProgress(prev => ({ ...prev, errors: prev.errors + 1 }));
        }
      }

      addLog('', 'info');
      addLog('='.repeat(60), 'info');
      addLog('📊 Migration Summary:', 'info');
      addLog(`   Total users: ${totalUsers}`, 'info');
      addLog(`   Plans migrated: ${plansMigrated}`, 'success');
      addLog(`   Plans skipped: ${plansSkipped}`, 'info');
      addLog(`   Errors: ${errors}`, errors > 0 ? 'error' : 'info');
      addLog('='.repeat(60), 'info');

      setStatus('complete');

    } catch (error) {
      addLog(`❌ Fatal error during migration: ${error.message}`, 'error');
      setStatus('error');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading...</h2>
        <p>Checking admin access...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error</h2>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>Admin privileges required to run phase migration.</p>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          Please log in to access this page.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Phase Migration Admin</h1>
      <p>This tool recalculates training plan phases (Base, Build, Peak, Taper) for all users using the updated phase calculation logic.</p>
      
      <div style={{ margin: '20px 0' }}>
        <button
          onClick={runMigration}
          disabled={status === 'running'}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: status === 'running' ? '#ccc' : '#06b6d4',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: status === 'running' ? 'not-allowed' : 'pointer'
          }}
        >
          {status === 'running' ? 'Running Migration...' : 'Run Migration'}
        </button>
      </div>

      {progress.total > 0 && (
        <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <h3>Progress</h3>
          <p>Total users: {progress.total}</p>
          <p style={{ color: '#10b981' }}>✅ Migrated: {progress.migrated}</p>
          <p style={{ color: '#6b7280' }}>⏭️  Skipped: {progress.skipped}</p>
          <p style={{ color: '#ef4444' }}>❌ Errors: {progress.errors}</p>
        </div>
      )}

      {logs.length > 0 && (
        <div style={{ margin: '20px 0' }}>
          <h3>Migration Logs</h3>
          <div style={{
            backgroundColor: '#1f2937',
            color: '#f3f4f6',
            padding: '15px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            {logs.map((log, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '4px',
                  color: log.type === 'error' ? '#ef4444' : 
                         log.type === 'success' ? '#10b981' : '#9ca3af'
                }}
              >
                [{log.timestamp}] {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PhaseMigrationAdmin;

