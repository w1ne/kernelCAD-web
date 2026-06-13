// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// MUSE 'cnc_shoe_rack_compact_two_tier' — compact two-tier CNC timber shoe
// rack: left/right side panels (with lightening window cutouts and shelf
// mortises) + two solid shelves whose end tabs interlock through the side
// panels. 4 independent components, assembled with clearance fits.

const W = 720;          // overall width (x)
const D = 300;          // depth (y)
const H = 420;          // height (z)
const T = 18;           // side panel thickness
const SHELF_D = 260;    // shelf depth
const SHELF_T = 18;     // shelf thickness
const TAB_W = 120;      // tab (tenon) width along y
const CLR = 0.2;        // assembly clearance per side
const SHELF_Z = [70, 210]; // shelf underside heights

const rack = assembly('shoe-rack');

// Side panel centers: outer faces at +/- W/2.
const px = W / 2 - T / 2; // 351
// Two tabs per shelf end, centered at +/- 65 in y.
const tabCenters = [-65, 65];

// --- Side panels: vertical plates with a window cutout + shelf mortises ---
function sidePanel(sign: 1 | -1) {
  let panel = box(T, D, H, true).translate(sign * px, 0, H / 2);
  // Lightening window in the band ABOVE the upper shelf so the shelf
  // mortises stay in solid material (z 280..380, clear of the 210..228 shelf).
  const win = box(T + 2, 160, 100, true).translate(sign * px, 0, 330);
  panel = panel.subtract(win);
  // Through mortises for each shelf's two tabs.
  for (const z of SHELF_Z) {
    for (const ty of tabCenters) {
      const mortise = box(T + 2, TAB_W + 2 * CLR, SHELF_T + 2 * CLR, true)
        .translate(sign * px, ty, z + SHELF_T / 2);
      panel = panel.subtract(mortise);
    }
  }
  return panel.color('plate');
}
const left = rack.part('left_side_panel', sidePanel(-1));
const right = rack.part('right_side_panel', sidePanel(1));

// --- Shelves: solid panels with two through-tabs per end ------------------
const innerSpan = W - 2 * T; // body spans between the panels' inner faces
function shelf(idx: number, z: number) {
  const body = box(innerSpan - 2 * CLR, SHELF_D, SHELF_T, true)
    .translate(0, 0, z + SHELF_T / 2);
  let s = body;
  for (const sign of [-1, 1] as const) {
    for (const ty of tabCenters) {
      // Tab reaches through the panel, stopping 0.2 mm shy of the outer face.
      const tab = box(T - CLR, TAB_W, SHELF_T, true)
        .translate(sign * (innerSpan / 2 + (T - CLR) / 2 - 0.01), ty, z + SHELF_T / 2);
      s = s.union(tab);
    }
  }
  return s.color('beam');
}
const s1 = rack.part('shelf_panel_01', shelf(1, SHELF_Z[0]));
const s2 = rack.part('shelf_panel_02', shelf(2, SHELF_Z[1]));

// --- Mates: each shelf interlocks with both side panels -------------------
const shelfRefs = [
  ['shelf_panel_01', s1, SHELF_Z[0]],
  ['shelf_panel_02', s2, SHELF_Z[1]],
] as const;
for (const [name, ref, z] of shelfRefs) {
  for (const [side, panelRef, sign] of [['left_side_panel', left, -1], ['right_side_panel', right, 1]] as const) {
    const origin: [number, number, number] = [sign * (innerSpan / 2), 0, z + SHELF_T / 2];
    ref.connector(`tabs-${side}`, { type: 'frame', origin: { kind: 'vec3', value: origin }, axis: [sign, 0, 0] });
    panelRef.connector(`mortise-${name}`, { type: 'frame', origin: { kind: 'vec3', value: origin }, axis: [sign, 0, 0] });
    rack.mate(`${name}-to-${side}`, `${side}.mortise-${name}`, `${name}.tabs-${side}`, 'fastened');
  }
}

return rack.solvedModel({});
