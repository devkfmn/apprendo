import { useCallback, useEffect, useState } from 'react'
import type { LearningReport } from '@/types/domain'
import { listLearningReports, type ListReportsOptions } from './api'

export function useReports(learnerId?: string, options: ListReportsOptions = {}) {
  const [reports, setReports] = useState<LearningReport[]>([])
  const [loading, setLoading] = useState(Boolean(learnerId))
  const submittedOnly = Boolean(options.submittedOnly)

  const refresh = useCallback(async () => {
    if (!learnerId) return
    setLoading(true)
    try {
      setReports(await listLearningReports(learnerId, { submittedOnly }))
    } finally {
      setLoading(false)
    }
  }, [learnerId, submittedOnly])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { reports, loading, refresh }
}
