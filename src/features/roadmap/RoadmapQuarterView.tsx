import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CompanyRoadmapList } from '@/features/roadmap/CompanyRoadmapList'
import { SchoolRoadmapList } from '@/features/roadmap/SchoolRoadmapList'
import type { RoadmapContext } from '@/features/roadmap/useRoadmap'
import { labelForQuarter, lehrjahrForQuarter } from '@/lib/ims'
import type { QuarterRoadmapView } from '@/types/domain'

type RoadmapQuarterViewProps = {
  quarter: QuarterRoadmapView
  roadmap: RoadmapContext
  canManageCompany?: boolean
}

function treatedCount(items: QuarterRoadmapView['school']) {
  return items.filter((item) => item.progress?.treated).length
}

export function RoadmapQuarterView({
  quarter,
  roadmap,
  canManageCompany = false,
}: RoadmapQuarterViewProps) {
  const { imsQuarter } = quarter
  const schoolTreated = treatedCount(quarter.school)
  const companyTreated = treatedCount(quarter.company)

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">{labelForQuarter(imsQuarter)}</CardTitle>
          <Badge variant="secondary">Lehrjahr {lehrjahrForQuarter(imsQuarter)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 md:grid-cols-2">
          <section className="min-w-0 space-y-3">
            <div className="flex items-baseline justify-between gap-2 border-b border-line pb-2">
              <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
                Schule
              </h3>
              {quarter.school.length > 0 ? (
                <span className="text-xs text-ink-muted tabular-nums">
                  {schoolTreated}/{quarter.school.length} behandelt
                </span>
              ) : null}
            </div>
            <SchoolRoadmapList items={quarter.school} roadmap={roadmap} />
          </section>
          <section className="min-w-0 space-y-3">
            <div className="flex items-baseline justify-between gap-2 border-b border-line pb-2">
              <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
                Betrieb
              </h3>
              {quarter.company.length > 0 ? (
                <span className="text-xs text-ink-muted tabular-nums">
                  {companyTreated}/{quarter.company.length} behandelt
                </span>
              ) : null}
            </div>
            <CompanyRoadmapList
              items={quarter.company}
              imsQuarter={imsQuarter}
              roadmap={roadmap}
              canManage={canManageCompany}
            />
          </section>
        </div>
      </CardContent>
    </Card>
  )
}
