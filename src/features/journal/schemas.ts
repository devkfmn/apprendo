import { z } from 'zod'

export const journalAnswersSchema = z.object({
  workedOn: z.string().min(1, 'Bitte beschreibe, woran du gearbeitet hast.'),
  learned: z.string().min(1, 'Bitte beschreibe, was du gelernt hast.'),
  wentWell: z.string().optional(),
  difficulties: z.string().optional(),
  needSupport: z.string().optional(),
  nextWeek: z.string().optional(),
})

export const journalEntrySchema = z.object({
  semesterId: z.string().min(1),
  calendarWeek: z.number().int().min(1).max(53),
  year: z.number().int(),
  weekStart: z.string().min(1),
  weekEnd: z.string().min(1),
  answers: journalAnswersSchema,
  roadmapTopicIds: z.array(z.string()),
})

export type JournalEntryFormValues = z.infer<typeof journalEntrySchema>
