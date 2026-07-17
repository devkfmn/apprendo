import { Button } from '@/components/ui/button'
import { ADMIN_PAGE_SIZE, clampPage, pageCount } from '@/features/admin/listUtils'

export function AdminPagination({
  page,
  total,
  pageSize = ADMIN_PAGE_SIZE,
  onPageChange,
}: {
  page: number
  total: number
  pageSize?: number
  onPageChange: (page: number) => void
}) {
  if (total <= pageSize) {
    return (
      <p className="text-sm text-ink-muted">
        {total === 0 ? 'Keine Einträge' : `${total} Einträge`}
      </p>
    )
  }

  const current = clampPage(page, total, pageSize)
  const pages = pageCount(total, pageSize)
  const from = (current - 1) * pageSize + 1
  const to = Math.min(current * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-muted">
        {from}–{to} von {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          Zurück
        </Button>
        <span className="text-sm text-ink-muted">
          Seite {current}/{pages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={current >= pages}
          onClick={() => onPageChange(current + 1)}
        >
          Weiter
        </Button>
      </div>
    </div>
  )
}
