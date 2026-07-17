import { marked } from 'marked'
import { ImagePlus } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

marked.setOptions({ breaks: true, gfm: true })

type ReportEditorProps = {
  value: string
  readOnly?: boolean
  uploading?: boolean
  onChange: (value: string) => void
  onUploadImage?: (file: File) => Promise<string | null>
}

type ViewMode = 'markdown' | 'preview'

export function ReportEditor({
  value,
  readOnly,
  uploading,
  onChange,
  onUploadImage,
}: ReportEditorProps) {
  const [view, setView] = useState<ViewMode>(readOnly ? 'preview' : 'markdown')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const html = useMemo(() => {
    try {
      return marked.parse(value || '*Noch kein Inhalt.*') as string
    } catch {
      return '<p>Vorschau nicht verfügbar.</p>'
    }
  }, [value])

  const insertImageMarkdown = (imageUrl: string) => {
    const snippet = `\n\n![Bild](${imageUrl})\n\n`
    const el = textareaRef.current
    if (!el) {
      onChange(`${value}${snippet}`)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + snippet.length
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="space-y-3">
      {!readOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-md border border-line bg-canvas p-0.5">
            <button
              type="button"
              className={cn(
                'rounded px-3 py-1.5 text-xs font-semibold',
                view === 'markdown' ? 'bg-panel text-brand shadow-sm' : 'text-ink-muted',
              )}
              onClick={() => setView('markdown')}
            >
              Markdown
            </button>
            <button
              type="button"
              className={cn(
                'rounded px-3 py-1.5 text-xs font-semibold',
                view === 'preview' ? 'bg-panel text-brand shadow-sm' : 'text-ink-muted',
              )}
              onClick={() => setView('preview')}
            >
              Formatiert
            </button>
          </div>

          {view === 'markdown' && onUploadImage ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  void onUploadImage(file).then((url) => {
                    if (url) insertImageMarkdown(url)
                  })
                  event.target.value = ''
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="size-4" />
                {uploading ? 'Bild wird geladen…' : 'Bild einfügen'}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {view === 'markdown' && !readOnly ? (
        <Textarea
          ref={textareaRef}
          value={value}
          rows={18}
          placeholder={`# Überschrift\n\nSchreibe hier deinen Lernbericht in Markdown…\n\n## Untertitel\n\nText mit **fett** und *kursiv*.`}
          className="min-h-80 font-mono text-sm"
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <div
          className="markdown-body min-h-80 rounded-md border border-line bg-panel px-4 py-3"
          // Content is learner-authored Markdown rendered to HTML for preview.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      {!readOnly && view === 'markdown' ? (
        <p className="text-xs text-ink-muted">
          Markdown: <code>#</code> / <code>##</code> / <code>###</code> für Überschriften,{' '}
          <code>**fett**</code>, <code>*kursiv*</code>, Bilder mit dem Button «Bild einfügen».
        </p>
      ) : null}
    </div>
  )
}
