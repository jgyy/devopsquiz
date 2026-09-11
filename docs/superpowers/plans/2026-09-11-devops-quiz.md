# DevOps Quiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static Vite + React quiz SPA with a validated 500+ question DevOps bank, practice and exam modes, results and stats pages, and GitHub Pages deploy.

**Architecture:** Pure, tested logic in `src/lib/` (select, grade, score, storage); question bank as per-domain JSON validated by a zod schema; React pages wired through a session context and hash router.

**Tech Stack:** Vite 7, React 19, TypeScript, react-router-dom (HashRouter), zod, Vitest, Testing Library, tsx, ESLint, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-11-devops-quiz-design.md`

## Global Constraints

- No backend; all persistence in `localStorage` under key `devopsquiz.history.v1`.
- Domains: docker, kubernetes, cicd, linux, git, terraform, aws, networking, monitoring, security.
- Question ids: `<domain>-<nnn>`, unique bank-wide; file's domain must match each question's `domain`.
- Vite `base` = `/devopsquiz/`.
- Commit after each task.

---

### Task 1: Scaffold project and tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vitest.setup.ts`, `eslint.config.js`

- [ ] **Step 1:** `npm create vite@latest . -- --template react-ts` (into the existing repo; keep README/LICENSE/.gitignore).
- [ ] **Step 2:** `npm i react-router-dom zod` and `npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom tsx`.
- [ ] **Step 3:** Set `base: '/devopsquiz/'` and `test: { environment: 'jsdom', setupFiles: './src/vitest.setup.ts' }` in `vite.config.ts` (use `/// <reference types="vitest/config" />`).
- [ ] **Step 4:** Add scripts: `"test": "vitest run"`, `"validate": "tsx scripts/validate.ts"`.
- [ ] **Step 5:** `npm run build` succeeds. Commit: `chore: scaffold vite react ts app`.

### Task 2: Question types and zod schema

**Files:**
- Create: `src/data/domains.ts`, `src/data/schema.ts`, `src/data/schema.test.ts`

**Produces:** `Domain`, `Difficulty`, `Question` union, `questionSchema` (zod), `DOMAINS: {id, label}[]`.

