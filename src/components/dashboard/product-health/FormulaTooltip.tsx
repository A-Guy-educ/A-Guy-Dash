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
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary Hover/focus tooltip anchor for a KPI-formula popover
 */

'use client'

import { useId, useState } from 'react'

import { cn } from '@/utils/ui'

interface FormulaTooltipProps {
  children: React.ReactNode
  content: string
  className?: string
}

export function FormulaTooltip({ children, content, className }: FormulaTooltipProps) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-2"
      >
        {children}
      </span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1 w-max max-w-xs whitespace-pre-line rounded-md bg-foreground px-3 py-2 text-body-xs font-normal normal-case tracking-normal text-background shadow-lg"
        >
          {content}
        </span>
      )}
    </span>
  )
}
