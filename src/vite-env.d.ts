/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_PASSWORD_HASH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
