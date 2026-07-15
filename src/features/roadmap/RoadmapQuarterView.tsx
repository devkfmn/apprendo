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

export function RoadmapQuarterView({
  quarter,
  roadmap,
  canManageCompany = false,
}: RoadmapQuarterViewProps) {
  const { imsQuarter } = quarter

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">{labelForQuarter(imsQuarter)}</CardTitle>
          <Badge>Lehrjahr {lehrjahrForQuarter(imsQuarter)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h3 className="mb-3 text-sm font-semibold tracking-wide uppercase">Schule</h3>
            <SchoolRoadmapList items={quarter.school} roadmap={roadmap} />
          </section>
          <section>
            <h3 className="mb-3 text-sm font-semibold tracking-wide uppercase">Betrieb</h3>
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
