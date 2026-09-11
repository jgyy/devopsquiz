# Practice-Mode Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real Linux shell (v86 WebAssembly emulator + xterm.js) that learners can open under the question card in practice mode.

**Architecture:** A thin `src/lib/vm.ts` module wraps the `v86` emulator (asset URLs, serial in/out, restart, destroy) and holds the one pure, unit-testable helper (prompt detection). `src/components/Terminal.tsx` owns an xterm.js instance and binds it to the VM; it is `React.lazy`-loaded so the emulator stays out of the main bundle. `Quiz.tsx` shows an "Open terminal" toggle in practice mode and keeps the panel mounted (hidden) so VM state survives question changes.

**Tech Stack:** React 19, Vite 8, Vitest 5, `v86` (BSD-2), `@xterm/xterm` 6.

**Spec:** `docs/superpowers/specs/2026-09-11-practice-terminal-design.md`

## Global Constraints

- Static site on GitHub Pages, Vite `base: '/devopsquiz/'`; every asset URL must go through Vite (`?url` imports), never hard-coded absolute paths.
- No backend; no cross-origin-isolation headers available.
- Guest image is v86's Buildroot bzImage (`buildroot-bzimage.bin`, ~5 MB); BusyBox prompt is `~% `.
- Terminal appears only when `settings.mode === 'practice'`.
- Commit messages: plain imperative, no AI attribution trailers (CLAUDE.md).
- `npm run lint`, `npm test`, `npm run build` must stay green.

---

### Task 1: Dependencies and VM assets

**Files:**
- Modify: `package.json` (deps added by npm)
- Create: `src/assets/vm/seabios.bin`, `src/assets/vm/vgabios.bin`, `src/assets/vm/buildroot-bzimage.bin`
- Create: `src/assets/vm/README.md`

**Interfaces:**
- Produces: the three binary files at the paths above, imported later via `?url`.

- [ ] **Step 1: Install packages**

```bash
npm install v86@^0.5.458 @xterm/xterm@^6.0.0
```

- [ ] **Step 2: Download BIOS and kernel image**

```bash
mkdir -p src/assets/vm
curl -L -o src/assets/vm/seabios.bin https://raw.githubusercontent.com/copy/v86/master/bios/seabios.bin
curl -L -o src/assets/vm/vgabios.bin https://raw.githubusercontent.com/copy/v86/master/bios/vgabios.bin
curl -L -o src/assets/vm/buildroot-bzimage.bin https://i.copy.sh/buildroot-bzimage.bin
ls -l src/assets/vm
```

Expected sizes: seabios 131072 bytes, vgabios 36352 bytes, bzimage 5166352 bytes.

- [ ] **Step 3: Document provenance**

Create `src/assets/vm/README.md`:

```markdown
# VM assets

Used by the practice-mode terminal (`src/components/Terminal.tsx`).

- `seabios.bin`, `vgabios.bin` — from https://github.com/copy/v86/tree/master/bios (SeaBIOS, LGPL-3.0).
- `buildroot-bzimage.bin` — v86's Buildroot/BusyBox Linux image from https://i.copy.sh/buildroot-bzimage.bin.
  Login is automatic; the shell prompt is `~% `.
- `v86.wasm` is imported from the `v86` npm package at build time.
```

- [ ] **Step 4: Verify build still passes**

