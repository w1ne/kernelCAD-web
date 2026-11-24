// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Demo source for the standalone `Surface.offset(distance)` workflow:
// build a curved NURBS panel (measured peak 3 mm), offset it 4 mm along its
// normal, then thicken the offset into a 3 mm mold-core skin. `capture.mts`
// measures the real lowered geometry and writes verification.json plus three
// PNG frames; the MP4 is encoded from those frames with ffmpeg.
const panel = nurbsSurface({
  controls: [
    [[0, 0, 0], [0, 20, 3], [0, 40, 0]],
    [[15, 0, 3], [15, 20, 6], [15, 40, 3]],
    [[30, 0, 0], [30, 20, 3], [30, 40, 0]],
  ],
  degree: { u: 2, v: 2 },
});
const offset = panel.offset(4);
return offset.thicken(3);
