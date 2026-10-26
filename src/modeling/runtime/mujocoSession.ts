// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mujocoSession.ts
//
// Node adapter for the host-independent MuJoCo session. The browser worker
// supplies its own WASM URL and uses mujocoSessionCore directly.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createMujocoSession, type MujocoSession, type MujocoSessionFactory } from './mujocoSessionCore';

export { MujocoSession } from './mujocoSessionCore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MujocoModule = any;

let cachedModule: MujocoModule | null = null;

/** Load and cache the MuJoCo WASM module from the installed Node package. */
async function loadModule(): Promise<MujocoModule> {
    if (cachedModule !== null) return cachedModule;
    const require_ = createRequire(import.meta.url);
    const pkgEntry = require_.resolve('@mujoco/mujoco');
    const pkgDir = dirname(pkgEntry);
    const wasmBinary = await readFile(join(pkgDir, 'mujoco.wasm'));
    // The CLI tsconfig uses Node module resolution, which does not honor the
    // package exports map. The runtime ESM loader does, so keep the specifier
    // indirect here and share the rest of the session implementation.
    const specifier = '@mujoco/mujoco';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import(specifier)) as any;
    cachedModule = await mod.default({
        wasmBinary,
        locateFile: (path: string) => join(pkgDir, path),
        print: () => undefined,
        printErr: () => undefined,
    });
    return cachedModule;
}

/** Compile an MJCF string into a fresh session owned by the caller. */
export const loadMujocoSession: MujocoSessionFactory = async (
    mjcfXml,
    bodyOrder,
    jointOrder,
): Promise<MujocoSession> => {
    const mujoco = await loadModule();
    return createMujocoSession(mujoco, mjcfXml, bodyOrder, jointOrder);
};