Run: `npm run build`
Expected: succeeds (assets are not yet referenced, so no change in output).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/assets/vm
git commit -m "Add v86, xterm and Linux VM assets for practice terminal"
```

---

### Task 2: Prompt detector and support check in `src/lib/vm.ts`

**Files:**
- Create: `src/lib/vm.ts`
- Test: `src/lib/vm.test.ts`

**Interfaces:**
- Produces:
  - `makePromptDetector(prompt?: string): (byte: number) => boolean` — feed serial bytes one at a time; returns `true` exactly once, on the byte that completes the first occurrence of `prompt` (default `'~% '`).
  - `isVmSupported(): boolean` — `true` when `WebAssembly` exists.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/vm.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isVmSupported, makePromptDetector } from './vm'

const feed = (detect: (b: number) => boolean, text: string) => [...text].map((c) => detect(c.charCodeAt(0)))

describe('makePromptDetector', () => {
  it('fires once when the prompt first appears', () => {
    const detect = makePromptDetector('~% ')
    const hits = feed(detect, 'Welcome to Buildroot\r\n~% ')
    expect(hits.filter(Boolean)).toHaveLength(1)
    expect(hits.at(-1)).toBe(true)
  })

  it('does not fire on partial matches and never fires twice', () => {
    const detect = makePromptDetector('~% ')
    expect(feed(detect, '~%x~%').some(Boolean)).toBe(false)
    expect(feed(detect, ' ').at(-1)).toBe(true)
    expect(feed(detect, '~% ~% ').some(Boolean)).toBe(false)
  })
})

describe('isVmSupported', () => {
  it('is true in an environment with WebAssembly', () => {
    expect(isVmSupported()).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/vm.test.ts`
Expected: FAIL, cannot resolve `./vm`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/vm.ts`:

```ts
/** Returns true once, on the byte that completes the first occurrence of `prompt`. */
export function makePromptDetector(prompt = '~% '): (byte: number) => boolean {
  let buf = ''
  let done = false
  return (byte) => {
    if (done) return false
    buf = (buf + String.fromCharCode(byte)).slice(-prompt.length)
    if (buf === prompt) {
      done = true
      return true
    }
    return false
  }
}

