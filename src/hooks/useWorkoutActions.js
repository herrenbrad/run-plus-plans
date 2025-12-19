/**
 * useWorkoutActions Hook
 * Extracted from Dashboard.js to centralize workout modification logic
 * Handles replacing, adding, removing, swapping, and converting workouts
 */

import { useState, useCallback } from 'react';
import { auth } from '../firebase/config';
import FirestoreService from '../services/FirestoreService';
import WorkoutOptionsService from '../services/WorkoutOptionsService';
import { getNormalizedWorkoutType } from '../utils/workoutHelpers';
import { formatEquipmentName } from '../utils/typography';
import logger from '../utils/logger';

export default function useWorkoutActions({
  currentWeek,
  userProfile,
  modifiedWorkouts,
  setModifiedWorkouts,
  toast
}) {
  const [somethingElseModal, setSomethingElseModal] = useState({
    isOpen: false,
    workout: null,
    mode: 'replace' // 'replace' or 'add'
  });
  const [showBrickOptions, setShowBrickOptions] = useState({});
  const [showingOptions, setShowingOptions] = useState({});
  const [workoutOptions, setWorkoutOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});

  const workoutOptionsService = new WorkoutOptionsService();

  /**
   * Open "Something Else" modal to replace or add a workout
   */
  const handleSomethingElse = useCallback((workout, mode = 'replace') => {
    setSomethingElseModal({
      isOpen: true,
      workout: workout,
      mode: mode // 'replace' or 'add'
    });
  }, []);

  /**
   * Close "Something Else" modal
   */
  const handleCloseSomethingElse = useCallback(() => {
    setSomethingElseModal({
      isOpen: false,
      workout: null,
      mode: 'replace'
    });
  }, []);

  /**
   * Add a workout to a day (for two-a-days)
   */
  const handleAddWorkout = useCallback((originalWorkout) => {
    handleSomethingElse(originalWorkout, 'add');
  }, [handleSomethingElse]);

  /**
   * Remove a secondary workout (cannot remove primary workout at index 0)
   */
  const handleRemoveWorkout = useCallback((originalWorkout, workoutIndex) => {
    if (workoutIndex === 0) {
      toast.warning("Cannot remove the primary workout. Use 'Something Else' to replace it instead.");
      return;
    }

    const dayKey = `${currentWeek}-${originalWorkout.day}`;
    const workoutKey = `${dayKey}-${workoutIndex}`;
    
    const updatedWorkouts = { ...modifiedWorkouts };
    delete updatedWorkouts[workoutKey];
    
    setModifiedWorkouts(updatedWorkouts);
    localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(updatedWorkouts));
    
    // Save to Firestore
    if (auth.currentUser) {
      FirestoreService.removeModifiedWorkout(
        auth.currentUser.uid,
        currentWeek,
        originalWorkout.day,
        workoutIndex
      ).catch(error => {
        logger.error('Error removing workout from Firestore:', error);
      });
    }
  }, [currentWeek, modifiedWorkouts, setModifiedWorkouts, toast]);

  /**
   * Replace or add a workout (called from SomethingElseModal)
   */
  const handleWorkoutReplacement = useCallback((newWorkout) => {
    const mode = somethingElseModal.mode || 'replace';
    const dayKey = `${currentWeek}-${newWorkout.day}`;
    let workoutIndex = 0;

    if (mode === 'add') {
      // Find the next available index for this day
      let nextIndex = 0;
      while (modifiedWorkouts[`${dayKey}-${nextIndex}`]) {
        nextIndex++;
      }

      // If nextIndex is 0 and we already have an original workout, start at 1
      if (nextIndex === 0) {
        nextIndex = 1;
      }

      workoutIndex = nextIndex;
      const workoutKey = `${dayKey}-${nextIndex}`;
      const updatedWorkouts = {
        ...modifiedWorkouts,
        [workoutKey]: newWorkout
      };

      setModifiedWorkouts(updatedWorkouts);
      localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(updatedWorkouts));
      logger.log('💾 Added second workout:', workoutKey, newWorkout.workout?.name);
    } else {
      // Replace mode - use index 0
      workoutIndex = 0;
      const workoutKey = `${dayKey}-0`;
      const updatedWorkouts = {
        ...modifiedWorkouts,
        [workoutKey]: newWorkout
      };

      setModifiedWorkouts(updatedWorkouts);
      localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(updatedWorkouts));
      logger.log('💾 Replaced workout:', workoutKey, newWorkout.workout?.name);
    }

    // Save to Firestore with matching key format (weekNumber-day-index)
    if (auth.currentUser) {
      FirestoreService.saveModifiedWorkout(
        auth.currentUser.uid,
        currentWeek,
        newWorkout.day,
        newWorkout,
        workoutIndex  // Pass the index to match localStorage key format
      ).catch(error => {
        logger.error('Error saving workout to Firestore:', error);
      });
    }

    // Close the modal
    handleCloseSomethingElse();
  }, [currentWeek, modifiedWorkouts, setModifiedWorkouts, somethingElseModal.mode, handleCloseSomethingElse]);

  /**
   * Swap workouts between two days
   * Useful for moving a long run to a rest day for a race, etc.
   */
  const handleSwapWorkouts = useCallback(async (sourceWorkout, targetDay, targetWorkout = null) => {
    const sourceDayKey = `${currentWeek}-${sourceWorkout.day}`;
    const sourceWorkoutIndex = sourceWorkout.workoutIndex || 0;
    const sourceWorkoutKey = `${sourceDayKey}-${sourceWorkoutIndex}`;
    
    const targetDayKey = `${currentWeek}-${targetDay}`;
    const targetWorkoutIndex = targetWorkout?.workoutIndex || 0;
    const targetWorkoutKey = `${targetDayKey}-${targetWorkoutIndex}`;

    const updatedWorkouts = { ...modifiedWorkouts };

    // Get the source workout (either modified or original)
    const sourceWorkoutData = modifiedWorkouts[sourceWorkoutKey] || sourceWorkout;
    
    // Create swapped versions with updated day
    const swappedSource = {
      ...sourceWorkoutData,
      day: targetDay
    };

    // Get target workout data if it exists (needed for Firestore save)
    let targetWorkoutData = null;
    let swappedTarget = null;

    // If there's a target workout, swap it to the source day
    if (targetWorkout) {
      targetWorkoutData = modifiedWorkouts[targetWorkoutKey] || targetWorkout;
      swappedTarget = {
        ...targetWorkoutData,
        day: sourceWorkout.day
      };
      
      // Store both swapped workouts
      updatedWorkouts[`${targetDayKey}-${targetWorkoutIndex}`] = swappedSource;
      updatedWorkouts[`${sourceDayKey}-${sourceWorkoutIndex}`] = swappedTarget;
    } else {
      // Just move the source workout to the target day (rest day scenario)
      updatedWorkouts[`${targetDayKey}-0`] = swappedSource;
      
      // Remove the source workout (or mark it as removed)
      delete updatedWorkouts[sourceWorkoutKey];
    }

    setModifiedWorkouts(updatedWorkouts);
    localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(updatedWorkouts));

    // Save to Firestore
    if (auth.currentUser) {
      try {
        // Save the swapped source workout to target day
        await FirestoreService.saveModifiedWorkout(
          auth.currentUser.uid,
          currentWeek,
          targetDay,
          swappedSource
        );
        
        if (targetWorkout && swappedTarget) {
          // Save the swapped target workout to source day
          await FirestoreService.saveModifiedWorkout(
            auth.currentUser.uid,
            currentWeek,
            sourceWorkout.day,
            swappedTarget
          );
        } else {
          // Remove the source workout (moved to rest day)
          await FirestoreService.removeModifiedWorkout(
            auth.currentUser.uid,
            currentWeek,
            sourceWorkout.day,
            sourceWorkoutIndex
          );
        }
        
        logger.log('✅ Swapped workouts successfully');
        toast.success(`Swapped ${sourceWorkout.workout?.name || 'workout'} to ${targetDay}`);
      } catch (error) {
        logger.error('Error swapping workouts in Firestore:', error);
        toast.error('Error saving swap. Changes are saved locally.');
      }
    }
  }, [currentWeek, modifiedWorkouts, setModifiedWorkouts, toast]);

  /**
   * Move a workout to a different day (without swapping)
   */
  const handleMoveWorkout = useCallback(async (workout, targetDay) => {
    await handleSwapWorkouts(workout, targetDay, null);
  }, [handleSwapWorkouts]);

  /**
   * Show/hide brick options
   */
  const handleShowBrickOptions = useCallback((workout) => {
    const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
    setShowBrickOptions(prev => ({
      ...prev,
      [workoutKey]: true
    }));
  }, [currentWeek]);

  const handleHideBrickOptions = useCallback((workout) => {
    const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
    setShowBrickOptions(prev => ({
      ...prev,
      [workoutKey]: false
    }));
  }, [currentWeek]);

  /**
   * Convert a workout to a brick workout
   */
  const handleMakeBrick = useCallback((workout, split = 'balanced') => {
    // Convert the long run to a brick workout
    const originalDistance = parseFloat(workout.workout?.name?.match(/\d+/)?.[0]) || 8;

    // Different split ratios (all equal the same total training load)
    let runDistance, bikeRunEqDistance, splitLabel;

    switch(split) {
      case 'heavy-run':
        runDistance = Math.round(originalDistance * 0.8);
        bikeRunEqDistance = Math.round(originalDistance * 0.2);
        splitLabel = 'Heavy Run';
        break;
      case 'balanced':
        runDistance = Math.round(originalDistance * 0.6);
        bikeRunEqDistance = Math.round(originalDistance * 0.4);
        splitLabel = 'Balanced';
        break;
      case 'heavy-bike':
        runDistance = Math.round(originalDistance * 0.4);
        bikeRunEqDistance = Math.round(originalDistance * 0.6);
        splitLabel = 'Heavy Bike';
        break;
      case 'light-run':
        runDistance = Math.round(originalDistance * 0.2);
        bikeRunEqDistance = Math.round(originalDistance * 0.8);
        splitLabel = 'Light Run';
        break;
      default:
        runDistance = Math.round(originalDistance * 0.6);
        bikeRunEqDistance = Math.round(originalDistance * 0.4);
        splitLabel = 'Balanced';
    }

    const brickWorkout = {
      ...workout,
      type: 'brickLongRun',
      workout: {
        name: `Brick Long Run (${runDistance}mi run + ${bikeRunEqDistance} RunEQ Miles ${formatEquipmentName(userProfile?.standUpBikeType)})`,
        description: `${splitLabel} brick: ${runDistance} mile run + ${bikeRunEqDistance} RunEQ miles on ${formatEquipmentName(userProfile?.standUpBikeType)}`
      },
      focus: 'Brick Endurance',
      equipmentSpecific: true,
      replacementReason: `Converted to ${splitLabel.toLowerCase()} brick workout`
    };

    // Store the modified workout using indexed key format
    const workoutIndex = workout.workoutIndex || 0;
    const workoutKey = `${currentWeek}-${workout.day}-${workoutIndex}`;
    setModifiedWorkouts(prev => ({
      ...prev,
      [workoutKey]: brickWorkout
    }));

    localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify({
      ...modifiedWorkouts,
      [workoutKey]: brickWorkout
    }));

    // Save to Firestore
    if (auth.currentUser) {
      FirestoreService.saveModifiedWorkout(
        auth.currentUser.uid,
        currentWeek,
        workout.day,
        brickWorkout
      ).catch(error => {
        logger.error('Error saving brick workout to Firestore:', error);
      });
    }

    // Hide the options after selection
    handleHideBrickOptions(workout);
  }, [currentWeek, userProfile, modifiedWorkouts, setModifiedWorkouts, handleHideBrickOptions]);

  /**
   * Revert a workout to its original (remove modification)
   */
  const handleMakeRegularRun = useCallback((workout) => {
    // Remove the modified workout to revert to original
    const workoutIndex = workout.workoutIndex || 0;
    const workoutKey = `${currentWeek}-${workout.day}-${workoutIndex}`;
    const updatedWorkouts = { ...modifiedWorkouts };
    delete updatedWorkouts[workoutKey];
    
    setModifiedWorkouts(updatedWorkouts);
    localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(updatedWorkouts));

    // Remove from Firestore
    if (auth.currentUser) {
      FirestoreService.removeModifiedWorkout(
        auth.currentUser.uid,
        currentWeek,
        workout.day,
        workoutIndex
      ).catch(error => {
        logger.error('Error removing workout from Firestore:', error);
      });
    }
  }, [currentWeek, modifiedWorkouts, setModifiedWorkouts]);

  /**
   * Show "Choose Your Adventure" options for a workout
   */
  const handleShowOptions = useCallback((workout) => {
    const workoutKey = `${currentWeek}-${workout.day}`;

    // Get options based on workout type
    let options = [];
    const targetDistance = parseFloat(workout.workout?.name?.match(/\d+/)?.[0]) || 8;
    const normalizedType = getNormalizedWorkoutType(workout);

    switch (normalizedType) {
      case 'intervals':
        options = workoutOptionsService.getSpeedOptions(currentWeek, userProfile);
        break;
      case 'tempo':
        options = workoutOptionsService.getTempoOptions(currentWeek, userProfile);
        break;
      case 'longRun':
        options = workoutOptionsService.getLongRunOptions(currentWeek, userProfile, targetDistance);
        break;
      case 'hills':
        options = workoutOptionsService.getHillOptions(currentWeek, userProfile);
        break;
      case 'easy':
        options = workoutOptionsService.getEasyOptions(currentWeek, userProfile, 4);
        break;
      default:
        options = [];
    }

    setWorkoutOptions(prev => ({
      ...prev,
      [workoutKey]: options
    }));

    setShowingOptions(prev => ({
      ...prev,
      [workoutKey]: true
    }));
  }, [currentWeek, userProfile, workoutOptionsService]);

  const handleHideOptions = useCallback((workout) => {
    const workoutKey = `${currentWeek}-${workout.day}`;
    setShowingOptions(prev => ({
      ...prev,
      [workoutKey]: false
    }));
  }, [currentWeek]);

  const handleSelectOption = useCallback((workout, selectedOption) => {
    const workoutKey = `${currentWeek}-${workout.day}`;
    
    logger.log('🎯 Option selected:', {
      workoutKey,
      selectedOption: selectedOption.shortName,
      workout: workout.day,
      currentWeek,
      selectedOptionObject: selectedOption
    });
    
    try {
      const newSelectedOptions = {
        ...selectedOptions,
        [workoutKey]: selectedOption
      };
      
      setSelectedOptions(newSelectedOptions);
      logger.log('✨ State update dispatched, should see confirmation buttons next');
    } catch (error) {
      console.error('❌ Error in handleSelectOption:', error);
    }
  }, [currentWeek, selectedOptions]);

  const handleConfirmSelection = useCallback(async (workout) => {
    const workoutKey = `${currentWeek}-${workout.day}`;
    const selectedOption = selectedOptions[workoutKey];

    if (!selectedOption) return;

    // Create the new workout
    const newWorkout = {
      ...workout,
      workout: {
        ...selectedOption,
      },
      focus: selectedOption.focus || workout.focus,
      replacementReason: 'Choose Your Adventure selection'
    };

    // Update state and localStorage
    const updatedWorkouts = {
      ...modifiedWorkouts,
      [workoutKey]: newWorkout
    };

    setModifiedWorkouts(updatedWorkouts);
    localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(updatedWorkouts));

    // Save to Firestore
    if (auth.currentUser) {
      await FirestoreService.saveModifiedWorkout(
        auth.currentUser.uid,
        currentWeek,
        workout.day,
        newWorkout
      );
      logger.log('✅ SAVED to Firestore:', selectedOption.name, 'for', workout.day);
    }

    // Clear selection and hide options
    setSelectedOptions(prev => {
      const updated = { ...prev };
      delete updated[workoutKey];
      return updated;
    });
    setShowingOptions(prev => ({ ...prev, [workoutKey]: false }));
  }, [currentWeek, modifiedWorkouts, setModifiedWorkouts, selectedOptions]);

  const handleCancelSelection = useCallback((workout) => {
    const workoutKey = `${currentWeek}-${workout.day}`;
    setSelectedOptions(prev => {
      const updated = { ...prev };
      delete updated[workoutKey];
      return updated;
    });
  }, [currentWeek]);

  return {
    // Modal state
    somethingElseModal,
    setSomethingElseModal,
    
    // Brick options state
    showBrickOptions,
    setShowBrickOptions,
    
    // Choose Your Adventure state
    showingOptions,
    setShowingOptions,
    workoutOptions,
    setWorkoutOptions,
    selectedOptions,
    setSelectedOptions,
    
    // Handlers
    handleSomethingElse,
    handleCloseSomethingElse,
    handleAddWorkout,
    handleRemoveWorkout,
    handleWorkoutReplacement,
    handleSwapWorkouts,
    handleMoveWorkout,
    handleShowBrickOptions,
    handleHideBrickOptions,
    handleMakeBrick,
    handleMakeRegularRun,
    handleShowOptions,
    handleHideOptions,
    handleSelectOption,
    handleConfirmSelection,
    handleCancelSelection
  };
}

