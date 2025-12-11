import { useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase/config';
import FirestoreService from '../services/FirestoreService';
import { formatEquipmentName } from '../utils/typography';
import { transformWorkoutForDisplay } from '../utils/transformWorkoutForDisplay';
import { PaceCalculator } from '../lib/pace-calculator';

const paceCalculator = new PaceCalculator();

const raceDistanceToMiles = {
  '5K': 3.1,
  '10K': 6.2,
  'Half': 13.1,
  'Half Marathon': 13.1,
  'Marathon': 26.2
};

const calculateRacePace = (goalTime, raceDistance) => {
  if (!goalTime || !raceDistance) return null;

  let timeStr = goalTime.includes('-') ? goalTime.split('-')[1] : goalTime;
  const parts = timeStr.split(':').map(Number);

  let totalMinutes;
  if (parts.length === 3) {
    totalMinutes = parts[0] * 60 + parts[1] + parts[2] / 60;
  } else if (parts.length === 2) {
    totalMinutes = parts[0] + parts[1] / 60;
  } else {
    return null;
  }

  const miles = raceDistanceToMiles[raceDistance] || parseFloat(raceDistance);
  if (!miles) return null;

  const paceMinutes = totalMinutes / miles;
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function useWorkoutDetailData({ day, userProfile, trainingPlan, locationState = {} }) {
  const [somethingElseModal, setSomethingElseModal] = useState({
    isOpen: false,
    workout: null
  });
  const [modifiedWorkout, setModifiedWorkout] = useState(null);
  const [completionData, setCompletionData] = useState(null);

  const workoutFromState = locationState.workout;
  const userProfileFromState = locationState.userProfile || userProfile;
  const currentWeekNumber = locationState.currentWeek || 1;
  const weekDataFromState = locationState.weekData;

  const vdotPaces = useMemo(() => {
    const goalTime = trainingPlan?.planOverview?.goalTime || userProfileFromState?.raceTime || userProfile?.raceTime;
    const raceDistance = trainingPlan?.planOverview?.raceDistance || userProfileFromState?.raceDistance || userProfile?.raceDistance;
    const racePace = calculateRacePace(goalTime, raceDistance);

    const addRacePace = (paces) => {
      if (!paces || !racePace) return paces;
      return {
        ...paces,
        racePace: { pace: racePace },
        raceDistance
      };
    };

    if (userProfileFromState?.paces?.easy) {
      return addRacePace(userProfileFromState.paces);
    }

    if (trainingPlan?.paces?.easy) {
      return addRacePace(trainingPlan.paces);
    }

    if (goalTime && raceDistance) {
      try {
        const result = paceCalculator.calculateFromGoal(raceDistance, goalTime);
        if (result?.paces?.easy) {
          return addRacePace(result.paces);
        }
      } catch (error) {
        // Swallow pace calculation errors - fallback handled elsewhere
      }
    }

    return null;
  }, [trainingPlan, userProfileFromState, userProfile]);

  const workoutData = useMemo(() => {
    if (workoutFromState) return workoutFromState;

    const dayLower = (day || '').toLowerCase();

    if (weekDataFromState?.workouts) {
      if (Array.isArray(weekDataFromState.workouts)) {
        const workout = weekDataFromState.workouts.find(
          (w) => w.day && w.day.toLowerCase() === dayLower
        );
        if (workout) return workout;
      } else if (weekDataFromState.workouts[dayLower]) {
        return weekDataFromState.workouts[dayLower];
      }
    }

    if (!trainingPlan?.weeks) {
      return null;
    }

    const currentWeekIndex = Math.min(currentWeekNumber - 1, trainingPlan.weeks.length - 1);
    const currentWeek = trainingPlan.weeks[currentWeekIndex];
    if (!currentWeek?.workouts) {
      return null;
    }

    return (
      currentWeek.workouts.find(
        (w) => w.day && w.day.toLowerCase() === dayLower
      ) || null
    );
  }, [workoutFromState, weekDataFromState, trainingPlan, day, currentWeekNumber]);

  useEffect(() => {
    let isMounted = true;

    const fetchCompletionData = async () => {
      if (!auth.currentUser || !workoutData) {
        if (isMounted) setCompletionData(null);
        return;
      }

      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');

        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (isMounted && userDoc.exists()) {
          const data = userDoc.data();
          const completedWorkouts = data.completedWorkouts || {};
          const workoutIndex = workoutData.workoutIndex || 0;
          const workoutKey = `${currentWeekNumber}-${workoutData.day}-${workoutIndex}`;

          setCompletionData(completedWorkouts[workoutKey] || null);
        }
      } catch (error) {
        console.error('Error fetching completion data:', error);
      }
    };

    fetchCompletionData();

    return () => {
      isMounted = false;
    };
  }, [workoutData, currentWeekNumber]);

  const normalizedProfile = userProfileFromState || userProfile;

  const fallbackWorkouts = useMemo(() => {
    return {
      tuesday: {
        name: normalizedProfile?.standUpBikeType ? 'Progressive Build Session' : 'Sandwich Tempo',
        type: 'tempo',
        focus: 'Lactate Threshold',
        duration: '45 minutes',
        description: normalizedProfile?.standUpBikeType
          ? 'Gradually increasing intensity throughout session on your stand-up bike'
          : 'Tempo effort sandwiched between easy running',
        structure: normalizedProfile?.standUpBikeType
          ? '20 min easy + 20-40 min progressive build to tempo + 10 min easy'
          : '10-15 min easy warmup + 15-20 min tempo + 5-10 min easy cooldown',
        equipmentSpecific: !!normalizedProfile?.standUpBikeType,
        intensity: 'Medium-hard effort, sustainable for 20-60 minutes',
        heartRate: '86-90% Max HR',
        paceGuidance: normalizedProfile?.standUpBikeType
          ? `${formatEquipmentName(normalizedProfile?.standUpBikeType)} specific: Focus on smooth ${
              normalizedProfile?.standUpBikeType === 'cyclete' ? 'teardrop' : 'elliptical'
            } motion`
          : 'Half marathon to 10-mile race pace',
        safetyNotes: [
          'Start conservatively - tempo should feel "controlled discomfort"',
          'If breathing becomes labored, slow down slightly',
          'Better to run slightly too easy than too hard'
        ],
        alternatives: {
          tooHot: 'Move indoors or to early morning',
          tooTired: 'Easy run with 4-6 x 1 minute pickups',
          timeConstraint: '20 min tempo run instead of full session',
          noEquipment: normalizedProfile?.standUpBikeType ? 'Traditional running tempo workout' : 'Treadmill with 1% incline'
        }
      },
      thursday: {
        name: 'Easy Run',
        type: 'easy',
        focus: 'Recovery',
        duration: '35-45 minutes',
        description: 'Conversational pace, aerobic base building',
        structure: 'Easy effort throughout, should feel refreshed after',
        equipmentSpecific: false,
        intensity: 'Easy conversational pace',
        heartRate: '65-79% Max HR',
        paceGuidance: 'Should be able to speak in full sentences',
        safetyNotes: [
          'This should feel easy - not a workout day',
          'Focus on form and relaxation',
          'Cut short if feeling overly fatigued'
        ],
        alternatives: {
          tooHot: 'Move to air conditioning or pool running',
          tooTired: 'Walk or very easy bike ride',
          injury: 'Cross-training or complete rest',
          timeConstraint: '20-30 minutes is fine'
        }
      },
      sunday: {
        name: 'Conversational Long Run',
        type: 'longRun',
        focus: 'Endurance',
        duration: '60-75 minutes',
        description: 'Easy long run emphasizing conversational pace',
        structure: 'Run with partner/group, maintain conversation throughout',
        equipmentSpecific: false,
        intensity: 'Easy conversational pace',
        heartRate: '65-78% Max HR',
        paceGuidance: "If you can't hold a conversation, you're going too fast",
        safetyNotes: [
          'Carry water for runs over 60 minutes',
          'Know your route and have bailout options',
          'Focus on time on feet, not speed'
        ],
        alternatives: {
          tooHot: 'Start very early or split into two shorter runs',
          timeConstraint: 'Run for available time, maintain easy effort',
          noPartner: 'Solo run with audiobook or podcast',
          injury: 'Long bike ride or pool running session'
        }
      }
    };
  }, [normalizedProfile?.standUpBikeType]);

  const dayLower = (day || '').toLowerCase();

  const baseWorkout = useMemo(() => {
    const sourceWorkout = workoutData || fallbackWorkouts[dayLower] || fallbackWorkouts.tuesday;
    if (!sourceWorkout) return null;

    return transformWorkoutForDisplay({
      workoutData: sourceWorkout,
      userProfile: normalizedProfile,
      trainingPlan,
      vdotPaces,
      experienceLevel: normalizedProfile?.experienceLevel
    });
  }, [workoutData, fallbackWorkouts, dayLower, normalizedProfile, trainingPlan, vdotPaces]);

  const currentWorkout = modifiedWorkout || baseWorkout;

  const openSomethingElseModal = (workout) => {
    if (!workout) return;

    setSomethingElseModal({
      isOpen: true,
      workout: {
        day: day.charAt(0).toUpperCase() + day.slice(1),
        type: workout.type,
        workout: {
          name: workout.name,
          description: workout.description
        },
        focus: workout.focus,
        equipmentSpecific: workout.equipmentSpecific
      }
    });
  };

  const closeSomethingElseModal = () => {
    setSomethingElseModal({
      isOpen: false,
      workout: null
    });
  };

  const handleWorkoutReplacement = async (newWorkout) => {
    if (!baseWorkout) return;

    const updatedWorkout = {
      ...baseWorkout,
      workout: {
        ...newWorkout.workout
      },
      name: newWorkout.workout.name,
      description: newWorkout.workout.description,
      type: newWorkout.type,
      focus: newWorkout.focus,
      equipmentSpecific: newWorkout.equipmentSpecific,
      replacementReason: newWorkout.replacementReason
    };

    setModifiedWorkout(updatedWorkout);

    const workoutKey = `${currentWeekNumber}-${day}`;
    const workoutToSave = {
      day: day.charAt(0).toUpperCase() + day.slice(1),
      workout: {
        ...newWorkout.workout
      },
      focus: newWorkout.focus,
      type: newWorkout.type,
      equipmentSpecific: newWorkout.equipmentSpecific,
      replacementReason: newWorkout.replacementReason
    };

    const savedWorkouts = JSON.parse(localStorage.getItem('runeq_modifiedWorkouts') || '{}');
    savedWorkouts[workoutKey] = workoutToSave;
    localStorage.setItem('runeq_modifiedWorkouts', JSON.stringify(savedWorkouts));

    if (auth.currentUser) {
      await FirestoreService.saveModifiedWorkout(
        auth.currentUser.uid,
        currentWeekNumber,
        day,
        workoutToSave
      );
    }

    closeSomethingElseModal();
  };

  return {
    userProfileForDisplay: userProfileFromState,
    currentWeekNumber,
    weekDataFromState,
    workoutData,
    completionData,
    currentWorkout,
    somethingElseModal,
    openSomethingElseModal,
    closeSomethingElseModal,
    handleWorkoutReplacement
  };
}








