// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CaptureSession } from './capture/captureSession';
import { createSketchModule } from './sketch/index';
import { fontPath } from '../shared/fonts/fontPath';
import { q as queryNamespace } from '../kernel/naming/queryConstructors';
import type { KernelCadApi } from './api';

export function makeModuleNamespaces(
  session: CaptureSession,
): Pick<KernelCadApi, 'sketch' | 'fontPath' | 'q'> {
  return {
    sketch: createSketchModule(session),
    fontPath,

    // Query DSL constructor namespace (Slice Q). Exposed both as a top-level
    // global `q` (via the sandbox spread in `runScript`/`isolation`) AND
    // namespaced under `kc.q` for SKILL.md prose continuity. The wiring
    // below routes calls to the existing constructors in
    // `src/kernel/naming/queryConstructors.ts`; consumer-side resolution
    // of a Query value (`hole(q.face(...), ...)`) is gated on Q7 — until
    // then, agents inspect with `q.face(...).evaluate(scene)` (see Q-S6).
    q: queryNamespace,
  };
}
