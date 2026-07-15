import { useState } from 'react'
import { Archive, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CompanyItemForm } from '@/features/roadmap/CompanyItemForm'
import { ProgressActions } from '@/features/roadmap/ProgressActions'
import type { RoadmapContext } from '@/features/roadmap/useRoadmap'
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
  isFirst,
  isLast,
}: {
  view: RoadmapItemView
  roadmap: RoadmapContext
  canManage?: boolean
  imsQuarter: ImsQuarter
  isFirst: boolean
  isLast: boolean
}) {
  const item = view.item as CompanyRoadmapItem
  const [editing, setEditing] = useState(false)

  return (
    <>
      <li className="border-b border-line py-3 last:border-b-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {item.status === 'archived' ? (
              <Badge className="text-xs">
                Archiviert
              </Badge>
            ) : null}
            <p className="mt-1 text-sm font-medium">{item.title}</p>
            {item.description ? (
              <p className="mt-1 text-xs text-ink-muted">{item.description}</p>
            ) : null}
          </div>
          {canManage && item.status === 'active' ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="size-8"
                aria-label="Nach oben"
                disabled={isFirst}
                onClick={() => void roadmap.moveCompanyItem(imsQuarter, item.id, 'up')}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="size-8"
                aria-label="Nach unten"
                disabled={isLast}
                onClick={() => void roadmap.moveCompanyItem(imsQuarter, item.id, 'down')}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="size-8"
                aria-label="Bearbeiten"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 text-danger"
                aria-label="Archivieren"
                onClick={() => void roadmap.removeCompanyItem(item.id)}
              >
                <Archive className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
        <ProgressActions
          view={view}
          role={roadmap.role}
          actorId={roadmap.actorId}
          onChange={roadmap.setProgressField}
        />
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
  const activeItems = items.filter(
    (v) => (v.item as CompanyRoadmapItem).status === 'active',
  )

  return (
    <div>
      {canManage ? (
        <div className="mb-3">
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            Betriebsthema hinzufügen
          </Button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="py-4 text-sm text-ink-muted">
          Keine betrieblichen Themen in diesem Quartal.
        </p>
      ) : (
        <ul>
          {items.map((view) => {
            const companyItem = view.item as CompanyRoadmapItem
            const activeIndex = activeItems.findIndex((v) => v.item.id === view.item.id)
            const isActive = companyItem.status === 'active'
            return (
              <CompanyItem
                key={view.item.id}
                view={view}
                roadmap={roadmap}
                canManage={canManage}
                imsQuarter={imsQuarter}
                isFirst={!isActive || activeIndex <= 0}
                isLast={!isActive || activeIndex === activeItems.length - 1}
              />
            )
          })}
        </ul>
      )}

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
