// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/demoPlayer/sectionParam.ts
//
// Parser for the demo-player section-plane URL params. The headless render
// path (`kernelcad render --section <axis>=<pos>`) forwards the validated
// flag as `?section=<axis>:<pos>` (+ `?sectionflip=1`); DemoPlayerPage turns
// the parsed state into a global renderer clipping plane via
// sectionPlaneFromState (../viewer/sectionPlane).

export interface SectionParamState {
  axis: 'x' | 'y' | 'z';
  position: number;
  flip: boolean;
}

/** Parse `?section=<axis>:<pos>` + `?sectionflip=1` demo-player URL params. */
export function parseSectionParam(
  raw: string | null,
  flipRaw: string | null,
): SectionParamState | null {
  if (!raw) return null;
  const m = /^([xyz]):(-?\d+(?:\.\d+)?)$/.exec(raw);
  if (!m) return null;
  return { axis: m[1] as 'x' | 'y' | 'z', position: Number(m[2]), flip: flipRaw === '1' };
}
