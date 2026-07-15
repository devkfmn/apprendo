import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DateInput } from '@/components/ui/date-input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/features/auth/useAuth'
import { CommentThread } from '@/features/comments/CommentThread'
import { useMarkContentViewed } from '@/features/comments/useMarkContentViewed'
import { JournalForm } from '@/features/journal/JournalForm'
import { getJournalEntry, saveJournalDraft, submitJournalEntry } from '@/features/journal/api'
import { journalEntrySchema, type JournalEntryFormValues } from '@/features/journal/schemas'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { useSemesters } from '@/features/semesters/useSemesters'
import { formatDate } from '@/lib/utils'
import { getIsoWeekInfo, weekLabel } from '@/lib/week'
import type { JournalEntry, RoadmapItemView } from '@/types/domain'

const blankAnswers = { workedOn: '', learned: '', wentWell: '', difficulties: '', needSupport: '', nextWeek: '' }

export function JournalEditPage() {
  const { entryId } = useParams<{ entryId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const learnerId = profile?.id
  const { activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const roadmap = useRoadmap({ learnerId: learnerId ?? '', role: 'learner', actorId: learnerId ?? '' })
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loadingEntry, setLoadingEntry] = useState(Boolean(entryId))
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [markTopicsOpen, setMarkTopicsOpen] = useState(false)
  const [autosaveLabel, setAutosaveLabel] = useState<string | null>(null)
  const savingRef = useRef(false)
  const initialWeek = getIsoWeekInfo()
  const form = useForm<JournalEntryFormValues>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: { semesterId: '', ...initialWeek, answers: blankAnswers, roadmapTopicIds: [] },
  })
  const watchedValues = useWatch({ control: form.control })
  const isSubmitted = entry?.status === 'submitted'
  const topics = useMemo(() => roadmap.quarters.flatMap((quarter) => [...quarter.school, ...quarter.company]), [roadmap.quarters])

  useMarkContentViewed({
    viewerId: profile?.id,
    learnerId,
    targetKind: 'journal',
    targetId: entry?.id,
    enabled: Boolean(entry?.id && isSubmitted),
  })

  useEffect(() => {
    if (!entryId || !learnerId) {
      setLoadingEntry(false)
      return
    }
    void getJournalEntry(learnerId, entryId).then((loaded) => {
      setEntry(loaded)
      if (loaded) {
        const { semesterId, calendarWeek, year, weekStart, weekEnd, answers, roadmapTopicIds } = loaded
        form.reset({ semesterId, calendarWeek, year, weekStart, weekEnd, answers: { ...blankAnswers, ...answers }, roadmapTopicIds })
      } else setError('Wochenrückblick nicht gefunden.')
      setLoadingEntry(false)
    }).catch(() => { setError('Wochenrückblick konnte nicht geladen werden.'); setLoadingEntry(false) })
  }, [entryId, learnerId, form])

  useEffect(() => {
    if (!entryId && activeSemester && !form.getValues('semesterId')) form.setValue('semesterId', activeSemester.id)
  }, [activeSemester, entryId, form])

  const save = async (values = form.getValues(), autosave = false) => {
    if (!learnerId || savingRef.current) return
    savingRef.current = true
    try {
      const saved = await saveJournalDraft(learnerId, values, entry?.id ?? entryId)
      setEntry(saved)
      form.reset(values)
      if (autosave) {
        setAutosaveLabel(`Automatisch gespeichert um ${new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`)
      } else {
        setMessage(isSubmitted || saved.status === 'submitted' ? 'Änderungen gespeichert.' : 'Entwurf gespeichert.')
        setAutosaveLabel(null)
      }
      if (!entryId && saved.id) {
        navigate(`/journal/${saved.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      savingRef.current = false
    }
  }

  useEffect(() => {
    if (!form.formState.isDirty) return
    const timer = window.setTimeout(() => void save(form.getValues(), true), 4000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on watched field changes
  }, [watchedValues, form.formState.isDirty])

  const updateWeek = (value: string) => {
    const info = getIsoWeekInfo(new Date(`${value}T12:00:00`))
    form.setValue('calendarWeek', info.calendarWeek, { shouldDirty: true })
    form.setValue('year', info.year, { shouldDirty: true })
    form.setValue('weekStart', info.weekStart, { shouldDirty: true })
    form.setValue('weekEnd', info.weekEnd, { shouldDirty: true })
  }

  const submit = form.handleSubmit(async (values) => {
    if (!learnerId) return
    setError(null)
    try {
      const saved = await saveJournalDraft(learnerId, values, entry?.id)
      await submitJournalEntry(learnerId, saved.id)
      setEntry({ ...saved, status: 'submitted', submittedAt: new Date().toISOString() })
      setMessage('Wochenrückblick wurde eingereicht.')
      setMarkTopicsOpen(saved.roadmapTopicIds.length > 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wochenrückblick konnte nicht eingereicht werden.')
    }
  })

  const markTopics = async () => {
    const selected = new Set(form.getValues('roadmapTopicIds'))
    try {
      await Promise.all(topics.filter(({ item }) => selected.has(item.id)).map(({ item, itemType }) => roadmap.setProgressField(itemType, item.id, { treated: true, treatedBy: learnerId })))
      setMessage('Themen wurden auf der Roadmap als behandelt markiert.')
    } catch {
      setError('Die Roadmap-Themen konnten nicht aktualisiert werden.')
    } finally {
      setMarkTopicsOpen(false)
    }
  }

  if (loadingEntry || semestersLoading || roadmap.loading) return <p className="text-sm text-ink-muted">Laden…</p>
  if (!activeSemester && !entry) return <><PageHeader title="Wochenrückblick" /><p className="text-sm text-ink-muted">Bitte warte, bis dein Coach ein aktives Semester eingerichtet hat.</p></>

  const weekDate = new Date(form.watch('weekStart'))
  return (
    <>
      <PageHeader
        title="Wochenrückblick"
        description={
          isSubmitted
            ? 'Eingereicht – du kannst den Wochenrückblick weiterhin anpassen.'
            : 'Reflektiere deine Lernwoche Schritt für Schritt.'
        }
      />
      {message ? <p className="mb-4 rounded-md bg-brand-soft p-3 text-sm text-brand">{message}</p> : null}
      {autosaveLabel && !message ? <p className="mb-4 text-xs text-ink-muted">{autosaveLabel}</p> : null}
      {error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-danger">{error}</p> : null}
      <Card>
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div><Label>Kalenderwoche</Label><p className="mt-1 font-medium">{weekLabel(form.watch('calendarWeek'), form.watch('year'))}</p></div>
          <div>
            <Label htmlFor="week-date">Woche anpassen</Label>
            <DateInput
              id="week-date"
              value={Number.isNaN(weekDate.getTime()) ? '' : weekDate.toISOString().slice(0, 10)}
              onChange={(iso) => {
                if (iso) updateWeek(iso)
              }}
            />
          </div>
          <div>
            <Label>Zeitraum</Label>
            <p className="mt-1 text-sm text-ink-muted">
              {formatDate(form.watch('weekStart'))} – {formatDate(form.watch('weekEnd'))}
            </p>
          </div>
          <div><Label>Semester</Label><p className="mt-1 text-sm">{activeSemester?.label ?? 'Früheres Semester'}</p></div>
        </div>
        <form onSubmit={submit}>
          <JournalForm form={form} topics={topics as RoadmapItemView[]} />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => void save()}>
              {isSubmitted ? 'Änderungen speichern' : 'Entwurf speichern'}
            </Button>
            {!isSubmitted ? <Button type="submit">Einreichen</Button> : null}
          </div>
        </form>
      </Card>
      {profile && entry?.id && learnerId ? (
        <CommentThread
          learnerId={learnerId}
          targetKind="journal"
          targetId={entry.id}
          parentSubmitted={entry.status === 'submitted'}
          profile={profile}
        />
      ) : null}
      <Dialog open={markTopicsOpen} onOpenChange={setMarkTopicsOpen}><DialogContent><DialogHeader><DialogTitle>Themen als behandelt markieren?</DialogTitle><DialogDescription>Möchtest du diese Themen auf der Roadmap als behandelt markieren?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setMarkTopicsOpen(false)}>Nein</Button><Button onClick={() => void markTopics()}>Ja, markieren</Button></DialogFooter></DialogContent></Dialog>
    </>
  )
}
