// tests/unit/kinematic/fixtures/cantileverBracket.ts
//
// Two-part cantilever bracket fixture used by the closed-form beam tests.
// `wall` is a fixed block representing the root, `cantilever` is a slender
// bar (50 mm wide × 5 mm tall × 200 mm long along +X) fastened to the
// wall at its root. The single-mate / load-at-end geometry is exactly the
// applicability envelope of the v1 cantilever approximation.

import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';
import type { Assembly } from '../../../../src/modeling/capture/assembly';
import type { AssemblyCrossSection } from '../../../../src/modeling/capture/assembly';

export interface CantileverBracketFixture {
  readonly arm: Assembly;
  readonly partName: 'cantilever';
  readonly crossSection: AssemblyCrossSection;
}

/**
 * Build a single-mate cantilever bracket. Default cross-section is the
 * 50×5×200 mm slender beam used by T6.5 (width 50 mm × height 5 mm × free
 * span 200 mm); pass `crossSection` to vary it. Pass
 * `{ withCrossSection: false }` to omit the declaration entirely and
 * exercise the K7 not-applicable path.
 */
export function buildCantileverBracket(
  opts: {
    readonly crossSection?: AssemblyCrossSection;
    readonly withCrossSection?: boolean;
  } = {},
): CantileverBracketFixture {
  const session = new CaptureSession();
  const kc = createApi({ session });
  const arm = kc.assembly('cantilever-bracket');

  const cs: AssemblyCrossSection = opts.crossSection ?? {
    kind: 'rectangle',
    widthMm: 50,
    heightMm: 5,
    lengthMm: 200,
  };

  // Wall: 40×40×40 fixed block at the origin with a 'frame'-typed mate
  // connector on its +X face.
  arm
    .part('wall', kc.box(40, 40, 40, true))
    .connector('anchor', {
      type: 'frame',
      origin: { kind: 'vec3', value: [20, 0, 0] },
    });

  // Cantilever: a 200-long bar laid along +X. The visual shape sits at
  // (100, 0, 0) so its root face aligns with the wall's +X face; the
  // closed-form beam reads dimensions from `crossSection`, not the BREP.
  const beamShape = kc.box(200, 50, 5, true).translate(100, 0, 0);
  const beamRefOpts = opts.withCrossSection === false ? {} : { crossSection: cs };
  arm
    .part('cantilever', beamShape, beamRefOpts)
    .connector('root', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    });

  arm.mate('rootMate', 'wall.anchor', 'cantilever.root', 'fastened');

  return { arm, partName: 'cantilever', crossSection: cs };
}
