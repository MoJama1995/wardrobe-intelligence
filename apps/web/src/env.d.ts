/** Build-time environment variables. Only `VITE_`-prefixed values reach the browser bundle: never put secrets here. */
interface ImportMetaEnv {
  /** Absolute URL of services/api in deployed environments. Defaults to the dev proxy at `/api`. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