export function isVmSupported(): boolean {
  return typeof WebAssembly !== 'undefined'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/vm.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/vm.ts src/lib/vm.test.ts
git commit -m "Add VM prompt detector and WebAssembly support check"
```

---

### Task 3: `createVm` emulator wrapper

**Files:**
- Modify: `src/lib/vm.ts`

**Interfaces:**
- Consumes: v86 `V86` class (`add_listener('serial0-output-byte', fn)`, `serial0_send(str)`, `restart()`, `destroy()`).
- Produces:
  ```ts
  export interface Vm {
    onOutput(cb: (byte: number) => void): () => void  // returns unsubscribe
    send(text: string): void
    restart(): void
    destroy(): Promise<void>
  }
  export async function createVm(): Promise<Vm>
  ```

This code talks to WebAssembly and real network fetches, so it is not unit-tested; it is verified by the manual browser check in Task 6.

- [ ] **Step 1: Append the wrapper to `src/lib/vm.ts`**

```ts
import { V86 } from 'v86'
import wasmUrl from 'v86/build/v86.wasm?url'
import biosUrl from '../assets/vm/seabios.bin?url'
import vgaBiosUrl from '../assets/vm/vgabios.bin?url'
import kernelUrl from '../assets/vm/buildroot-bzimage.bin?url'

export interface Vm {
  onOutput(cb: (byte: number) => void): () => void
  send(text: string): void
  restart(): void
  destroy(): Promise<void>
}

export async function createVm(): Promise<Vm> {
  const emulator = new V86({
    wasm_path: wasmUrl,
    bios: { url: biosUrl },
    vga_bios: { url: vgaBiosUrl },
    bzimage: { url: kernelUrl, async: false },
    filesystem: {},
    cmdline: 'tsc=reliable mitigations=off random.trust_cpu=on',
    autostart: true,
    disable_keyboard: true,
    disable_mouse: true,
  })
  await new Promise<void>((resolve) => emulator.add_listener('emulator-ready', () => resolve()))
  return {
    onOutput(cb) {
      emulator.add_listener('serial0-output-byte', cb)
      return () => emulator.remove_listener('serial0-output-byte', cb)
    },
    send: (text) => emulator.serial0_send(text),
    restart: () => emulator.restart(),
    destroy: () => emulator.destroy(),
  }
}
```

Keep the `makePromptDetector` and `isVmSupported` exports from Task 2 in the same file; put the imports at the top.

- [ ] **Step 2: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: success. If `v86/build/v86.wasm?url` fails to resolve types, add a `src/vite-env.d.ts` containing `/// <reference types="vite/client" />` (the `types` array in `tsconfig.app.json` already includes `vite/client`, so this should not be needed).

- [ ] **Step 3: Verify Task 2 tests still pass**

Run: `npx vitest run src/lib/vm.test.ts`
Expected: 3 passed. (jsdom can import `v86` without instantiating it; if the import itself throws under jsdom, move `createVm` and its imports to `src/lib/vmRuntime.ts` and leave the pure helpers in `vm.ts`.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/vm.ts
git commit -m "Add createVm wrapper around v86 emulator"
```

---

### Task 4: `Terminal` component and styles

**Files:**
- Create: `src/components/Terminal.tsx`
- Modify: `src/styles.css` (append)

**Interfaces:**
- Consumes: `createVm`, `isVmSupported`, `makePromptDetector` from `src/lib/vm.ts`; `Terminal` from `@xterm/xterm` and its CSS.
- Produces: `export default function Terminal(): JSX.Element` — no props. Renders the xterm container, a status line, and a "Restart VM" button.

- [ ] **Step 1: Create the component**

```tsx
import { Terminal as Xterm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef, useState } from 'react'
import { createVm, isVmSupported, makePromptDetector, type Vm } from '../lib/vm'

type Status = 'booting' | 'ready' | 'error'

export default function Terminal() {
  const hostRef = useRef<HTMLDivElement>(null)
  const vmRef = useRef<Vm | null>(null)
  const [status, setStatus] = useState<Status>('booting')
  const [error, setError] = useState<string | null>(null)
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (!isVmSupported()) {
      setStatus('error')
      setError('This browser does not support WebAssembly, so the terminal cannot run.')
      return
    }
    const term = new Xterm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      theme: { background: '#0f1419', foreground: '#e6edf3', cursor: '#3fb950' },
      convertEol: true,
    })
    term.open(host)
    term.writeln('Booting Linux… (downloads ~7 MB on first use)')

    let cancelled = false
    let unsubscribe = () => {}
    const detect = makePromptDetector()

    createVm()
      .then((vm) => {
        if (cancelled) return vm.destroy()
        vmRef.current = vm
        unsubscribe = vm.onOutput((byte) => {
          term.write(Uint8Array.of(byte))
          if (detect(byte)) setStatus('ready')
        })
        term.onData((data) => vm.send(data))
        term.focus()
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setStatus('error')
        setError(e instanceof Error ? e.message : 'Failed to start the virtual machine.')
      })

    return () => {
      cancelled = true
      unsubscribe()
      vmRef.current?.destroy()
      vmRef.current = null
      term.dispose()
    }
  }, [generation])

  function restart() {
    setStatus('booting')
    setError(null)
    setGeneration((g) => g + 1)
  }

  return (
    <div className="card terminal">
      <div className="terminal-bar">
        <span className={'muted small status-' + status}>
          {status === 'booting' ? 'Booting…' : status === 'ready' ? 'Ready — BusyBox shell (try ls, cat, grep, vi)' : 'Error'}
        </span>
        <button className="link" onClick={restart}>
          Restart VM
        </button>
      </div>
      {error ? <p className="terminal-error">{error}</p> : null}
      <div ref={hostRef} className="terminal-host" />
    </div>
  )
}
```

- [ ] **Step 2: Append styles to `src/styles.css`**

```css
.terminal { padding: 0.75rem; }
.terminal-bar { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.terminal-bar .status-ready { color: var(--ok); }
.terminal-bar .status-error { color: var(--bad); }
.terminal-error { color: var(--bad); margin: 0 0 0.5rem; font-size: 0.9rem; }
.terminal-host { height: 320px; background: #0f1419; border-radius: var(--radius); padding: 0.4rem; overflow: hidden; }
.terminal-host .xterm { height: 100%; }
```

- [ ] **Step 3: Type-check, lint, build**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: all succeed. The build output should show a separate chunk containing `libv86` once Task 5 lazy-loads it.

- [ ] **Step 4: Commit**

```bash
git add src/components/Terminal.tsx src/styles.css
git commit -m "Add Terminal component backed by v86 and xterm"
```

---

### Task 5: Practice-mode toggle in `Quiz.tsx`

**Files:**
- Modify: `src/pages/Quiz.tsx`
- Test: `src/pages/Quiz.test.tsx`

**Interfaces:**
- Consumes: `default` export of `src/components/Terminal.tsx` via `React.lazy`.

- [ ] **Step 1: Write the failing tests**

Add to the top of `src/pages/Quiz.test.tsx`, after the existing imports:

```ts
import { vi } from 'vitest'

vi.mock('../components/Terminal', () => ({ default: () => <div>TERMINAL PANEL</div> }))
```

Add inside `describe('Quiz page', ...)`:

```ts
  it('practice mode can open and hide the terminal without unmounting it', async () => {
    const user = userEvent.setup()
    renderQuiz('practice')
    expect(screen.queryByText('TERMINAL PANEL')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open terminal' }))
    expect(await screen.findByText('TERMINAL PANEL')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Hide terminal' }))
    expect(screen.getByText('TERMINAL PANEL')).not.toBeVisible()
  })

  it('exam mode has no terminal toggle', () => {
    renderQuiz('exam', { timeLimitSec: 600 })
    expect(screen.queryByRole('button', { name: /terminal/i })).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/Quiz.test.tsx`
Expected: the two new tests FAIL (no "Open terminal" button).

- [ ] **Step 3: Implement the toggle**

In `src/pages/Quiz.tsx`:

Change the React import and add the lazy component:

```tsx
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

const Terminal = lazy(() => import('../components/Terminal'))
```

Add state next to `revealed`:

```tsx
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalMounted, setTerminalMounted] = useState(false)
```

Add a handler after `next()`:

```tsx
  function toggleTerminal() {
    setTerminalMounted(true)
    setTerminalOpen((o) => !o)
  }
```

Insert directly after the `<QuestionCard … />` element, before the `{revealed && (…)}` block:

```tsx
      {!isExam && (
        <div className="terminal-toggle">
          <button className="link" onClick={toggleTerminal} aria-expanded={terminalOpen}>
            {terminalOpen ? 'Hide terminal' : 'Open terminal'}
          </button>
          {terminalMounted && (
            <div hidden={!terminalOpen}>
              <Suspense fallback={<p className="muted small">Loading terminal…</p>}>
                <Terminal />
              </Suspense>
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all tests pass, including the two new ones. If `toBeVisible` fails on the hidden wrapper, jsdom honours the `hidden` attribute, so check that the `hidden` prop is on the wrapping `div` and not dropped.

- [ ] **Step 5: Lint and build**

Run: `npm run lint && npm run build`
Expected: success; `dist/assets` contains a separate chunk with `libv86`/`xterm` and copies of `v86.wasm`, the two BIOS files and the bzImage.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Quiz.tsx src/pages/Quiz.test.tsx
git commit -m "Add practice-mode terminal toggle to quiz page"
```

---

### Task 6: Manual verification and README

**Files:**
- Modify: `README.md` (Features list)

- [ ] **Step 1: Document the feature**

In `README.md`, under `## Features`, after the Practice mode bullet add:

```markdown
- **Practice terminal**: a real Linux (BusyBox) shell runs in the browser via the
  [v86](https://github.com/copy/v86) WebAssembly emulator. Open it under any question
  in practice mode to try commands. First open downloads ~7 MB.
```

- [ ] **Step 2: Manual browser check**

Run: `npm run dev`, open the URL, start a practice session, click "Open terminal".
Expected:
- status changes from "Booting…" to "Ready" within ~10 s;
- typing `ls /` prints a directory listing; `echo hi | grep h` prints `hi`;
- Next question keeps the terminal and its shell history;
- "Restart VM" reboots to a fresh prompt;
- Exam mode shows no toggle.

Then `npm run build && npm run preview` and repeat the boot check on the preview URL to confirm asset paths work under `/devopsquiz/`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document practice-mode terminal"
```
