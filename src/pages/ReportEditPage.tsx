import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/features/auth/useAuth'
import { CommentThread } from '@/features/comments/CommentThread'
import { useMarkContentViewed } from '@/features/comments/useMarkContentViewed'
import { ReportEditor } from '@/features/reports/ReportEditor'
import {
  getLearningReport,
  getReportMarkdown,
  saveLearningReportDraft,
  submitLearningReport,
  uploadReportImage,
} from '@/features/reports/api'
import { useSemesters } from '@/features/semesters/useSemesters'
import type { LearningReport } from '@/types/domain'

export function ReportEditPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const learnerId = profile?.id
  const { activeSemester, loading: semestersLoading } = useSemesters(learnerId)

  const [report, setReport] = useState<LearningReport | null>(null)
  const [title, setTitle] = useState('')
  const [bodyMarkdown, setBodyMarkdown] = useState('')
  const [imagePaths, setImagePaths] = useState<string[]>([])
  const [loading, setLoading] = useState(Boolean(reportId))
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autosaveLabel, setAutosaveLabel] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dirty, setDirty] = useState(false)
  const savingRef = useRef(false)
  const reportIdRef = useRef(reportId)

  const isSubmitted = report?.status === 'submitted'

  useMarkContentViewed({
    viewerId: profile?.id,
    learnerId,
    targetKind: 'report',
    targetId: report?.id,
    enabled: Boolean(report?.id && isSubmitted),
  })

  useEffect(() => {
    reportIdRef.current = reportId
  }, [reportId])

  useEffect(() => {
    if (!reportId || !learnerId) {
      setLoading(false)
      return
    }
    void getLearningReport(learnerId, reportId)
      .then((loaded) => {
        if (!loaded) {
          setError('Lernbericht nicht gefunden.')
          return
        }
        setReport(loaded)
        setTitle(loaded.title)
        setBodyMarkdown(getReportMarkdown(loaded))
        setImagePaths(loaded.imagePaths ?? [])
        setDirty(false)
      })
      .catch(() => setError('Lernbericht konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [reportId, learnerId])

  const save = async (autosave = false) => {
    if (!learnerId || savingRef.current) return
    savingRef.current = true
    try {
      const saved = await saveLearningReportDraft(
        learnerId,
        {
          title,
          bodyMarkdown,
          imagePaths,
          semesterId: report?.semesterId ?? activeSemester?.id ?? null,
        },
        report?.id ?? reportIdRef.current,
      )
      setReport(saved)
      setDirty(false)
      if (autosave) {
        setAutosaveLabel(
          `Automatisch gespeichert um ${new Date().toLocaleTimeString('de-CH', {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
        )
      } else {
        setMessage(
          isSubmitted || saved.status === 'submitted'
            ? 'Änderungen gespeichert.'
            : 'Entwurf gespeichert.',
        )
        setAutosaveLabel(null)
      }
      if (!reportId && saved.id) {
        reportIdRef.current = saved.id
        navigate(`/reports/${saved.id}`, { replace: true })
      }
      return saved
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
      return null
    } finally {
      savingRef.current = false
    }
  }

  useEffect(() => {
    if (!dirty) return
    const timer = window.setTimeout(() => void save(true), 4000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, bodyMarkdown, dirty])

  const handleUploadImage = async (file: File): Promise<string | null> => {
    if (!learnerId) return null
    setError(null)
    setUploading(true)
    try {
      let currentId = report?.id ?? reportIdRef.current
      if (!currentId) {
        const created = await save(false)
        currentId = created?.id
      }
      if (!currentId) throw new Error('Bericht muss zuerst gespeichert werden.')
      const uploaded = await uploadReportImage(learnerId, currentId, file)
      if (uploaded.imagePath) {
        setImagePaths((prev) => [...prev, uploaded.imagePath])
      }
      setDirty(true)
      setMessage('Bild eingefügt.')
      return uploaded.imageUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bild-Upload fehlgeschlagen.')
      return null
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    if (!learnerId || isSubmitted) return
    setError(null)
    try {
      const saved = await save(false)
      if (!saved) return
      await submitLearningReport(learnerId, saved.id)
      setReport({
        ...saved,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      })
      setMessage('Lernbericht wurde eingereicht.')
      setDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Einreichen fehlgeschlagen.')
    }
  }

  if (loading || semestersLoading) {
    return <p className="text-sm text-ink-muted">Laden…</p>
  }

  return (
    <>
      <PageHeader
        title="Lernbericht"
        description={
          isSubmitted
            ? 'Eingereicht – du kannst den Bericht weiterhin anpassen.'
            : 'Schreibe einen freien Bericht in Markdown.'
        }
        actions={
          report ? (
            <Badge variant={report.status === 'submitted' ? 'default' : 'warning'}>
              {report.status === 'submitted' ? 'Eingereicht' : 'Entwurf'}
            </Badge>
          ) : null
        }
      />
      {message ? (
        <p className="mb-4 rounded-md bg-brand-soft p-3 text-sm text-brand">{message}</p>
      ) : null}
      {autosaveLabel && !message ? (
        <p className="mb-4 text-xs text-ink-muted">{autosaveLabel}</p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-danger">{error}</p>
      ) : null}

      <Card>
        <div className="mb-6 space-y-2">
          <Label htmlFor="report-title">Titel</Label>
          <Input
            id="report-title"
            value={title}
            placeholder="Titel des Lernberichts"
            onChange={(event) => {
              setTitle(event.target.value)
              setDirty(true)
            }}
          />
        </div>

        <ReportEditor
          value={bodyMarkdown}
          uploading={uploading}
          onChange={(next) => {
            setBodyMarkdown(next)
            setDirty(true)
          }}
          onUploadImage={handleUploadImage}
        />

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => void save(false)}>
            {isSubmitted ? 'Änderungen speichern' : 'Entwurf speichern'}
          </Button>
          {!isSubmitted ? (
            <Button type="button" onClick={() => void submit()}>
              Einreichen
            </Button>
          ) : null}
        </div>
      </Card>
      {profile && report?.id && learnerId ? (
        <CommentThread
          learnerId={learnerId}
          targetKind="report"
          targetId={report.id}
          parentSubmitted={report.status === 'submitted'}
          profile={profile}
        />
      ) : null}
    </>
  )
}
