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
    patch: {
      learnerCompleted?: boolean
      learnerCompletedBy?: string | null
      coachCompleted?: boolean
      coachCompletedBy?: string | null
      coachConfirmed?: boolean
      confirmedBy?: string | null
    },
  ) => Promise<void>
}

type CheckboxRowProps = {
  id: string
  label: string
  checked: boolean
  meta?: string | null
  disabled?: boolean
  onChange: (checked: boolean) => void
}

function formatMeta(by?: string | null, at?: string | null): string | null {
  if (!by && !at) return null
  const when = at
    ? new Date(at).toLocaleString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null
  if (by && when) return `${by.slice(0, 8)}… · ${when}`
  if (when) return when
  return by ? `${by.slice(0, 8)}…` : null
}

function CheckboxRow({ id, label, checked, meta, disabled, onChange }: CheckboxRowProps) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className={cn(
          'flex items-center gap-2 text-xs',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 rounded border border-line"
        />
        <span>{label}</span>
      </label>
      {meta ? <p className="mt-0.5 pl-6 text-[11px] text-ink-muted">{meta}</p> : null}
    </div>
  )
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
  const progress = view.progress

  const learnerCompleted = progress?.learnerCompleted ?? false
  const coachCompleted = progress?.coachCompleted ?? false
  const coachConfirmed = progress?.coachConfirmed ?? false

  const baseId = `${itemType}-${itemId}`

  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
      <CheckboxRow
        id={`${baseId}-learner`}
        label="Behandelt"
        checked={learnerCompleted}
        meta={
          learnerCompleted
            ? formatMeta(progress?.learnerCompletedBy, progress?.learnerCompletedAt)
            : null
        }
        disabled={disabled}
        onChange={(checked) =>
          void onChange(itemType, itemId, {
            learnerCompleted: checked,
            learnerCompletedBy: checked ? actorId : null,
          })
        }
      />
      {role === 'coach' ? (
        <>
          <CheckboxRow
            id={`${baseId}-coach`}
            label="Coach-behandelt"
            checked={coachCompleted}
            meta={
              coachCompleted
                ? formatMeta(progress?.coachCompletedBy, progress?.coachCompletedAt)
                : null
            }
            disabled={disabled}
            onChange={(checked) =>
              void onChange(itemType, itemId, {
                coachCompleted: checked,
                coachCompletedBy: checked ? actorId : null,
              })
            }
          />
          <CheckboxRow
            id={`${baseId}-confirmed`}
            label="Bestätigt"
            checked={coachConfirmed}
            meta={
              coachConfirmed
                ? formatMeta(progress?.confirmedBy, progress?.coachConfirmedAt)
                : null
            }
            disabled={disabled}
            onChange={(checked) =>
              void onChange(itemType, itemId, {
                coachConfirmed: checked,
                confirmedBy: checked ? actorId : null,
              })
            }
          />
        </>
      ) : null}
    </div>
  )
}
