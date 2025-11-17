import Anthropic from '@anthropic-ai/sdk';

/**
 * AI Coach Service - Analyzes completed workouts using Claude API
 *
 * WARNING: This is for LOCAL DEVELOPMENT ONLY
 * The API key is exposed in frontend code and will be visible in production builds.
 *
 * For production deployment:
 * - Move API calls to a backend service (Node.js, Netlify Functions, etc.)
 * - OR use Firebase Cloud Functions as a proxy
 * - OR migrate from GitHub Pages to a platform with serverless functions
 */

class AICoachService {
  constructor() {
    // API key for local testing only
    // For production, this MUST be moved to a backend service
    this.apiKey = null;
    this.client = null;
  }

  /**
   * Initialize the Anthropic client with API key
   * @param {string} apiKey - Anthropic API key
   */
  initialize(apiKey) {
    this.apiKey = apiKey;
    this.client = new Anthropic({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true // ONLY for local dev - never in production
    });
  }

  /**
   * Analyze a completed workout and generate coaching insights
   * @param {object} workoutData - Completed workout data from Strava
   * @param {object} options - Additional context (training plan, injury history, etc.)
   * @returns {Promise<string>} Coaching analysis (150-175 words)
   */
  async analyzeWorkout(workoutData, options = {}) {
    if (!this.client) {
      throw new Error('AICoachService not initialized. Call initialize(apiKey) first.');
    }

    const prompt = this.buildCoachingPrompt(workoutData, options);

    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return message.content[0].text;
    } catch (error) {
      console.error('❌ Error calling Claude API:', error);
      throw error;
    }
  }

  /**
   * Build the coaching prompt with workout data and context
   * @param {object} workoutData - Completed workout data
   * @param {object} options - Additional context
   * @returns {string} Complete prompt for Claude
   */
  buildCoachingPrompt(workoutData, options = {}) {
    const { trainingContext, injuryContext, prescribedWorkout, upcomingWorkouts } = options;

    // Determine workout type
    // Strava categorizes stand-up bikes as "Ride", so check standUpBikeType field
    const isStandUpBike = (workoutData.type === 'Ride' || workoutData.type === 'VirtualRide') && workoutData.standUpBikeType;
    const isRun = workoutData.type === 'Run' || workoutData.type === 'VirtualRun';

    // Build lap-by-lap summary
    let lapSummary = '';
    if (workoutData.laps && workoutData.laps.length > 0) {
      // Check if laps are in miles or kilometers based on distance field
      const isMetric = workoutData.laps[0].distance && workoutData.laps[0].distance.includes('km');

      if (isMetric) {
        lapSummary = '\n\nLap-by-Lap Breakdown (kilometer splits):\n';
        workoutData.laps.forEach(lap => {
          const elevChange = lap.elevationGain !== null
            ? `${lap.elevationGain > 0 ? '+' : ''}${lap.elevationGain}ft`
            : 'flat';
          lapSummary += `Kilometer ${lap.lap} (~${lap.distanceMiles} mi cumulative): ${lap.pace || 'N/A'} pace, ${elevChange} elevation, ${lap.avgHeartRate || 'N/A'} bpm\n`;
        });
      } else {
        lapSummary = '\n\nLap-by-Lap Breakdown (mile splits):\n';
        workoutData.laps.forEach(lap => {
          const elevChange = lap.elevationGain !== null
            ? `${lap.elevationGain > 0 ? '+' : ''}${lap.elevationGain}ft`
            : 'flat';
          lapSummary += `Mile ${lap.lap}: ${lap.pace || 'N/A'} pace, ${elevChange} elevation, ${lap.avgHeartRate || 'N/A'} bpm\n`;
        });
      }
    }

    // Determine workout description for prompt
    let workoutTypeDescription = '';
    let recoveryNotes = '';

    if (isStandUpBike) {
      const bikeName = workoutData.standUpBikeType === 'cyclete' ? 'Cyclete' :
                       workoutData.standUpBikeType === 'elliptigo' ? 'ElliptiGO' :
                       'stand-up bike';
      workoutTypeDescription = `${bikeName} (stand-up bike) - Weight-bearing, NO-IMPACT outdoor cardio`;
      recoveryNotes = `This was completed on a stand-up bike (comes into Strava as "Ride"). Stand-up bikes are weight-bearing but have ZERO impact forces on joints. Quads still work eccentrically controlling descents but without the pounding. Recovery needs: less joint/bone stress than running, but similar muscular fatigue. Can often handle higher volume than running due to no impact.`;
    } else if (isRun) {
      workoutTypeDescription = `Running - Weight-bearing, HIGH-IMPACT activity`;
      recoveryNotes = `This was a running workout with full ground impact forces. Every foot strike creates 2-3x bodyweight forces absorbed by joints, bones, and connective tissue. Descents create even higher eccentric loading on quads AND impact stress. Recovery needs: manage both muscular fatigue AND impact-related stress on joints/bones/tendons.`;
    } else {
      workoutTypeDescription = `Cycling or other cardio activity`;
      recoveryNotes = `This appears to be a traditional cycling workout. Lower body muscular work but minimal impact forces.`;
    }

    // Build the complete prompt
    const prompt = `You are a USATF-certified running coach analyzing a completed workout. Your coaching style is conversational, data-driven, and actionable - like you're coaching someone you know personally.

IMPORTANT GUIDELINES:
- Keep response to 150-175 words MAXIMUM
- Use conversational tone (not robotic or generic)
- Focus on terrain's impact on performance (especially descents and eccentric loading)
- Provide specific lap-by-lap storytelling when relevant
- Give actionable next-step advice
- DO NOT use any real coach names in your response
- Be concise and insightful, not flowery or generic

WORKOUT TYPE: ${workoutTypeDescription}

CRITICAL CONTEXT - RECOVERY IMPLICATIONS:
${recoveryNotes}

COMPLETED WORKOUT:
- Distance: ${workoutData.distance} miles
- Duration: ${workoutData.duration} minutes
- Pace: ${workoutData.pace || 'N/A'}
- Total Elevation Gain: ${workoutData.elevationGain || 0} feet
- Avg Heart Rate: ${workoutData.avgHeartRate || 'N/A'} bpm
- Max Heart Rate: ${workoutData.maxHeartRate || 'N/A'} bpm
${lapSummary}

${prescribedWorkout ? `PRESCRIBED WORKOUT:\n${prescribedWorkout}\n` : ''}

${trainingContext ? `TRAINING CONTEXT:\n${trainingContext}\n` : ''}

${upcomingWorkouts ? `UPCOMING WORKOUTS THIS WEEK:\n${upcomingWorkouts}\n` : ''}

${injuryContext ? `INJURY/FATIGUE NOTES:\n${injuryContext}\n` : ''}

Analyze this workout and provide coaching feedback. Focus on how terrain affected performance, whether pacing was appropriate given elevation changes, and what recovery/preparation is needed for the upcoming scheduled workouts. Reference specific upcoming workouts when giving advice (e.g., "Tuesday's tempo run", "Thursday's intervals").`;

    return prompt;
  }
}

export default new AICoachService();
