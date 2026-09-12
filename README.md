# devopsquiz

A static quiz web app for practising DevOps knowledge. Twenty domains, four question
formats, practice and exam modes, and a question bank that is meant to keep growing
(target: 1000+).

Live: https://jgyy.github.io/devopsquiz/

## Features

- Pick domains, difficulty, and question count; questions and option order are shuffled.
- **Practice mode**: instant feedback with an explanation and reference link after each question.
- **Practice terminal**: a real Linux (BusyBox) shell runs in the browser via the
  [v86](https://github.com/copy/v86) WebAssembly emulator. Open it under any question
  in practice mode to try commands. First open downloads ~7 MB.
- **Exam mode**: countdown timer, no feedback until the end, free navigation between questions.
- Results page with per-domain and per-difficulty breakdown and a full review; retry wrong answers only.
- Stats page with cumulative accuracy per domain, stored in your browser (localStorage). No backend.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit + component tests (Vitest)
npm run validate   # check the question bank
npm run lint
npm run build
```

## Adding questions

Questions live in `src/data/questions/<domain>.json`, one JSON array per domain.
Every question is validated by `npm run validate` (and by CI) against the schema in
`src/data/schema.ts`. Ids must be unique and follow `<domain>-<nnn>`.

```json
{
  "id": "docker-042",
  "domain": "docker",
  "difficulty": "medium",
  "type": "single",
  "prompt": "Which instruction sets the default executable of an image?",
  "options": ["RUN", "ENTRYPOINT", "COPY", "EXPOSE"],
  "answer": 1,
  "explanation": "ENTRYPOINT configures the executable; CMD supplies default arguments.",
  "reference": "https://docs.docker.com/reference/dockerfile/",
  "tags": ["dockerfile"]
}
```

Formats:

| type      | answer field                                        |
|-----------|-----------------------------------------------------|
| `single`  | index of the correct option                         |
| `multi`   | sorted array of correct option indices              |
| `boolean` | `true` or `false`                                   |
| `fill`    | array of accepted strings, optional `pattern` regex |

Fill answers are compared case-insensitively with whitespace collapsed.
To add a new domain, add it to `src/data/domains.ts` and import its file in `src/data/index.ts`.

## Deploy

Pushes to `main` run lint, validate, tests, and build, then publish `dist/` to GitHub Pages.
In the repository settings, set Pages "Source" to "GitHub Actions" once.
