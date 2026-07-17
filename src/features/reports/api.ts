import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage'
import { db, paths, reportImagePath, storage } from '@/lib/firebase'
import type { LearningReport, ReportBlock } from '@/types/domain'

const now = () => new Date().toISOString()
const reports = (learnerId: string) => collection(db, paths.reports(learnerId))

/** Convert legacy block-based reports into markdown. */
export function blocksToMarkdown(blocks: ReportBlock[] | undefined): string {
  if (!blocks?.length) return ''
  return blocks
    .map((block) => {
      if (block.type === 'h1') return `# ${block.text ?? ''}`.trimEnd()
      if (block.type === 'h2') return `## ${block.text ?? ''}`.trimEnd()
      if (block.type === 'h3') return `### ${block.text ?? ''}`.trimEnd()
      if (block.type === 'image' && block.imageUrl) {
        return `![${block.alt || 'Bild'}](${block.imageUrl})`
      }
      return block.text ?? ''
    })
    .filter(Boolean)
    .join('\n\n')
}

export function getReportMarkdown(report: LearningReport): string {
  if (typeof report.bodyMarkdown === 'string' && report.bodyMarkdown.length > 0) {
    return report.bodyMarkdown
  }
  return blocksToMarkdown(report.blocks)
}

function mapReport(id: string, data: Record<string, unknown>): LearningReport {
  const report = { id, ...data } as LearningReport
  if (!report.bodyMarkdown) {
    report.bodyMarkdown = blocksToMarkdown(report.blocks)
  }
  if (!Array.isArray(report.roadmapTopicIds)) {
    report.roadmapTopicIds = []
  }
  return report
}

export type ListReportsOptions = {
  /** Coach/observer: only submitted reports (required by security rules). */
  submittedOnly?: boolean
}

export async function listLearningReports(
  learnerId: string,
  options: ListReportsOptions = {},
): Promise<LearningReport[]> {
  const source = options.submittedOnly
    ? query(reports(learnerId), where('status', '==', 'submitted'))
    : reports(learnerId)
  const result = await getDocs(source)
  return result.docs
    .map((item) => mapReport(item.id, item.data() as Record<string, unknown>))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getLearningReport(
  learnerId: string,
  reportId: string,
): Promise<LearningReport | null> {
  try {
    const result = await getDoc(doc(db, paths.report(learnerId, reportId)))
    return result.exists()
      ? mapReport(result.id, result.data() as Record<string, unknown>)
      : null
  } catch {
    // Permission denied for drafts when viewer is coach/observer
    return null
  }
}

export type SaveReportInput = {
  title: string
  bodyMarkdown: string
  imagePaths?: string[]
  roadmapTopicIds?: string[]
  semesterId?: string | null
}

export async function saveLearningReportDraft(
  learnerId: string,
  values: SaveReportInput,
  reportId?: string,
): Promise<LearningReport> {
  const reference = reportId
    ? doc(db, paths.report(learnerId, reportId))
    : doc(reports(learnerId))
  const existing = reportId ? await getLearningReport(learnerId, reportId) : null
  const timestamp = now()
  const alreadySubmitted = existing?.status === 'submitted'
  const report: LearningReport = {
    id: reference.id,
    learnerId,
    title: values.title.trim() || 'Ohne Titel',
    status: alreadySubmitted ? 'submitted' : 'draft',
    bodyMarkdown: values.bodyMarkdown,
    imagePaths: values.imagePaths ?? existing?.imagePaths ?? [],
    roadmapTopicIds: values.roadmapTopicIds ?? existing?.roadmapTopicIds ?? [],
    semesterId: values.semesterId ?? null,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    submittedAt: alreadySubmitted ? (existing.submittedAt ?? null) : null,
  }
  await setDoc(reference, report, { merge: true })
  return report
}

export async function submitLearningReport(
  learnerId: string,
  reportId: string,
): Promise<void> {
  const existing = await getLearningReport(learnerId, reportId)
  if (!existing) throw new Error('Lernbericht nicht gefunden.')
  if (existing.status === 'submitted') return
  const timestamp = now()
  await updateDoc(doc(db, paths.report(learnerId, reportId)), {
    status: 'submitted',
    submittedAt: timestamp,
    updatedAt: timestamp,
  })
}

export async function deleteLearningReportDraft(
  learnerId: string,
  reportId: string,
): Promise<void> {
  const existing = await getLearningReport(learnerId, reportId)
  if (!existing) return
  if (existing.status === 'submitted') {
    throw new Error('Eingereichte Lernberichte können nicht gelöscht werden.')
  }
  const pathsToDelete = [
    ...(existing.imagePaths ?? []),
    ...(existing.blocks ?? [])
      .filter((block) => block.type === 'image' && block.imagePath)
      .map((block) => block.imagePath!),
  ]
  for (const imagePath of pathsToDelete) {
    try {
      await deleteObject(ref(storage, imagePath))
    } catch {
      // ignore missing files
    }
  }
  await deleteDoc(doc(db, paths.report(learnerId, reportId)))
}

export async function uploadReportImage(
  learnerId: string,
  reportId: string,
  file: File,
): Promise<{ imageUrl: string; imagePath: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Nur Bilddateien sind erlaubt.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Bilder dürfen maximal 5 MB gross sein.')
  }

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const imagePath = reportImagePath(learnerId, reportId, `${Date.now()}_${safeName}`)
    const storageRef = ref(storage, imagePath)
    await uploadBytes(storageRef, file, { contentType: file.type })
    const imageUrl = await getDownloadURL(storageRef)
    return { imageUrl, imagePath }
  } catch {
    const imageUrl = await compressImageToDataUrl(file)
    return { imageUrl, imagePath: '' }
  }
}

async function compressImageToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const maxWidth = 1280
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Bild konnte nicht verarbeitet werden.')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
  if (dataUrl.length > 700_000) {
    throw new Error('Bild ist zu gross. Bitte ein kleineres Bild wählen.')
  }
  return dataUrl
}