- [ ] **Step 1:** Write failing tests: valid single question parses; `answer` index out of range fails; multi with unsorted indices fails; fill with invalid regex fails; duplicate options fail.
- [ ] **Step 2:** Run `npx vitest run src/data/schema.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement `schema.ts` with `z.discriminatedUnion('type', [...])` plus `superRefine` for index ranges, sorted multi answers, duplicate options, regex validity. Export `type Question = z.infer<typeof questionSchema>`.
- [ ] **Step 4:** Tests pass. Commit: `feat: question schema and domain list`.

### Task 3: Bank loader and validation script

**Files:**
- Create: `src/data/questions/<domain>.json` (10 files, each initially 2 sample questions), `src/data/index.ts`, `src/data/bank.test.ts`, `scripts/validate.ts`

**Produces:** `export const QUESTIONS: Question[]` from `src/data/index.ts`; `validateBank(files: Record<Domain, unknown[]>): {errors: string[], counts: Record<Domain, number>}` in `src/data/validate.ts` (shared by script and test).

- [ ] **Step 1:** Failing test: `validateBank` returns error on duplicate id, on domain/file mismatch; returns zero errors for the real bank.
- [ ] **Step 2:** Implement `src/data/validate.ts` and `src/data/index.ts` (imports each JSON with `resolveJsonModule`, flattens).
- [ ] **Step 3:** `scripts/validate.ts` reads JSON files from disk, calls `validateBank`, prints count table, exits 1 on errors.
- [ ] **Step 4:** `npm run validate` and tests pass. Commit: `feat: bank loader and validate script`.

### Task 4: Core logic — select, grade, score, storage

**Files:**
- Create: `src/lib/rng.ts`, `src/lib/select.ts`, `src/lib/grade.ts`, `src/lib/score.ts`, `src/lib/storage.ts`, and a `.test.ts` beside each.

**Produces:**
```ts
mulberry32(seed: number): () => number
filterQuestions(bank: Question[], f: {domains: Domain[]; difficulties: Difficulty[]}): Question[]
sampleQuestions<T>(list: T[], n: number, rng: () => number): T[]
shuffleOptions(q: Question, rng): PreparedQuestion   // {question, order: number[]} order maps display idx -> original idx (identity for boolean/fill)
type UserAnswer = number | number[] | boolean | string | null
gradeAnswer(q: Question, a: UserAnswer): boolean
summarize(questions: Question[], answers: Record<string, UserAnswer>): Summary // {total, correct, byDomain, byDifficulty}
loadHistory(): AttemptRecord[]; saveAttempt(a: AttemptRecord): void; clearHistory(): void
```
- [ ] **Step 1:** Failing tests per module: filter by domain and difficulty; sample never exceeds list length and has no duplicates; grade multi partial → false, fill with `"  Docker  "` vs `docker` → true, regex path; summarize counts per domain; storage tolerates corrupt JSON.
- [ ] **Step 2:** Implement each module minimally.
- [ ] **Step 3:** All tests pass. Commit: `feat: quiz core logic`.

### Task 5: Session context and router shell

**Files:**
- Create: `src/session/SessionContext.tsx`, `src/pages/Home.tsx`, `src/pages/Quiz.tsx`, `src/pages/Results.tsx`, `src/pages/Stats.tsx`, `src/App.tsx` (modify), `src/styles.css`

**Produces:** `useSession()` returning `{session, start(settings), answer(id, a), finish(), reset()}`; `HashRouter` with routes `/`, `/quiz`, `/results`, `/stats`.

- [ ] **Step 1:** Implement context with `startSession(settings, bank, rng)` building `QuizSession` from Task 4 functions.
- [ ] **Step 2:** Home page: domain chips with counts, difficulty chips, count select, mode toggle, exam time input, Start (disabled on 0 matches).
- [ ] **Step 3:** Commit: `feat: session context, router, home page`.

### Task 6: Quiz page

**Files:**
- Create: `src/pages/Quiz.tsx`, `src/components/QuestionCard.tsx`, `src/components/Timer.tsx`, `src/pages/Quiz.test.tsx`

- [ ] **Step 1:** Failing component tests: practice mode shows explanation after Submit; exam mode shows no explanation; timer expiry triggers finish.
- [ ] **Step 2:** Implement QuestionCard inputs per type, feedback rendering, prev/next in exam mode, Finish button, Timer with `setInterval`.
- [ ] **Step 3:** Tests pass. Commit: `feat: quiz page`.

### Task 7: Results and Stats pages

**Files:**
- Modify: `src/pages/Results.tsx`, `src/pages/Stats.tsx`

- [ ] **Step 1:** Results: score, time, per-domain and per-difficulty tables, review list with wrong-only filter, Retry / Retry wrong / Home. Save attempt on mount (guard against double save with a ref).
- [ ] **Step 2:** Stats: totals, per-domain accuracy from history, recent attempts, Reset with `window.confirm`.
- [ ] **Step 3:** Commit: `feat: results and stats pages`.

### Task 8: Question bank content (500+)

**Files:**
- Modify: all `src/data/questions/*.json`

- [ ] **Step 1:** Write 50+ questions per domain, mix ~60% single / 15% multi / 15% boolean / 10% fill, all three difficulties, every one with explanation, most with reference URL.
- [ ] **Step 2:** `npm run validate` prints counts, total ≥ 500, zero errors.
- [ ] **Step 3:** Commit per domain or in batches: `content: add <domain> questions`.

### Task 9: CI and deploy

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1:** Workflow: on push/PR → `npm ci`, `npm run lint`, `npm run validate`, `npm test`, `npm run build`; on push to main → `actions/upload-pages-artifact` + `actions/deploy-pages`.
- [ ] **Step 2:** Update README with usage, adding-questions guide, and the Pages URL.
- [ ] **Step 3:** Commit: `ci: test, validate, deploy to GitHub Pages`.
