import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useComments } from '@/features/comments/useComments'
import { formatDateTime, roleLabel } from '@/lib/utils'
import type { CommentTargetKind, UserProfile } from '@/types/domain'

type CommentThreadProps = {
  learnerId: string
  targetKind: CommentTargetKind
  targetId: string
  /** Parent must be submitted before commenting is allowed. */
  parentSubmitted: boolean
  profile: UserProfile
}

export function CommentThread({
  learnerId,
  targetKind,
  targetId,
  parentSubmitted,
  profile,
}: CommentThreadProps) {
  const { comments, loading, error, add, edit, remove } = useComments(
    learnerId,
    targetKind,
    targetId,
  )
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const submit = async () => {
    setActionError(null)
    setBusy(true)
    try {
      await add({
        authorId: profile.id,
        authorDisplayName: profile.displayName,
        authorRole: profile.role,
        body: draft,
      })
      setDraft('')
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Kommentar konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }

  const saveEdit = async (commentId: string) => {
    setActionError(null)
    setBusy(true)
    try {
      await edit(commentId, editingBody)
      setEditingId(null)
      setEditingBody('')
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Kommentar konnte nicht aktualisiert werden.')
    } finally {
      setBusy(false)
    }
  }

  const removeComment = async (commentId: string) => {
    setActionError(null)
    setBusy(true)
    try {
      await remove(commentId)
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Kommentar konnte nicht gelöscht werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mt-6">
      <CardTitle>Kommentare</CardTitle>
      <p className="mt-1 text-sm text-ink-muted">
        Feedback und Hinweise von Coach, Lernendem und Beobachter.
      </p>

      {loading ? <p className="mt-4 text-sm text-ink-muted">Laden…</p> : null}
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {actionError ? <p className="mt-4 text-sm text-danger">{actionError}</p> : null}

      {!loading && comments.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Noch keine Kommentare.</p>
      ) : null}

      <ul className="mt-4 space-y-4">
        {comments.map((comment) => {
          const isOwn = comment.authorId === profile.id
          const isEditing = editingId === comment.id
          return (
            <li key={comment.id} className="rounded-lg border border-line bg-canvas/50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  {comment.authorDisplayName}{' '}
                  <span className="font-normal text-ink-muted">
                    ({roleLabel(comment.authorRole)})
                  </span>
                </p>
                <p className="text-xs text-ink-muted">{formatDateTime(comment.createdAt)}</p>
              </div>
              {isEditing ? (
                <div className="mt-3 space-y-3">
                  <Textarea
                    value={editingBody}
                    onChange={(event) => setEditingBody(event.target.value)}
                    maxLength={4000}
                    rows={3}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy} onClick={() => void saveEdit(comment.id)}>
                      Speichern
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(null)
                        setEditingBody('')
                      }}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
                  {isOwn ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(comment.id)
                          setEditingBody(comment.body)
                        }}
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void removeComment(comment.id)}
                      >
                        Löschen
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </li>
          )
        })}
      </ul>

      {parentSubmitted ? (
        <div className="mt-6 space-y-3 border-t border-line pt-4">
          <Label htmlFor={`comment-${targetKind}-${targetId}`}>Neuer Kommentar</Label>
          <Textarea
            id={`comment-${targetKind}-${targetId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Kommentar schreiben…"
            maxLength={4000}
            rows={3}
          />
          <Button disabled={busy || !draft.trim()} onClick={() => void submit()}>
            Kommentar senden
          </Button>
        </div>
      ) : (
        <p className="mt-6 border-t border-line pt-4 text-sm text-ink-muted">
          Kommentare sind möglich, sobald der Eintrag eingereicht wurde.
        </p>
      )}
    </Card>
  )
}
