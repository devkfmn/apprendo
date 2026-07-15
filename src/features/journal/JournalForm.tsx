import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RoadmapTopicPicker } from '@/features/journal/RoadmapTopicPicker'
import type { JournalEntry, RoadmapItemView } from '@/types/domain'
import type { JournalEntryFormValues } from './schemas'
import type { UseFormReturn } from 'react-hook-form'

type JournalFormProps = {
  form: UseFormReturn<JournalEntryFormValues>
  topics: RoadmapItemView[]
  readOnly?: boolean
}

const questions: Array<{
  key: keyof JournalEntry['answers']
  label: string
  help: string
  required?: boolean
}> = [
  { key: 'workedOn', label: 'Woran hast du diese Woche gearbeitet?', help: 'Beschreibe Aufgaben, Projekte oder Themen.', required: true },
  { key: 'learned', label: 'Was hast du gelernt?', help: 'Halte neue Erkenntnisse oder Fähigkeiten fest.', required: true },
  { key: 'wentWell', label: 'Was ist gut gelaufen?', help: 'Optional' },
  { key: 'difficulties', label: 'Wo gab es Schwierigkeiten?', help: 'Optional' },
  { key: 'needSupport', label: 'Wobei brauchst du Unterstützung?', help: 'Optional' },
  { key: 'nextWeek', label: 'Was nimmst du dir für nächste Woche vor?', help: 'Optional' },
]

export function JournalForm({ form, topics, readOnly = false }: JournalFormProps) {
  const selectedTopicIds = form.watch('roadmapTopicIds')
  const { errors } = form.formState

  return (
    <div className="space-y-6">
      {questions.map(({ key, label, help, required }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>
            {label} {required ? <span className="text-danger">*</span> : null}
          </Label>
          <p className="text-sm text-ink-muted">{help}</p>
          <Textarea id={key} rows={4} readOnly={readOnly} {...form.register(`answers.${key}`)} />
          {errors.answers?.[key] ? <p className="text-sm text-danger">{errors.answers[key]?.message}</p> : null}
        </div>
      ))}
      <div className="space-y-2">
        <Label>Behandelte Roadmap-Themen</Label>
        <p className="text-sm text-ink-muted">Wähle alle Themen aus, die in diesem Wochenrückblick vorkommen.</p>
        <RoadmapTopicPicker
          topics={topics}
          value={selectedTopicIds}
          disabled={readOnly}
          onChange={(ids) => form.setValue('roadmapTopicIds', ids, { shouldDirty: true })}
        />
      </div>
    </div>
  )
}
