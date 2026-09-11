import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { DOMAIN_IDS } from '../src/data/domains'
import { validateBank } from '../src/data/validate'

const dir = join(process.cwd(), 'src/data/questions')
const files: Record<string, unknown> = {}
for (const name of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const domain = basename(name, '.json')
  try {
    files[domain] = JSON.parse(readFileSync(join(dir, name), 'utf8'))
  } catch (err) {
    console.error(`${name}: invalid JSON: ${(err as Error).message}`)
    process.exit(1)
  }
}
for (const d of DOMAIN_IDS) if (!(d in files)) console.warn(`warning: no file for domain "${d}"`)

const { errors, counts } = validateBank(files)
const rows = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
const total = rows.reduce((n, [, c]) => n + c, 0)
console.log('Domain'.padEnd(14) + 'Questions')
for (const [d, c] of rows) console.log(d.padEnd(14) + String(c))
console.log('total'.padEnd(14) + String(total))

if (errors.length) {
  console.error(`\n${errors.length} error(s):`)
  for (const e of errors) console.error('  ' + e)
  process.exit(1)
}
console.log('\nBank is valid.')
