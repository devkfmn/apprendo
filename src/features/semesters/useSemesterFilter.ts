import { useEffect, useState } from 'react'

/**
 * Semester filter state. Defaults to the current (date-based) semester once known.
 * Empty string = "Alle Semester".
 */
export function useSemesterFilter(
  currentSemesterId: string | null | undefined,
  loading = false,
) {
  const [semesterId, setSemesterId] = useState('')
  const [userChanged, setUserChanged] = useState(false)

  useEffect(() => {
    if (loading || userChanged) return
    if (currentSemesterId) {
      setSemesterId(currentSemesterId)
    }
  }, [currentSemesterId, loading, userChanged])

  const onSemesterChange = (nextId: string) => {
    setUserChanged(true)
    setSemesterId(nextId)
  }

  return { semesterId, onSemesterChange }
}
