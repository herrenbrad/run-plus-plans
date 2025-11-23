# Race Course Analysis Feature - Implementation Plan

## Overview
Allow users to upload TCX/GPX files of their race course to get personalized, course-specific training recommendations. The AI Coach will analyze the elevation profile and generate race-specific workouts and pacing strategies.

## Current State
- Simple dropdown: "flat", "rolling", or "hilly"
- Stored as `userProfile.raceElevationProfile` (string)
- AI Coach receives basic terrain description

## Target State
- TCX/GPX file upload in onboarding
- Automatic elevation profile extraction
- Visual elevation chart
- Detailed course analysis (total gain/loss, key segments, altitude range)
- AI Coach receives full course data for personalized recommendations
- Course-specific workouts (e.g., "Miles 14-18 Simulation" for Medellín Marathon)
- Race day pacing strategy based on actual elevation profile

---

## Implementation Phases

### Phase 1: Core Infrastructure (Foundation)
**Goal**: Build the file parsing and analysis engine

#### 1.1 TCX/GPX Parser Service
**File**: `src/services/CourseFileParser.js`
- Parse TCX (Training Center XML) files
- Parse GPX (GPS Exchange Format) files
- Extract: GPS coordinates, elevation data, distance markers, timestamps
- Handle both imperial and metric units
- Error handling for malformed files

**Key Functions**:
```javascript
parseTCXFile(file) → { coordinates, elevations, distances, totalDistance }
parseGPXFile(file) → { coordinates, elevations, distances, totalDistance }
validateFile(file) → boolean
```

#### 1.2 Elevation Profile Analyzer
**File**: `src/services/ElevationAnalyzer.js`
- Calculate total elevation gain/loss
- Identify steep sections (>3% grade)
- Find sustained climbs (>0.5 miles)
- Detect rolling vs. flat sections
- Calculate average grade
- Find high/low points
- Identify key segments (start, middle, finish challenges)

**Key Functions**:
```javascript
analyzeElevationProfile(data) → {
  totalGain, totalLoss, netElevation,
  altitudeRange: { min, max },
  averageGrade,
  steepSections: [{ startMile, endMile, grade, elevationGain }],
  sustainedClimbs: [{ startMile, endMile, grade, elevationGain }],
  rollingSections: [{ startMile, endMile }],
  keySegments: {
    start: { miles, description },
    middle: { miles, description },
    finish: { miles, description }
  }
}
```

#### 1.3 Course Data Storage
**Update**: `src/services/FirestoreService.js`
- Add `courseProfile` field to user profile:
  ```javascript
  courseProfile: {
    fileType: 'tcx' | 'gpx',
    totalDistance: number, // miles or km
    elevationGain: number, // feet or meters
    elevationLoss: number,
    altitudeRange: { min, max },
    averageGrade: number,
    steepSections: [...],
    sustainedClimbs: [...],
    keySegments: {...},
    rawElevationData: [{ mile, elevation }], // for charting
    uploadedAt: timestamp
  }
  ```

---

### Phase 2: UI Components (User Experience)
**Goal**: Build intuitive file upload and visualization

#### 2.1 Course File Upload Component
**File**: `src/components/CourseFileUpload.js`
- Drag-and-drop file upload
- File type validation (.tcx, .gpx)
- File size limit (e.g., 10MB)
- Loading state during parsing
- Error messages for invalid files
- Success confirmation with course summary

**UI Features**:
- "Upload Race Course File" button/area
- File name display after upload
- "Remove" option to clear file
- Help text: "Upload a TCX or GPX file from your GPS device or race website"

#### 2.2 Elevation Profile Chart
**File**: `src/components/ElevationProfileChart.js`
- Visual elevation profile using a charting library (e.g., `recharts`)
- X-axis: Distance (miles/km)
- Y-axis: Elevation (feet/meters)
- Highlight key segments (steep climbs, high points)
- Interactive tooltips showing elevation at specific points
- Mobile-responsive

**Chart Features**:
- Line chart showing elevation vs. distance
- Color-coded sections (green=easy, yellow=moderate, red=steep)
- Markers for high/low points
- Annotations for key segments

#### 2.3 Course Analysis Display
**File**: `src/components/CourseAnalysisCard.js`
- Summary card showing:
  - Total distance
  - Elevation gain/loss
  - Altitude range
  - Average grade
  - Key segments description
- Display in onboarding after file upload
- Display in Dashboard (if course uploaded)

---

### Phase 3: AI Coach Integration (Intelligence)
**Goal**: Feed course data to AI for personalized recommendations

