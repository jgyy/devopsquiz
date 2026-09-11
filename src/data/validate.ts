import type { Domain } from './domains'
import { questionSchema, type Question } from './schema'

export interface ValidationResult {
  errors: string[]
  counts: Record<string, number>
  questions: Question[]
}

/** Validate every domain file. `files` maps a domain id to the raw parsed JSON array from that file. */
export function validateBank(files: Record<string, unknown>): ValidationResult {
  const errors: string[] = []
  const counts: Record<string, number> = {}
  const questions: Question[] = []
  const seen = new Map<string, string>()

  for (const [domain, raw] of Object.entries(files)) {
    if (!Array.isArray(raw)) {
      errors.push(`${domain}: file is not a JSON array`)
      continue
    }
    counts[domain] = 0
    raw.forEach((item, index) => {
      const parsed = questionSchema.safeParse(item)
      const label = (item as { id?: string })?.id ?? `#${index}`
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push(`${domain}/${label}: ${issue.path.join('.') || '(root)'} ${issue.message}`)
        }
        return
      }
      const q = parsed.data
      if (q.domain !== (domain as Domain)) {
        errors.push(`${domain}/${q.id}: domain "${q.domain}" does not match file "${domain}"`)
      }
      const prev = seen.get(q.id)
      if (prev) errors.push(`${domain}/${q.id}: duplicate id (also in ${prev})`)
      else seen.set(q.id, domain)
      questions.push(q)
      counts[domain]++
    })
  }
  return { errors, counts, questions }
}
