// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Hub: cylinder height 10, radius 30, anchored at origin.
const hub = cylinder(10, 30);

// Source tab: small box 8 × 4 × 10, anchored so its inner edge touches the
// rim at x = 30, centered on Y/Z. The pattern axis is the world Z.
const tab = box(8, 4, 10).translate(30, -2, 0);

const tabs = tab.patternCircular({ count: 6, axis: [0, 0, 1], angleDeg: 360 });

return hub.union(tabs);
