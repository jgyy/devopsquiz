import { z } from 'zod'
import { DIFFICULTIES, DOMAIN_IDS } from './domains'

const baseFields = {
  id: z.string().regex(/^[a-z]+-\d{3,}$/, 'id must look like <domain>-<nnn>'),
  domain: z.enum(DOMAIN_IDS),
  difficulty: z.enum(DIFFICULTIES),
  prompt: z.string().min(1),
  explanation: z.string().min(1),
  /** Short command, snippet, or scenario showing the concept in use. Newlines allowed. */
  example: z.string().min(1),
  /** Mermaid source for a small diagram of the concept, shown after every answer. */
  diagram: z.string().min(1),
  reference: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
}

const optionsSchema = (min: number) =>
  z
    .array(z.string().min(1))
    .min(min)
    .max(6)
    .refine((opts) => new Set(opts).size === opts.length, 'options must be unique')

/** One note per option, same order as `options`: what the option is and why it is or isn't correct. */
const optionNotesSchema = z.array(z.string().min(1))
const notesMatchOptions = {
  message: 'optionNotes must have exactly one entry per option',
  path: ['optionNotes'],
}

const singleSchema = z
  .object({
    ...baseFields,
    type: z.literal('single'),
    options: optionsSchema(2),
    optionNotes: optionNotesSchema,
    answer: z.number().int().min(0),
  })
  .refine((q) => q.optionNotes.length === q.options.length, notesMatchOptions)
  .refine((q) => q.answer < q.options.length, { message: 'answer index out of range', path: ['answer'] })

const multiSchema = z
  .object({
    ...baseFields,
    type: z.literal('multi'),
    options: optionsSchema(3),
    optionNotes: optionNotesSchema,
    answer: z.array(z.number().int().min(0)).min(1),
  })
  .refine((q) => q.optionNotes.length === q.options.length, notesMatchOptions)
  .refine((q) => q.answer.every((i) => i < q.options.length), { message: 'answer index out of range', path: ['answer'] })
  .refine((q) => q.answer.every((v, i) => i === 0 || v > q.answer[i - 1]), {
    message: 'answer indices must be sorted ascending and unique',
    path: ['answer'],
  })

const booleanSchema = z.object({ ...baseFields, type: z.literal('boolean'), answer: z.boolean() })

const fillSchema = z
  .object({
    ...baseFields,
    type: z.literal('fill'),
    answer: z.array(z.string().min(1)).min(1),
    pattern: z.string().optional(),
  })
  .refine(
    (q) => {
      if (q.pattern === undefined) return true
      try {
        new RegExp(q.pattern, 'i')
        return true
      } catch {
        return false
      }
    },
    { message: 'pattern is not a valid regex', path: ['pattern'] },
  )

export const questionSchema = z
  .discriminatedUnion('type', [singleSchema, multiSchema, booleanSchema, fillSchema])
  .refine((q) => q.id.startsWith(`${q.domain}-`), { message: 'id prefix must match domain', path: ['id'] })

export type Question = z.infer<typeof questionSchema>
export type SingleQuestion = Extract<Question, { type: 'single' }>
export type MultiQuestion = Extract<Question, { type: 'multi' }>
export type BooleanQuestion = Extract<Question, { type: 'boolean' }>
export type FillQuestion = Extract<Question, { type: 'fill' }>
