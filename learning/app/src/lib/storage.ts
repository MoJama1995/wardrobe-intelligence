/**
 * localStorage, wrapped so the viewer keeps working (without saving) when storage is blocked,
 * e.g. in a private window.
 */

export function storageAvailable(): boolean {
  try {
    const probe = '__course_viewer_probe__'
    window.localStorage.setItem(probe, probe)
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function readJSON(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? undefined : (JSON.parse(raw) as unknown)
  } catch {
    return undefined
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: progress stays in memory for this session.
  }
}
