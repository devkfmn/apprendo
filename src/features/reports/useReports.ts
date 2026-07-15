import { useCallback, useEffect, useState } from 'react'
import type { LearningReport } from '@/types/domain'
import { listLearningReports } from './api'

export function useReports(learnerId?: string) {
  const [reports, setReports] = useState<LearningReport[]>([])
  const [loading, setLoading] = useState(Boolean(learnerId))

  const refresh = useCallback(async () => {
    if (!learnerId) return
    setLoading(true)
    try {
      setReports(await listLearningReports(learnerId))
    } finally {
      setLoading(false)
    }
  }, [learnerId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { reports, loading, refresh }
}
