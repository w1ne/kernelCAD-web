// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/capture/shapeColorUnknownName.test.ts
//
// `.color('orange')` / `.color('steel')` were stored as-is with no
// diagnostic, and `resolveColor()` (STEP, 3MF, PLY, viewer) mapped them to
// the default grey. The call now keeps its value but warns.
import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { resolveColor } from '../../../src/shared/render/palette';

function colorWarnings(session: CaptureSession) {
  return session.warnings.filter((w) => w.code === 'feature.color.unresolved');
}

describe('Shape.color() unresolved names', () => {
  it('warns on a CSS name and suggests its hex', () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const s = kcad.box(10, 10, 10);
    const c = s.color('orange' as never);
    expect(resolveColor('orange')).toBeUndefined();
    const warns = colorWarnings(session);
    expect(warns).toHaveLength(1);
    expect(warns[0].recordId).toBe(c.id);
    expect(warns[0].message).toContain("'#ffa500'");
  });

  it('warns on a material name and points at .finish()', () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    kcad.box(10, 10, 10).color('steel' as never);
    const warns = colorWarnings(session);
    expect(warns).toHaveLength(1);
    expect(warns[0].message).toContain(".finish('steel')");
  });

  it('accepts role tokens, hex and colour params without a warning', () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    kcad.box(10, 10, 10).color('servo');
    kcad.box(10, 10, 10).color('#3366cc');
    kcad.box(10, 10, 10).color(kcad.param('BodyColor', '#112233'));
    expect(colorWarnings(session)).toHaveLength(0);
  });
});
