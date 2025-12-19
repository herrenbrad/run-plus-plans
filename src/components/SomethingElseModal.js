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
      title: 'Keep Running - Same Intensity',
      subtitle: `Alternative ${currentWorkout.type} workouts`,
      workouts: getSameIntensityAlternatives()
    });

    // Easier alternatives
    categories.push({
      id: 'easier',
      title: 'Make It Easier',
      subtitle: 'Lower intensity alternatives',
      workouts: getEasierAlternatives()
    });

    // Harder alternatives
    categories.push({
      id: 'harder',
      title: 'Make It Harder',
      subtitle: 'Higher intensity challenges',
      workouts: getHarderAlternatives()
    });

    // Equipment alternatives (if available)
    if (userProfile.standUpBikeType) {
      // If current workout is a BIKE workout, show running alternatives
      if (currentWorkout.type === 'bike') {
        categories.push({
          id: 'run-instead',
          title: 'Switch to Running',
          subtitle: 'Run instead of bike',
          workouts: getRunningAlternatives()
        });
      }
      // If current workout is a RUN, show bike alternatives
      else {
        categories.push({
          id: 'equipment',
          title: `Switch to ${formatEquipmentName(userProfile.standUpBikeType)}`,
          subtitle: 'Equipment-specific alternatives',
          workouts: getEquipmentAlternatives()
        });
      }
    }

    // Contextual alternatives (situational adaptations)
    categories.push({
      id: 'contextual',
      title: 'Quick Adaptations',
      subtitle: 'Situational alternatives for real life',
      workouts: getContextualAlternatives()
    });

    // Weather alternatives
    if (weather?.isExtreme) {
      categories.push({
        id: 'weather',
        title: 'Weather Alternatives',
        subtitle: `Safe options for ${weather.condition}`,
        workouts: getWeatherAlternatives()
      });
    }

    // Brick workouts
    if (userProfile.standUpBikeType) {
      categories.push({
        id: 'brick',
        title: 'Brick Workouts',
        subtitle: 'Run + bike combinations',
        workouts: getBrickWorkouts()
      });
    }

    // Cross-training alternatives (if user has equipment)
    const crossTrainingWorkouts = getCrossTrainingAlternatives();
    if (crossTrainingWorkouts.length > 0) {
      categories.push({
        id: 'cross-training',
        title: 'Cross-Train Instead',
        subtitle: 'Use your cross-training equipment',
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
      title: 'Light & Easy',
      subtitle: 'Gentle movement that won\'t interfere with recovery',
      workouts: getRestDayLightOptions()
    });

    // Active Recovery
    restCategories.push({
      id: 'active-recovery',
      title: 'Active Recovery',
      subtitle: 'Movement that actually helps recovery',
      workouts: getRestDayActiveRecoveryOptions()
    });

    // Equipment alternatives (if available)
    if (userProfile.standUpBikeType) {
      restCategories.push({
        id: 'equipment-easy',
        title: `Easy ${formatEquipmentName(userProfile.standUpBikeType)}`,
        subtitle: 'Low-impact equipment workout',
        workouts: getRestDayEquipmentOptions()
      });
    }

    // Cross-Training
    restCategories.push({
      id: 'cross-training',
      title: 'Cross-Training',
      subtitle: 'Non-running activities for variety',
      workouts: getRestDayCrossTrainingOptions()
    });

    // Short & Sweet options
    restCategories.push({
      id: 'short-sweet',
      title: 'Short & Sweet',
      subtitle: '15-30 minutes max - just enough to move',
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
      title: 'Just Rest',
      subtitle: 'Take the day off completely - recovery is training too',
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
        title: 'Pool Running',
        subtitle: 'Zero impact, running-specific fitness',
        workouts: getPoolWorkouts()
      });
    }

    // Elliptical
    if (equipment.elliptical) {
      xtCategories.push({
        id: 'elliptical-xt',
        title: 'Elliptical',
        subtitle: 'Low impact cardio machine',
        workouts: getEllipticalWorkouts()
      });
    }

    // Stationary Bike
    if (equipment.stationaryBike) {
      xtCategories.push({
        id: 'stationary-bike-xt',
        title: 'Stationary Bike',
        subtitle: 'Spin bike, Peloton, or indoor trainer',
        workouts: getStationaryBikeWorkouts()
      });
    }

    // Swimming
    if (equipment.swimming) {
      xtCategories.push({
        id: 'swimming-xt',
        title: 'Lap Swimming',
        subtitle: 'Full body, zero impact workout',
        workouts: getSwimmingWorkouts()
      });
    }

    // Rowing
    if (equipment.rowing) {
      xtCategories.push({
        id: 'rowing-xt',
        title: 'Rowing Machine',
        subtitle: 'Full body power and cardio',
        workouts: getRowingWorkouts()
      });
    }

    // Stand-up bike if user has one
    if (userProfile?.standUpBikeType) {
      xtCategories.push({
        id: 'standup-bike-xt',
        title: formatEquipmentName(userProfile.standUpBikeType),
        subtitle: 'Running-specific cross-training',
        workouts: getStandUpBikeEasyWorkouts()
      });
    }

    // If user has no equipment at all, show generic options
    if (!hasAnyEquipment && !userProfile?.standUpBikeType) {
      xtCategories.push({
        id: 'light-activity',
        title: 'Light Activity',
        subtitle: 'No equipment needed',
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
          ...w, // Spread all library workout fields
          name: w.name,
          description: w.description || w.structure || 'Easy pool running',
          duration: w.duration || '30-40 minutes',
          intensity: 'Easy',
          reason: 'zero impact recovery',
          benefits: w.benefits || 'Maintains running fitness without impact stress',
          equipmentType: 'pool',
          crossTrainingType: 'pool',
          sourceWorkout: w
        });
      });

      moderateWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          ...w, // Spread all library workout fields
          name: w.name,
          description: w.description || w.structure || 'Moderate pool running',
          duration: w.duration || '35-45 minutes',
          intensity: 'Moderate',
          reason: 'aerobic maintenance',
          benefits: w.benefits || 'Running-specific aerobic development',
          equipmentType: 'pool',
          crossTrainingType: 'pool',
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
        equipmentType: 'pool',
        crossTrainingType: 'pool'
      }];
    } catch (e) {
      return [{
        name: 'Pool Running Session',
        description: 'Deep water running with flotation belt',
        duration: '30-45 minutes',
        intensity: 'Easy to Moderate',
        reason: 'zero impact',
        benefits: 'Maintains running fitness',
        equipmentType: 'pool',
        crossTrainingType: 'pool'
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
          ...w, // Spread all library workout fields
          name: w.name,
          description: w.description || w.structure || 'Easy elliptical session',
          duration: w.duration || '30-40 minutes',
          intensity: 'Easy',
          reason: 'low impact cardio',
          benefits: w.benefits || 'Cardio maintenance without joint stress',
          equipmentType: 'elliptical',
          crossTrainingType: 'elliptical',
          sourceWorkout: w
        });
      });

      moderateWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          ...w, // Spread all library workout fields
          name: w.name,
          description: w.description || w.structure || 'Moderate elliptical workout',
          duration: w.duration || '35-45 minutes',
          intensity: 'Moderate',
          reason: 'aerobic development',
          benefits: w.benefits || 'Aerobic fitness with minimal impact',
          equipmentType: 'elliptical',
          crossTrainingType: 'elliptical',
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
        equipmentType: 'elliptical',
        crossTrainingType: 'elliptical'
      }];
    } catch (e) {
      return [{
        name: 'Elliptical Session',
        description: 'Steady effort on elliptical',
        duration: '30-45 minutes',
        intensity: 'Easy to Moderate',
        reason: 'gym alternative',
        benefits: 'Low impact cardio',
        equipmentType: 'elliptical',
        crossTrainingType: 'elliptical'
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
          ...w, // Spread all library workout fields
          name: w.name,
          description: w.description || w.structure || 'Easy spin session',
          duration: w.duration || '30-40 minutes',
          intensity: 'Easy',
          reason: 'active recovery',
          benefits: w.benefits || 'Leg turnover without running impact',
          equipmentType: 'stationaryBike',
          crossTrainingType: 'stationaryBike',
          sourceWorkout: w
        });
      });

      moderateWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          ...w, // Spread all library workout fields
          name: w.name,
          description: w.description || w.structure || 'Moderate bike workout',
          duration: w.duration || '35-45 minutes',
          intensity: 'Moderate',
          reason: 'aerobic maintenance',
          benefits: w.benefits || 'Aerobic development without impact',
          equipmentType: 'stationaryBike',
          crossTrainingType: 'stationaryBike',
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
        equipmentType: 'stationaryBike',
        crossTrainingType: 'stationaryBike'
      }];
    } catch (e) {
      return [{
        name: 'Stationary Bike Session',
        description: 'Spin session for aerobic development',
        duration: '30-45 minutes',
        intensity: 'Easy to Moderate',
        reason: 'cardio alternative',
        benefits: 'Aerobic fitness maintenance',
        equipmentType: 'stationaryBike',
        crossTrainingType: 'stationaryBike'
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
          ...w, // Spread all library workout fields
          name: w.name,
          description: w.description || w.structure || 'Easy lap swimming',
          duration: w.duration || '30-40 minutes',
          intensity: 'Easy',
          reason: 'full body recovery',
          benefits: w.benefits || 'Complete body workout with zero impact',
          equipmentType: 'swimming',
          crossTrainingType: 'swimming',
          sourceWorkout: w
        });
      });

      moderateWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          ...w, // Spread all library workout fields
          name: w.name,
          description: w.description || w.structure || 'Moderate swimming workout',
          duration: w.duration || '35-45 minutes',
          intensity: 'Moderate',
          reason: 'aerobic cross-training',
          benefits: w.benefits || 'Full body cardio conditioning',
          equipmentType: 'swimming',
          crossTrainingType: 'swimming',
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
        equipmentType: 'swimming',
        crossTrainingType: 'swimming'
      }];
    } catch (e) {
      return [{
        name: 'Lap Swimming',
        description: 'Continuous lap swimming',
        duration: '30-45 minutes',
        intensity: 'Easy to Moderate',
        reason: 'full body workout',
        benefits: 'Complete body conditioning',
        equipmentType: 'swimming',
        crossTrainingType: 'swimming'
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
          // Spread ALL library workout fields first (settings, technique, coachingTips, etc.)
          ...w,
          // Then override with processed values
          name: w.name,
          description: w.description || w.structure || 'Easy rowing session',
          duration: w.duration || '25-35 minutes',
          intensity: 'Easy',
          reason: 'posterior chain focus',
          benefits: w.benefits || 'Posterior chain development without impact',
          equipmentType: 'rowing',
          crossTrainingType: 'rowing',
          sourceWorkout: w
        });
      });

      moderateWorkouts.slice(0, 2).forEach(w => {
        workouts.push({
          // Spread ALL library workout fields first (settings, technique, coachingTips, etc.)
          ...w,
          // Then override with processed values
          name: w.name,
          description: w.description || w.structure || 'Moderate rowing workout',
          duration: w.duration || '30-40 minutes',
          intensity: 'Moderate',
          reason: 'full body power',
          benefits: w.benefits || 'Full body power and cardio development',
          equipmentType: 'rowing',
          crossTrainingType: 'rowing',
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
        equipmentType: 'rowing',
        crossTrainingType: 'rowing'
      }];
    } catch (e) {
      return [{
        name: 'Rowing Session',
        description: 'Rowing machine workout',
        duration: '25-40 minutes',
        intensity: 'Easy to Moderate',
        reason: 'full body alternative',
        benefits: 'Posterior chain and cardio',
        equipmentType: 'rowing',
        crossTrainingType: 'rowing'
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
    const getMatchingWorkouts = (library, equipmentType, equipmentName) => {
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
            // Spread ALL library workout fields first (settings, technique, coachingTips, etc.)
            ...w,
            // Then override with processed values - NO emoji prefix
            name: w.name,
            description: w.description || convertedStructure || `${equipmentName} workout`,
            structure: convertedStructure || w.structure,
            duration: w.duration || '30-45 minutes',
            intensity: w.intensity || intensityLabel,
            reason: `matches ${workoutType} intensity`,
            benefits: w.benefits || `Same training stimulus without running impact`,
            // Cross-training identification - BOTH fields for compatibility
            equipmentType: equipmentType,
            crossTrainingType: equipmentType,
            sourceWorkout: { ...w, structure: convertedStructure } // Store converted structure
          });
        });
      } catch (e) {
        // Fallback with generic workout
        workouts.push({
          name: `${equipmentName} ${intensityLabel}`,
          description: `${intensityLabel} effort ${equipmentName.toLowerCase()} session`,
          duration: '30-45 minutes',
          intensity: intensityLabel,
          reason: `matches ${workoutType} intensity`,
          benefits: 'Cross-training at equivalent effort',
          equipmentType: equipmentType,
          crossTrainingType: equipmentType
        });
      }
    };

    // Pool / Aqua Running
    if (equipment.pool) {
      getMatchingWorkouts(aquaLibrary, 'pool', 'Pool Running');
    }

    // Elliptical
    if (equipment.elliptical) {
      getMatchingWorkouts(ellipticalLibrary, 'elliptical', 'Elliptical');
    }

    // Stationary Bike
    if (equipment.stationaryBike) {
      getMatchingWorkouts(stationaryBikeLibrary, 'stationaryBike', 'Stationary Bike');
    }

    // Swimming
    if (equipment.swimming) {
      getMatchingWorkouts(swimmingLibrary, 'swimming', 'Swimming');
    }

    // Rowing
    if (equipment.rowing) {
      getMatchingWorkouts(rowingLibrary, 'rowing', 'Rowing');
    }

    // NOTE: Stand-up bike (Cyclete/ElliptiGO) is NOT included here because
    // it already has its own dedicated category via getEquipmentAlternatives()

    // If no equipment selected in profile, show generic cross-training options
    // This ensures the cross-training card always appears for hard workouts
    if (workouts.length === 0) {
      // Add pool running as a universal option (most running-specific)
      getMatchingWorkouts(aquaLibrary, 'pool', 'Pool Running');
      // Add rowing as another good option
      getMatchingWorkouts(rowingLibrary, 'rowing', 'Rowing');
      // Add elliptical as gym option
      getMatchingWorkouts(ellipticalLibrary, 'elliptical', 'Elliptical');
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
            if (baseWorkout && baseWorkout.name !== (currentWorkout.workout?.name || currentWorkout.name)) {
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
            if (baseWorkout && baseWorkout.name !== (currentWorkout.workout?.name || currentWorkout.name)) {
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
            if (baseWorkout && baseWorkout.name !== (currentWorkout.workout?.name || currentWorkout.name)) {
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
            if (baseWorkout && baseWorkout.name !== (currentWorkout.workout?.name || currentWorkout.name)) {
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
          if (workout && workout.name !== (currentWorkout.workout?.name || currentWorkout.name)) {
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

  const getEasierAlternatives = () => {
    const easier = [];

    // Extract easy pace for structure details
    const easyPaceMin = userPaces?.easy?.min || userPaces?.easy?.pace?.split('-')[0]?.trim();
    const easyPaceMax = userPaces?.easy?.max || userPaces?.easy?.pace?.split('-')[1]?.trim() || easyPaceMin;
    const easyPaceStr = easyPaceMin && easyPaceMax
      ? `${easyPaceMin}-${easyPaceMax}/mile`
      : 'conversational pace';

    // Easy Recovery Run - real structure
    easier.push({
      name: 'Easy Recovery Run',
      description: 'Very easy pace, active recovery focus - promotes blood flow and recovery without adding training stress',
      structure: `20-30 minutes at ${easyPaceStr}\n\nKeep effort very light - should be able to hold full conversation. Heart rate Zone 1-2. This is easier than your normal easy runs.`,
      duration: '20-30 minutes',
      intensity: 'Recovery',
      focus: 'Active Recovery',
      benefits: 'Promotes blood flow, aids muscle recovery, maintains routine without adding fatigue',
      paces: easyPaceStr
    });

    // Walk-Run Intervals - real structure
    easier.push({
      name: 'Walk-Run Intervals',
      description: 'Alternating walk and run intervals - perfect for recovery days or when feeling fatigued',
      structure: `5 min walk warmup\n8-10 rounds of:\n  • 2 min easy jog at ${easyPaceStr}\n  • 1 min walk recovery\n5 min walk cooldown\n\nTotal: ~30 minutes. No pressure on pace - focus on keeping heart rate low.`,
      duration: '30 minutes',
      intensity: 'Easy',
      focus: 'Recovery',
      benefits: 'Maintains running habit while minimizing stress, great for comeback or low-energy days',
      paces: easyPaceStr
    });

    // Shortened version of current workout type
    if (currentWorkout.type === 'tempo') {
      easier.push({
        name: 'Mini Tempo',
        description: 'Shortened tempo workout - same quality, less volume',
        structure: `10 min easy warmup at ${easyPaceStr}\n10 min tempo effort (comfortably hard)\n10 min easy cooldown\n\nTotal: 30 minutes. Same tempo intensity but half the volume.`,
        duration: '30 minutes',
        intensity: 'Moderate',
        focus: 'Lactate Threshold',
        benefits: 'Maintains threshold stimulus with reduced fatigue accumulation',
        paces: userPaces?.threshold ? `Tempo: ${userPaces.threshold.min || userPaces.threshold.pace || 'comfortably hard'}` : 'Comfortably hard effort'
      });
    } else if (currentWorkout.type === 'intervals') {
      easier.push({
        name: 'Reduced Intervals',
        description: 'Fewer reps of the same quality - maintain speed, reduce volume',
        structure: `10 min easy warmup at ${easyPaceStr}\n3-4 x 400m at 5K effort with 400m jog recovery\n10 min easy cooldown\n\nHalf the reps, same intensity. Quality over quantity.`,
        duration: '35-40 minutes',
        intensity: 'Moderate-Hard',
        focus: 'Speed Development',
        benefits: 'Maintains neuromuscular stimulus while reducing overall stress',
        paces: userPaces?.interval ? `Intervals: ${userPaces.interval.min || userPaces.interval.pace || '5K effort'}` : '5K effort'
      });
    } else if (currentWorkout.type === 'longRun') {
      easier.push({
        name: 'Shortened Long Run',
        description: 'Reduced distance long run - maintains aerobic benefit with less time commitment',
        structure: `Run at ${easyPaceStr} for 60-75% of planned distance\n\nKeep effort conversational throughout. Focus on time on feet rather than hitting exact mileage.`,
        duration: '45-60 minutes',
        intensity: 'Easy',
        focus: 'Aerobic Base',
        benefits: 'Maintains aerobic adaptation while reducing fatigue and time commitment',
        paces: easyPaceStr
      });
    }

    // Cross-training option if equipment available
    if (userProfile?.crossTrainingEquipment?.elliptical) {
      easier.push({
        name: 'Easy Elliptical',
        description: 'Low-impact cardio alternative - same aerobic benefit without running stress',
        structure: '30-40 minutes at easy effort\n\nRPE 3-4, should feel easy and sustainable. Great for active recovery when legs need a break from impact.',
        duration: '30-40 minutes',
        intensity: 'Easy',
        focus: 'Cross-Training',
        benefits: 'Maintains aerobic fitness, zero impact, allows running muscles to recover',
        equipment: 'elliptical'
      });
    }

    // Always offer complete rest as an option
    easier.push({
      name: 'Rest Day',
      description: 'Sometimes the best workout is no workout - complete recovery',
      structure: 'No structured activity\n\nOptional: light stretching, foam rolling, or short walk. Listen to your body - rest is when adaptation happens.',
      duration: 'Full day',
      intensity: 'Rest',
      focus: 'Recovery',
      benefits: 'Physical and mental recovery, injury prevention, glycogen replenishment'
    });

    return easier;
  };

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

    // Extract paces for structure details
    const easyPaceMin = userPaces?.easy?.min || userPaces?.easy?.pace?.split('-')[0]?.trim();
    const easyPaceMax = userPaces?.easy?.max || userPaces?.easy?.pace?.split('-')[1]?.trim() || easyPaceMin;
    const easyPaceStr = easyPaceMin && easyPaceMax
      ? `${easyPaceMin}-${easyPaceMax}/mile`
      : 'easy pace';
    const tempoPace = userPaces?.threshold?.min || userPaces?.threshold?.pace || 'tempo effort';
    const intervalPace = userPaces?.interval?.min || userPaces?.interval?.pace || '5K effort';

    // Add fartlek with real structure
    harder.push({
      name: 'Fartlek Run',
      description: 'Playful speed play - develops speed and mental toughness with varied surges',
      structure: `10 min easy warmup at ${easyPaceStr}\n\nMain set (20-25 min):\n  • 3 min moderate surge\n  • 2 min easy recovery\n  • 2 min hard surge (${intervalPace})\n  • 2 min easy recovery\n  • 1 min sprint\n  • 2 min easy recovery\n  Repeat pattern once more\n\n5 min easy cooldown\n\nListen to your body - surges should feel challenging but sustainable.`,
      duration: '35-45 minutes',
      intensity: 'Moderate-Hard',
      focus: 'Speed Development',
      benefits: 'Develops pace awareness, mental toughness, and running economy through varied intensities',
      paces: `Easy: ${easyPaceStr}, Surges: ${intervalPace}`
    });

    // Add progressive run with real structure
    harder.push({
      name: 'Progressive Run',
      description: 'Building effort run - starts easy, finishes strong, develops pacing control',
      structure: `Total: 35-45 minutes\n\nFirst third: Easy pace at ${easyPaceStr}\nMiddle third: Moderate effort (marathon pace)\nFinal third: Strong finish at ${tempoPace}\n\nEach section should feel progressively harder. The last mile should feel like tempo effort but not all-out.`,
      duration: '35-45 minutes',
      intensity: 'Easy to Hard',
      focus: 'Pace Control',
      benefits: 'Develops negative splitting, teaches pacing discipline, builds finishing strength',
      paces: `Easy: ${easyPaceStr}, Finish: ${tempoPace}`
    });

    return harder.filter(Boolean).slice(0, 5);
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
    const bikeDistance = extractDistance(currentWorkout.workout?.name || currentWorkout.name || '') || 12;
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
    const workoutName = currentWorkout.workout?.name || currentWorkout.name || 'Workout';
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
      // IMPORTANT: Copy ALL fields from selectedWorkout to preserve cross-training details
      // Cross-training fields (settings, technique, coachingTips, etc.) must be at TOP LEVEL
      // so transformWorkoutForDisplay can detect and use them
      const newWorkoutData = {
        ...currentWorkout,
        workout: {
          ...selectedWorkout, // Copy ALL fields (structure, benefits, effort, cycleteNotes, elliptigoNotes, roadConsiderations, etc.)
          name: selectedWorkout.name,
          description: selectedWorkout.description,
          duration: selectedWorkout.duration || selectedWorkout.repetitions || 'Variable'
        },
        // Basic workout info
        name: selectedWorkout.name,
        description: selectedWorkout.description,
        structure: selectedWorkout.structure,
        duration: selectedWorkout.duration,
        intensity: selectedWorkout.intensity,
        benefits: selectedWorkout.benefits,
        type: selectedWorkout.library || selectedWorkout.type || currentWorkout.type,
        focus: getFocusFromWorkout(selectedWorkout),
        equipmentSpecific: selectedWorkout.equipmentSpecific || !!selectedWorkout.equipment,
        // Cross-training specific fields - MUST be at top level for WorkoutDetail display
        crossTrainingType: selectedWorkout.crossTrainingType || selectedWorkout.equipmentType,
        equipmentType: selectedWorkout.equipmentType || selectedWorkout.crossTrainingType,
        settings: selectedWorkout.settings,
        technique: selectedWorkout.technique,
        coachingTips: selectedWorkout.coachingTips,
        effort: selectedWorkout.effort,
        runningEquivalent: selectedWorkout.runningEquivalent,
        // Keep full reference
        workoutDetails: selectedWorkout,
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
                <>Your plan adapts when life happens • Scheduled: <strong>{currentWorkout.workout?.name || currentWorkout.name}</strong> • {currentWorkout.day}</>
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
                  {/* Equipment Type Banner for Cross-Training */}
                  {(workout.equipmentType || workout.crossTrainingType) && (
                    <div style={{
                      background: (() => {
                        const eqType = workout.equipmentType || workout.crossTrainingType;
                        const colors = {
                          pool: 'linear-gradient(90deg, #0077B6 0%, #00A8CC 100%)',
                          aquaRunning: 'linear-gradient(90deg, #0077B6 0%, #00A8CC 100%)',
                          rowing: 'linear-gradient(90deg, #E85D04 0%, #F48C06 100%)',
                          elliptical: 'linear-gradient(90deg, #7209B7 0%, #B5179E 100%)',
                          stationaryBike: 'linear-gradient(90deg, #2D6A4F 0%, #40916C 100%)',
                          swimming: 'linear-gradient(90deg, #0077B6 0%, #48CAE4 100%)',
                          standUpBike: 'linear-gradient(90deg, #F77F00 0%, #FCBF49 100%)'
                        };
                        return colors[eqType] || 'linear-gradient(90deg, #6C757D 0%, #ADB5BD 100%)';
                      })(),
                      padding: '6px 12px',
                      borderRadius: '6px 6px 0 0',
                      margin: '-12px -12px 12px -12px'
                    }}>
                      <span style={{
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        {formatEquipmentName(workout.equipmentType || workout.crossTrainingType)}
                      </span>
                    </div>
                  )}
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
                    {/* Only show equipment badge if no banner shown */}
                    {workout.equipment && !workout.equipmentType && !workout.crossTrainingType && (
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
                padding: 'var(--space-5)',
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 255, 136, 0.1) 100%)',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid rgba(0, 212, 255, 0.4)',
                overflow: 'hidden'
              }}>
                {/* Equipment Type Banner for Cross-Training in Preview */}
                {(selectedWorkout.equipmentType || selectedWorkout.crossTrainingType) && (
                  <div style={{
                    background: (() => {
                      const eqType = selectedWorkout.equipmentType || selectedWorkout.crossTrainingType;
                      const colors = {
                        pool: 'linear-gradient(90deg, #0077B6 0%, #00A8CC 100%)',
                        aquaRunning: 'linear-gradient(90deg, #0077B6 0%, #00A8CC 100%)',
                        rowing: 'linear-gradient(90deg, #E85D04 0%, #F48C06 100%)',
                        elliptical: 'linear-gradient(90deg, #7209B7 0%, #B5179E 100%)',
                        stationaryBike: 'linear-gradient(90deg, #2D6A4F 0%, #40916C 100%)',
                        swimming: 'linear-gradient(90deg, #0077B6 0%, #48CAE4 100%)',
                        standUpBike: 'linear-gradient(90deg, #F77F00 0%, #FCBF49 100%)'
                      };
                      return colors[eqType] || 'linear-gradient(90deg, #6C757D 0%, #ADB5BD 100%)';
                    })(),
                    padding: '10px 20px',
                    margin: '-20px -20px 16px -20px'
                  }}>
                    <span style={{
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px'
                    }}>
                      {formatEquipmentName(selectedWorkout.equipmentType || selectedWorkout.crossTrainingType)} Workout
                    </span>
                  </div>
                )}
                {/* Preview Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.2rem' }}>
                      {selectedWorkout.name}
                    </h4>
                    <p style={{ margin: '4px 0 0 0', color: '#CCCCCC', fontSize: '0.9rem' }}>
                      {mode === 'add' ? 'Add to ' : 'Replace '}{currentWorkout.day}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedWorkout(null)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    ← Back to List
                  </button>
                </div>

                {/* Workout Details Grid */}
                <div style={{ display: 'grid', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  {/* Structure/Description - handles both flat structure and nested workout format */}
                  {(selectedWorkout.structure || selectedWorkout.workout || selectedWorkout.description) && (
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid rgba(0, 212, 255, 0.6)'
                    }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#00D4FF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Workout Structure
                      </p>
                      {/* Flat structure format */}
                      {typeof selectedWorkout.structure === 'string' ? (
                        <p style={{ margin: '8px 0 0 0', color: '#FFFFFF', fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {selectedWorkout.structure}
                        </p>
                      ) : selectedWorkout.workout && (selectedWorkout.workout.warmup || selectedWorkout.workout.main) ? (
                        /* Nested workout format (hill workouts, etc.) */
                        <div style={{ margin: '8px 0 0 0', color: '#FFFFFF', fontSize: '0.95rem', lineHeight: 1.6 }}>
                          {selectedWorkout.workout.warmup && (
                            <p style={{ margin: '0 0 6px 0' }}><strong style={{ color: '#00FF88' }}>Warmup:</strong> {selectedWorkout.workout.warmup}</p>
                          )}
                          {selectedWorkout.workout.main && (
                            <p style={{ margin: '0 0 6px 0' }}><strong style={{ color: '#00D4FF' }}>Main Set:</strong> {selectedWorkout.workout.main}</p>
                          )}
                          {selectedWorkout.workout.recovery && (
                            <p style={{ margin: '0 0 6px 0' }}><strong style={{ color: '#FFC800' }}>Recovery:</strong> {selectedWorkout.workout.recovery}</p>
                          )}
                          {selectedWorkout.workout.cooldown && (
                            <p style={{ margin: 0 }}><strong style={{ color: '#00FF88' }}>Cooldown:</strong> {selectedWorkout.workout.cooldown}</p>
                          )}
                        </div>
                      ) : typeof selectedWorkout.description === 'string' ? (
                        <p style={{ margin: '8px 0 0 0', color: '#FFFFFF', fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {selectedWorkout.description}
                        </p>
                      ) : (
                        <p style={{ margin: '8px 0 0 0', color: '#FFFFFF', fontSize: '0.95rem', lineHeight: 1.5 }}>
                          See workout details
                        </p>
                      )}
                    </div>
                  )}

                  {/* Paces - if available */}
                  {selectedWorkout.paces && (
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid rgba(0, 255, 136, 0.6)'
                    }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#00FF88', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Target Paces
                      </p>
                      <p style={{ margin: '8px 0 0 0', color: '#FFFFFF', fontSize: '0.95rem', lineHeight: 1.5 }}>
                        {typeof selectedWorkout.paces === 'string'
                          ? selectedWorkout.paces
                          : typeof selectedWorkout.paces === 'object'
                            ? Object.entries(selectedWorkout.paces)
                                .filter(([, val]) => val && typeof val === 'string')
                                .map(([key, val]) => `${key}: ${val}`)
                                .join(' • ') || 'Based on your training paces'
                            : 'Based on your training paces'}
                      </p>
                    </div>
                  )}

                  {/* Benefits */}
                  {selectedWorkout.benefits && (
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid rgba(255, 200, 0, 0.6)'
                    }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#FFC800', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Benefits
                      </p>
                      <p style={{ margin: '8px 0 0 0', color: '#FFFFFF', fontSize: '0.95rem', lineHeight: 1.5 }}>
                        {typeof selectedWorkout.benefits === 'string'
                          ? selectedWorkout.benefits
                          : Array.isArray(selectedWorkout.benefits)
                            ? selectedWorkout.benefits.join(', ')
                            : 'Training adaptation and fitness improvement'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Badges Row */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                  {selectedWorkout.duration && (
                    <div className="badge badge-info" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
                      ⏱️ {typeof selectedWorkout.duration === 'string' ? selectedWorkout.duration : 'Duration varies'}
                    </div>
                  )}
                  {selectedWorkout.intensity && (
                    <div className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
                      🔥 {typeof selectedWorkout.intensity === 'string' ? selectedWorkout.intensity : 'Moderate'}
                    </div>
                  )}
                  {selectedWorkout.equipment && (
                    <div className="badge badge-success" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
                      🏋️ {formatEquipmentName(selectedWorkout.equipment)}
                    </div>
                  )}
                  {selectedWorkout.focus && (
                    <div className="badge badge-primary" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
                      🎯 {selectedWorkout.focus}
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleConfirmReplacement}
                    className="btn btn-primary"
                    style={{ fontSize: '1rem', padding: '12px 24px' }}
                  >
                    {mode === 'add' ? '➕ Add This Workout' : '✓ Select This Workout'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SomethingElseModal;