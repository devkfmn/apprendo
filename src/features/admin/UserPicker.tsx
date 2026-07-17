import { useDeferredValue, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { filterUsersByQuery } from '@/features/admin/listUtils'
import type { UserProfile } from '@/types/domain'

const PREVIEW_LIMIT = 8

export function UserPicker({
  id,
  label,
  users,
  value,
  onChange,
  placeholder = 'Name oder E-Mail suchen…',
  emptyMessage = 'Keine passenden Benutzer.',
}: {
  id: string
  label: string
  users: UserProfile[]
  value: string
  onChange: (userId: string) => void
  placeholder?: string
  emptyMessage?: string
}) {
  const selected = users.find((user) => user.id === value) ?? null
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const filtered = useMemo(
    () => filterUsersByQuery(users, deferredQuery),
    [deferredQuery, users],
  )
  const matches = filtered.slice(0, PREVIEW_LIMIT)

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {selected ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm">
          <div>
            <p className="font-medium">{selected.displayName}</p>
            <p className="text-ink-muted">{selected.email}</p>
          </div>
          <button
            type="button"
            className="text-sm font-medium text-brand hover:underline"
            onClick={() => {
              onChange('')
              setQuery('')
            }}
          >
            Ändern
          </button>
        </div>
      ) : (
        <div className="mt-1 space-y-2">
          <Input
            id={id}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
          />
          <div className="max-h-48 overflow-y-auto rounded-md border border-line bg-panel">
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-muted">{emptyMessage}</p>
            ) : (
              <ul>
                {matches.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-brand-soft"
                      onClick={() => {
                        onChange(user.id)
                        setQuery('')
                      }}
                    >
                      <span className="font-medium">{user.displayName}</span>
                      <span className="text-ink-muted">{user.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {filtered.length > PREVIEW_LIMIT ? (
            <p className="text-xs text-ink-muted">
              Tippe weiter, um die Suche einzugrenzen ({users.length} gesamt).
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
