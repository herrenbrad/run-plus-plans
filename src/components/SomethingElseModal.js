import React, { useState } from 'react';
import { TempoWorkoutLibrary } from '../lib/tempo-workout-library.js';
import { IntervalWorkoutLibrary } from '../lib/interval-workout-library.js';
import { HillWorkoutLibrary } from '../lib/hill-workout-library.js';
import { LongRunWorkoutLibrary } from '../lib/long-run-workout-library.js';
import { StandUpBikeWorkoutLibrary } from '../lib/standup-bike-workout-library.js';
import { AquaRunningWorkoutLibrary } from '../lib/aqua-running-workout-library.js';
import { EllipticalWorkoutLibrary } from '../lib/elliptical-workout-library.js';
import { StationaryBikeWorkoutLibrary } from '../lib/stationary-bike-workout-library.js';
import { SwimmingWorkoutLibrary } from '../lib/swimming-workout-library.js';
import { RowingWorkoutLibrary } from '../lib/rowing-workout-library.js';
import BrickWorkoutService from '../services/brickWorkoutService';
import { formatEquipmentName } from '../utils/typography';
import { convertVagueStructureToSpecific } from '../lib/workout-structure-converter.js';
// Removed broken RealWorldTrainingService import

function SomethingElseModal({
  isOpen,
  onClose,
  currentWorkout,
  userProfile,
  trainingPlan,
  onWorkoutSelect,
  weather = null,
  mode = 'replace' // 'replace' or 'add'
}) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  // Initialize workout libraries
  const tempoLibrary = new TempoWorkoutLibrary();
  const intervalLibrary = new IntervalWorkoutLibrary();
  const hillLibrary = new HillWorkoutLibrary();
  const longRunLibrary = new LongRunWorkoutLibrary();
  const bikeLibrary = new StandUpBikeWorkoutLibrary();
  const brickWorkoutService = new BrickWorkoutService();

  // Cross-training libraries (initialized based on user equipment)
  const aquaLibrary = new AquaRunningWorkoutLibrary();
  const ellipticalLibrary = new EllipticalWorkoutLibrary();
  const stationaryBikeLibrary = new StationaryBikeWorkoutLibrary();
  const swimmingLibrary = new SwimmingWorkoutLibrary();
  const rowingLibrary = new RowingWorkoutLibrary();

  // Extract paces from training plan for injection into workouts
  const userPaces = trainingPlan?.trainingPaces || null;
  const trackIntervals = trainingPlan?.trackIntervals || null;
  // Extract week info for progressive structure conversion
  const weekNumber = trainingPlan?.currentWeek || trainingPlan?.planOverview?.currentWeek || null;
  const totalWeeks = trainingPlan?.planOverview?.totalWeeks || trainingPlan?.weeks?.length || null;

  // Don't render if not open or no workout provided
  if (!isOpen || !currentWorkout) return null;

  const getAlternativeCategories = () => {
    const categories = [];

    // Special handling for rest days
    if (currentWorkout.type === 'rest') {
      return getRestDayCategories();
    }

    // Special handling for rest_or_xt days - show user's cross-training equipment
    if (currentWorkout.type === 'rest_or_xt') {
      return getRestOrXTCategories();
    }

    // Same intensity alternatives
    categories.push({
      id: 'same-intensity',
      title: '🏃‍♂️ Keep Running - Same Intensity',
      subtitle: `Alternative ${currentWorkout.type} workouts`,
      icon: '🔄',
      workouts: getSameIntensityAlternatives()
    });

    // Easier alternatives
    categories.push({
      id: 'easier',
      title: '😌 Make It Easier',
      subtitle: 'Lower intensity alternatives',
      icon: '⬇️',
      workouts: getEasierAlternatives()
    });

    // Harder alternatives
    categories.push({
      id: 'harder', 
      title: '💪 Make It Harder',
      subtitle: 'Higher intensity challenges',
      icon: '⬆️',
      workouts: getHarderAlternatives()
    });

    // Equipment alternatives (if available)
    if (userProfile.standUpBikeType) {
      // If current workout is a BIKE workout, show running alternatives
      if (currentWorkout.type === 'bike') {
        categories.push({
          id: 'run-instead',
          title: '🏃‍♂️ Switch to Running',
          subtitle: 'Run instead of bike',
          icon: '👟',
          workouts: getRunningAlternatives()
        });
      }
      // If current workout is a RUN, show bike alternatives
      else {
        categories.push({
          id: 'equipment',
          title: `🚴‍♂️ Switch to ${formatEquipmentName(userProfile.standUpBikeType)}`,
          subtitle: 'Equipment-specific alternatives',
          icon: '⚡',
          workouts: getEquipmentAlternatives()
        });
      }
    }

    // Contextual alternatives (situational adaptations)
    categories.push({
      id: 'contextual',
      title: '🔄 Quick Adaptations',
      subtitle: 'Situational alternatives for real life',
      icon: '🛠️',
      workouts: getContextualAlternatives()
    });

    // Weather alternatives
    if (weather?.isExtreme) {
      categories.push({
        id: 'weather',
        title: '🌡️ Weather Alternatives',
        subtitle: `Safe options for ${weather.condition}`,
        icon: '🛡️',
        workouts: getWeatherAlternatives()
      });
    }

    // Brick workouts
    if (userProfile.standUpBikeType) {
      categories.push({
        id: 'brick',
        title: '🧱 Brick Workouts',
        subtitle: 'Run + bike combinations',
        icon: '🔄',
        workouts: getBrickWorkouts()
      });
    }

    // Cross-training alternatives (if user has equipment)
    const crossTrainingWorkouts = getCrossTrainingAlternatives();
    if (crossTrainingWorkouts.length > 0) {
      categories.push({
        id: 'cross-training',
        title: '🏊 Cross-Train Instead',
        subtitle: 'Use your cross-training equipment',
        icon: '🔄',
        workouts: crossTrainingWorkouts
      });
    }

    return categories;
  };

  // Special categories for rest days
  const getRestDayCategories = () => {
    const restCategories = [];

    // Light & Easy options
    restCategories.push({
      id: 'light-easy',
      title: '😌 Light & Easy',
      subtitle: 'Gentle movement that won\'t interfere with recovery',
      icon: '🌱',
      workouts: getRestDayLightOptions()
    });

    // Active Recovery
    restCategories.push({
      id: 'active-recovery',
      title: '🔄 Active Recovery',
      subtitle: 'Movement that actually helps recovery',
      icon: '♻️',
      workouts: getRestDayActiveRecoveryOptions()
    });

    // Equipment alternatives (if available)
    if (userProfile.standUpBikeType) {
      restCategories.push({
        id: 'equipment-easy',
        title: `🚴‍♂️ Easy ${formatEquipmentName(userProfile.standUpBikeType)}`,
        subtitle: 'Low-impact equipment workout',
        icon: '⚡',
        workouts: getRestDayEquipmentOptions()
      });
    }

    // Cross-Training
    restCategories.push({
      id: 'cross-training',
      title: '🏊‍♂️ Cross-Training',
      subtitle: 'Non-running activities for variety',
      icon: '🎯',
      workouts: getRestDayCrossTrainingOptions()
    });

    // Short & Sweet options
    restCategories.push({
      id: 'short-sweet',
      title: '⏰ Short & Sweet',
      subtitle: '15-30 minutes max - just enough to move',
      icon: '⚡',
      workouts: getRestDayShortOptions()
    });

    return restCategories;
  };

  // Special categories for rest_or_xt days - prioritize user's cross-training equipment
  const getRestOrXTCategories = () => {
    const xtCategories = [];
    const equipment = userProfile?.crossTrainingEquipment || {};
    const hasAnyEquipment = Object.values(equipment).some(Boolean);

    // Just Rest option always first
    xtCategories.push({
      id: 'just-rest',
      title: '🛌 Just Rest',
      subtitle: 'Take the day off completely - recovery is training too',
      icon: '😴',
      workouts: [{
        name: 'Complete Rest',
        description: 'No activity today - let your body recover and adapt',
        duration: 'Full day',
        intensity: 'Rest',
        reason: 'prioritize recovery',
        benefits: 'Physical and mental recovery, injury prevention'
      }]
    });

    // Pool / Aqua Running
    if (equipment.pool) {
      xtCategories.push({
        id: 'pool-xt',
        title: '🏊 Pool Running',
        subtitle: 'Zero impact, running-specific fitness',
        icon: '🌊',
        workouts: getPoolWorkouts()
      });
    }

    // Elliptical
    if (equipment.elliptical) {
      xtCategories.push({
        id: 'elliptical-xt',
        title: '🏃 Elliptical',
        subtitle: 'Low impact cardio machine',
        icon: '⚡',
        workouts: getEllipticalWorkouts()
      });
    }

    // Stationary Bike
    if (equipment.stationaryBike) {
      xtCategories.push({
        id: 'stationary-bike-xt',
        title: '🚴 Stationary Bike',
        subtitle: 'Spin bike, Peloton, or indoor trainer',
        icon: '🔥',
        workouts: getStationaryBikeWorkouts()
      });
    }

    // Swimming
    if (equipment.swimming) {
      xtCategories.push({
        id: 'swimming-xt',
        title: '🏊 Lap Swimming',
        subtitle: 'Full body, zero impact workout',
        icon: '💧',
        workouts: getSwimmingWorkouts()
      });
    }

    // Rowing
    if (equipment.rowing) {
      xtCategories.push({
        id: 'rowing-xt',
        title: '🚣 Rowing Machine',
        subtitle: 'Full body power and cardio',
        icon: '💪',
        workouts: getRowingWorkouts()
      });
    }

    // Stand-up bike if user has one
    if (userProfile?.standUpBikeType) {
      xtCategories.push({
        id: 'standup-bike-xt',
        title: `🚴 ${formatEquipmentName(userProfile.standUpBikeType)}`,
        subtitle: 'Running-specific cross-training',
        icon: '⚡',
        workouts: getStandUpBikeEasyWorkouts()
      });
    }

    // If user has no equipment at all, show generic options
    if (!hasAnyEquipment && !userProfile?.standUpBikeType) {
      xtCategories.push({
        id: 'light-activity',
        title: '🚶 Light Activity',
        subtitle: 'No equipment needed',
        icon: '🌱',
        workouts: getRestDayLightOptions()
      });
    }

    return xtCategories;
  };

  // Helper functions for rest_or_xt equipment-specific workouts
  const getPoolWorkouts = () => {
    try {
      const workouts = [];
      const easyWorkouts = aquaLibrary.getWorkoutsByIntensity?.('easy') || [];
      const moderateWorkouts = aquaLibrary.getWorkoutsByIntensity?.('moderate') || [];

      easyWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          name: w.name,
          description: w.description || w.structure || 'Easy pool running',
          duration: w.duration || '30-40 minutes',
          intensity: 'Easy',
          reason: 'zero impact recovery',
          benefits: 'Maintains running fitness without impact stress',
          equipmentType: 'pool',
          sourceWorkout: w
        });
      });

      moderateWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          name: w.name,
          description: w.description || w.structure || 'Moderate pool running',
          duration: w.duration || '35-45 minutes',
          intensity: 'Moderate',
          reason: 'aerobic maintenance',
          benefits: 'Running-specific aerobic development',
          equipmentType: 'pool',
          sourceWorkout: w
        });
      });

      return workouts.length > 0 ? workouts : [{
        name: 'Pool Running Session',
        description: 'Deep water running with flotation belt - running motion without impact',
        duration: '30-45 minutes',
        intensity: 'Easy to Moderate',
        reason: 'zero impact',
        benefits: 'Maintains running-specific fitness',
        equipmentType: 'pool'
      }];
    } catch (e) {
      return [{
        name: 'Pool Running Session',
        description: 'Deep water running with flotation belt',
        duration: '30-45 minutes',
        intensity: 'Easy to Moderate',
        reason: 'zero impact',
        benefits: 'Maintains running fitness',
        equipmentType: 'pool'
      }];
    }
  };

  const getEllipticalWorkouts = () => {
    try {
      const workouts = [];
      const easyWorkouts = ellipticalLibrary.getWorkoutsByIntensity?.('easy') || [];
      const moderateWorkouts = ellipticalLibrary.getWorkoutsByIntensity?.('moderate') || [];

      easyWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          name: w.name,
          description: w.description || w.structure || 'Easy elliptical session',
          duration: w.duration || '30-40 minutes',
          intensity: 'Easy',
          reason: 'low impact cardio',
          benefits: 'Cardio maintenance without joint stress',
          equipmentType: 'elliptical',
          sourceWorkout: w
        });
      });

      moderateWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          name: w.name,
          description: w.description || w.structure || 'Moderate elliptical workout',
          duration: w.duration || '35-45 minutes',
          intensity: 'Moderate',
          reason: 'aerobic development',
          benefits: 'Aerobic fitness with minimal impact',
          equipmentType: 'elliptical',
          sourceWorkout: w
        });
      });

      return workouts.length > 0 ? workouts : [{
        name: 'Elliptical Session',
        description: 'Steady effort on elliptical - similar motion to running',
        duration: '30-45 minutes',
        intensity: 'Easy to Moderate',
        reason: 'gym alternative',
        benefits: 'Low impact cardio maintenance',
        equipmentType: 'elliptical'
      }];
    } catch (e) {
      return [{
        name: 'Elliptical Session',
        description: 'Steady effort on elliptical',
        duration: '30-45 minutes',
        intensity: 'Easy to Moderate',
        reason: 'gym alternative',
        benefits: 'Low impact cardio',
        equipmentType: 'elliptical'
      }];
    }
  };

  const getStationaryBikeWorkouts = () => {
    try {
      const workouts = [];
      const easyWorkouts = stationaryBikeLibrary.getWorkoutsByIntensity?.('easy') || [];
      const moderateWorkouts = stationaryBikeLibrary.getWorkoutsByIntensity?.('moderate') || [];

      easyWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          name: w.name,
          description: w.description || w.structure || 'Easy spin session',
          duration: w.duration || '30-40 minutes',
          intensity: 'Easy',
          reason: 'active recovery',
          benefits: 'Leg turnover without running impact',
          equipmentType: 'stationaryBike',
          sourceWorkout: w
        });
      });

      moderateWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          name: w.name,
          description: w.description || w.structure || 'Moderate bike workout',
          duration: w.duration || '35-45 minutes',
          intensity: 'Moderate',
          reason: 'aerobic maintenance',
          benefits: 'Aerobic development without impact',
          equipmentType: 'stationaryBike',
          sourceWorkout: w
        });
      });

      return workouts.length > 0 ? workouts : [{
        name: 'Stationary Bike Session',
        description: 'Spin session for aerobic development',
        duration: '30-45 minutes',
        intensity: 'Easy to Moderate',
        reason: 'cardio alternative',
        benefits: 'Aerobic fitness maintenance',
        equipmentType: 'stationaryBike'
      }];
    } catch (e) {
      return [{
        name: 'Stationary Bike Session',
        description: 'Spin session for aerobic development',
        duration: '30-45 minutes',
        intensity: 'Easy to Moderate',
        reason: 'cardio alternative',
        benefits: 'Aerobic fitness maintenance',
        equipmentType: 'stationaryBike'
      }];
    }
  };

  const getSwimmingWorkouts = () => {
    try {
      const workouts = [];
      const easyWorkouts = swimmingLibrary.getWorkoutsByIntensity?.('easy') || [];
      const moderateWorkouts = swimmingLibrary.getWorkoutsByIntensity?.('moderate') || [];

      easyWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          name: w.name,
          description: w.description || w.structure || 'Easy lap swimming',
          duration: w.duration || '30-40 minutes',
          intensity: 'Easy',
          reason: 'full body recovery',
          benefits: 'Complete body workout with zero impact',
          equipmentType: 'swimming',
          sourceWorkout: w
        });
      });

      moderateWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          name: w.name,
          description: w.description || w.structure || 'Moderate swimming workout',
          duration: w.duration || '35-45 minutes',
          intensity: 'Moderate',
          reason: 'aerobic cross-training',
          benefits: 'Full body cardio conditioning',
          equipmentType: 'swimming',
          sourceWorkout: w
        });
      });

      return workouts.length > 0 ? workouts : [{
        name: 'Lap Swimming',
        description: 'Continuous lap swimming for full body conditioning',
        duration: '30-45 minutes',
        intensity: 'Easy to Moderate',
        reason: 'full body workout',
        benefits: 'Complete body conditioning',
        equipmentType: 'swimming'
      }];
    } catch (e) {
      return [{
        name: 'Lap Swimming',
        description: 'Continuous lap swimming',
        duration: '30-45 minutes',
        intensity: 'Easy to Moderate',
        reason: 'full body workout',
        benefits: 'Complete body conditioning',
        equipmentType: 'swimming'
      }];
    }
  };

  const getRowingWorkouts = () => {
    try {
      const workouts = [];
      const easyWorkouts = rowingLibrary.getWorkoutsByIntensity?.('easy') || [];
      const moderateWorkouts = rowingLibrary.getWorkoutsByIntensity?.('moderate') || [];

      easyWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          name: w.name,
          description: w.description || w.structure || 'Easy rowing session',
          duration: w.duration || '25-35 minutes',
          intensity: 'Easy',
          reason: 'posterior chain focus',
          benefits: 'Posterior chain development without impact',
          equipmentType: 'rowing',
          sourceWorkout: w
        });
      });

      moderateWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          name: w.name,
          description: w.description || w.structure || 'Moderate rowing workout',
          duration: w.duration || '30-40 minutes',
          intensity: 'Moderate',
          reason: 'full body power',
          benefits: 'Full body power and cardio development',
          equipmentType: 'rowing',
          sourceWorkout: w
        });
      });

      return workouts.length > 0 ? workouts : [{
        name: 'Rowing Session',
        description: 'Rowing machine workout for full body conditioning',
        duration: '25-40 minutes',
        intensity: 'Easy to Moderate',
        reason: 'full body alternative',
        benefits: 'Posterior chain and cardio development',
        equipmentType: 'rowing'
      }];
    } catch (e) {
      return [{
        name: 'Rowing Session',
        description: 'Rowing machine workout',
        duration: '25-40 minutes',
        intensity: 'Easy to Moderate',
        reason: 'full body alternative',
        benefits: 'Posterior chain and cardio',
        equipmentType: 'rowing'
      }];
    }
  };

  const getStandUpBikeEasyWorkouts = () => {
    // Get easy bike workouts from the stand-up bike library
    const workouts = [];
    const longEndurance = bikeLibrary.workoutLibrary.LONG_ENDURANCE_RIDES || [];
    const tempo = bikeLibrary.workoutLibrary.TEMPO_BIKE || [];

    // Get easy/recovery options
    longEndurance.slice(0, 2).forEach(w => {
      workouts.push({
        ...w,
        type: 'bike',
        library: 'bike',
        equipment: userProfile.standUpBikeType,
        equipmentSpecific: true,
        reason: 'running-specific cross-training',
        benefits: userProfile.standUpBikeType === 'cyclete'
          ? 'Quad-dominant workout - high running specificity'
          : 'Glute + full-body workout - excellent for recovery'
      });
    });

    // Get one tempo option
    if (tempo.length > 0) {
      workouts.push({
        ...tempo[0],
        type: 'bike',
        library: 'bike',
        equipment: userProfile.standUpBikeType,
        equipmentSpecific: true,
        reason: 'aerobic development',
        benefits: 'Lactate threshold development without running impact'
      });
    }

    return workouts.length > 0 ? workouts : [{
      name: `Easy ${formatEquipmentName(userProfile.standUpBikeType)} Ride`,
      description: 'Light 30-minute ride at conversational effort',
      duration: '30 minutes',
      intensity: 'Easy',
      equipment: formatEquipmentName(userProfile.standUpBikeType),
      reason: 'running-specific',
      benefits: 'Aerobic maintenance with running-similar motion'
    }];
  };

  const getRestDayLightOptions = () => [
    {
      name: 'Easy 20-Minute Jog',
      description: 'Very light conversational pace - just shake out the legs',
      duration: '20 minutes',
      intensity: 'Very Easy',
      reason: 'feeling energetic',
      benefits: 'Promotes blood flow and maintains routine'
    },
    {
      name: 'Walk-Run Intervals',
      description: '1 min easy jog, 2 min walk - perfect rest day movement',
      duration: '25-30 minutes',
      intensity: 'Recovery',
      reason: 'want light movement',
      benefits: 'Active recovery without stress'
    },
    {
      name: 'Easy Mile',
      description: 'Just one easy mile to keep the legs moving',
      duration: '8-12 minutes',
      intensity: 'Very Easy',
      reason: 'minimal time commitment',
      benefits: 'Maintains routine without fatigue'
    }
  ];

  const getRestDayActiveRecoveryOptions = () => [
    {
      name: 'Dynamic Stretching Session',
      description: '20 minutes of movement-based stretches and mobility work',
      duration: '20 minutes',
      intensity: 'Recovery',
      reason: 'improve flexibility',
      benefits: 'Enhances recovery and prevents injury'
    },
    {
      name: 'Yoga Flow',
      description: 'Gentle yoga focused on hip flexibility and core strength',
      duration: '25-30 minutes',
      intensity: 'Recovery',
      reason: 'mental relaxation',
      benefits: 'Flexibility, balance, and mental clarity'
    },
    {
      name: 'Foam Rolling + Light Movement',
      description: '15 min foam rolling + 10 min easy walking',
      duration: '25 minutes',
      intensity: 'Recovery',
      reason: 'muscle maintenance',
      benefits: 'Improves tissue quality and circulation'
    }
  ];

  const getRestDayEquipmentOptions = () => [
    {
      name: `Easy ${formatEquipmentName(userProfile.standUpBikeType)} Spin`,
      description: 'Light 30-minute ride at conversational effort',
      duration: '30 minutes',
      intensity: 'Easy',
      equipment: formatEquipmentName(userProfile.standUpBikeType),
      reason: 'low impact variety',
      benefits: 'Aerobic maintenance without running impact'
    },
    {
      name: `Recovery ${formatEquipmentName(userProfile.standUpBikeType)} Ride`,
      description: 'Very easy 20-minute ride focusing on leg turnover',
      duration: '20 minutes',
      intensity: 'Recovery',
      equipment: formatEquipmentName(userProfile.standUpBikeType),
      reason: 'active recovery',
      benefits: 'Promotes blood flow and recovery'
    }
  ];

  const getRestDayCrossTrainingOptions = () => {
    const workouts = [];
    const equipment = userProfile?.crossTrainingEquipment || {};

    // Only show options for equipment the user actually has
    if (equipment.pool) {
      workouts.push({
        name: 'Pool Running (Easy)',
        description: '25-30 minutes easy aqua jogging - zero impact recovery',
        duration: '25-30 minutes',
        intensity: 'Easy',
        reason: 'zero impact, running-specific',
        benefits: 'Running fitness without impact stress'
      });
    }

    if (equipment.swimming) {
      workouts.push({
        name: 'Swimming (Easy)',
        description: '20-30 minutes easy swimming - excellent for recovery',
        duration: '20-30 minutes',
        intensity: 'Easy',
        reason: 'full body, zero impact',
        benefits: 'Complete body workout with minimal stress'
      });
    }

    if (equipment.elliptical) {
      workouts.push({
        name: 'Elliptical Easy',
        description: '25 minutes easy effort on elliptical machine',
        duration: '25 minutes',
        intensity: 'Easy',
        reason: 'low impact cardio',
        benefits: 'Cardio maintenance without impact'
      });
    }

    if (equipment.stationaryBike) {
      workouts.push({
        name: 'Easy Spin',
        description: '25-30 minutes easy spinning - legs moving without stress',
        duration: '25-30 minutes',
        intensity: 'Easy',
        reason: 'active recovery',
        benefits: 'Leg turnover without running impact'
      });
    }

    if (equipment.rowing) {
      workouts.push({
        name: 'Easy Rowing',
        description: '20-25 minutes easy rowing - posterior chain focus',
        duration: '20-25 minutes',
        intensity: 'Easy',
        reason: 'full body, low impact',
        benefits: 'Posterior chain development'
      });
    }

    // Always include strength as an option (no equipment needed)
    workouts.push({
      name: 'Strength Training (Light)',
      description: 'Light strength work focusing on running-specific muscles',
      duration: '30-40 minutes',
      intensity: 'Light',
      reason: 'strength maintenance',
      benefits: 'Maintains strength without fatigue'
    });

    return workouts;
  };

  const getRestDayShortOptions = () => [
    {
      name: '15-Minute Walk',
      description: 'Brisk walk around the neighborhood - minimal time commitment',
      duration: '15 minutes',
      intensity: 'Very Easy',
      reason: 'time constraint',
      benefits: 'Mental break and light movement'
    },
    {
      name: '10-Minute Core Work',
      description: 'Quick core strengthening session - runner-specific exercises',
      duration: '10 minutes',
      intensity: 'Light',
      reason: 'minimal time',
      benefits: 'Core strength for better running'
    },
    {
      name: '5-Minute Stretch',
      description: 'Quick targeted stretching for tight spots',
      duration: '5 minutes',
      intensity: 'Recovery',
      reason: 'very minimal time',
      benefits: 'Maintains flexibility'
    }
  ];

  // Get cross-training alternatives based on user's equipment
  const getCrossTrainingAlternatives = () => {
    const workouts = [];
    const equipment = userProfile?.crossTrainingEquipment || {};
    const workoutType = currentWorkout.type;

    // Map running workout types to cross-training intensity category
    // tempo/intervals/hills = hard intensity, easy = easy, longRun = endurance
    let targetCategory = 'EASY';
    let intensityLabel = 'Moderate';
    if (workoutType === 'tempo') {
      targetCategory = 'TEMPO';
      intensityLabel = 'Tempo';
    } else if (workoutType === 'intervals') {
      targetCategory = 'INTERVALS';
      intensityLabel = 'Intervals';
    } else if (workoutType === 'hills') {
      targetCategory = 'TEMPO'; // Hills map to tempo effort for cross-training
      intensityLabel = 'Hard';
    } else if (workoutType === 'longRun') {
      targetCategory = 'EASY'; // Long runs are easy effort, just longer
      intensityLabel = 'Endurance';
    } else if (workoutType === 'easy') {
      targetCategory = 'EASY';
      intensityLabel = 'Easy';
    }

    // Helper to get workouts from a library's workout arrays
    const getMatchingWorkouts = (library, emoji, equipmentType, equipmentName) => {
      try {
        // Access the workoutLibrary directly
        const lib = library.workoutLibrary || {};

        // Try target category first, fall back to EASY
        let libraryWorkouts = lib[targetCategory] || [];
        if (libraryWorkouts.length === 0) {
          libraryWorkouts = lib.EASY || [];
        }
        if (libraryWorkouts.length === 0) {
          libraryWorkouts = lib.TEMPO || [];
        }

        libraryWorkouts.slice(0, 2).forEach(w => {
          // Convert vague structures to specific values
          const convertedStructure = w.structure 
            ? convertVagueStructureToSpecific(w.structure, weekNumber, totalWeeks)
            : w.structure;
          
          workouts.push({
            name: `${emoji} ${w.name}`,
            description: w.description || convertedStructure || `${equipmentName} workout`,
            duration: w.duration || '30-45 minutes',
            intensity: w.intensity || intensityLabel,
            reason: `matches ${workoutType} intensity`,
            benefits: w.benefits || `Same training stimulus without running impact`,
            equipmentType: equipmentType,
            sourceWorkout: { ...w, structure: convertedStructure } // Store converted structure
          });
        });
      } catch (e) {
        // Fallback with generic workout
        workouts.push({
          name: `${emoji} ${equipmentName} ${intensityLabel}`,
          description: `${intensityLabel} effort ${equipmentName.toLowerCase()} session`,
          duration: '30-45 minutes',
          intensity: intensityLabel,
          reason: `matches ${workoutType} intensity`,
          benefits: 'Cross-training at equivalent effort',
          equipmentType: equipmentType
        });
      }
    };

    // Pool / Aqua Running
    if (equipment.pool) {
      getMatchingWorkouts(aquaLibrary, '🏊', 'pool', 'Pool Running');
    }

    // Elliptical
    if (equipment.elliptical) {
      getMatchingWorkouts(ellipticalLibrary, '🏃', 'elliptical', 'Elliptical');
    }

    // Stationary Bike
    if (equipment.stationaryBike) {
      getMatchingWorkouts(stationaryBikeLibrary, '🚴', 'stationaryBike', 'Stationary Bike');
    }

    // Swimming
    if (equipment.swimming) {
      getMatchingWorkouts(swimmingLibrary, '🏊', 'swimming', 'Swimming');
    }

    // Rowing
    if (equipment.rowing) {
      getMatchingWorkouts(rowingLibrary, '🚣', 'rowing', 'Rowing');
    }

    // NOTE: Stand-up bike (Cyclete/ElliptiGO) is NOT included here because
    // it already has its own dedicated category via getEquipmentAlternatives()

    // If no equipment selected in profile, show generic cross-training options
    // This ensures the cross-training card always appears for hard workouts
    if (workouts.length === 0) {
      // Add pool running as a universal option (most running-specific)
      getMatchingWorkouts(aquaLibrary, '🏊', 'pool', 'Pool Running');
      // Add rowing as another good option
      getMatchingWorkouts(rowingLibrary, '🚣', 'rowing', 'Rowing');
      // Add elliptical as gym option
      getMatchingWorkouts(ellipticalLibrary, '🏃', 'elliptical', 'Elliptical');
    }

    return workouts;
  };

  // Helper to enhance workout descriptions for modal display
  const enhanceWorkoutDescription = (workout, library, category) => {
    const descriptions = {
      tempo: {
        TRADITIONAL_TEMPO: 'Sustained lactate threshold effort - builds race pace endurance',
        ALTERNATING_TEMPO: 'Varied tempo segments - teaches pace changes and mental toughness',
        PROGRESSIVE_TEMPO: 'Building tempo effort - develops pacing skills and confidence'
      },
      interval: {
        SHORT_SPEED: 'Quick speed bursts - develops neuromuscular power and turnover',
        VO2_MAX: 'Hard aerobic intervals - builds maximum oxygen uptake and speed',
        LONG_INTERVALS: 'Extended speed work - race pace practice with recovery'
      },
      hill: {
        short_power: 'Power hill repeats - builds leg strength and running power',
        long_strength: 'Endurance hill training - develops climbing stamina and mental toughness',
        hill_circuits: 'Mixed hill workout - combines power, strength, and endurance'
      },
      longRun: {
        TRADITIONAL_EASY: 'Steady aerobic run - builds endurance base and fat adaptation',
        PROGRESSIVE_RUNS: 'Building effort long run - develops race-day pacing skills',
        MIXED_PACE_LONG: 'Mixed pace long run - practices energy system transitions'
      },
      brick: {
        aerobic: 'Run+bike endurance combo - builds aerobic fitness with variety',
        tempo: 'Run+bike threshold workout - lactate threshold with equipment changes',
        speed: 'Run+bike intervals - develops speed with transition practice',
        recovery: 'Easy run+bike combo - active recovery with movement variety'
      }
    };

    const enhancedDescription = descriptions[library]?.[category] || workout.description;
    return {
      ...workout,
      description: enhancedDescription,
      originalDescription: workout.description,
      category: category,
      library: library
    };
  };

  const getSameIntensityAlternatives = () => {
    const workouts = [];

    switch (currentWorkout.type) {
      case 'tempo':
        const tempoCategories = ['TRADITIONAL_TEMPO', 'ALTERNATING_TEMPO', 'PROGRESSIVE_TEMPO'];
        tempoCategories.forEach(cat => {
          try {
            const baseWorkout = tempoLibrary.getRandomWorkout(cat);
            if (baseWorkout && baseWorkout.name !== currentWorkout.workout?.name) {
              // Prescribe with user-specific paces and week info for structure conversion
              const workout = tempoLibrary.prescribeTempoWorkout(baseWorkout.name, {
                runEqPreference: userProfile?.runEqPreference || 0,
                paces: userPaces,
                weekNumber: weekNumber,
                totalWeeks: totalWeeks
              });
              workouts.push(enhanceWorkoutDescription(workout, 'tempo', cat));
            }
          } catch (e) {
            console.warn(`Failed to get tempo workout from ${cat}:`, e.message);
          }
        });
        break;

      case 'intervals':
        const intervalCategories = ['SHORT_SPEED', 'VO2_MAX', 'LONG_INTERVALS'];
        intervalCategories.forEach(cat => {
          try {
            const baseWorkout = intervalLibrary.getRandomWorkout(cat);
            if (baseWorkout && baseWorkout.name !== currentWorkout.workout?.name) {
              // Prescribe with user-specific paces and track intervals
              const workout = intervalLibrary.prescribeIntervalWorkout(baseWorkout.name, {
                runEqPreference: userProfile?.runEqPreference || 0,
                paces: userPaces,
                trackIntervals: trackIntervals
              });
              workouts.push(enhanceWorkoutDescription(workout, 'interval', cat));
            }
          } catch (e) {
            console.warn(`Failed to get interval workout from ${cat}:`, e.message);
          }
        });
        break;

      case 'hills':
        const hillCategories = ['short_power', 'long_strength', 'hill_circuits'];
        hillCategories.forEach(cat => {
          try {
            const baseWorkout = hillLibrary.getRandomWorkout(cat);
            if (baseWorkout && baseWorkout.name !== currentWorkout.workout?.name) {
              // Prescribe with user-specific paces
              const workout = hillLibrary.prescribeHillWorkout(baseWorkout.name, {
                runEqPreference: userProfile?.runEqPreference || 0,
                paces: userPaces
              });
              workouts.push(enhanceWorkoutDescription(workout, 'hill', cat));
            }
          } catch (e) {
            console.warn(`Failed to get hill workout from ${cat}:`, e.message);
          }
        });
        break;

      case 'longRun':
        // Extract distance from current workout to maintain context
        const currentDistance = extractDistance(currentWorkout.workout?.name || '') ||
                               extractDistance(currentWorkout.name || '') || 8; // fallback to 8 miles

        const longRunCategories = ['TRADITIONAL_EASY', 'PROGRESSIVE_RUNS', 'MIXED_PACE_LONG'];
        longRunCategories.forEach(cat => {
          try {
            const baseWorkout = longRunLibrary.getRandomWorkout(cat);
            if (baseWorkout && baseWorkout.name !== currentWorkout.workout?.name) {
              // Prescribe with user-specific paces and distance
              const workout = longRunLibrary.prescribeLongRunWorkout(baseWorkout.name, {
                runEqPreference: userProfile?.runEqPreference || 0,
                distance: currentDistance,
                paces: userPaces
              });
              workouts.push(enhanceWorkoutDescription(workout, 'longRun', cat));
            }
          } catch (e) {
            console.warn(`Failed to get long run workout from ${cat}:`, e.message);
          }
        });
        break;

      case 'brick':
        const brickTypes = ['aerobic', 'tempo', 'speed', 'recovery'];
        brickTypes.forEach(type => {
          const workout = brickWorkoutService.generateBrickWorkout({
            type: type,
            equipment: userProfile.standUpBikeType || 'cyclete',
            difficulty: 'intermediate'
          });
          if (workout && workout.name !== currentWorkout.workout?.name) {
            workouts.push(enhanceWorkoutDescription(workout, 'brick', type));
          }
        });
        break;

      default:
        // For easy runs, offer some structure
        workouts.push({
          name: 'Conversational Run',
          description: 'Easy pace, focus on breathing and form',
          duration: '30-45 minutes',
          library: 'easy'
        });
    }

    return workouts.slice(0, 6); // Limit to 6 options
  };

  const getEasierAlternatives = () => [
    {
      name: 'Easy Recovery Run',
      description: 'Very easy pace, active recovery focus',
      duration: '20-30 minutes',
      intensity: 'Recovery'
    },
    {
      name: 'Walk-Run Intervals',
      description: '2 min run, 1 min walk intervals',
      duration: '30 minutes',
      intensity: 'Easy'
    },
    {
      name: 'Yoga Flow',
      description: 'Active recovery with stretching',
      duration: '20-30 minutes',
      intensity: 'Recovery'
    }
  ];

  const getHarderAlternatives = () => {
    const harder = [];

    // Suggest harder workout types
    if (currentWorkout.type === 'easy' || currentWorkout.type === 'tempo') {
      const baseWorkout = intervalLibrary.getRandomWorkout('SHORT_SPEED');
      if (baseWorkout) {
        // Prescribe with user-specific paces
        const intervalWorkout = intervalLibrary.prescribeIntervalWorkout(baseWorkout.name, {
          runEqPreference: userProfile?.runEqPreference || 0,
          paces: userPaces,
          trackIntervals: trackIntervals
        });
        harder.push(enhanceWorkoutDescription(intervalWorkout, 'interval', 'SHORT_SPEED'));
      }
    }

    if (currentWorkout.type !== 'hills') {
      const baseWorkout = hillLibrary.getRandomWorkout('short_power');
      if (baseWorkout) {
        // Prescribe with user-specific paces
        const hillWorkout = hillLibrary.prescribeHillWorkout(baseWorkout.name, {
          runEqPreference: userProfile?.runEqPreference || 0,
          paces: userPaces
        });
        harder.push(enhanceWorkoutDescription(hillWorkout, 'hill', 'short_power'));
      }
    }

    // Add some generic harder options with enhanced descriptions
    harder.push({
      name: 'Fartlek Run',
      description: 'Playful speed play - develops speed and mental toughness with varied surges',
      duration: '30-40 minutes',
      intensity: 'Moderate-Hard'
    });

    harder.push({
      name: 'Progressive Run',
      description: 'Building effort run - starts easy, finishes strong, develops pacing control',
      duration: '35-45 minutes', 
      intensity: 'Easy to Hard'
    });

    return harder.filter(Boolean).slice(0, 4);
  };

  const getEquipmentAlternatives = () => {
    // Return actual bike workouts from the library based on current workout intensity
    const workouts = [];
    const workoutType = currentWorkout.type;

    // Select appropriate bike workout category based on current workout type
    if (workoutType === 'tempo' || workoutType === 'intervals') {
      // Offer tempo bike workouts - take first 3 from TEMPO_BIKE
      const tempoBikeWorkouts = bikeLibrary.workoutLibrary.TEMPO_BIKE || [];
      tempoBikeWorkouts.slice(0, 3).forEach(bikeWorkout => {
        workouts.push({
          ...bikeWorkout,
          type: 'bike',
          library: 'bike',
          equipment: userProfile.standUpBikeType,
          equipmentSpecific: true
        });
      });

      // Offer interval bike workouts - take first 2 from INTERVAL_BIKE
      const intervalBikeWorkouts = bikeLibrary.workoutLibrary.INTERVAL_BIKE || [];
      intervalBikeWorkouts.slice(0, 2).forEach(bikeWorkout => {
        workouts.push({
          ...bikeWorkout,
          type: 'bike',
          library: 'bike',
          equipment: userProfile.standUpBikeType,
          equipmentSpecific: true
        });
      });
    } else if (workoutType === 'hills') {
      // Offer power/resistance bike workouts - take first 3 from POWER_RESISTANCE
      const powerBikeWorkouts = bikeLibrary.workoutLibrary.POWER_RESISTANCE || [];
      powerBikeWorkouts.slice(0, 3).forEach(bikeWorkout => {
        workouts.push({
          ...bikeWorkout,
          type: 'bike',
          library: 'bike',
          equipment: userProfile.standUpBikeType,
          equipmentSpecific: true
        });
      });
    } else if (workoutType === 'longRun') {
      // Offer long endurance bike rides - take first 3 from LONG_ENDURANCE_RIDES
      const longBikeWorkouts = bikeLibrary.workoutLibrary.LONG_ENDURANCE_RIDES || [];
      longBikeWorkouts.slice(0, 3).forEach(bikeWorkout => {
        workouts.push({
          ...bikeWorkout,
          type: 'bike',
          library: 'bike',
          equipment: userProfile.standUpBikeType,
          equipmentSpecific: true
        });
      });
    } else {
      // For easy/recovery, offer easy bike options from LONG_ENDURANCE_RIDES and TEMPO_BIKE
      const longBikeWorkouts = bikeLibrary.workoutLibrary.LONG_ENDURANCE_RIDES || [];
      const tempoBikeWorkouts = bikeLibrary.workoutLibrary.TEMPO_BIKE || [];

      if (longBikeWorkouts.length > 0) {
        workouts.push({
          ...longBikeWorkouts[0],
          type: 'bike',
          library: 'bike',
          equipment: userProfile.standUpBikeType,
          equipmentSpecific: true
        });
      }

      if (tempoBikeWorkouts.length > 0) {
        workouts.push({
          ...tempoBikeWorkouts[tempoBikeWorkouts.length - 1], // Get Zone 2 base if it's last
          type: 'bike',
          library: 'bike',
          equipment: userProfile.standUpBikeType,
          equipmentSpecific: true
        });
      }
    }

    return workouts.slice(0, 6); // Limit to 6 options
  };

  const getRunningAlternatives = () => {
    // Extract distance from current bike workout (if available)
    const bikeDistance = extractDistance(currentWorkout.workout?.name || '') || 12;
    // Convert bike miles to equivalent running miles (roughly 3:1 ratio)
    const equivalentRunMiles = Math.round(bikeDistance / 3);

    return [
      {
        name: `${equivalentRunMiles}-Mile Easy Run`,
        description: `Equivalent running distance for today's bike workout - same aerobic benefit`,
        duration: `${equivalentRunMiles * 8}-${equivalentRunMiles * 10} minutes`,
        intensity: 'Easy'
      },
      {
        name: `${Math.max(3, equivalentRunMiles - 2)}-Mile Tempo Run`,
        description: 'Shorter but higher intensity - builds lactate threshold',
        duration: `${Math.max(3, equivalentRunMiles - 2) * 7}-${Math.max(3, equivalentRunMiles - 2) * 8} minutes`,
        intensity: 'Moderate-Hard'
      },
      {
        name: 'Fartlek Run',
        description: 'Playful speed play - develops speed and mental toughness',
        duration: '30-40 minutes',
        intensity: 'Variable'
      },
      {
        name: `${Math.max(2, equivalentRunMiles - 1)} Miles Progressive`,
        description: 'Start easy, build to moderate-hard finish',
        duration: `${Math.max(2, equivalentRunMiles - 1) * 7}-${Math.max(2, equivalentRunMiles - 1) * 9} minutes`,
        intensity: 'Easy to Moderate-Hard'
      }
    ];
  };

  const getContextualAlternatives = () => {
    const workoutType = currentWorkout.type;
    const workoutName = currentWorkout.workout?.name || 'Workout';
    const contextualWorkouts = [];

    // Speed/Intervals specific alternatives
    if (workoutType === 'intervals' || workoutName.toLowerCase().includes('interval') || workoutName.toLowerCase().includes('speed') || workoutName.toLowerCase().includes('track')) {
      contextualWorkouts.push(
        {
          name: 'Treadmill Speed Work',
          description: 'Same intervals on treadmill - 6x800m @ 5K pace (2min rest)',
          duration: '45-50 minutes',
          reason: 'no track available',
          icon: '🏃‍♂️'
        },
        {
          name: 'Hill Sprints Alternative',
          description: '8x30sec uphill @ max effort - builds same speed without track',
          duration: '35-40 minutes', 
          reason: 'no track available',
          icon: '🏔️'
        },
        {
          name: 'Fartlek Speed Session',
          description: '20min fartlek: fast when you feel it, easy when you need it',
          duration: '40-45 minutes',
          reason: 'too hot / no track',
          icon: '⚡'
        },
        {
          name: 'Shortened Speed Work',
          description: '4x400m @ 5K pace instead of full session',
          duration: '30-35 minutes',
          reason: 'time constraint',
          icon: '⏰'
        }
      );
    }

    // Tempo work specific alternatives  
    else if (workoutType === 'tempo' || workoutName.toLowerCase().includes('tempo') || workoutName.toLowerCase().includes('threshold')) {
      contextualWorkouts.push(
        {
          name: 'Treadmill Tempo',
          description: '3 miles @ comfortably hard pace on 1% incline',
          duration: '35-40 minutes',
          reason: 'too hot / weather',
          icon: '🏃‍♂️'
        },
        {
          name: 'Cruise Intervals Indoor',
          description: '3x1 mile @ tempo pace (90sec rest) - easier to pace indoors',
          duration: '40-45 minutes',
          reason: 'too hot / pacing issues',
          icon: '🔀'
        },
        {
          name: 'Easy Tempo',
          description: '2 miles @ marathon pace instead of tempo - still builds endurance',
          duration: '25-30 minutes',
          reason: 'too tired',
          icon: '😌'
        },
        {
          name: 'Short Tempo Burst',
          description: '15min tempo run instead of full session',
          duration: '25-30 minutes', 
          reason: 'time constraint',
          icon: '⏰'
        }
      );
    }

    // Long run specific alternatives
    else if (workoutType === 'longRun' || workoutName.toLowerCase().includes('long') || workoutName.toLowerCase().includes('endurance')) {
      const longDistance = extractDistance(workoutName) || 10;
      contextualWorkouts.push(
        {
          name: `${longDistance} Miles on Treadmill`,
          description: `Complete long run indoors with A/C and entertainment - same endurance benefit`,
          duration: `${Math.round(longDistance * 8.5)}-${Math.round(longDistance * 10)} minutes`,
          reason: 'too hot / weather',
          icon: '🏃‍♂️'
        },
        {
          name: 'Split Long Run',
          description: `${Math.round(longDistance/2)} miles morning + ${Math.round(longDistance/2)} miles evening`,
          duration: 'Split sessions',
          reason: 'too hot / time constraint',
          icon: '🔄'
        },
        {
          name: `${Math.round(longDistance * 0.75)} Mile Moderate`,
          description: `Shorter distance but at marathon pace for last ${Math.round(longDistance * 0.25)} miles`,
          duration: `${Math.round(longDistance * 6.5)}-${Math.round(longDistance * 8)} minutes`,
          reason: 'time constraint',
          icon: '⏰'
        },
        {
          name: 'Easy Long Walk/Run',
          description: `${longDistance} miles with walk breaks every 2 miles - active recovery style`,
          duration: `${Math.round(longDistance * 10)}-${Math.round(longDistance * 12)} minutes`,
          reason: 'too tired',
          icon: '🚶‍♂️'
        }
      );
    }

    // Hills specific alternatives
    else if (workoutType === 'hills' || workoutName.toLowerCase().includes('hill') || workoutName.toLowerCase().includes('incline')) {
      contextualWorkouts.push(
        {
          name: 'Treadmill Hill Repeats',
          description: '6x90sec @ 6-8% incline, 5K effort (walk down recovery)',
          duration: '40-45 minutes',
          reason: 'no hills available',
          icon: '🏃‍♂️'
        },
        {
          name: 'Parking Garage Hills',
          description: '8x30sec up parking garage ramps - urban hill alternative',
          duration: '35-40 minutes',
          reason: 'no hills available',
          icon: '🏢'
        },
        {
          name: 'Stadium Stairs',
          description: '6x60sec stadium/building stairs @ hard effort',
          duration: '30-35 minutes',
          reason: 'no hills available',
          icon: '🏟️'
        },
        {
          name: 'Flat Tempo Instead',
          description: '20min tempo run - still builds lactate threshold without hills',
          duration: '35-40 minutes',
          reason: 'no hills / too tired',
          icon: '🏃‍♂️'
        }
      );
    }

    // Easy run alternatives
    else if (workoutType === 'easy' || workoutName.toLowerCase().includes('easy') || workoutName.toLowerCase().includes('recovery')) {
      contextualWorkouts.push(
        {
          name: 'Indoor Easy Run',
          description: 'Same easy pace on treadmill with entertainment',
          duration: currentWorkout.duration || '30-40 minutes',
          reason: 'weather',
          icon: '🏃‍♂️'
        },
        {
          name: 'Easy Walk',
          description: 'Brisk walk for same duration - active recovery',
          duration: currentWorkout.duration || '30-40 minutes', 
          reason: 'too tired',
          icon: '🚶‍♂️'
        },
        {
          name: 'Short Easy Run',
          description: '20min easy jog - better than nothing',
          duration: '20 minutes',
          reason: 'time constraint',
          icon: '⏰'
        }
      );
    }

    // Universal alternatives if no specific ones apply
    if (contextualWorkouts.length === 0) {
      contextualWorkouts.push(
        {
          name: 'Rest Day',
          description: 'Complete rest - sometimes the best choice for your body',
          duration: '0 minutes',
          reason: 'too tired / injury risk',
          icon: '🛌'
        },
        {
          name: 'Light Cross Training',
          description: '20-30min easy bike, elliptical, or swimming',
          duration: '20-30 minutes',
          reason: 'need something different',
          icon: '🚴‍♂️'
        }
      );
    }

    return contextualWorkouts;
  };

  // Helper to extract distance from workout name
  const extractDistance = (workoutName) => {
    const match = workoutName.match(/(\d+)\s*(mile|miles|mi)/i);
    return match ? parseInt(match[1]) : null;
  };

  const getContextIcon = (reason) => {
    const iconMap = {
      'tooHot': '🌡️',
      'tooTired': '😴',
      'timeConstraint': '⏰',
      'noEquipment': '🏠',
      'injury': '🩹',
      'weather': '🌧️'
    };
    return iconMap[reason] || '🔄';
  };

  const getWeatherAlternatives = () => [
    {
      name: 'Treadmill Version',
      description: 'Climate-controlled indoor version - same workout, perfect conditions',
      location: 'Indoor'
    },
    {
      name: 'Mall/Parking Garage Run',
      description: 'Weather-protected option - stay dry and maintain your schedule',
      location: 'Covered'
    },
    {
      name: 'Early Morning Run',
      description: 'Beat the heat/weather - cooler temps and quieter roads',
      timing: 'Pre-dawn'
    },
    {
      name: 'Split Session',
      description: 'Break into 2 shorter runs - work around weather windows',
      timing: 'Flexible'
    }
  ];

  const getBrickWorkouts = () => {
    const workouts = [];

    // Determine appropriate brick workout intensity based on current workout
    const currentDistance = extractDistance(currentWorkout.workout?.name || '') ||
                           extractDistance(currentWorkout.name || '') || 0;
    const currentDuration = currentWorkout.workout?.duration || currentWorkout.duration || 0;

    // For short workouts (< 5 RunEQ miles or < 30 minutes), only show recovery bricks
    // For medium workouts (5-10 miles or 30-60 min), show recovery + aerobic
    // For long workouts (> 10 miles or > 60 min), show all types
    let appropriateTypes = [];

    if (currentDistance < 5 || (typeof currentDuration === 'number' && currentDuration < 30)) {
      // SHORT workout - only show short recovery brick
      appropriateTypes = ['recovery'];
    } else if (currentDistance < 10 || (typeof currentDuration === 'number' && currentDuration < 60)) {
      // MEDIUM workout - show recovery and base aerobic
      appropriateTypes = ['recovery', 'aerobic'];
    } else {
      // LONG workout - show all brick types
      appropriateTypes = ['recovery', 'aerobic', 'tempo', 'speed'];
    }

    // Generate workouts for appropriate types only
    appropriateTypes.forEach(type => {
      const workout = brickWorkoutService.generateBrickWorkout({
        type: type,
        equipment: userProfile.standUpBikeType || 'cyclete',
        difficulty: 'intermediate'
      });

      // Enhance the description for brick workouts
      const enhancedWorkout = enhanceWorkoutDescription(workout, 'brick', type);

      workouts.push({
        ...enhancedWorkout,
        type: 'brick',
        library: 'brick'
      });
    });

    return workouts;
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedWorkout(null);
  };

  const handleWorkoutSelect = (workout) => {
    setSelectedWorkout(workout);
  };

  const handleConfirmReplacement = () => {
    if (selectedWorkout) {
      // Create a properly formatted workout object
      // IMPORTANT: Copy ALL fields from selectedWorkout to preserve bike workout details
      const newWorkoutData = {
        ...currentWorkout,
        workout: {
          ...selectedWorkout, // Copy ALL fields (structure, benefits, effort, cycleteNotes, elliptigoNotes, roadConsiderations, etc.)
          name: selectedWorkout.name,
          description: selectedWorkout.description,
          duration: selectedWorkout.duration || selectedWorkout.repetitions || 'Variable'
        },
        type: selectedWorkout.library || selectedWorkout.type || currentWorkout.type,
        focus: getFocusFromWorkout(selectedWorkout),
        equipmentSpecific: selectedWorkout.equipmentSpecific || !!selectedWorkout.equipment,
        workoutDetails: selectedWorkout, // Keep the full original workout for reference
        replacementReason: selectedCategory?.title
      };

      onWorkoutSelect(newWorkoutData);
      onClose();
    }
  };

  // Helper function to determine focus from workout
  const getFocusFromWorkout = (workout) => {
    if (workout.library === 'tempo') return 'Lactate Threshold';
    if (workout.library === 'interval') return 'Speed & Power';
    if (workout.library === 'hill') return 'Strength & Power';
    if (workout.library === 'longRun') return 'Endurance';
    if (workout.library === 'bike') {
      // Determine focus based on bike workout characteristics
      if (workout.effort?.perceived?.includes('threshold') || workout.name?.toLowerCase().includes('tempo')) {
        return 'Lactate Threshold';
      } else if (workout.effort?.perceived?.includes('hard') || workout.name?.toLowerCase().includes('interval')) {
        return 'Speed & Power';
      } else if (workout.name?.toLowerCase().includes('endurance') || workout.name?.toLowerCase().includes('long')) {
        return 'Endurance';
      }
      return 'Aerobic Power';
    }
    if (workout.intensity === 'Recovery') return 'Recovery';
    if (workout.intensity === 'Easy') return 'Aerobic Base';
    return 'Training Focus';
  };

  const categories = getAlternativeCategories();

  return (
    <div className="modal-overlay" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'rgba(0, 0, 0, 0.5)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content card" style={{ 
        width: '90%', 
        maxWidth: '800px', 
        maxHeight: '90vh', 
        overflow: 'auto',
        margin: 'var(--space-4)'
      }}>
        <div className="modal-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 'var(--space-6)'
        }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--runeq-primary)' }}>
              {mode === 'add' ? '➕ Add Second Workout' : '🔄 Life Adaptations'}
            </h2>
            <p style={{ margin: 'var(--space-2) 0 0 0', color: '#CCCCCC' }}>
              {mode === 'add' ? (
                <>Add a second workout to <strong>{currentWorkout.day}</strong></>
              ) : (
                <>Your plan adapts when life happens • Scheduled: <strong>{currentWorkout.workout.name}</strong> • {currentWorkout.day}</>
              )}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            style={{ minWidth: 'auto', padding: 'var(--space-2)' }}
          >
            ✕
          </button>
        </div>

        {!selectedCategory ? (
          /* Category Selection */
          <div>
            <h3 style={{ marginBottom: 'var(--space-4)', color: '#FFFFFF' }}>Choose Your Adventure</h3>
            <div className="card-grid">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="card card-interactive"
                  onClick={() => handleCategorySelect(category)}
                  style={{
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 255, 136, 0.1) 100%)',
                    border: '2px solid rgba(0, 212, 255, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(0, 255, 136, 0.2) 100%)';
                    e.currentTarget.style.border = '2px solid rgba(0, 212, 255, 0.6)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 255, 136, 0.1) 100%)';
                    e.currentTarget.style.border = '2px solid rgba(0, 212, 255, 0.4)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>
                    {category.icon}
                  </div>
                  <h4 style={{ margin: '0 0 var(--space-2) 0', color: '#FFFFFF', fontSize: '1.1rem' }}>
                    {category.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#CCCCCC' }}>
                    {category.subtitle}
                  </p>
                  <div className="badge" style={{
                    marginTop: 'var(--space-3)',
                    background: 'rgba(0, 255, 136, 0.2)',
                    color: '#00FF88',
                    border: '1px solid rgba(0, 255, 136, 0.4)',
                    fontWeight: '600'
                  }}>
                    {category.workouts.length} options
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Workout Selection */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <button 
                onClick={() => setSelectedCategory(null)}
                className="btn btn-secondary"
              >
                ← Back
              </button>
              <div>
                <h3 style={{ margin: 0, color: '#FFFFFF' }}>{selectedCategory.title}</h3>
                <p style={{ margin: 0, color: '#CCCCCC', fontSize: '0.9rem' }}>
                  {selectedCategory.subtitle}
                </p>
              </div>
            </div>

            <div className="card-grid">
              {selectedCategory.workouts.map((workout, index) => (
                <div
                  key={index}
                  className={`card card-interactive ${selectedWorkout === workout ? 'selected' : ''}`}
                  onClick={() => handleWorkoutSelect(workout)}
                  style={{
                    cursor: 'pointer',
                    background: selectedWorkout === workout
                      ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.3) 0%, rgba(0, 255, 136, 0.2) 100%)'
                      : 'linear-gradient(135deg, rgba(0, 212, 255, 0.12) 0%, rgba(0, 255, 136, 0.08) 100%)',
                    border: selectedWorkout === workout
                      ? '2px solid rgba(0, 212, 255, 0.8)'
                      : '2px solid rgba(0, 212, 255, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedWorkout !== workout) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 255, 136, 0.15) 100%)';
                      e.currentTarget.style.border = '2px solid rgba(0, 212, 255, 0.5)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedWorkout !== workout) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.12) 0%, rgba(0, 255, 136, 0.08) 100%)';
                      e.currentTarget.style.border = '2px solid rgba(0, 212, 255, 0.3)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <h4 style={{ margin: '0 0 var(--space-2) 0', color: '#FFFFFF', fontSize: '1.05rem' }}>
                    {workout.name}
                  </h4>
                  <p style={{ margin: '0 0 var(--space-3) 0', fontSize: '0.9rem', color: '#CCCCCC' }}>
                    {typeof workout.description === 'string' ? workout.description :
                     typeof workout.description === 'object' ? JSON.stringify(workout.description) :
                     'Workout description'}
                  </p>
                  
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {workout.duration && (
                      <div className="badge badge-info">
                        {typeof workout.duration === 'string' ? workout.duration : 
                         typeof workout.duration === 'object' ? JSON.stringify(workout.duration) : 
                         'Duration'}
                      </div>
                    )}
                    {workout.intensity && (
                      <div className="badge badge-warning">
                        {typeof workout.intensity === 'string' ? workout.intensity : 
                         typeof workout.intensity === 'object' ? JSON.stringify(workout.intensity) : 
                         'Intensity'}
                      </div>
                    )}
                    {workout.equipment && (
                      <div className="badge badge-success">
                        {formatEquipmentName(workout.equipment)}
                      </div>
                    )}
                    {workout.location && (
                      <div className="badge badge-info">
                        {workout.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedWorkout && (
              <div style={{ 
                marginTop: 'var(--space-6)', 
                padding: 'var(--space-4)', 
                background: 'var(--gray-50)', 
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {mode === 'add' ? 'Add: ' : 'Replace with: '}<strong>{selectedWorkout.name}</strong>
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                    {mode === 'add'
                      ? `This will add a second workout to ${currentWorkout.day} for a two-a-day training session.`
                      : `This will update your ${currentWorkout.day} workout and maintain your training load.`}
                  </p>
                </div>
                <button
                  onClick={handleConfirmReplacement}
                  className="btn btn-primary"
                >
                  {mode === 'add' ? '➕ Add Workout' : '🔄 Replace Workout'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SomethingElseModal;