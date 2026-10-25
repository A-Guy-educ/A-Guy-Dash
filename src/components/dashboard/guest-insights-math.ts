import type { OnboardingFunnel } from '@/types/dashboard'

/** Percentage of `part` over `whole`, or null when `whole` is 0. */
export function percentOf(part: number, whole: number): number | null {
  return whole > 0 ? (part / whole) * 100 : null
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`
}

/**
 * Headline drop-off stats. Only compares steps that every path goes through
 * (prompt → Google → completed); persona/grade are skipped by lesson and
 * course landings so step-to-step deltas there would be meaningless.
 * Clamped at 0 in case cohort edges make `completed` briefly exceed a step.
 */
export function funnelDropOff(funnel: OnboardingFunnel) {
  return {
    reachedSignupButLeft: Math.max(0, funnel.signupPromptShown - funnel.completed),
    clickedGoogleButLeft: Math.max(0, funnel.googleClicked - funnel.completed),
  }
}
