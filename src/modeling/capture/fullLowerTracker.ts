// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { SoftWarningSink } from '../../shared/runtime/softWarning';
import type { CaptureSession, FullLowerSnapshot } from './captureSession';

interface FullLowerResult {
  readonly shapes: ReadonlyMap<string, ShapeBackend>;
  readonly diagnostics: readonly unknown[];
  readonly health: ReadonlyMap<string, string>;
}

/**
 * Track one full-record-chain lower of `session`: snapshot the inputs it
 * depends on up front, count the soft warnings it emits (forwarding them),
 * and tell afterwards whether it was clean — no warnings, no diagnostics,
 * every record healthy. Only a clean lower may seed a later one: a seeded
 * record emits no diagnostics or warnings, so reusing a dirty lower would
 * drop them.
 */
export function trackFullLower(session: CaptureSession, forward?: SoftWarningSink) {
  const pending = session.snapshotFullLower(new Map());
  let warnings = 0;
  const result = (r: FullLowerResult): { snapshot: FullLowerSnapshot; clean: boolean } => ({
    snapshot: { ...pending, shapes: r.shapes },
    clean: warnings === 0
      && r.diagnostics.length === 0
      && [...r.health.values()].every((h) => h === 'healthy'),
  });
  return {
    warningSink: ((warning) => { warnings += 1; forward?.(warning); }) as SoftWarningSink,
    result,
    /** Record `r` as the session's last full lower, and as its clean full
     *  lower when it was clean (probes that restore `lastFullLower`, such as
     *  mountingHoleAlignment, keep the clean one for the build to reuse). */
    publish(r: FullLowerResult): void {
      const { snapshot, clean } = result(r);
      session.lastFullLower = snapshot;
      if (clean) session.cleanScriptLower = snapshot;
    },
  };
}
