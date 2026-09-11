# Practice-mode terminal (v86 Linux in the browser)

## Goal

Give practice mode a real Linux shell the learner can play with while answering
questions. The app is static (GitHub Pages, no backend), so the shell runs entirely in
the browser via WebAssembly.

## Components

- **Emulator**: `v86` npm package (`libv86.mjs` + `v86.wasm`). Boots a 32-bit Linux
  kernel in WebAssembly. No cross-origin isolation required.
- **Guest image**: v86's Buildroot bzImage (`buildroot-bzimage.bin`, ~5 MB) with
  BusyBox. Static assets live in `public/vm/`: `seabios.bin`, `vgabios.bin`,
  `buildroot-bzimage.bin`. `v86.wasm` is served from the same folder (copied from
  `node_modules/v86/build/` by a script run before build/dev).
- **Terminal UI**: `@xterm/xterm` bound to the v86 serial console.
  - guest -> screen: `serial0-output-byte` listener writes bytes to xterm.
  - keyboard -> guest: xterm `onData` sends the string via `serial0-send`.
- **`src/lib/vm.ts`**: small adapter that creates the emulator with the right asset
  URLs (respecting Vite `BASE_URL`), exposes `onOutput`, `send`, `restart`, `destroy`.
  Pure-ish and mockable in tests.
- **`src/components/Terminal.tsx`**: xterm wrapper. Lazy-loaded with `React.lazy`.
  Shows "Booting…" until the first prompt, an error message if WebAssembly is
  unsupported or assets fail to load, and a "Restart VM" button.
- **Quiz page**: in practice mode only, an "Open terminal" toggle under the question
  card. The panel stays mounted (hidden with `hidden`) while toggled off so the VM keeps
  its state across questions.

## Data flow

Quiz toggle -> mounts `Terminal` -> `createVm()` fetches bios/kernel/wasm -> serial
bytes stream into xterm -> user keystrokes stream back.

## Error handling

- `typeof WebAssembly === 'undefined'` -> message, no attempt to load.
- Asset fetch or emulator init throws -> message with retry.
- Restart button destroys and recreates the emulator.

## Testing

- Unit test for the serial adapter (byte accumulation and CR/LF handling).
- Quiz component test verifies the toggle appears only in practice mode; the
  `Terminal` module is mocked.
- Real boot is checked manually in a browser.

## Out of scope

kubectl/docker inside the VM, persistence of VM state across reloads, networking.
