import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { db, paths } from '@/lib/firebase'
import type { SemesterGoal } from '@/types/domain'

export function useGoals(learnerId?: string, semesterId?: string) {
  const [goals, setGoals] = useState<SemesterGoal[]>([])
  const [loading, setLoading] = useState(Boolean(learnerId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!learnerId) {
      setGoals([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const q = query(collection(db, paths.goals(learnerId)), orderBy('sortOrder', 'asc'))

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setGoals(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SemesterGoal),
        )
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [learnerId])

  const filteredGoals = useMemo(() => {
    if (!semesterId) return goals
    return goals.filter((g) => g.semesterId === semesterId)
  }, [goals, semesterId])

  return { goals, filteredGoals, loading, error }
}
