/// <reference types="vite/client" />
/// <reference types="@react-three/fiber" />

declare const __COMMIT_HASH__: string;
declare const __APP_VERSION__: string;
// True when this source is being bundled for the embed library
// (`vite.studio.config.ts`). Undefined in the standalone Vite app and
// during vitest runs. Used to dead-code-eliminate paths that ship a
// 25 MB worker / WASM blob into the embed bundle when the host always
// routes geometry through `StudioConfig.backendUrl`.
declare const __KERNELCAD_EMBED__: boolean | undefined;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
