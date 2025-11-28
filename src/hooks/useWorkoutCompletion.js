import { useState } from 'react';
import { auth } from '../firebase/config';
import FirestoreService from '../services/FirestoreService';
import { useToast } from '../components/Toast';
import logger from '../utils/logger';

/**
 * Custom hook for managing workout completion
 * Handles completion modal, marking workouts complete/uncomplete, and saving to Firestore
 */
export const useWorkoutCompletion = ({ currentWeek, workoutCompletions, setWorkoutCompletions }) => {
  const toast = useToast();
  const [completionModal, setCompletionModal] = useState({
    isOpen: false,
    workout: null,
    distance: '',
    notes: ''
  });

  /**
   * Handle marking a workout as complete or uncomplete
   * Shows modal for workouts, directly marks rest days
   */
  const handleMarkComplete = async (workout) => {
    if (!auth.currentUser) {
      toast.error('You must be logged in to complete workouts');
      return;
    }

    const workoutIndex = workout.workoutIndex || 0;
    const workoutKey = `${currentWeek}-${workout.day}-${workoutIndex}`;
    const isCurrentlyCompleted = workoutCompletions[workoutKey]?.completed || workout.completed;

    // If already completed, uncomplete it
    if (isCurrentlyCompleted) {
      const newCompletedStatus = false;

      // INSTANT UI UPDATE
      setWorkoutCompletions(prev => ({
        ...prev,
        [workoutKey]: {
          completed: newCompletedStatus,
          completedAt: null,
          actualDistance: null,
          notes: null
        }
      }));

      // BACKGROUND SAVE: Update Firestore without blocking UI
      try {
        const result = await FirestoreService.markWorkoutComplete(
          auth.currentUser.uid,
          currentWeek,
          workout.day,
          newCompletedStatus,
          null, // distance
          null  // notes
        );

        if (!result.success) {
          console.error('Failed to save completion status');
          setWorkoutCompletions(prev => {
            const updated = { ...prev };
            delete updated[workoutKey];
            return updated;
          });
          toast.error('Failed to save. Please try again.');
        }
      } catch (error) {
        console.error('Error uncompleting workout:', error);
      }
      return;
    }

    // For rest days, just mark complete without modal
    if (workout.type === 'rest') {
      const newCompletedStatus = true;

      setWorkoutCompletions(prev => ({
        ...prev,
        [workoutKey]: {
          completed: newCompletedStatus,
          completedAt: new Date().toISOString()
        }
      }));

      try {
        await FirestoreService.markWorkoutComplete(
          auth.currentUser.uid,
          currentWeek,
          workout.day,
          newCompletedStatus
        );
      } catch (error) {
        console.error('Error completing rest day:', error);
      }
      return;
    }

    // For actual workouts, show completion modal with distance tracking
    setCompletionModal({
      isOpen: true,
      workout: workout,
      distance: workout.distance?.toString() || '',
      notes: ''
    });
  };

  /**
   * Handle saving workout completion with distance and notes
   */
  const handleSaveCompletion = async () => {
    const { workout, distance, notes } = completionModal;
    if (!workout || !auth.currentUser) return;

    const newCompletedStatus = true;
    const workoutIndex = workout.workoutIndex || 0;
    const workoutKey = `${currentWeek}-${workout.day}-${workoutIndex}`;

    // INSTANT UI UPDATE
    setWorkoutCompletions(prev => ({
      ...prev,
      [workoutKey]: {
        completed: newCompletedStatus,
        completedAt: new Date().toISOString(),
        actualDistance: distance ? parseFloat(distance) : null,
        notes: notes || null
      }
    }));

    // Close modal
    setCompletionModal({ isOpen: false, workout: null, distance: '', notes: '' });

    // BACKGROUND SAVE
    try {
      const result = await FirestoreService.markWorkoutComplete(
        auth.currentUser.uid,
        currentWeek,
        workout.day,
        newCompletedStatus,
        distance ? parseFloat(distance) : null,
        notes || null
      );

      if (!result.success) {
        // Rollback on failure
        console.error('Failed to save completion status');
        setWorkoutCompletions(prev => {
          const updated = { ...prev };
          delete updated[workoutKey];
          return updated;
        });
        toast.error('Failed to save. Please try again.');
      }
    } catch (error) {
      // Rollback on error
      console.error('Error saving completion:', error);
      setWorkoutCompletions(prev => {
        const updated = { ...prev };
        delete updated[workoutKey];
        return updated;
      });
      toast.error('Failed to save. Please try again.');
    }
  };

  /**
   * Close completion modal
   */
  const handleCloseCompletionModal = () => {
    setCompletionModal({ isOpen: false, workout: null, distance: '', notes: '' });
  };

  return {
    completionModal,
    setCompletionModal,
    handleMarkComplete,
    handleSaveCompletion,
    handleCloseCompletionModal
  };
};

export default useWorkoutCompletion;

