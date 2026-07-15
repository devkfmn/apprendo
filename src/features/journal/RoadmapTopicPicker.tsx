import type { RoadmapItemView } from '@/types/domain'

type RoadmapTopicPickerProps = {
  topics: RoadmapItemView[]
  value: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function RoadmapTopicPicker({
  topics,
  value,
  onChange,
  disabled = false,
}: RoadmapTopicPickerProps) {
  if (topics.length === 0) {
    return <p className="text-sm text-ink-muted">Für die aktiven Quartale sind keine Roadmap-Themen vorhanden.</p>
  }

  return (
    <div className="space-y-2">
      {topics.map(({ item, itemType }) => {
        const selected = value.includes(item.id)
        return (
          <label key={`${itemType}_${item.id}`} className="flex cursor-pointer gap-3 rounded-md border border-line p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-brand"
              checked={selected}
              disabled={disabled}
              onChange={(event) => {
                onChange(
                  event.target.checked
                    ? [...value, item.id]
                    : value.filter((id) => id !== item.id),
                )
              }}
            />
            <span>
              <span className="font-medium">{item.title}</span>
              <span className="ml-2 text-xs text-ink-muted">
                {itemType === 'school' ? 'Schule' : 'Betrieb'} · Q{item.imsQuarter}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
