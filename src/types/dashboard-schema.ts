import { z } from 'zod'

export const dashboardMetricsSchema = z.object({
  period: z.enum(['week', 'month', 'year']),
  userMetrics: z.object({
    activeUsersToday: z.number(),
    activeUsersYesterday: z.number(),
    activeUsersLastWeek: z.number(),
    activeUsersLastMonth: z.number(),
    registeredToday: z.number(),
    registeredYesterday: z.number(),
    registeredThisWeek: z.number(),
    registeredLastWeek: z.number(),
    registeredThisMonth: z.number(),
    registeredLastMonth: z.number(),
    totalUsers: z.number(),
    totalGuestSessions: z.number(),
    guestSessionsToday: z.number(),
    guestSessionsLastWeek: z.number(),
    guestSessionsLastMonth: z.number(),
    guestToRegisteredCount: z.number(),
    guestToRegisteredPercentage: z.number(),
    returnedOnceCount: z.number(),
    returnedOncePercentage: z.number(),
    returnedMultipleCount: z.number(),
    returnedMultiplePercentage: z.number(),
    returningUsers: z.number(),
    returningUsersTotal: z.number(),
    // Zeroed default so a rolling Web deploy (or an older upstream that hasn't
    // adopted PR #1180 yet) degrades the widget to an empty-state render
    // instead of 502-ing the entire dashboard via safeParse rejection.
    signupSourceBreakdown: z
      .object({
        google: z.number(),
        guykoren: z.number(),
        direct: z.number(),
        other: z.number(),
        unknown: z.number(),
      })
      .default({ google: 0, guykoren: 0, direct: 0, other: 0, unknown: 0 }),
  }),
  monthlySignups: z.array(z.object({ month: z.string(), count: z.number() })),
  contentCounts: z.object({
    courses: z.number(),
    lessons: z.number(),
    exercises: z.number(),
    formulaSheets: z.number(),
    prompts: z.number(),
  }),
  engagement: z.object({
    avgTimeSpentMinutes: z.number(),
    medianTimeSpentMinutes: z.number(),
    stdDevTimeSpentMinutes: z.number(),
    courseEnrollments: z.array(z.object({ courseTitle: z.string(), count: z.number() })),
    usersPerCourse: z.array(z.object({ courseTitle: z.string(), count: z.number() })),
    topLessons: z.array(
      z.object({
        lessonId: z.string(),
        lessonTitle: z.string(),
        openCount: z.number(),
        avgDurationSeconds: z.number().nullable(),
      }),
    ),
    sessionTimeByLessonType: z.object({
      learning: z.number().nullable(),
      practice: z.number().nullable(),
      exam: z.number().nullable(),
    }),
    featureUsage: z.object({
      questionsAsked: z.number(),
      conversationsStarted: z.number(),
      lessonsCompleted: z.number(),
      exercisesAttempted: z.number(),
      exercisesCompleted: z.number(),
    }),
    lessonTypeUsage: z.object({
      learning: z.number(),
      practice: z.number(),
      exam: z.number(),
    }),
  }),
  revenueMetrics: z.object({
    totalRevenueAgorot: z.record(z.string(), z.number()),
    refundedAgorot: z.number(),
    failedAgorot: z.number(),
    transactionCount: z.number(),
    successRate: z.number(),
    topProducts: z.array(z.object({ productName: z.string(), agorot: z.number() })),
  }),
  tokenMetrics: z.object({
    totalTokensToday: z.number(),
    totalTokensThisMonth: z.number(),
    totalTokensThisYear: z.number(),
    avgTokensPerUserThisMonth: z.number(),
    avgTokensPerLessonThisMonth: z.number(),
    topLessons: z.array(
      z.object({
        lessonId: z.string(),
        lessonTitle: z.string(),
        totalTokens: z.number(),
        callCount: z.number(),
      }),
    ),
    topUsers: z.array(z.object({ userId: z.string(), label: z.string(), totalTokens: z.number() })),
  }),
})
