import { cn } from '@/lib/utils'
import type { RoadmapItemView, UserRole } from '@/types/domain'

type ProgressActionsProps = {
  view: RoadmapItemView
  role: UserRole
  actorId: string
  disabled?: boolean
  onChange: (
    itemType: 'school' | 'company',
    itemId: string,
    patch: { treated: boolean; treatedBy?: string | null },
  ) => Promise<void>
}

export function ProgressActions({
  view,
  role,
  actorId,
  disabled,
  onChange,
}: ProgressActionsProps) {
  const itemId = view.item.id
  const { itemType } = view
  const treated = view.progress?.treated ?? false
  const readOnly = Boolean(disabled) || role === 'observer'
  const inputId = `${itemType}-${itemId}-treated`

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition',
        treated
          ? 'border-brand/30 bg-brand-soft text-brand'
          : 'border-line bg-canvas text-ink-muted',
        readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-brand/40',
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={treated}
        disabled={readOnly}
        onChange={(e) =>
          void onChange(itemType, itemId, {
            treated: e.target.checked,
            treatedBy: e.target.checked ? actorId : null,
          })
        }
        className="size-3.5 rounded border border-line"
      />
      <span>Behandelt</span>
    </label>
  )
}
