import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  archiveCompanyItem,
  createCompanyItem,
  fetchActiveSemester,
  fetchCompanyItems,
  fetchProgress,
  fetchSchoolItems,
  reorderCompanyItems,
  updateCompanyItem,
  upsertProgress,
  type CreateCompanyItemInput,
  type ProgressPatch,
  type SortOrderUpdate,
  type UpdateCompanyItemInput,
} from '@/features/roadmap/api'
import type {
  CompanyRoadmapItem,
  ImsQuarter,
  QuarterRoadmapView,
  RoadmapItemView,
  RoadmapProgress,
  SchoolRoadmapItem,
  Semester,
  UserRole,
} from '@/types/domain'

export type UseRoadmapOptions = {
  learnerId: string
  /** When omitted, uses active semester's primaryImsQuarters */
  imsQuarters?: ImsQuarter[]
  includeArchivedCompany?: boolean
  role: UserRole
  actorId: string
}

function buildProgressMap(progress: RoadmapProgress[]): Map<string, RoadmapProgress> {
  return new Map(progress.map((p) => [p.id, p]))
}

function buildQuarterViews(
  imsQuarters: ImsQuarter[],
  schoolItems: SchoolRoadmapItem[],
  companyItems: CompanyRoadmapItem[],
  progressMap: Map<string, RoadmapProgress>,
): QuarterRoadmapView[] {
  return imsQuarters.map((imsQuarter) => {
    const school: RoadmapItemView[] = schoolItems
      .filter((item) => item.imsQuarter === imsQuarter)
      .map((item) => ({
        itemType: 'school' as const,
        item,
        progress: progressMap.get(`school_${item.id}`) ?? null,
      }))

    const company: RoadmapItemView[] = companyItems
      .filter((item) => item.imsQuarter === imsQuarter)
      .map((item) => ({
        itemType: 'company' as const,
        item,
        progress: progressMap.get(`company_${item.id}`) ?? null,
      }))

    return { imsQuarter, school, company }
  })
}

export function useRoadmap({
  learnerId,
  imsQuarters: imsQuartersOverride,
  includeArchivedCompany = false,
  role,
  actorId,
}: UseRoadmapOptions) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null)
  const [schoolItems, setSchoolItems] = useState<SchoolRoadmapItem[]>([])
  const [companyItems, setCompanyItems] = useState<CompanyRoadmapItem[]>([])
  const [progress, setProgress] = useState<RoadmapProgress[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [semester, school, company, prog] = await Promise.all([
          fetchActiveSemester(learnerId),
          fetchSchoolItems(),
          fetchCompanyItems(learnerId, { includeArchived: includeArchivedCompany }),
          fetchProgress(learnerId),
        ])
        if (cancelled) return
        setActiveSemester(semester)
        setSchoolItems(school)
        setCompanyItems(company)
        setProgress(prog)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Daten konnten nicht geladen werden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [learnerId, includeArchivedCompany, refreshKey])

  const progressMap = useMemo(() => buildProgressMap(progress), [progress])

  const effectiveQuarters = useMemo(
    () => imsQuartersOverride ?? activeSemester?.primaryImsQuarters ?? [],
    [imsQuartersOverride, activeSemester],
  )

  const quarters = useMemo(
    () =>
      buildQuarterViews(effectiveQuarters, schoolItems, companyItems, progressMap),
    [effectiveQuarters, schoolItems, companyItems, progressMap],
  )

  const setProgressField = useCallback(
    async (
      itemType: 'school' | 'company',
      itemId: string,
      patch: ProgressPatch,
    ) => {
      await upsertProgress(learnerId, itemType, itemId, patch)
      const docId = `${itemType}_${itemId}`
      const timestamp = new Date().toISOString()
      setProgress((prev) => {
        const idx = prev.findIndex((p) => p.id === docId)
        if (idx === -1) {
          return [
            ...prev,
            {
              id: docId,
              itemId,
              itemType,
              learnerId,
              treated: patch.treated,
              treatedAt: patch.treated ? timestamp : null,
              treatedBy: patch.treated ? (patch.treatedBy ?? null) : null,
              updatedAt: timestamp,
            },
          ]
        }
        const next = [...prev]
        next[idx] = {
          ...next[idx]!,
          treated: patch.treated,
          treatedAt: patch.treated ? timestamp : null,
          treatedBy: patch.treated ? (patch.treatedBy ?? null) : null,
          updatedAt: timestamp,
        }
        return next
      })
    },
    [learnerId],
  )

  const addCompanyItem = useCallback(
    async (input: CreateCompanyItemInput) => {
      const id = await createCompanyItem(learnerId, actorId, input)
      const timestamp = new Date().toISOString()
      setCompanyItems((prev) => [
        ...prev,
        {
          id,
          learnerId,
          imsQuarter: input.imsQuarter,
          title: input.title.trim(),
          description: input.description.trim(),
          sortOrder: input.sortOrder,
          status: 'active',
          createdBy: actorId,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ])
      return id
    },
    [learnerId, actorId],
  )

  const editCompanyItem = useCallback(
    async (itemId: string, input: UpdateCompanyItemInput) => {
      await updateCompanyItem(learnerId, itemId, input)
      setCompanyItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                ...(input.title !== undefined ? { title: input.title.trim() } : {}),
                ...(input.description !== undefined
                  ? { description: input.description.trim() }
                  : {}),
                ...(input.imsQuarter !== undefined ? { imsQuarter: input.imsQuarter } : {}),
              }
            : item,
        ),
      )
    },
    [learnerId],
  )

  const removeCompanyItem = useCallback(
    async (itemId: string) => {
      await archiveCompanyItem(learnerId, itemId)
      if (includeArchivedCompany) {
        setCompanyItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, status: 'archived' } : item,
          ),
        )
      } else {
        setCompanyItems((prev) => prev.filter((item) => item.id !== itemId))
      }
    },
    [learnerId, includeArchivedCompany],
  )

  const moveCompanyItem = useCallback(
    async (imsQuarter: ImsQuarter, itemId: string, direction: 'up' | 'down') => {
      const quarterItems = companyItems
        .filter((i) => i.imsQuarter === imsQuarter && i.status === 'active')
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const index = quarterItems.findIndex((i) => i.id === itemId)
      if (index === -1) return

      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (swapIndex < 0 || swapIndex >= quarterItems.length) return

      const current = quarterItems[index]!
      const swap = quarterItems[swapIndex]!
      const updates: SortOrderUpdate[] = [
        { id: current.id, sortOrder: swap.sortOrder },
        { id: swap.id, sortOrder: current.sortOrder },
      ]

      await reorderCompanyItems(learnerId, updates)
      setCompanyItems((prev) =>
        prev.map((item) => {
          const update = updates.find((u) => u.id === item.id)
          return update ? { ...item, sortOrder: update.sortOrder } : item
        }),
      )
    },
    [companyItems, learnerId],
  )

  const nextSortOrderForQuarter = useCallback(
    (imsQuarter: ImsQuarter) => {
      const max = companyItems
        .filter((i) => i.imsQuarter === imsQuarter && i.status === 'active')
        .reduce((acc, i) => Math.max(acc, i.sortOrder), 0)
      return max + 10
    },
    [companyItems],
  )

  return {
    loading,
    error,
    activeSemester,
    quarters,
    role,
    actorId,
    refresh,
    setProgressField,
    addCompanyItem,
    editCompanyItem,
    removeCompanyItem,
    moveCompanyItem,
    nextSortOrderForQuarter,
  }
}

export type RoadmapContext = ReturnType<typeof useRoadmap>
