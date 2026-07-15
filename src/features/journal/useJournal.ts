import { useCallback, useEffect, useState } from 'react'
import type { JournalEntry } from '@/types/domain'
import { listJournalEntries, type ListJournalOptions } from './api'

export function useJournal(learnerId?: string, options: ListJournalOptions = {}) {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(Boolean(learnerId))
  const submittedOnly = Boolean(options.submittedOnly)
  const refresh = useCallback(async () => {
    if (!learnerId) return
    setLoading(true)
    try {
      setEntries(await listJournalEntries(learnerId, { submittedOnly }))
    } finally {
      setLoading(false)
    }
  }, [learnerId, submittedOnly])
  useEffect(() => void refresh(), [refresh])
  return { entries, loading, refresh }
}
