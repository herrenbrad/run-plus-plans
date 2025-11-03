/**
 * Run+ Training Pace Calculator Data
 * Based on Jack Daniels' VDOT System
 * Data collected from https://vdoto2.com/calculator
 *
 * All pace values in MM:SS format per mile (with km equivalents in comments)
 * Track interval times in MM:SS or M:SS format
 */

export const trainingPaceData = {
  marathon: [
    {
      goalTime: "6:00:00",
      paces: {
        easy: { min: "12:52", max: "14:04", km: "8:00-8:44" },
        marathon: { pace: "13:38", km: "8:28" },
        threshold: { pace: "11:42", km: "7:16" },
        interval: { pace: "10:00", km: "6:13" }
      },
      trackIntervals: {
        threshold: { "1200m": "8:43", "800m": "5:49", "600m": "4:22" },
        interval: { "400m": "2:29", "300m": "1:53", "200m": "1:15" }
      }
    },
    {
      goalTime: "5:45:00",
      paces: {
        easy: { min: "12:35", max: "13:45", km: "7:49-8:33" },
        marathon: { pace: "13:05", km: "8:08" },
        threshold: { pace: "11:20", km: "7:02" },
        interval: { pace: "9:46", km: "6:04" }
      },
      trackIntervals: {
        threshold: { "1200m": "8:27", "800m": "5:38", "600m": "4:13" },
        interval: { "400m": "2:26", "300m": "1:49", "200m": "1:13" }
      }
    },
    {
      goalTime: "5:30:00",
      paces: {
        easy: { min: "12:17", max: "13:26", km: "7:38-8:21" },
        marathon: { pace: "12:32", km: "7:47" },
        threshold: { pace: "10:57", km: "6:49" },
        interval: { pace: "9:31", km: "5:55" }
      },
      trackIntervals: {
        threshold: { "1200m": "8:10", "800m": "5:27", "600m": "4:05" },
        interval: { "400m": "2:22", "300m": "1:46", "200m": "1:11" }
      }
    },
    {
      goalTime: "5:15:00",
      paces: {
        easy: { min: "11:58", max: "13:06", km: "7:26-8:08" },
        marathon: { pace: "11:58", km: "7:26" },
        threshold: { pace: "10:34", km: "6:34" },
        interval: { pace: "9:16", km: "5:45" }
      },
      trackIntervals: {
        threshold: { "1200m": "7:53", "800m": "5:15", "600m": "3:57" },
        interval: { "400m": "2:18", "300m": "1:44", "200m": "1:09" }
      }
    },
    {
      goalTime: "5:00:00",
      paces: {
        easy: { min: "11:38", max: "12:45", km: "7:14-7:55" },
        marathon: { pace: "11:25", km: "7:05" },
        threshold: { pace: "10:11", km: "6:20" },
        interval: { pace: "9:00", km: "5:35" }
      },
      trackIntervals: {
        threshold: { "1200m": "7:36", "800m": "5:04", "600m": "3:48" },
        interval: { "400m": "2:14", "300m": "1:41", "200m": "1:07" }
      }
    },
    {
      goalTime: "4:45:00",
      paces: {
        easy: { min: "11:18", max: "12:23", km: "7:01-7:42" },
        marathon: { pace: "10:51", km: "6:45" },
        threshold: { pace: "9:47", km: "6:05" },
        interval: { pace: "8:43", km: "5:25" }
      },
      trackIntervals: {
        threshold: { "1200m": "7:18", "800m": "4:52", "600m": "3:39" },
        interval: { "400m": "2:10", "300m": "1:38", "200m": "1:05" }
      }
    },
    {
      goalTime: "4:30:00",
      paces: {
        easy: { min: "10:57", max: "12:00", km: "6:48-7:27" },
        marathon: { pace: "10:17", km: "6:24" },
        threshold: { pace: "9:22", km: "5:49" },
        interval: { pace: "8:26", km: "5:15" }
      },
      trackIntervals: {
        threshold: { "1200m": "6:59", "800m": "4:40", "600m": "3:30" },
        interval: { "400m": "2:06", "300m": "1:34", "200m": "1:03" }
      }
    },
    {
      goalTime: "4:15:00",
      paces: {
        easy: { min: "10:34", max: "11:36", km: "6:34-7:13" },
        marathon: { pace: "9:43", km: "6:02" },
        threshold: { pace: "8:57", km: "5:34" },
        interval: { pace: "8:08", km: "5:03" }
      },
      trackIntervals: {
        threshold: { "1200m": "6:41", "800m": "4:27", "600m": "3:20" },
        interval: { "400m": "2:01", "300m": "1:31", "200m": "1:01" }
      }
    },
    {
      goalTime: "4:00:00",
      paces: {
        easy: { min: "10:11", max: "11:11", km: "6:20-6:57" },
        marathon: { pace: "9:09", km: "5:41" },
        threshold: { pace: "8:32", km: "5:18" },
        interval: { pace: "7:50", km: "4:52" }
      },
      trackIntervals: {
        threshold: { "1200m": "6:22", "800m": "4:14", "600m": "3:11" },
        interval: { "400m": "1:57", "300m": "1:28", "200m": "0:58" }
      }
    },
    {
      goalTime: "3:45:00",
      paces: {
        easy: { min: "9:39", max: "10:36", km: "6:00-6:35" },
        marathon: { pace: "8:35", km: "5:20" },
        threshold: { pace: "8:02", km: "5:00" },
        interval: { pace: "7:24", km: "4:36" }
      },
      trackIntervals: {
        threshold: { "1200m": "6:00", "800m": "4:00", "600m": "3:00" },
        interval: { "400m": "1:50", "300m": "1:23", "200m": "0:55" }
      }
    },
    {
      goalTime: "3:30:00",
      paces: {
        easy: { min: "9:02", max: "9:56", km: "5:37-6:11" },
        marathon: { pace: "8:01", km: "4:59" },
        threshold: { pace: "7:31", km: "4:40" },
        interval: { pace: "6:55", km: "4:18" }
      },
      trackIntervals: {
        threshold: { "1200m": "5:36", "800m": "3:44", "600m": "2:48" },
        interval: { "400m": "1:43", "300m": "1:17", "200m": "0:52" }
      }
    },
    {
      goalTime: "3:15:00",
      paces: {
        easy: { min: "8:25", max: "9:16", km: "5:14-5:46" },
        marathon: { pace: "7:26", km: "4:37" },
        threshold: { pace: "7:00", km: "4:21" },
        interval: { pace: "6:26", km: "4:00" }
      },
      trackIntervals: {
        threshold: { "1200m": "5:13", "800m": "3:29", "600m": "2:37" },
        interval: { "400m": "1:36", "300m": "1:12", "200m": "0:48" }
      }
    },
    {
      goalTime: "3:00:00",
      paces: {
        easy: { min: "7:48", max: "8:36", km: "4:51-5:21" },
        marathon: { pace: "6:52", km: "4:16" },
        threshold: { pace: "6:29", km: "4:02" },
        interval: { pace: "5:58", km: "3:42" }
      },
      trackIntervals: {
        threshold: { "1200m": "4:50", "800m": "3:13", "600m": "2:25" },
        interval: { "400m": "1:29", "300m": "1:07", "200m": "0:44" }
      }
    },
    {
      goalTime: "2:45:00",
      paces: {
        easy: { min: "7:11", max: "7:55", km: "4:28-4:55" },
        marathon: { pace: "6:18", km: "3:55" },
        threshold: { pace: "5:58", km: "3:42" },
        interval: { pace: "5:29", km: "3:24" }
      },
      trackIntervals: {
        threshold: { "1200m": "4:27", "800m": "2:58", "600m": "2:13" },
        interval: { "400m": "1:22", "300m": "1:01", "200m": "0:41" }
      }
    },
    {
      goalTime: "2:30:00",
      paces: {
        easy: { min: "6:33", max: "7:14", km: "4:04-4:30" },
        marathon: { pace: "5:43", km: "3:33" },
        threshold: { pace: "5:27", km: "3:23" },
        interval: { pace: "5:01", km: "3:07" }
      },
      trackIntervals: {
        threshold: { "1200m": "4:04", "800m": "2:42", "600m": "2:02" },
        interval: { "400m": "1:15", "300m": "0:56", "200m": "0:37" }
      }
    },
    {
      goalTime: "2:15:00",
      paces: {
        easy: { min: "5:56", max: "6:33", km: "3:41-4:04" },
        marathon: { pace: "5:09", km: "3:12" },
        threshold: { pace: "4:56", km: "3:04" },
        interval: { pace: "4:32", km: "2:49" }
      },
      trackIntervals: {
        threshold: { "1200m": "3:40", "800m": "2:27", "600m": "1:50" },
        interval: { "400m": "1:08", "300m": "0:51", "200m": "0:34" }
      }
    },
    {
      goalTime: "2:00:00",
      paces: {
        easy: { min: "5:18", max: "5:51", km: "3:18-3:38" },
        marathon: { pace: "4:34", km: "2:50" },
        threshold: { pace: "4:25", km: "2:44" },
        interval: { pace: "4:04", km: "2:32" }
      },
      trackIntervals: {
        threshold: { "1200m": "3:17", "800m": "2:12", "600m": "1:39" },
        interval: { "400m": "1:01", "300m": "0:45", "200m": "0:30" }
      }
    }
  ],

  "10K": [
    {
      goalTime: "80:00",
      paces: {
        easy: { min: "13:14", max: "14:28", km: "8:13-8:59" },
        marathon: { pace: "14:04", km: "8:44" },
        threshold: { pace: "11:58", km: "7:26" },
        interval: { pace: "10:11", km: "6:20" }
      },
      trackIntervals: {
        threshold: { "1200m": "8:56", "800m": "5:58", "600m": "4:28" },
        interval: { "400m": "2:32", "300m": "1:54", "200m": "1:16" }
      }
    },
    {
      goalTime: "70:00",
      paces: {
        easy: { min: "12:18", max: "13:27", km: "7:38-8:21" },
        marathon: { pace: "12:35", km: "7:49" },
        threshold: { pace: "10:59", km: "6:49" },
        interval: { pace: "9:33", km: "5:56" }
      },
      trackIntervals: {
        threshold: { "1200m": "8:12", "800m": "5:28", "600m": "4:06" },
        interval: { "400m": "2:23", "300m": "1:47", "200m": "1:11" }
      }
    },
    {
      goalTime: "60:00",
      paces: {
        easy: { min: "11:11", max: "12:15", km: "6:57-7:37" },
        marathon: { pace: "10:58", km: "6:49" },
        threshold: { pace: "9:48", km: "6:05" },
        interval: { pace: "8:39", km: "5:22" }
      },
      trackIntervals: {
        threshold: { "1200m": "7:19", "800m": "4:53", "600m": "3:40" },
        interval: { "400m": "2:09", "300m": "1:37", "200m": "1:04" }
      }
    },
    {
      goalTime: "55:00",
      paces: {
        easy: { min: "10:32", max: "11:32", km: "6:33-7:10" },
        marathon: { pace: "10:15", km: "6:22" },
        threshold: { pace: "9:09", km: "5:41" },
        interval: { pace: "8:08", km: "5:03" }
      },
      trackIntervals: {
        threshold: { "1200m": "6:50", "800m": "4:33", "600m": "3:25" },
        interval: { "400m": "2:01", "300m": "1:31", "200m": "1:01" }
      }
    },
    {
      goalTime: "50:00",
      paces: {
        easy: { min: "9:51", max: "10:48", km: "6:07-6:43" },
        marathon: { pace: "9:29", km: "5:53" },
        threshold: { pace: "8:29", km: "5:16" },
        interval: { pace: "7:35", km: "4:43" }
      },
      trackIntervals: {
        threshold: { "1200m": "6:20", "800m": "4:13", "600m": "3:10" },
        interval: { "400m": "1:53", "300m": "1:25", "200m": "0:57" }
      }
    },
    {
      goalTime: "45:00",
      paces: {
        easy: { min: "9:07", max: "10:00", km: "5:40-6:13" },
        marathon: { pace: "8:41", km: "5:23" },
        threshold: { pace: "7:46", km: "4:50" },
        interval: { pace: "6:58", km: "4:20" }
      },
      trackIntervals: {
        threshold: { "1200m": "5:48", "800m": "3:52", "600m": "2:54" },
        interval: { "400m": "1:44", "300m": "1:18", "200m": "0:52" }
      }
    },
    {
      goalTime: "42:00",
      paces: {
        easy: { min: "8:42", max: "9:32", km: "5:24-5:56" },
        marathon: { pace: "8:15", km: "5:08" },
        threshold: { pace: "7:23", km: "4:35" },
        interval: { pace: "6:38", km: "4:07" }
      },
      trackIntervals: {
        threshold: { "1200m": "5:31", "800m": "3:40", "600m": "2:45" },
        interval: { "400m": "1:39", "300m": "1:14", "200m": "0:50" }
      }
    },
    {
      goalTime: "38:00",
      paces: {
        easy: { min: "8:07", max: "8:56", km: "5:02-5:33" },
        marathon: { pace: "7:36", km: "4:43" },
        threshold: { pace: "6:51", km: "4:15" },
        interval: { pace: "6:10", km: "3:50" }
      },
      trackIntervals: {
        threshold: { "1200m": "5:07", "800m": "3:24", "600m": "2:33" },
        interval: { "400m": "1:32", "300m": "1:09", "200m": "0:46" }
      }
    },
    {
      goalTime: "32:00",
      paces: {
        easy: { min: "7:13", max: "7:56", km: "4:29-4:56" },
        marathon: { pace: "6:40", km: "4:09" },
        threshold: { pace: "6:03", km: "3:45" },
        interval: { pace: "5:28", km: "3:23" }
      },
      trackIntervals: {
        threshold: { "1200m": "4:31", "800m": "3:01", "600m": "2:16" },
        interval: { "400m": "1:22", "300m": "1:01", "200m": "0:41" }
      }
    }
  ],

  halfMarathon: [
    {
      goalTime: "3:00:00",
      paces: {
        easy: { min: "12:59", max: "14:11", km: "8:04-8:49" },
        marathon: { pace: "13:51", km: "8:36" },
        threshold: { pace: "11:50", km: "7:21" },
        interval: { pace: "10:05", km: "6:16" }
      },
      trackIntervals: {
        threshold: { "1200m": "8:50", "800m": "5:53", "600m": "4:25" },
        interval: { "400m": "2:30", "300m": "1:53", "200m": "1:15" }
      }
    },
    {
      goalTime: "2:45:00",
      paces: {
        easy: { min: "12:25", max: "13:34", km: "7:43-8:26" },
        marathon: { pace: "12:46", km: "7:56" },
        threshold: { pace: "11:07", km: "6:55" },
        interval: { pace: "9:37", km: "5:59" }
      },
      trackIntervals: {
        threshold: { "1200m": "8:17", "800m": "5:32", "600m": "4:09" },
        interval: { "400m": "2:23", "300m": "1:48", "200m": "1:12" }
      }
    },
    {
      goalTime: "2:30:00",
      paces: {
        easy: { min: "11:48", max: "12:55", km: "7:20-8:02" },
        marathon: { pace: "11:40", km: "7:15" },
        threshold: { pace: "10:22", km: "6:26" },
        interval: { pace: "9:07", km: "5:40" }
      },
      trackIntervals: {
        threshold: { "1200m": "7:44", "800m": "5:09", "600m": "3:52" },
        interval: { "400m": "2:16", "300m": "1:42", "200m": "1:08" }
      }
    },
    {
      goalTime: "2:15:00",
      paces: {
        easy: { min: "11:07", max: "12:12", km: "6:55-7:35" },
        marathon: { pace: "10:34", km: "6:34" },
        threshold: { pace: "9:35", km: "5:57" },
        interval: { pace: "8:35", km: "5:20" }
      },
      trackIntervals: {
        threshold: { "1200m": "7:08", "800m": "4:46", "600m": "3:34" },
        interval: { "400m": "2:08", "300m": "1:36", "200m": "1:04" }
      }
    },
    {
      goalTime: "2:00:00",
      paces: {
        easy: { min: "10:23", max: "11:24", km: "6:27-7:05" },
        marathon: { pace: "9:27", km: "5:52" },
        threshold: { pace: "8:45", km: "5:26" },
        interval: { pace: "7:59", km: "4:58" }
      },
      trackIntervals: {
        threshold: { "1200m": "6:32", "800m": "4:21", "600m": "3:16" },
        interval: { "400m": "1:59", "300m": "1:29", "200m": "1:00" }
      }
    },
    {
      goalTime: "1:45:00",
      paces: {
        easy: { min: "9:21", max: "10:17", km: "5:49-6:23" },
        marathon: { pace: "8:19", km: "5:10" },
        threshold: { pace: "7:48", km: "4:51" },
        interval: { pace: "7:10", km: "4:27" }
      },
      trackIntervals: {
        threshold: { "1200m": "5:49", "800m": "3:52", "600m": "2:54" },
        interval: { "400m": "1:47", "300m": "1:20", "200m": "0:53" }
      }
    },
    {
      goalTime: "1:30:00",
      paces: {
        easy: { min: "8:07", max: "8:56", km: "5:02-5:33" },
        marathon: { pace: "7:09", km: "4:27" },
        threshold: { pace: "6:45", km: "4:11" },
        interval: { pace: "6:12", km: "3:51" }
      },
      trackIntervals: {
        threshold: { "1200m": "5:02", "800m": "3:21", "600m": "2:31" },
        interval: { "400m": "1:33", "300m": "1:09", "200m": "0:46" }
      }
    },
    {
      goalTime: "1:15:00",
      paces: {
        easy: { min: "6:51", max: "7:33", km: "4:15-4:42" },
        marathon: { pace: "5:59", km: "3:43" },
        threshold: { pace: "5:41", km: "3:32" },
        interval: { pace: "5:14", km: "3:15" }
      },
      trackIntervals: {
        threshold: { "1200m": "4:14", "800m": "2:49", "600m": "2:07" },
        interval: { "400m": "1:18", "300m": "0:58", "200m": "0:39" }
      }
    },
    {
      goalTime: "1:00:00",
      paces: {
        easy: { min: "5:33", max: "6:07", km: "3:27-3:48" },
        marathon: { pace: "4:47", km: "2:59" },
        threshold: { pace: "4:36", km: "2:52" },
        interval: { pace: "4:15", km: "2:38" }
      },
      trackIntervals: {
        threshold: { "1200m": "3:26", "800m": "2:17", "600m": "1:43" },
        interval: { "400m": "1:03", "300m": "0:47", "200m": "0:32" }
      }
    }
  ]
};

/**
 * Helper function to convert time string (MM:SS or M:SS) to total seconds
 */
export function paceToSeconds(paceString) {
  const parts = paceString.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

/**
 * Helper function to convert seconds to pace string (MM:SS)
 */
export function secondsToPace(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Find pace data for a specific goal time
 * If exact match not found, returns null (implement interpolation separately)
 */
export function findPaceData(distance, goalTime) {
  const data = trainingPaceData[distance];
  if (!data) return null;

  return data.find(entry => entry.goalTime === goalTime) || null;
}

/**
 * Get all available goal times for a distance
 */
export function getAvailableGoalTimes(distance) {
  const data = trainingPaceData[distance];
  if (!data) return [];

  return data.map(entry => entry.goalTime);
}

// Export the data as default as well for convenience
export default trainingPaceData;
