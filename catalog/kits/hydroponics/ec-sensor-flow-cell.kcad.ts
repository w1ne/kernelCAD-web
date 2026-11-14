// SPDX-License-Identifier: CC0-1.0
// EC sensor flow cell: the sensor panel that samples nutrient solution off the
// feed line and reads its conductivity (how much fertiliser is dissolved).
// What makes it an EC flow cell: a clear vertical acrylic cell held off a
// polypropylene backboard in ring clips, solution entering at the bottom
// through a ball valve and leaving near the top so the cell always runs full
// and bubble-free, the EC electrode pushed in from the top through a
// compression gland, an optional temperature probe in a side gland for
// compensation, and both cables running to a wall transmitter with an LCD
// and keys; hose barbs, a sample tap and flow arrows on the panel.
// Generic visualization geometry at about real size (cell 64 mm diameter,
// panel 440 x 620 mm on a floor stand), millimetres, Z up, front -Y.

meta({
  name: "ec-sensor-flow-cell",
  license: 'CC0-1.0',
  title: "EC sensor flow cell",
  description: "Panel-mounted conductivity flow cell at about real size: clear acrylic cell in ring clips on a polypropylene backboard, bottom inlet with ball valve and sample tap, top outlet, EC electrode in a top compression gland with its cable arcing to an LCD transmitter, optional temperature probe in a side gland, hose barbs and flow arrows, on a floor stand. Material controls: backboard, flow cell, pipework, transmitter housing, plus an EC-only or EC + temperature probe choice. greyPanel, blueTransmitter, labWhite and weathered presets.",
  tags: ['ec sensor', 'conductivity', 'flow cell', 'sensor panel', 'transmitter', 'nutrient monitoring', 'fertigation', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const board = param('backboard', '#e4e3dc', { label: 'Backboard (polypropylene)' });
const cell = param('flowCell', '#b9dbe4', { label: 'Flow cell (clear acrylic)' });
const pipe = param('pipework', '#5d6a73', { label: 'Pipework and fittings (PVC-U)' });
const housing = param('transmitter', '#2f6fa8', { label: 'Transmitter housing (polycarbonate)' });
const probes = param('probes', 'EC + temperature', { choices: ['EC only', 'EC + temperature'], label: 'Probes fitted' });

presets({
  greyPanel: { backboard: '#e4e3dc', flowCell: '#b9dbe4', pipework: '#5d6a73', transmitter: '#2f6fa8' },
  blueTransmitter: { backboard: '#3b4248', flowCell: '#c6e4ec', pipework: '#9aa3a8', transmitter: '#1f5d99' },
  labWhite: { backboard: '#f3f2ee', flowCell: '#d2eaf0', pipework: '#c9ced1', transmitter: '#e7e3d6' },
  weathered: { backboard: '#c9c3b2', flowCell: '#a9bcb8', pipework: '#7a7a70', transmitter: '#5f7a8e' },
});

const p = assembly("ec-sensor-flow-cell");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const arc = (name: string, a: [number, number, number], b: [number, number, number], lift: number, r: number, n: number, col: string) => {
  const pt = (u: number): [number, number, number] => [
    a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u + Math.sin(Math.PI * u) * lift,
  ];
  for (let k = 0; k < n; k++) add(`${name}-${k}`, rod(pt(k / n), pt((k + 1) / n), r).color(col));
};

// Floor stand: base plate, two square posts, backboard.
add("base-plate", blk(-50, 10, 0, 640, 320, 12).color('#5a6066'));
for (const x of [-220, 160]) add(`post-${x}`, blk(x, 30, 12, 40, 40, 900).color('#5a6066'));
add("backboard", blk(-30, 0, 280, 440, 16, 620).color(board));
for (const [x, z] of [[-230, 300], [170, 300], [-230, 880], [170, 880]]) add(`board-screw-${x}-${z}`, cylY(x, -8, z, 3, 6, 8).color('#9aa3a8'));

// Flow cell: clear tube between end caps, held in two ring clips.
const CX = -80, CY = -60;
add("cell-tube", cylZ(CX, CY, 420, 300, 32, 18).color(cell));
add("cell-bottom-cap", cylZ(CX, CY, 390, 32, 38, 18).color(pipe));
add("cell-top-cap", cylZ(CX, CY, 718, 32, 38, 18).color(pipe));
for (const z of [470, 640]) {
  add(`clip-ring-${z}`, cylZ(CX, CY, z, 20, 38, 18).subtract(cylZ(CX, CY, z - 5, 30, 33, 18)).color('#3b3f42'));
  add(`clip-stem-${z}`, blk(CX, -16, z, 30, 18, 20).color('#3b3f42'));
}
add("level-band", cylZ(CX, CY, 700, 6, 33, 18).color('#2f6fa8'));

// Inlet: up through the bottom cap from a ball valve, sample tap, hose barb.
add("inlet-riser", cylZ(CX, CY, 330, 62, 10, 10).color(pipe));
add("inlet-elbow", sphere(14).translate(CX, CY, 330).color(pipe));
add("inlet-pipe", cylX(-270, CY, 330, 190, 10, 10).color(pipe));
add("inlet-valve", cylX(-215, CY, 330, 56, 20, 12).color(pipe));
add("inlet-valve-lever", blk(-187, CY - 34, 352, 18, 70, 10).color('#c0392b'));
add("sample-tap", cylZ(-140, CY, 280, 50, 7, 8).color(pipe));
add("sample-tap-handle", blk(-140, CY, 300, 36, 8, 8).color('#2f6fa8'));
add("inlet-barb", cylX(-310, CY, 330, 42, 7, 8).color('#c9ced1'));
arc("inlet-hose", [-310, CY, 330], [-345, CY + 20, 20], -10, 9, 3, '#2a2d30');

// Outlet: side tee near the top, out to a barb and hose.
add("outlet-pipe", cylX(-270, CY, 690, 160, 10, 10).color(pipe));
add("outlet-boss", cylX(-125, CY, 690, 20, 16, 10).color(pipe));
add("outlet-barb", cylX(-310, CY, 690, 42, 7, 8).color('#c9ced1'));
arc("outlet-hose", [-310, CY, 690], [-350, CY + 30, 20], 40, 9, 5, '#2a2d30');

// EC electrode in the top compression gland, cable arcing to the transmitter.
add("top-gland", cylZ(CX, CY, 750, 26, 17, 12).color('#3b3f42'));
add("gland-nut", cylZ(CX, CY, 760, 14, 20, 6).color('#3b3f42'));
add("ec-electrode", cylZ(CX, CY, 776, 110, 12, 14).color('#2a2d30'));
add("electrode-band", cylZ(CX, CY, 840, 10, 12.5, 14).color('#e3b52c'));
add("electrode-boot", cylZ(CX, CY, 886, 26, 7, 10).color('#1e2124'));
arc("ec-cable", [CX, CY, 912], [150, -43, 720], 120, 4, 8, '#1e2124');

// Transmitter: rounded housing, LCD with reading bars, keys, status LED, glands.
add("transmitter", extrudeRoundedRect(160, 140, 14, 70, { axis: 'y' }).translate(110, -78, 640).color(housing));
add("display-bezel", blk(110, -79, 645, 120, 3, 56).color('#22262a'));
add("display", blk(110, -80, 650, 108, 3, 46).color('#a9bfa0'));
for (const [x, w] of [[86, 14], [104, 14], [126, 14]]) add(`digit-${x}`, blk(x, -81.6, 664, w, 1, 22).color('#1f2a1c'));
add("units-legend", blk(150, -81.6, 664, 18, 1, 6).color('#1f2a1c'));
add("decimal-point", blk(95, -81.6, 664, 3, 1, 3).color('#1f2a1c'));
[-40, -14, 14, 40].forEach((dx, i) => add(`key-${i}`, cylY(110 + dx, -78, 593, 4, 8, 10).color(i === 0 ? '#c0392b' : '#e7e3d6')));
add("status-led", cylY(170, -78, 690, 3, 5, 8).color('#4f9a3a'));
add("top-gland-tx", cylZ(150, -43, 710, 14, 8, 8).color('#22262a'));
add("bottom-gland-power", cylZ(150, -43, 556, 14, 8, 8).color('#22262a'));
arc("power-cable", [150, -43, 556], [210, -20, 22], -30, 4, 4, '#1e2124');

// Optional temperature probe in a side gland, cable to the transmitter.
if (probes.value === 'EC + temperature') {
  add("temp-gland", cylX(-50, CY, 520, 28, 12, 10).color('#3b3f42'));
  add("temp-probe", cylX(-22, CY, 520, 56, 6, 10).color('#c9ced1'));
  add("temp-boot", cylX(34, CY, 520, 16, 5, 8).color('#1e2124'));
  add("bottom-gland-temp", cylZ(70, -43, 556, 14, 8, 8).color('#22262a'));
  add("temp-cable-a", rod([50, CY, 520], [70, -50, 530], 3.5).color('#1e2124'));
  add("temp-cable-b", rod([70, -50, 530], [70, -43, 556], 3.5).color('#1e2124'));
}

// Panel labels: EC tag and flow arrows.
add("ec-tag", blk(CX, -9, 296, 90, 2, 26).color('#2f6fa8'));
add("ec-tag-text", blk(CX, -10.2, 304, 50, 1, 10).color('#f2f2ec'));
add("flow-arrow-in", blk(-215, -9, 296, 70, 2, 10).color('#4f9a3a'));
add("flow-arrow-out", blk(-215, -9, 726, 70, 2, 10).color('#c0392b'));
add("flow-arrow-up", blk(-160, -9, 430, 10, 2, 220).color('#4f9a3a'));
for (const s of [-1, 1]) add(`flow-arrow-head-${s}`, box(8, 2, 34, true).rotateY(s * 35).translate(-160 + s * 9, -9, 640).color('#4f9a3a'));

return p.model();
