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
