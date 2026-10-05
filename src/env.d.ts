// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
  /** Feedback endpoint override; defaults to https://kernelcad.com/api/feedback. */
  readonly VITE_FEEDBACK_URL?: string;
  /** `1` forces the hosted mesh path on localhost (Playwright against prod APIs). */
  readonly VITE_HOSTED_MESH?: string;
  /** Override for the publish-time mesh CDN. Defaults to https://mesh.kernelcad.com. */
  readonly VITE_MESH_CDN_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Kernel API declarations for the Studio code editor, generated at build
 *  time by `scripts/editorTypings.ts` (`kernelCadEditorTypingsPlugin`). */
declare module 'virtual:kcad-editor-typings' {
  const typings: string;
  export default typings;
}
