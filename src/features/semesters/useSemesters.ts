import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { findCurrentSemester } from '@/features/semesters/defaultTimeline'
import { db, paths } from '@/lib/firebase'
import type { Semester } from '@/types/domain'

export function useSemesters(learnerId?: string) {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [loading, setLoading] = useState(Boolean(learnerId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!learnerId) {
      setSemesters([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const q = query(
      collection(db, paths.semesters(learnerId)),
      orderBy('startDate', 'asc'),
    )

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setSemesters(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Semester),
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

  /** Semester whose date range contains today (not completed). */
  const activeSemester = useMemo(
    () => findCurrentSemester(semesters),
    [semesters],
  )

  return { semesters, activeSemester, loading, error }
}
