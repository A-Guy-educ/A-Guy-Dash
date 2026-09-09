/**
 * Response contract for the admin dashboard metrics endpoint.
 *
 * Mirrors the shape of `A-Guy-Admin/src/app/api/admin/dashboard-metrics` so
 * the ported widgets (see PR-B2) render against the same field names. Any
 * change here breaks the widgets — coordinate before touching.
 */

export type Period = 'day' | 'week' | 'month' | 'year'

export const VALID_PERIODS: readonly Period[] = ['day', 'week', 'month', 'year']

/**
 * Signup attribution counts for the selected period. Buckets sum to the same
 * total as registeredThisMonth / registeredThisWeek / etc. — both anchor on
 * user.createdAt. Only Google OAuth signups carry attribution today; users
 * without a `signupSource` value (pre-feature legacy) land in `unknown`.
 */
export interface SignupSourceBreakdown {
  google: number
  guykoren: number
  direct: number
  other: number
  unknown: number
}

export interface UserMetrics {
  activeUsersToday: number
  activeUsersYesterday: number
  activeUsersLastWeek: number
  activeUsersLastMonth: number
  registeredToday: number
  registeredYesterday: number
  registeredThisWeek: number
  registeredLastWeek: number
  registeredThisMonth: number
  registeredLastMonth: number
  totalUsers: number
  totalGuestSessions: number
  guestSessionsToday: number
  guestSessionsLastWeek: number
  guestSessionsLastMonth: number
  guestToRegisteredCount: number
  guestToRegisteredPercentage: number
  returnedOnceCount: number
  returnedOncePercentage: number
  returnedMultipleCount: number
  returnedMultiplePercentage: number
  returningUsers: number
  returningUsersTotal: number
  signupSourceBreakdown: SignupSourceBreakdown
}

/** One month bucket for the year-view signups chart. `month` is "YYYY-MM". */
export interface MonthlySignup {
  month: string
  count: number
}

export interface CourseEnrollment {
  courseTitle: string
  count: number
}

/**
 * One row for "active learners per course" — sourced from
 * `users.currentCourse` (the last course the user picked or opened a
 * lesson in), not the `enrollments` collection which counts purchases.
 * A user can own multiple courses but only be on one at a time.
 */
export interface UsersPerCourse {
  courseTitle: string
  count: number
}

/**
 * One row for the "top lessons opened" widget. Sorted desc by openCount.
 * `avgDurationSeconds` is null when we have opens tracked but no ended
 * sessions yet (early after PR 2 ships, or lessons with only bail-outs).
 */
export interface TopLesson {
  lessonId: string
  lessonTitle: string
  openCount: number
  avgDurationSeconds: number | null
}

/**
 * Session-time roll-up by lesson type (learning / practice / exam). Values
 * are averages in seconds; null when no completed sessions of that type.
 */
export interface SessionTimeByLessonType {
  learning: number | null
  practice: number | null
  exam: number | null
}

export interface EngagementMetrics {
  avgTimeSpentMinutes: number
  medianTimeSpentMinutes: number
  stdDevTimeSpentMinutes: number
  courseEnrollments: CourseEnrollment[]
  usersPerCourse: UsersPerCourse[]
  topLessons: TopLesson[]
  sessionTimeByLessonType: SessionTimeByLessonType
  featureUsage: {
    questionsAsked: number
    conversationsStarted: number
    lessonsCompleted: number
    exercisesAttempted: number
    exercisesCompleted: number
  }
  lessonTypeUsage: {
    learning: number
    practice: number
    exam: number
  }
}

export interface ContentCounts {
  courses: number
  lessons: number
  exercises: number
  formulaSheets: number
  prompts: number
}

export interface CurrencyRevenue {
  [currencyCode: string]: number
}

export interface TopProduct {
  productName: string
  agorot: number
}

export interface RevenueMetrics {
  totalRevenueAgorot: CurrencyRevenue
  refundedAgorot: number
  failedAgorot: number
  transactionCount: number
  successRate: number
  topProducts: TopProduct[]
}

export interface TopLessonByTokens {
  lessonId: string
  lessonTitle: string
  totalTokens: number
  callCount: number
}

export interface TopUserByTokens {
  userId: string
  label: string
  totalTokens: number
}

export interface TokenMetrics {
  totalTokensToday: number
  totalTokensThisMonth: number
  totalTokensThisYear: number
  avgTokensPerUserThisMonth: number
  avgTokensPerLessonThisMonth: number
  topLessons: TopLessonByTokens[]
  topUsers: TopUserByTokens[]
}

/**
 * Product Health tab (Tab 1) — Spec v0.2. Five rate KPIs with paired trend
 * lines. Every metric surfaces `numerator` + `denominator` so weekly/monthly
 * buckets can be recomputed rather than averaged (Section 4 of the spec).
 *
 * The whole block is optional: Web owns the aggregation and may ship the
 * field after Dash. When the field is absent the UI renders an "awaiting
 * upstream" state instead of failing the entire response validation.
 */
export const PRODUCT_HEALTH_METRIC_KEYS = [
  'activeUserRate',
  'engagementRate',
  'retentionRate',
  'inactiveChurnRate',
  'lessonCompletionRate',
] as const

export type ProductHealthMetricKey = (typeof PRODUCT_HEALTH_METRIC_KEYS)[number]

export type ProductHealthDateRange = '7d' | '30d' | '90d' | 'custom'
export type ProductHealthGranularity = 'daily' | 'weekly' | 'monthly'

export interface ProductHealthTrendBucket {
  bucketStart: string
  bucketEnd: string
  value: number | null
  numerator: number | null
  denominator: number | null
}

export interface ProductHealthMetric {
  value: number | null
  numerator: number | null
  denominator: number | null
  comparisonValue: number | null
  deltaPp: number | null
  trend: ProductHealthTrendBucket[]
}

export interface ProductHealthCourseOption {
  id: string
  title: string
}

export interface ProductHealth {
  periodStart: string
  periodEnd: string
  courseId: string | null
  granularity: ProductHealthGranularity
  metrics: Record<ProductHealthMetricKey, ProductHealthMetric>
  availableCourses: ProductHealthCourseOption[]
}

export interface DashboardMetricsResponse {
  period: Period
  userMetrics: UserMetrics
  monthlySignups: MonthlySignup[]
  contentCounts: ContentCounts
  engagement: EngagementMetrics
  revenueMetrics: RevenueMetrics
  tokenMetrics: TokenMetrics
  productHealth?: ProductHealth
}

export { dashboardMetricsSchema } from './dashboard-schema'
