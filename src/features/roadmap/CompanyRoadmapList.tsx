import { useState } from 'react'
import { Archive, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CompanyItemForm } from '@/features/roadmap/CompanyItemForm'
import { ProgressActions } from '@/features/roadmap/ProgressActions'
import type { RoadmapContext } from '@/features/roadmap/useRoadmap'
import { cn } from '@/lib/utils'
import type { CompanyRoadmapItem, ImsQuarter, RoadmapItemView } from '@/types/domain'

type CompanyRoadmapListProps = {
  items: RoadmapItemView[]
  imsQuarter: ImsQuarter
  roadmap: RoadmapContext
  canManage?: boolean
}

function CompanyItem({
  view,
  roadmap,
  canManage,
  imsQuarter,
}: {
  view: RoadmapItemView
  roadmap: RoadmapContext
  canManage?: boolean
  imsQuarter: ImsQuarter
}) {
  const item = view.item as CompanyRoadmapItem
  const [editing, setEditing] = useState(false)
  const treated = view.progress?.treated ?? false
  const description = item.description?.trim() || null

  return (
    <>
      <li
        className={cn(
          'rounded-lg border border-line px-3 py-3 transition',
          treated ? 'bg-brand-soft/40' : 'bg-panel',
          item.status === 'archived' && 'opacity-70',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {item.status === 'archived' ? (
              <Badge variant="secondary" className="mb-1.5 text-xs">
                Archiviert
              </Badge>
            ) : null}
            <p className="text-sm font-medium leading-snug text-ink">{item.title}</p>
            <p className="mt-1 text-xs text-ink-muted">{description ?? 'Betriebsthema'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {canManage && item.status === 'active' ? (
              <div className="inline-flex h-9 items-center rounded-md border border-line bg-canvas px-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Bearbeiten"
                  title="Bearbeiten"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="size-5 shrink-0" strokeWidth={2.25} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-danger"
                  aria-label="Archivieren"
                  title="Archivieren"
                  onClick={() => void roadmap.removeCompanyItem(item.id)}
                >
                  <Archive className="size-5 shrink-0" strokeWidth={2.25} />
                </Button>
              </div>
            ) : null}
            <ProgressActions
              view={view}
              role={roadmap.role}
              actorId={roadmap.actorId}
              onChange={roadmap.setProgressField}
            />
          </div>
        </div>
      </li>
      {editing ? (
        <CompanyItemForm
          open={editing}
          onOpenChange={setEditing}
          imsQuarter={imsQuarter}
          item={item}
          onSubmit={async (data) => {
            await roadmap.editCompanyItem(item.id, data)
            setEditing(false)
          }}
        />
      ) : null}
    </>
  )
}

export function CompanyRoadmapList({
  items,
  imsQuarter,
  roadmap,
  canManage,
}: CompanyRoadmapListProps) {
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="py-2 text-sm text-ink-muted">
          Keine betrieblichen Themen in diesem Quartal.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((view) => (
            <CompanyItem
              key={view.item.id}
              view={view}
              roadmap={roadmap}
              canManage={canManage}
              imsQuarter={imsQuarter}
            />
          ))}
        </ul>
      )}

      {canManage ? (
        <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
          Betriebsthema hinzufügen
        </Button>
      ) : null}

      {creating ? (
        <CompanyItemForm
          open={creating}
          onOpenChange={setCreating}
          imsQuarter={imsQuarter}
          onSubmit={async (data) => {
            await roadmap.addCompanyItem({
              imsQuarter,
              title: data.title,
              description: data.description,
              sortOrder: roadmap.nextSortOrderForQuarter(imsQuarter),
            })
            setCreating(false)
          }}
        />
      ) : null}
    </div>
  )
}
