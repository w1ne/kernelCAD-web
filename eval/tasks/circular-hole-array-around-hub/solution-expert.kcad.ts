// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Hub: cylinder height 10, radius 30, anchored at origin.
const hub = cylinder(10, 30);

// Source tab: box 8.5 × 4 × 10 from x = 29.5 to 38, centered on Y/Z. Its
// inner end sinks 0.5 mm into the rim so tab and hub fuse; a flat face set
// at x = 30 only touches the round rim along a line, which the union leaves
// unfused (union.disconnected warning). Outer reach (x = 38) is unchanged.
// The pattern axis is the world Z.
const tab = box(8.5, 4, 10).translate(29.5, -2, 0);

const tabs = tab.patternCircular({ count: 6, axis: [0, 0, 1], angleDeg: 360 });

return hub.union(tabs);
