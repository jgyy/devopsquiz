# DevOps Quiz Web App — Design Spec

Date: 2026-09-11

## Goal

A static, no-backend quiz web app for practicing DevOps knowledge across domains,
with a question bank of 500+ at launch that can grow past 1000 over time.

## Stack

- Vite + React + TypeScript single-page app.
- No backend. All state (attempt history, stats) lives in `localStorage`.
- Deployed to GitHub Pages via GitHub Actions.
- Tests: Vitest. Lint: ESLint. Schema validation: zod.

## Question bank

### Layout

```
src/data/questions/
  docker.json
  kubernetes.json
  cicd.json
  linux.json
  git.json
  terraform.json
  aws.json
  networking.json
  monitoring.json
  security.json
src/data/index.ts        # imports every domain file, exports the merged, typed array
src/data/domains.ts      # domain id -> display label, order
```

Each domain file is a JSON array of questions. Target at launch: 500+ total, at
least 50 per domain, mixed difficulty and format.

### Schema

```ts
type Domain = 'docker' | 'kubernetes' | 'cicd' | 'linux' | 'git'
            | 'terraform' | 'aws' | 'networking' | 'monitoring' | 'security';
type Difficulty = 'easy' | 'medium' | 'hard';

interface BaseQuestion {
  id: string;            // "<domain>-<nnn>", unique across the whole bank
  domain: Domain;
  difficulty: Difficulty;
  prompt: string;        // may contain inline code in backticks
  explanation: string;
  reference?: string;    // URL
  tags?: string[];
}

interface SingleQuestion extends BaseQuestion {
  type: 'single';
  options: string[];     // 2..6 entries
  answer: number;        // index into options
}
interface MultiQuestion extends BaseQuestion {
  type: 'multi';
  options: string[];     // 3..6 entries
  answer: number[];      // 1..options.length indices, sorted ascending
}
interface BooleanQuestion extends BaseQuestion {
  type: 'boolean';
  answer: boolean;
}
interface FillQuestion extends BaseQuestion {
  type: 'fill';
  answer: string[];      // accepted answers; compared trimmed, case-insensitive
  pattern?: string;      // optional regex (case-insensitive) that also accepts
}
type Question = SingleQuestion | MultiQuestion | BooleanQuestion | FillQuestion;
```

### Validation

`npm run validate` (`scripts/validate.ts`, run with `tsx`) loads every domain
file, parses each question against the zod schema, and fails on:

- schema violations (wrong type, missing fields, answer index out of range)
- duplicate ids across files
- a question whose `domain` field does not match its file
- options containing duplicate strings
- an invalid `pattern` regex

It prints a per-domain count table on success. The same zod schema is used by
`src/data/index.ts` in dev mode so a bad question fails fast in the browser too.

## Screens

Routing via `react-router-dom` with hash history (works on GitHub Pages).

### `/` Home

- Domain chips (multi-select, "All" toggle) with the count of available questions shown per chip.
- Difficulty filter: any / easy / medium / hard (multi-select chips).
- Question count: 10 / 20 / 40 / all-matching, capped to what the filter yields.
- Mode: Practice or Exam.
  - Exam: time limit input, default computed as 1 minute per question.
- Start button disabled with a hint if the filter yields zero questions.
- Link to Stats page.

### `/quiz` Quiz

- Shows one question at a time with a progress bar ("7 / 20") and domain + difficulty badges.
- Option order is shuffled once per attempt (except boolean).
- Answer inputs per type: radio (single), checkboxes (multi), two buttons (boolean), text input (fill).
- Practice mode: Submit reveals correct/incorrect state, highlights the right answer,
  shows explanation and reference link, then Next.
- Exam mode: Next moves on without feedback. Countdown timer in the header;
  when it hits zero, the attempt auto-submits with unanswered questions marked wrong.
  A "Finish" button is always available. Questions can be navigated back and forth in exam mode.
- Leaving the page mid-quiz discards the attempt (no resume in v1).

### `/results` Results

- Score (correct / total, percentage), time taken.
- Breakdown tables: per domain and per difficulty.
- Review list: each question, your answer, correct answer, explanation. Filter: all / wrong only.
- Buttons: Retry same settings, Retry wrong only, Back to Home.
- The attempt is saved to localStorage on arrival at this page.

### `/stats` Stats

- Total attempts, overall accuracy.
- Per-domain table: questions seen, correct, accuracy.
- Recent attempts list (date, mode, score).
- Reset history button with confirm.

## Core logic (`src/lib/`)

Pure, unit-tested modules with no React imports:

- `select.ts` — `filterQuestions(bank, {domains, difficulties})`, `sampleQuestions(list, n, rng)`,
  `shuffleOptions(question, rng)` returning a display order plus the remapped answer.
  Deterministic RNG (mulberry32) so tests are reproducible.
- `grade.ts` — `gradeAnswer(question, userAnswer): boolean`.
  - single: index equality
  - multi: set equality (all-or-nothing)
  - boolean: equality
  - fill: trimmed, case-insensitive match against any accepted answer, or regex match if `pattern` set
- `score.ts` — `summarize(attempt)` producing totals and per-domain / per-difficulty breakdowns.
- `storage.ts` — load/save/clear attempt history under key `devopsquiz.history.v1`.
  Tolerates missing or corrupt storage by returning empty history.

## State

A single `QuizSession` object held in a React context:

```ts
interface QuizSession {
  settings: { domains: Domain[]; difficulties: Difficulty[]; count: number;
              mode: 'practice' | 'exam'; timeLimitSec?: number };
  questions: PreparedQuestion[];   // question + shuffled option order
  answers: Record<string, UserAnswer>;
  startedAt: number;
  finishedAt?: number;
}
```

## Error handling

- Corrupt localStorage: ignored, treated as empty, warning logged.
- Invalid question data: caught at validate time in CI; in dev the app throws with the offending id.
- Zero questions after filtering: Start disabled with a message.

## Testing

- Unit tests for every function in `src/lib/` including edge cases
  (multi with partial selection, fill with extra whitespace and different case, regex path, empty bank).
- A test that loads the real bank through the zod schema (same check as `validate`).
- Component smoke tests with Testing Library for the Quiz page: answer a single-choice
  question in practice mode and see feedback; exam mode shows no feedback.

## CI / deploy

`.github/workflows/ci.yml`: on push and PR — install, lint, validate, test, build.
On push to `main`, deploy `dist/` to GitHub Pages. Vite `base` set from the repo name.

## Content plan

Generate 500+ questions across the ten domains, mixing the four formats and three
difficulties, every one with an explanation and most with a reference URL to
official docs. Roughly: 60% single, 15% multi, 15% boolean, 10% fill.

## Out of scope for v1

User accounts, server-side leaderboards, resume-in-progress attempts, spaced repetition,
question authoring UI, i18n.
