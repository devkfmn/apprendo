import { Badge } from '@/components/ui/badge'
import { ProgressActions } from '@/features/roadmap/ProgressActions'
import type { RoadmapContext } from '@/features/roadmap/useRoadmap'
import type { RoadmapItemView, SchoolRoadmapItem } from '@/types/domain'

type SchoolRoadmapListProps = {
  items: RoadmapItemView[]
  roadmap: RoadmapContext
}

function SchoolItem({ view, roadmap }: { view: RoadmapItemView; roadmap: RoadmapContext }) {
  const item = view.item as SchoolRoadmapItem

  return (
    <li className="border-b border-line py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-ink-muted">{item.code}</span>
          <Badge className="text-xs">
            {item.areaTitle}
          </Badge>
        </div>
        <p className="mt-1 text-sm font-medium">{item.title}</p>
        {item.description ? (
          <p className="mt-1 text-xs text-ink-muted">{item.description}</p>
        ) : null}
      </div>
      <ProgressActions
        view={view}
        role={roadmap.role}
        actorId={roadmap.actorId}
        onChange={roadmap.setProgressField}
      />
    </li>
  )
}

export function SchoolRoadmapList({ items, roadmap }: SchoolRoadmapListProps) {
  if (items.length === 0) {
    return (
      <p className="py-4 text-sm text-ink-muted">
        Keine festen schulischen Fachmodule in diesem Quartal (BiVo 2021).
      </p>
    )
  }

  return (
    <ul>
      {items.map((view) => (
        <SchoolItem key={view.item.id} view={view} roadmap={roadmap} />
      ))}
    </ul>
  )
}
