import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { semesterStatusLabels } from '@/features/semesters/labels'
import { useSemesters } from '@/features/semesters/useSemesters'
import { useAuth } from '@/features/auth/useAuth'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { SemesterStatus } from '@/types/domain'

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), 'd. MMM yyyy', { locale: de })
  } catch {
    return iso
  }
}

export function SemestersPage() {
  const { profile } = useAuth()
  const learnerId = profile?.id
  const { semesters, loading, error } = useSemesters(learnerId)

  return (
    <>
      <PageHeader
        title="Semester"
        description="Übersicht Ihrer Semester — vom Coach verwaltet"
      />
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : semesters.length === 0 ? (
        <p className="text-sm text-ink-muted">Noch keine Semester angelegt.</p>
      ) : (
        <div className="space-y-4">
          {semesters.map((semester) => (
            <Card key={semester.id}>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{semester.label}</CardTitle>
                <Badge>{semesterStatusLabels[semester.status as SemesterStatus]}</Badge>
              </div>
              {semester.academicYear ? (
                <CardDescription>Schuljahr {semester.academicYear}</CardDescription>
              ) : null}
              <p className="mt-3 text-sm">
                {formatDate(semester.startDate)} – {formatDate(semester.endDate)}
              </p>
              <p className="text-sm text-ink-muted">
                IMS-Quartale: {semester.primaryImsQuarters.join(', ')}
              </p>
              {semester.summaryNote ? (
                <p className="mt-2 border-t border-line pt-2 text-sm text-ink-muted">
                  <span className="font-medium">Abschluss:</span> {semester.summaryNote}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
