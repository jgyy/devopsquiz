# VM assets

Used by the practice-mode terminal (`src/components/Terminal.tsx`).

- `seabios.bin`, `vgabios.bin` — from https://github.com/copy/v86/tree/master/bios (SeaBIOS, LGPL-3.0).
- `buildroot-bzimage.bin` — v86's Buildroot/BusyBox Linux image from https://i.copy.sh/buildroot-bzimage.bin.
  Login is automatic; the shell prompt is `~% `.
- `v86.wasm` is imported from the `v86` npm package at build time.