#### 3.1 Enhanced AI Coach Prompt
**Update**: `src/services/TrainingPlanAIService.js`
- Modify `buildCoachingPrompt()` to include detailed course profile
- Replace simple "hilly" description with full analysis:
  ```javascript
  if (profile.courseProfile) {
    prompt += `**Race Course Profile (from uploaded file):**\n`;
    prompt += `- Total Distance: ${courseProfile.totalDistance} ${units}\n`;
    prompt += `- Elevation Gain: ${courseProfile.elevationGain} ${elevationUnit}\n`;
    prompt += `- Elevation Loss: ${courseProfile.elevationLoss} ${elevationUnit}\n`;
    prompt += `- Altitude Range: ${courseProfile.altitudeRange.min} - ${courseProfile.altitudeRange.max} ${elevationUnit}\n`;
    prompt += `- Average Grade: ${courseProfile.averageGrade}%\n`;
    prompt += `- Key Challenge: ${courseProfile.keySegments.middle.description}\n`;
    prompt += `- Steepest Section: Miles ${steepSection.startMile}-${steepSection.endMile} (${steepSection.grade}% grade)\n`;
  }
  ```

#### 3.2 Course-Specific Workout Recommendations
**Update**: AI Coach output to include:
- Hill workouts matching course profile (steep vs. rolling)
- Long runs that simulate key course segments
- Pacing strategy for race day based on elevation
- Fueling strategy for challenging sections

**Example AI Output**:
```
"Your race has a 4-mile climb from miles 14-18 (1.5% average grade). 
We'll add 'Sustained Climb Repeats' workouts to prepare. Your Week 10 
long run will simulate this: 10 miles easy → 4 miles at goal pace 
on 1.5% grade → cruise home."
```

---

### Phase 4: Course-Specific Workouts (Advanced)
**Goal**: Generate workouts that match the actual race course

#### 4.1 Course-Specific Long Run Generator
**File**: `src/lib/course-specific-workout-library.js`
- Generate long runs that simulate key course segments
- Example: "Miles 14-18 Simulation" for Medellín Marathon
- Example: "Downhill Quad Prep" for courses with significant descents
- Example: "Rolling Hills Long Run" for rolling courses

**Workout Types**:
- `courseSegmentSimulation`: Practice specific challenging segment
- `coursePaceProgression`: Match race day pacing strategy
- `courseTerrainLongRun`: Match overall course terrain

#### 4.2 Enhanced Hill Workout Selection
**Update**: `src/lib/hill-workout-library.js`
- Select hill workouts based on course profile:
  - Steep courses → "Classic Hill Repeats", "Steep Incline Intervals"
  - Rolling courses → "Rolling Hills Fartlek", "Tempo Hills"
  - Sustained climbs → "Sustained Climb Repeats", "Hill Pyramid"

#### 4.3 Race Day Pacing Strategy Generator
**File**: `src/services/RacePacingStrategy.js`
- Generate mile-by-mile pacing plan based on elevation
- Account for:
  - Uphill sections (slower pace, maintain effort)
  - Downhill sections (faster pace, controlled descent)
  - Flat sections (make up time)
  - Altitude effects (if applicable)

**Output Format**:
```javascript
{
  strategy: "Start controlled, push on flats, maintain effort on hills",
  mileByMile: [
    { mile: 1, targetPace: "9:15/mi", notes: "Start controlled" },
    { mile: 14, targetPace: "9:30/mi", notes: "Maintain effort on climb" },
    { mile: 18, targetPace: "9:00/mi", notes: "Push on descent" }
  ]
}
```

---

### Phase 5: Onboarding Integration
**Goal**: Seamlessly add file upload to onboarding flow

#### 5.1 Update Onboarding Components
**Files**: 
- `src/components/OnboardingFlow.js`
- `src/components/SimpleOnboardingFlow.js`

**Changes**:
- Replace simple terrain dropdown with:
  1. Option to upload file (primary)
  2. Fallback to manual selection (if no file)
- Add `CourseFileUpload` component in race details section
- Show `ElevationProfileChart` after file upload
- Show `CourseAnalysisCard` with key stats
- Store `courseProfile` in user profile

