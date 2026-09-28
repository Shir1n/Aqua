/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLOW_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
