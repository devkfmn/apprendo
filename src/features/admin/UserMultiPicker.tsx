import { useDeferredValue, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { filterUsersByQuery } from '@/features/admin/listUtils'
import type { UserProfile } from '@/types/domain'

const PREVIEW_LIMIT = 10

export function UserMultiPicker({
  id,
  label,
  users,
  value,
  onChange,
  placeholder = 'Lernende suchen…',
}: {
  id: string
  label: string
  users: UserProfile[]
  value: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const selected = useMemo(
    () => users.filter((user) => value.includes(user.id)),
    [users, value],
  )
  const matches = useMemo(() => {
    return filterUsersByQuery(users, deferredQuery)
      .filter((user) => !value.includes(user.id))
      .slice(0, PREVIEW_LIMIT)
  }, [deferredQuery, users, value])

  function add(id: string) {
    onChange([...value, id])
    setQuery('')
  }

  function remove(id: string) {
    onChange(value.filter((item) => item !== id))
  }

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {selected.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {selected.map((user) => (
            <Badge key={user.id} variant="default" className="gap-1.5 pr-1">
              {user.displayName}
              <button
                type="button"
                className="rounded px-1 text-brand hover:bg-white/50"
                onClick={() => remove(user.id)}
                aria-label={`${user.displayName} entfernen`}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-ink-muted">Noch keine Auswahl.</p>
      )}
      <Input
        id={id}
        className="mt-2"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-line bg-panel">
        {matches.length === 0 ? (
          <p className="px-3 py-2 text-sm text-ink-muted">
            {users.length === 0 ? 'Keine Lernenden vorhanden.' : 'Keine weiteren Treffer.'}
          </p>
        ) : (
          <ul>
            {matches.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-brand-soft"
                  onClick={() => add(user.id)}
                >
                  <span className="font-medium">{user.displayName}</span>
                  <span className="text-ink-muted">{user.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