**UI Flow**:
```
Race Details Section:
┌─────────────────────────────────────┐
│ Upload Race Course File (Optional)  │
│ [Drag & Drop or Click to Upload]    │
│                                      │
│ OR                                   │
│                                      │
│ Select Terrain: [Flat/Rolling/Hilly]│
└─────────────────────────────────────┘

After Upload:
┌─────────────────────────────────────┐
│ 📊 Course Analysis                  │
│ Distance: 26.5 mi                   │
│ Elevation: +1,400 ft / -1,522 ft    │
│ Key Challenge: 4-mile climb 14-18   │
│                                      │
│ [Elevation Profile Chart]           │
└─────────────────────────────────────┘
```

---

### Phase 6: Dashboard Integration
**Goal**: Show course info and recommendations in Dashboard

#### 6.1 Course Profile Card
**Update**: `src/components/Dashboard.js`
- Display course profile card (if uploaded)
- Show elevation chart
- Link to "View Race Day Strategy" (if generated)
- Show course-specific workout recommendations

#### 6.2 Race Day Strategy Modal
**File**: `src/components/RaceDayStrategyModal.js`
- Modal showing:
  - Full elevation profile
  - Mile-by-mile pacing plan
  - Fueling strategy
  - Key segments to watch for
  - AI Coach's race day advice

---

## Technical Dependencies

### New NPM Packages Needed
```json
{
  "xml2js": "^0.6.2",           // Parse TCX/GPX XML files
  "recharts": "^2.10.0",        // Elevation profile charts
  "react-dropzone": "^14.2.0"   // File upload with drag-and-drop
}
```

### File Size Considerations
- TCX/GPX files are typically 50KB - 2MB
- Parse on client-side (no backend needed for parsing)
- Store only analyzed data in Firestore (not raw file)
- Raw elevation data array: ~500-2000 points (manageable)

---

## Data Flow

```
User Uploads TCX/GPX
    ↓
CourseFileParser.parseFile()
    ↓
ElevationAnalyzer.analyzeProfile()
    ↓
Store in userProfile.courseProfile
    ↓
AI Coach receives courseProfile in prompt
    ↓
AI generates course-specific plan
    ↓
Workout libraries select course-appropriate workouts
    ↓
Display in Dashboard with course visualization
```

---

## Success Metrics

1. **User Experience**:
   - File upload works smoothly (< 3 seconds to parse)
   - Chart renders correctly on mobile
   - AI recommendations reference specific course segments

2. **Technical**:
   - Handles TCX and GPX files correctly
   - Accurate elevation calculations
   - No performance issues with large files

3. **Business Value**:
   - Differentiates from competitors (Runna, etc.)
   - Users feel plan is truly personalized to their race
   - Increases user engagement with course-specific workouts

---

## Implementation Order (Recommended)

1. **Week 1**: Phase 1 (Parser + Analyzer)
   - Build and test file parsing
   - Build elevation analysis
   - Unit tests for edge cases

2. **Week 2**: Phase 2 (UI Components)
   - File upload component
   - Elevation chart
   - Course analysis display

3. **Week 3**: Phase 3 (AI Integration)
   - Update AI Coach prompt
   - Test with real course files
   - Verify AI recommendations are course-specific

4. **Week 4**: Phase 4 (Advanced Features)
   - Course-specific workouts
   - Race day pacing strategy
   - Polish and testing

5. **Week 5**: Phase 5 & 6 (Integration)
   - Onboarding integration
   - Dashboard integration
   - End-to-end testing

---

## Future Enhancements (Post-MVP)

1. **Strava Route Integration**: Import course directly from Strava route
2. **Multiple Courses**: Support race calendar with multiple courses
3. **Course Comparison**: Compare training course vs. race course
4. **Weather Integration**: Factor in expected race day weather
5. **Course Preview Mode**: Let users preview course before committing to race
6. **Community Courses**: Share course profiles with other users

---

## Questions to Resolve

1. **File Storage**: Store raw file in Firebase Storage, or just analyzed data?
   - Recommendation: Just analyzed data (smaller, faster)

2. **Metric vs. Imperial**: Handle both in parser?
   - Recommendation: Yes, detect from file or user preference

3. **Chart Library**: Use `recharts` or `chart.js` or `victory`?
   - Recommendation: `recharts` (React-native, good mobile support)

4. **Error Handling**: What if file is corrupted or missing elevation data?
   - Recommendation: Fall back to manual terrain selection

5. **Backward Compatibility**: What about existing users with "hilly" selection?
   - Recommendation: Keep `raceElevationProfile` field, add `courseProfile` as enhancement

---

## Next Steps

1. Review this plan with team
2. Set up development branch: `feature/race-course-analysis`
3. Install dependencies
4. Start with Phase 1 (Parser + Analyzer)
5. Test with real TCX file (Medellín Marathon example from roadmap)


