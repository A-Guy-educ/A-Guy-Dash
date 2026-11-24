/**
 * Small hover/focus tooltip used to surface the formula behind a KPI card.
 * Spec v0.4 §C requires "hovering the KPI name must display a tooltip
 * containing the calculation formula" with both a plain-language description
 * and the symbolic formula.
 *
 * Kept minimal and dependency-free: no floating-ui / popover primitive is
 * warranted for a static below-the-anchor bubble with fixed width. The
 * anchor is announced via `aria-describedby` when the tooltip is open so
 * assistive tech gets the same content that sighted users hover for.
 *
 * The bubble is portalled to `document.body` with fixed positioning, so an
 * ancestor with `overflow: hidden` / `auto` (a `truncate` label, a
 * horizontally scrolling table) can't clip it into invisibility. It closes
 * on scroll rather than tracking the anchor.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary Hover/focus tooltip anchor for a KPI-formula popover
 */

'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/utils/ui'

interface FormulaTooltipProps {
  children: React.ReactNode
  content: string
  className?: string
  /** Bare block anchor (no dotted underline) — e.g. a chart segment. */
  plain?: boolean
}

// Matches `max-w-xs` (20rem) plus a small viewport margin.
const BUBBLE_MAX_WIDTH = 320
const VIEWPORT_MARGIN = 8

export function FormulaTooltip({ children, content, className, plain }: FormulaTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const id = useId()

  const open = () => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    const maxLeft = window.innerWidth - BUBBLE_MAX_WIDTH - VIEWPORT_MARGIN
    setPosition({
      top: rect.bottom + 4,
      left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, maxLeft)),
    })
  }
  const close = () => setPosition(null)

  useEffect(() => {
    if (!position) return
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [position])

  return (
    <span
      className={cn('inline-block', className)}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      <span
        ref={anchorRef}
        tabIndex={0}
        aria-describedby={position ? id : undefined}
        className={
          plain
            ? 'block h-full w-full cursor-help'
            : 'cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-2'
        }
      >
        {children}
      </span>
      {position &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 w-max max-w-xs whitespace-pre-line rounded-md bg-foreground px-3 py-2 text-body-xs font-normal normal-case tracking-normal text-start text-background shadow-lg"
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  )
}
