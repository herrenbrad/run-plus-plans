import React, { useState, useEffect } from 'react';
import TrainingPlanService from '../services/TrainingPlanService';
import TrainingPlanAIService from '../services/TrainingPlanAIService';
import FirestoreService from '../services/FirestoreService';
import { auth } from '../firebase/config';
import logger from '../utils/logger';

function InjuryRecoveryModal({ isOpen, onClose, userProfile, trainingPlan, currentWeek }) {
  // Initialize state
  const [weeksOffRunning, setWeeksOffRunning] = useState(2);
  const [selectedEquipment, setSelectedEquipment] = useState({
    pool: false,
    elliptical: false,
    stationaryBike: false,
    swimming: false,
    rowing: false,
    standUpBike: false
  });
  const [reduceTrainingDays, setReduceTrainingDays] = useState(1);
  const [injuries, setInjuries] = useState({
    itBand: false,
    plantarFasciitis: false,
    shinSplints: false,
    kneeIssues: false,
    lowerBackPain: false,
    achillesTendonitis: false,
    stressFracture: false,
    hipIssues: false,
    ankleIssues: false,
    other: false
  });
  const [injuryDescription, setInjuryDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Load current settings when modal opens
  useEffect(() => {
    if (isOpen && auth.currentUser) {
      // Reset to defaults when opening
      setWeeksOffRunning(2);
      setReduceTrainingDays(1);
      
      // Load existing injury data if available
      if (userProfile?.injuries) {
        setInjuries(userProfile.injuries);
      } else {
        setInjuries({
          itBand: false,
          plantarFasciitis: false,
          shinSplints: false,
          kneeIssues: false,
          lowerBackPain: false,
          achillesTendonitis: false,
          stressFracture: false,
          hipIssues: false,
          ankleIssues: false,
          other: false
        });
      }
      setInjuryDescription(userProfile?.injuryDescription || userProfile?.injuryRecovery?.injuryDescription || '');

      // Pre-select stand-up bike if user has one
      if (userProfile?.standUpBikeType) {
        setSelectedEquipment(prev => ({ ...prev, standUpBike: true }));
      } else {
        setSelectedEquipment({
          pool: false,
          elliptical: false,
          stationaryBike: false,
          swimming: false,
          rowing: false,
          standUpBike: false
        });
      }
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const handleEquipmentToggle = (equipment) => {
    setSelectedEquipment(prev => ({
      ...prev,
      [equipment]: !prev[equipment]
    }));
  };

  const selectedCount = Object.values(selectedEquipment).filter(Boolean).length;

  const handleCreateRecoveryPlan = async () => {
    try {
      // Validation
      if (selectedCount === 0) {
        // Note: useToast hook would need to be added to InjuryRecoveryModal component
        console.warn('Please select at least one cross-training option');
        return;
      }

      setIsUpdating(true);
      logger.log('🏥 Creating injury recovery plan...');
      logger.log('  Current week:', currentWeek);
      logger.log('  Weeks off running:', weeksOffRunning);
      logger.log('  Selected equipment:', selectedEquipment);
      logger.log('  Reduce training days by:', reduceTrainingDays);

      const trainingPlanService = new TrainingPlanService();

      // Create updated profile with injury recovery settings
      const updatedProfile = {
        ...userProfile,
        injuries: injuries, // Save injury checkboxes
        injuryDescription: injuries.other ? (injuryDescription.trim() || null) : null, // Only save if "other" is selected
        injuryRecovery: {
          weeksOffRunning,
          selectedEquipment,
          reduceTrainingDays,
          injuryStartWeek: currentWeek,
          returnToRunningWeek: currentWeek + weeksOffRunning,
          injuryDescription: injuries.other ? (injuryDescription.trim() || null) : null
        }
      };

      // Regenerate plan with injury recovery modifications
      logger.log('  📋 Current plan structure:', {
        hasWeeks: !!trainingPlan?.weeks,
        weeksLength: trainingPlan?.weeks?.length || 0,
        currentWeek: currentWeek,
        firstWeekWorkouts: trainingPlan?.weeks?.[0]?.workouts?.length || 0
      });
      
      const updatedPlan = await trainingPlanService.regeneratePlanWithInjury(
        trainingPlan,
        updatedProfile,
        currentWeek,
        weeksOffRunning,
        selectedEquipment,
        reduceTrainingDays
      );

      logger.log('  ✅ Recovery plan generated successfully');
      logger.log('  📋 Updated plan structure:', {
        hasWeeks: !!updatedPlan?.weeks,
        weeksLength: updatedPlan?.weeks?.length || 0,
        injuryRecoveryActive: updatedPlan?.injuryRecoveryActive,
        firstWeekWorkouts: updatedPlan?.weeks?.[0]?.workouts?.length || 0,
        firstWeekWorkoutTypes: updatedPlan?.weeks?.[0]?.workouts?.map(w => w.type) || []
      });

      // Generate AI coaching analysis for injury recovery
      logger.log('  🤖 Generating AI coaching analysis...');
      try {
        // Build injury list for AI context
        const selectedInjuries = [];
        if (injuries.itBand) selectedInjuries.push('IT Band Syndrome');
        if (injuries.plantarFasciitis) selectedInjuries.push('Plantar Fasciitis');
        if (injuries.shinSplints) selectedInjuries.push('Shin Splints');
        if (injuries.kneeIssues) selectedInjuries.push('Knee Issues');
        if (injuries.lowerBackPain) selectedInjuries.push('Lower Back Pain');
        if (injuries.achillesTendonitis) selectedInjuries.push('Achilles Tendonitis');
        if (injuries.stressFracture) selectedInjuries.push('Stress Fracture');
        if (injuries.hipIssues) selectedInjuries.push('Hip Issues');
        if (injuries.ankleIssues) selectedInjuries.push('Ankle Issues');
        if (injuries.other && injuryDescription.trim()) {
          selectedInjuries.push(`Other: ${injuryDescription.trim()}`);
        }
        
        const injuryContext = {
          weeksOffRunning,
          selectedEquipment,
          reduceTrainingDays,
          currentWeek,
          returnToRunningWeek: currentWeek + weeksOffRunning,
          injuries: selectedInjuries,
          injuryDescription: injuries.other ? (injuryDescription.trim() || null) : null
        };
        
        const coachingAnalysis = await TrainingPlanAIService.generateInjuryRecoveryCoaching(
          injuryContext,
          userProfile,
          trainingPlan
        );
        
        // Add coaching analysis to the plan
        updatedPlan.injuryRecoveryCoaching = coachingAnalysis;
        logger.log('  ✅ AI coaching analysis generated');
      } catch (error) {
        logger.error('  ⚠️ Could not generate AI coaching (non-critical):', error);
        // Continue without coaching - plan is still valid
      }

      // Validate plan structure before saving
      if (!updatedPlan.weeks || updatedPlan.weeks.length === 0) {
        logger.error('  ❌ CRITICAL: Updated plan has no weeks array! Cannot save.');
        throw new Error('Injury recovery plan generation failed - plan structure is invalid');
      }
      
      logger.log('  📋 Plan validation before save:', {
        weeksCount: updatedPlan.weeks.length,
        injuryRecoveryActive: updatedPlan.injuryRecoveryActive,
        hasInjuryRecoveryInfo: !!updatedPlan.injuryRecoveryInfo,
        firstWeekWorkouts: updatedPlan.weeks[0]?.workouts?.length || 0
      });

      // Save updated plan to Firestore
      await FirestoreService.saveTrainingPlan(auth.currentUser.uid, updatedPlan);

      // Save updated profile to Firestore
      await FirestoreService.saveUserProfile(auth.currentUser.uid, updatedProfile);

      logger.log('  ✅ Saved to Firestore');

      // Reload page to show updated plan
      window.location.reload();
    } catch (error) {
      logger.error('❌ Error creating recovery plan:', error);
      // Note: useToast hook would need to be added to InjuryRecoveryModal component
      console.error('Error creating recovery plan. Please try again.');
      setIsUpdating(false);
    }
  };

  const equipmentOptions = [
    {
      id: 'pool',
      name: 'Pool / Aqua Running',
      emoji: '🏊',
      description: 'Deep water running with flotation belt'
    },
    {
      id: 'elliptical',
      name: 'Elliptical',
      emoji: '🏃',
      description: 'Low-impact cardio machine'
    },
    {
      id: 'stationaryBike',
      name: 'Stationary Bike',
      emoji: '🚴',
      description: 'Spin bike, Peloton, or indoor trainer'
    },
    {
      id: 'swimming',
      name: 'Swimming',
      emoji: '🏊',
      description: 'Lap swimming (technique required)'
    },
    {
      id: 'rowing',
      name: 'Rowing Machine',
      emoji: '🚣',
      description: 'Concept2 or similar rowing erg'
    }
  ];

  // Add stand-up bike option if user has one
  if (userProfile?.standUpBikeType) {
    equipmentOptions.push({
      id: 'standUpBike',
      name: userProfile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO',
      emoji: '🚴',
      description: 'Your stand-up bike'
    });
  }

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
            🏥 Injury Recovery Protocol
          </h2>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '0.9rem',
            color: '#999'
          }}>
            We'll create a modified plan with cross-training while you recover. Your completed weeks will be preserved.
          </p>
        </div>

        {/* Injury Information */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            What injury are you recovering from? (Select all that apply)
          </label>
          <p style={{
            marginBottom: '16px',
            fontSize: '0.85rem',
            color: '#999'
          }}>
            This helps the AI coach recommend the safest cross-training equipment and avoid aggravating your injury.
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '16px'
          }}>
            {[
              { id: 'itBand', name: 'IT Band Syndrome', description: 'Hip/knee pain on outside of leg' },
              { id: 'plantarFasciitis', name: 'Plantar Fasciitis', description: 'Bottom of foot pain' },
              { id: 'shinSplints', name: 'Shin Splints', description: 'Pain along shin bone' },
              { id: 'kneeIssues', name: 'Knee Issues', description: 'Patellofemoral, meniscus, etc.' },
              { id: 'lowerBackPain', name: 'Lower Back Pain', description: 'Lower back discomfort' },
              { id: 'achillesTendonitis', name: 'Achilles Tendonitis', description: 'Back of heel/ankle pain' },
              { id: 'stressFracture', name: 'Stress Fracture', description: 'Bone stress injury' },
              { id: 'hipIssues', name: 'Hip Issues', description: 'Hip pain or impingement' },
              { id: 'ankleIssues', name: 'Ankle Issues', description: 'Ankle pain or instability' },
              { id: 'other', name: 'Other', description: 'Please specify below' }
            ].map(injury => (
              <button
                key={injury.id}
                type="button"
                onClick={() => {
                  const newInjuries = {
                    ...injuries,
                    [injury.id]: !injuries[injury.id]
                  };
                  setInjuries(newInjuries);
                  // Clear description if "other" is deselected
                  if (injury.id === 'other' && !newInjuries.other) {
                    setInjuryDescription('');
                  }
                }}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.9rem',
                  border: injuries[injury.id] ? '2px solid #ef4444' : '1px solid #333',
                  background: injuries[injury.id] ? 'rgba(239, 68, 68, 0.1)' : '#1a1a1a',
                  color: injuries[injury.id] ? '#ef4444' : '#999',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{injuries[injury.id] ? '✓' : '○'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500' }}>
                    {injury.name}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: injuries[injury.id] ? '#fca5a5' : '#666',
                    marginTop: '2px'
                  }}>
                    {injury.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Other injury description field */}
          {injuries.other && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                Please describe your injury:
              </label>
              <textarea
                value={injuryDescription}
                onChange={(e) => setInjuryDescription(e.target.value)}
                placeholder="e.g., Runner's knee, patellar tendinitis, etc."
                rows={2}
                maxLength={100}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
        </div>

        {/* Weeks Off Running */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            How many weeks off running do you need?
          </label>
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                onClick={() => setWeeksOffRunning(num)}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  border: weeksOffRunning === num ? '2px solid #ef4444' : '1px solid #333',
                  background: weeksOffRunning === num ? 'rgba(239, 68, 68, 0.1)' : '#1a1a1a',
                  color: weeksOffRunning === num ? '#ef4444' : '#999',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {num}
              </button>
            ))}
          </div>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '0.8rem',
            color: '#666'
          }}>
            Your race date will remain the same. Plan will be compressed after recovery.
          </p>
        </div>

        {/* Cross-Training Equipment */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            Select available cross-training equipment
          </label>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {equipmentOptions.map(option => (
              <button
                key={option.id}
                onClick={() => handleEquipmentToggle(option.id)}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.9rem',
                  border: selectedEquipment[option.id] ? '2px solid #22c55e' : '1px solid #333',
                  background: selectedEquipment[option.id] ? 'rgba(34, 197, 94, 0.1)' : '#1a1a1a',
                  color: selectedEquipment[option.id] ? '#22c55e' : '#999',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{option.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500' }}>
                    {selectedEquipment[option.id] ? '✓ ' : ''}{option.name}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: selectedEquipment[option.id] ? '#86efac' : '#666',
                    marginTop: '2px'
                  }}>
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '0.8rem',
            color: selectedCount === 0 ? '#ef4444' : '#666'
          }}>
            {selectedCount === 0 ? 'Please select at least one option' : `Selected: ${selectedCount} option${selectedCount > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Reduce Training Days */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            Reduce training days per week during recovery
          </label>
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            {[0, 1, 2].map(num => (
              <button
                key={num}
                onClick={() => setReduceTrainingDays(num)}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  border: reduceTrainingDays === num ? '2px solid #3b82f6' : '1px solid #333',
                  background: reduceTrainingDays === num ? 'rgba(59, 130, 246, 0.1)' : '#1a1a1a',
                  color: reduceTrainingDays === num ? '#3b82f6' : '#999',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {num === 0 ? 'Keep same' : `-${num} day${num > 1 ? 's' : ''}`}
              </button>
            ))}
          </div>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '0.8rem',
            color: '#666'
          }}>
            Recommended: Reduce by 1-2 days to focus on recovery
          </p>
        </div>

        {/* Preview */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            color: '#3b82f6',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            Recovery Plan Summary
          </div>
          <div style={{
            fontSize: '0.85rem',
            color: '#999',
            lineHeight: '1.6'
          }}>
            <div style={{ marginBottom: '6px' }}>
              • Weeks {currentWeek}-{currentWeek + weeksOffRunning - 1}: Cross-training only ({selectedCount} modality options)
            </div>
            <div style={{ marginBottom: '6px' }}>
              • Week {currentWeek + weeksOffRunning}: Gradual return to running
            </div>
            <div style={{ marginBottom: '6px' }}>
              • Training days: {reduceTrainingDays === 0 ? 'Same as current plan' : `Reduced by ${reduceTrainingDays} day${reduceTrainingDays > 1 ? 's' : ''}`}
            </div>
            <div>
              • Race date: Unchanged (plan will be compressed)
            </div>
          </div>
        </div>

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
            onClick={handleCreateRecoveryPlan}
            disabled={isUpdating || selectedCount === 0}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '1rem',
              fontWeight: '500',
              background: selectedCount === 0 ? '#333' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: (isUpdating || selectedCount === 0) ? 'not-allowed' : 'pointer',
              opacity: (isUpdating || selectedCount === 0) ? 0.5 : 1
            }}
          >
            {isUpdating ? 'Creating Recovery Plan...' : 'Create Recovery Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InjuryRecoveryModal;
