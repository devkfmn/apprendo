import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { labelForQuarter } from '@/lib/ims'
import type { CompanyRoadmapItem, ImsQuarter } from '@/types/domain'

type CompanyItemFormData = {
  title: string
  description: string
}

type CompanyItemFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  imsQuarter: ImsQuarter
  item?: CompanyRoadmapItem
  onSubmit: (data: CompanyItemFormData) => Promise<void>
}

export function CompanyItemForm({
  open,
  onOpenChange,
  imsQuarter,
  item,
  onSubmit,
}: CompanyItemFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = Boolean(item)

  useEffect(() => {
    if (open) {
      setTitle(item?.title ?? '')
      setDescription(item?.description ?? '')
      setError(null)
    }
  }, [open, item])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Titel ist erforderlich.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSubmit({ title: trimmedTitle, description: description.trim() })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Betriebsthema bearbeiten' : 'Betriebsthema hinzufügen'}
            </DialogTitle>
            <DialogDescription>{labelForQuarter(imsQuarter)}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company-title">Titel</Label>
              <Input
                id="company-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Thema im Betrieb"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-description">Beschreibung</Label>
              <Textarea
                id="company-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional: Details zum Thema"
                rows={4}
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern…' : isEdit ? 'Speichern' : 'Hinzufügen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
