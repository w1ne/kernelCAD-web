// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Capture-layer tests for Shape methods exercised without OCCT (no geometry).
import { describe, it, expect } from 'vitest';
import { CaptureSession } from './captureSession';
import { createApi } from '../api';

describe('Shape.draft() — capture layer (Task 6, Slice E)', () => {
  it('captures a draft feature on a named face', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const box = kcad.box(10, 10, 10);
    const drafted = box.draft(5, { face: 'front' });
    const rec = session.getRecords().find((r) => r.id === drafted.id);
    expect(rec?.kind).toBe('draft');
    expect(rec?.params.angle?.evaluated).toBe(5);
  });

  it('stores the face selector in inputs.face', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const box = kcad.box(10, 10, 10);
    const drafted = box.draft(3, { face: 'top' });
    const rec = session.getRecords().find((r) => r.id === drafted.id);
    expect(rec?.inputs.face).toBeDefined();
    expect((rec?.inputs.face as { ref?: { face?: string } })?.ref?.face).toBe('top');
  });

  it('stores neutralPlane in metadata when provided', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const box = kcad.box(10, 10, 10);
    const drafted = box.draft(5, { face: 'front', neutralPlane: 'bottom' });
    const rec = session.getRecords().find((r) => r.id === drafted.id);
    expect(rec?.metadata?.neutralPlane).toBe('bottom');
  });

  it('stores pullDir in metadata when provided', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const box = kcad.box(10, 10, 10);
    const drafted = box.draft(5, { face: 'front', pullDir: [0, 0, 1] });
    const rec = session.getRecords().find((r) => r.id === drafted.id);
    expect(rec?.metadata?.pullDir).toEqual([0, 0, 1]);
  });

  it('defaults neutralPlane to the face value when not provided', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const box = kcad.box(10, 10, 10);
    const drafted = box.draft(5, { face: 'front' });
    const rec = session.getRecords().find((r) => r.id === drafted.id);
    expect(rec?.metadata?.neutralPlane).toBe('front');
  });

  it('links base shape in inputs.base', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const box = kcad.box(10, 10, 10);
    const boxId = box.id;
    const drafted = box.draft(5, { face: 'front' });
    const rec = session.getRecords().find((r) => r.id === drafted.id);
    expect((rec?.inputs.base as { id?: string })?.id).toBe(boxId);
  });
});
