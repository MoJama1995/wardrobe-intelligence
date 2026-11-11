import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The course content lives one folder up (learning/), and repository files two folders up.
const learningDir = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = fileURLToPath(new URL('../..', import.meta.url)).replace(
  /\/$/,
  '',
)

export default defineConfig({
  plugins: [react()],
  // Used to turn links to repository files into vscode://file/... links. Local only.
  define: { __REPO_ROOT__: JSON.stringify(repoRoot) },
  server: {
    port: 5174,
    strictPort: true,
    fs: { allow: [learningDir] },
  },
  preview: { port: 5174, strictPort: true },
  test: { environment: 'node' },
})
