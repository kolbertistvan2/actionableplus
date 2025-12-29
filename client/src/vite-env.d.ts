/// <reference types="vite/client" />

// Build-time constants injected via Vite define
declare const __GIT_COMMIT__: string;
declare const __GIT_BRANCH__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_ENABLE_LOGGER: string;
  readonly VITE_LOGGER_FILTER: string;
  // Add other env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
