// SPDX-License-Identifier: MIT
import type { SketchCommand } from '../../shared/capture/sketchCommand';
import type { CaptureSession } from './captureSession';
import { makePath, type PathBuilder, type Sketch } from './sketch';

/**
 * One sketch record holding several closed loops: the first loop is the
 * outer boundary, every later loop a hole (the `moveTo … close` group
 * convention of {@link splitSketchLoops}). Each callback traces one loop on a
 * fresh pen, without its `close()`. Extruding it builds the holed face once
 * instead of subtracting a second extrude — the kernel-internal builder for
 * profiles such as a ring gear's bore.
 */
export function makeHoledSketch(
  session: CaptureSession,
  loops: ReadonlyArray<(pen: PathBuilder) => PathBuilder>,
): Sketch {
  const commands: SketchCommand[] = [];
  for (const trace of loops) {
    const pen = trace(makePath(session));
    // `commands` is TS-private to PathBuilder; this module owns it.
    commands.push(...(pen as unknown as { commands: readonly SketchCommand[] }).commands, { kind: 'close' });
  }
  return session.createSketch({ kind: 'sketch', inputs: {}, params: {}, metadata: { commands } });
}
