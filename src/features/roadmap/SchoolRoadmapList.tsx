import { ProgressActions } from '@/features/roadmap/ProgressActions'
import type { RoadmapContext } from '@/features/roadmap/useRoadmap'
import { cn } from '@/lib/utils'
import type { RoadmapItemView, SchoolRoadmapItem } from '@/types/domain'

type SchoolRoadmapListProps = {
  items: RoadmapItemView[]
  roadmap: RoadmapContext
}

function usefulDescription(item: SchoolRoadmapItem): string | null {
  const description = item.description?.trim()
  if (!description) return null
  if (description === item.title) return null
  if (description === item.code) return null
  if (description.toLowerCase() === `modul ${item.code}`.toLowerCase()) return null
  return description
}

function SchoolItem({ view, roadmap }: { view: RoadmapItemView; roadmap: RoadmapContext }) {
  const item = view.item as SchoolRoadmapItem
  const treated = view.progress?.treated ?? false
  const description = usefulDescription(item)

  return (
    <li
      className={cn(
        'rounded-lg border border-line px-3 py-3 transition',
        treated ? 'bg-brand-soft/40' : 'bg-panel',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-ink">{item.title}</p>
          <p className="mt-1 text-xs text-ink-muted">
            <span className="font-mono">{item.code}</span>
            {item.areaTitle ? <span> · {item.areaTitle}</span> : null}
          </p>
          {description ? (
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{description}</p>
          ) : null}
        </div>
        <ProgressActions
          view={view}
          role={roadmap.role}
          actorId={roadmap.actorId}
          onChange={roadmap.setProgressField}
        />
      </div>
    </li>
  )
}

export function SchoolRoadmapList({ items, roadmap }: SchoolRoadmapListProps) {
  if (items.length === 0) {
    return (
      <p className="py-2 text-sm text-ink-muted">
        Keine festen schulischen Fachmodule in diesem Quartal (BiVo 2021).
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((view) => (
        <SchoolItem key={view.item.id} view={view} roadmap={roadmap} />
      ))}
    </ul>
  )
}
