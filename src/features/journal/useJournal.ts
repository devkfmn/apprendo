import { useCallback, useEffect, useState } from 'react'
import type { JournalEntry } from '@/types/domain'
import { listJournalEntries } from './api'

export function useJournal(learnerId?: string) {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(Boolean(learnerId))
  const refresh = useCallback(async () => {
    if (!learnerId) return
    setLoading(true)
    try {
      setEntries(await listJournalEntries(learnerId))
    } finally {
      setLoading(false)
    }
  }, [learnerId])
  useEffect(() => void refresh(), [refresh])
  return { entries, loading, refresh }
}
