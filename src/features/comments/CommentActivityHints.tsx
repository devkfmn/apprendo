import { Link } from 'react-router-dom'
import { Card, CardTitle } from '@/components/ui/card'
import type { UnreadCommentHint } from '@/features/comments/useCommentHints'
import { formatDateTime } from '@/lib/utils'

type CommentActivityHintsProps = {
  hints: UnreadCommentHint[]
  hrefFor: (hint: UnreadCommentHint) => string
}

export function CommentActivityHints({ hints, hrefFor }: CommentActivityHintsProps) {
  if (hints.length === 0) return null

  return (
    <Card className="border-amber-300/80 bg-amber-50/80">
      <CardTitle>Neue Kommentare</CardTitle>
      <p className="mt-1 text-sm text-ink-muted">
        Hinweise verschwinden, sobald du den jeweiligen Wochenrückblick oder Lernbericht öffnest.
      </p>
      <ul className="mt-3 space-y-2">
        {hints.map((hint) => (
          <li key={`${hint.targetKind}-${hint.targetId}`}>
            <Link to={hrefFor(hint)} className="block rounded-md border border-amber-200 bg-panel px-3 py-2 text-sm transition hover:border-brand">
              <span className="font-medium text-ink">{hint.label}</span>
              <span className="mt-0.5 block text-ink-muted">
                Kommentar von {hint.authorName} · {formatDateTime(hint.commentedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
