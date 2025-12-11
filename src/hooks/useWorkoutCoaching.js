import { useState, useCallback } from 'react';
import AICoachService from '../services/AICoachService';
import logger from '../utils/logger';

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function useWorkoutCoaching({
  completionData,
  currentWorkout,
  currentWeekNumber,
  weekDataFromState,
  trainingPlan,
  day,
  userProfile
}) {
  const [coachingAnalysis, setCoachingAnalysis] = useState(null);
  const [loadingCoaching, setLoadingCoaching] = useState(false);
  const [coachingError, setCoachingError] = useState(null);

  const determineWorkoutType = useCallback(() => {
    if (!completionData || !currentWorkout) return 'Run';

    const isLifeAdaptation = completionData.isLifeAdaptation || false;
    let actualWorkoutType = 'Run';

    if (isLifeAdaptation) {
      const scheduledType = currentWorkout.type;
      const isBikeWorkout = scheduledType === 'bike' || currentWorkout.equipmentSpecific;

      actualWorkoutType = isBikeWorkout ? 'Ride' : 'Run';
      logger.log('🔄 Life adaptation detected: Using scheduled workout type for coaching', {
        scheduledType,
        actualWorkoutType
      });
    } else {
      if (completionData.laps?.length > 0 && completionData.laps[0].pace) {
        actualWorkoutType = 'Run';
      } else if (completionData.pace?.includes('/mi')) {
        actualWorkoutType = 'Run';
      } else if (completionData.laps?.length > 0 && !completionData.laps[0].pace) {
        actualWorkoutType = 'Ride';
      }
    }

    return { actualWorkoutType, isLifeAdaptation };
  }, [completionData, currentWorkout]);

  const buildUpcomingWorkouts = useCallback(() => {
    if (!trainingPlan || !weekDataFromState?.workouts) return null;

    const workouts = weekDataFromState.workouts;
    const isArray = Array.isArray(workouts);
    const dayLower = day?.toLowerCase();
    const currentDayIndex = dayOrder.indexOf(dayLower);
    const nextWorkouts = [];

    for (let i = currentDayIndex + 1; i < Math.min(currentDayIndex + 4, dayOrder.length); i++) {
      const dayName = dayOrder[i];
      let workout = null;

      if (isArray) {
        workout = workouts.find((w) => w.day && w.day.toLowerCase() === dayName);
      } else {
        workout = workouts?.[dayName];
      }

      if (workout && (workout.name || workout.workout?.name)) {
        const dayLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        const workoutName = workout.name || workout.workout?.name || 'Workout';
        nextWorkouts.push(`${dayLabel}: ${workoutName}`);
      }
    }

    return nextWorkouts.length > 0 ? nextWorkouts.join(', ') : null;
  }, [trainingPlan, weekDataFromState, day]);

  const getCoaching = useCallback(async () => {
    if (!completionData) {
      console.warn('No workout data available for analysis');
      return;
    }

    const apiKey = prompt('Enter your Anthropic API key (local dev only):');
    if (!apiKey) return;

    setLoadingCoaching(true);
    setCoachingError(null);

    try {
      AICoachService.initialize(apiKey);

      const { actualWorkoutType, isLifeAdaptation } = determineWorkoutType();

      const workoutDataForAI = {
        type: actualWorkoutType,
        distance: completionData.distance,
        duration: completionData.duration,
        pace: completionData.pace,
        elevationGain: completionData.elevationGain,
        avgHeartRate: completionData.avgHeartRate,
        maxHeartRate: completionData.maxHeartRate,
        laps: completionData.laps,
        standUpBikeType: actualWorkoutType === 'Ride' ? userProfile?.standUpBikeType : null,
        isLifeAdaptation
      };

      const upcomingWorkouts = buildUpcomingWorkouts();

      const contextOptions = {
        prescribedWorkout: currentWorkout?.name
          ? `${currentWorkout.name}: ${currentWorkout.description}`
          : null,
        trainingContext: trainingPlan
          ? `Week ${currentWeekNumber} of ${trainingPlan.weeks?.length || 'N/A'} week training plan for ${trainingPlan.goalRace || 'race'}`
          : null,
        upcomingWorkouts
      };

      const analysis = await AICoachService.analyzeWorkout(workoutDataForAI, contextOptions);
      setCoachingAnalysis(analysis);
    } catch (error) {
      console.error('Error getting coaching analysis:', error);
      setCoachingError(error.message || 'Failed to get coaching analysis');
    } finally {
      setLoadingCoaching(false);
    }
  }, [
    completionData,
    currentWorkout,
    currentWeekNumber,
    trainingPlan,
    userProfile,
    determineWorkoutType,
    buildUpcomingWorkouts
  ]);

  return {
    coachingAnalysis,
    loadingCoaching,
    coachingError,
    getCoaching
  };
}








