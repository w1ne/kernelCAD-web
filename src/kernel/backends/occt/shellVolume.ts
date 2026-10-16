// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/shellVolume.ts

/** Volume (mm³) of an OCCT shape, NaN when OCCT cannot integrate it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function shapeVolume(oc: any, shape: unknown): number {
  const props = new oc.GProp_GProps();
  try {
    oc.BRepGProp.VolumeProperties(shape, props, false, false, false);
    return Math.abs(props.Mass());
  } catch {
    return Number.NaN;
  } finally {
    props.delete();
  }
}

/**
 * A shell result must be a finite, positive-volume solid, and an inward
 * shell (thickness > 0) must remove material. OCCT 8's MakeThickSolid
 * reports IsDone with a valid solid equal to its input when the wall is
 * thicker than the body (box(10,10,10) shelled 100 mm returns the box), so
 * "done and valid" alone no longer means "hollowed".
 */
export function plausibleShellVolume(volume: number, bodyVolume: number, thickness: number): boolean {
  if (!Number.isFinite(volume) || volume <= 0) return false;
  if (thickness > 0 && Number.isFinite(bodyVolume) && volume >= bodyVolume * (1 - 1e-6)) return false;
  return true;
}
