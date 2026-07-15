import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-ink-muted">{description}</p>}
      </div>
      {actions}
    </header>
  )
}
