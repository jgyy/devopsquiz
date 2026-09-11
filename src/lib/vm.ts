import { V86 } from 'v86'
import wasmUrl from 'v86/build/v86.wasm?url'
import kernelUrl from '../assets/vm/buildroot-bzimage.bin?url'
import biosUrl from '../assets/vm/seabios.bin?url'
import vgaBiosUrl from '../assets/vm/vgabios.bin?url'

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
