// SPDX-License-Identifier: CC0-1.0
// Waste inspection platform: the raised steel gantry beside the reception
// lane where a site inspector looks down into each tipper or skip lorry
// before it is allowed onto the tipping floor. What makes it that platform
// rather than a table: a grating deck at lorry-body height on braced
// columns, yellow handrails with knee rails and toe boards, a steep stair
// with its own rails down to the yard, a self-closing safety gate at the
// stair head, a sloped inspection lectern, a floodlight and inspection
// mirror reaching out over the lane, and an optional rain canopy.
// Generic visualization geometry at about real size (deck 3.2 m up),
// millimetres, Z up, lane side on +X, stair descending toward -X.

meta({
  name: "waste-inspection-platform",
  license: 'CC0-1.0',
  title: "Waste inspection platform",
  description: "Load inspection gantry at about real size: grating deck 3.2 m up on braced steel columns, yellow handrails with knee rails and toe boards, steep stair with rails, self-closing safety gate, sloped lectern, floodlight and convex inspection mirror on an arm over the lane, and an optional mono-pitch rain canopy. Canopy on or off. Material controls: steel structure, handrails, deck grating and canopy. galvanised, painted, weathered and highVisibility presets.",
  tags: ["recycling", "inspection", "platform", "gantry", "stair", "handrail", "canopy", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#8e9598', { label: 'Steel structure (galvanised)' });
const handrail = param('handrail', '#f0c419', { label: 'Handrails (paint)' });
const grating = param('grating', '#4a4f52', { label: 'Deck and tread grating' });
const canopyColor = param('canopyColor', '#2f6b8f', { label: 'Canopy sheeting' });
const roof = param('roof', 'canopy', { choices: ['canopy', 'open'], label: 'Rain canopy' });

presets({
  galvanised: { steel: '#8e9598', handrail: '#f0c419', grating: '#4a4f52', canopyColor: '#2f6b8f' },
  painted: { steel: '#2f5e3c', handrail: '#e0a526', grating: '#3a3d40', canopyColor: '#c4c9cb' },
  weathered: { steel: '#6e6a62', handrail: '#a88f3c', grating: '#3c3a36', canopyColor: '#5f6f74' },
  highVisibility: { steel: '#3a3d40', handrail: '#f5d000', grating: '#2c2f31', canopyColor: '#d9692c' },
});

const p = assembly("waste-inspection-platform");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const tag = (x: number) => (x < 0 ? `m${Math.round(-x)}` : `p${Math.round(x)}`);
const bar = (x0: number, z0: number, x1: number, z1: number, y: number, w: number, h: number) => {
  const l = Math.hypot(x1 - x0, z1 - z0);
  return box(l, w, h, true).rotateY((-Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};

// Deck on four columns with cross bracing.
const DX = 3000, DY = 1600, DZ = 3200, HX = DX / 2, HY = DY / 2;
add("deck-grating", blk(0, 0, DZ - 40, DX, DY, 40).color(grating));
for (let k = 0; k < 13; k++) add(`grating-bar-${k}`, blk(-HX + 115 + k * 230, 0, DZ, 14, DY - 40, 4).color('#2c2f31'));
for (const y of [-HY, HY]) add(`deck-beam-${y < 0 ? 'f' : 'b'}`, blk(0, y, DZ - 240, DX + 40, 100, 200).color(steel));
for (const x of [-HX, HX]) add(`deck-beam-${tag(x)}`, blk(x, 0, DZ - 240, 100, DY, 200).color(steel));
for (const x of [-HX + 80, HX - 80]) {
  for (const y of [-HY + 80, HY - 80]) {
    const t = `${tag(x)}-${y < 0 ? 'f' : 'b'}`;
    add(`column-${t}`, blk(x, y, 0, 160, 160, DZ - 240).color(steel));
    add(`base-plate-${t}`, blk(x, y, 0, 320, 320, 20).color(steel));
  }
}
for (const y of [-HY + 80, HY - 80]) {
  add(`brace-a-${y < 0 ? 'f' : 'b'}`, bar(-HX + 160, 300, HX - 160, DZ - 340, y, 70, 70).color(steel));
  add(`brace-b-${y < 0 ? 'f' : 'b'}`, bar(-HX + 160, DZ - 340, HX - 160, 300, y, 70, 70).color(steel));
}
for (const x of [-HX + 80, HX - 80]) add(`brace-tie-${tag(x)}`, blk(x, 0, 1500, 80, DY - 160, 80).color(steel));

// Handrails round the deck: posts, top rail, knee rail and toe board. Stair opening on -X at the front.
const RZ = DZ + 1100, SW = 900;
const railX = (x0: number, x1: number, y: number, n: string) => {
  add(`top-rail-${n}`, blk((x0 + x1) / 2, y, RZ - 50, x1 - x0, 50, 50).color(handrail));
  add(`knee-rail-${n}`, blk((x0 + x1) / 2, y, DZ + 500, x1 - x0, 40, 40).color(handrail));
  add(`toe-board-${n}`, blk((x0 + x1) / 2, y, DZ, x1 - x0, 12, 150).color(handrail));
};
const railY = (y0: number, y1: number, x: number, n: string) => {
  add(`top-rail-${n}`, blk(x, (y0 + y1) / 2, RZ - 50, 50, y1 - y0, 50).color(handrail));
  add(`knee-rail-${n}`, blk(x, (y0 + y1) / 2, DZ + 500, 40, y1 - y0, 40).color(handrail));
  add(`toe-board-${n}`, blk(x, (y0 + y1) / 2, DZ, 12, y1 - y0, 150).color(handrail));
};
railX(-HX, HX, -HY + 25, 'front');
railX(-HX, HX, HY - 25, 'back');
railY(-HY + 25 + SW, HY - 25, -HX + 25, 'stair-side');
railY(-HY + 25, HY - 25, HX - 25, 'lane-side');
const postsAt: [number, number][] = [[-HX + 25, -HY + 25], [0, -HY + 25], [HX - 25, -HY + 25], [-HX + 25, HY - 25], [0, HY - 25], [HX - 25, HY - 25], [-HX + 25, -HY + 25 + SW], [HX - 25, 0]];
for (const [x, y] of postsAt) add(`rail-post-${tag(x)}-${tag(y)}`, blk(x, y, DZ, 50, 50, RZ - DZ).color(handrail));

// Self-closing safety gate across the stair head.
add("safety-gate-rail", blk(-HX + 25, -HY + 25 + SW / 2, RZ - 70, 40, SW - 80, 40).color(handrail));
add("safety-gate-knee", blk(-HX + 25, -HY + 25 + SW / 2, DZ + 520, 40, SW - 80, 40).color(handrail));
add("safety-gate-stile", blk(-HX + 25, -HY + 25 + SW - 60, DZ + 480, 40, 40, RZ - DZ - 520).color(handrail));
add("safety-gate-spring", cylinder(160, 22, 10).translate(-HX + 25, -HY + 70, DZ + 700).color('#3a3d40'));

// Stair down toward -X on the front side, with two stringers, treads and rails.
const N = 16, RISE = DZ / N, GO = 210, run = N * GO, SY0 = -HY + 25, SYC = SY0 + SW / 2;
const x0 = -HX, xf = -HX - run;
for (const s of [-1, 1]) {
  const y = SYC + s * (SW / 2 - 20);
  add(`stringer-${s < 0 ? 'f' : 'b'}`, bar(xf + 150, 160, x0, DZ - 60, y, 20, 240).color(steel));
  add(`stair-rail-${s < 0 ? 'f' : 'b'}`, bar(xf, 1000, x0, DZ + 1000, y, 50, 50).color(handrail));
  for (const k of [2, 8, 14]) add(`stair-post-${s < 0 ? 'f' : 'b'}-${k}`, blk(xf + k * GO, y, (k + 0.5) * RISE, 50, 50, 1000).color(handrail));
  add(`stair-foot-${s < 0 ? 'f' : 'b'}`, blk(xf + 230, y, 0, 220, 120, 20).color(steel));
}
for (let k = 0; k < N - 1; k++) add(`tread-${k}`, blk(xf + (k + 0.5) * GO + GO / 2, SYC, (k + 1) * RISE - 30, GO + 20, SW - 80, 30).color(grating));
for (let k = 0; k < N - 1; k++) add(`nosing-${k}`, blk(xf + (k + 1) * GO - GO / 2 + 10, SYC, (k + 1) * RISE - 30, 30, SW - 80, 32).color('#f0c419'));

// Sloped lectern facing the lane, with a clipboard.
const LX = HX - 600;
add("lectern-post", blk(LX, 200, DZ, 80, 80, 950).color(steel));
add("lectern-top", box(500, 380, 30, true).rotateY(-20).translate(LX + 20, 200, DZ + 990).color(steel));
add("lectern-sheet", box(260, 200, 6, true).rotateY(-20).translate(LX + 10, 200, DZ + 1010).color('#f2f2ee'));

// Arm out over the lane with a floodlight and a convex inspection mirror.
const AZ = DZ + 2300;
add("arm-mast", blk(HX - 60, HY - 60, DZ, 100, 100, AZ - DZ + 100).color(steel));
add("arm-boom", blk(HX + 700, HY - 60, AZ, 1500, 80, 80).color(steel));
add("floodlight-body", box(320, 120, 240, true).rotateY(35).translate(HX + 1300, HY - 60, AZ - 160).color('#3a3d40'));
add("floodlight-lens", box(260, 100, 10, true).rotateY(35).translate(HX + 1240, HY - 60, AZ - 240).color('#f6f0c8'));
add("mirror-hanger", blk(HX + 900, -300, AZ - 400, 40, 40, 480).color(steel));
add("mirror-arm", blk(HX + 900, (HY - 60 - 300) / 2, AZ, 60, HY - 60 + 300 + 40, 60).color(steel));
add("mirror-rim", cylinder(50, 300, 20).rotateY(-60).translate(HX + 900, -300, AZ - 560).color('#c8322a'));
add("mirror-face", sphere(290).scale([0.25, 1, 1]).rotateY(30).translate(HX + 875, -300, AZ - 545).color('#cfe0ea'));

// Mono-pitch canopy on four posts, sloping toward the back.
if (roof.value === 'canopy') {
  const CZf = DZ + 2700, CZb = DZ + 2400;
  for (const x of [-HX + 60, HX - 160]) for (const y of [-HY + 60, HY - 60]) add(`canopy-post-${tag(x)}-${y < 0 ? 'f' : 'b'}`, blk(x, y, DZ, 80, 80, (y < 0 ? CZf : CZb) - DZ).color(steel));
  const sl = (Math.atan2(CZf - CZb, DY) * 180) / Math.PI;
  add("canopy-sheet", box(DX + 400, Math.hypot(DY + 600, CZf - CZb), 40, true).rotateX(-sl).translate(-80, 0, (CZf + CZb) / 2 + 30).color(canopyColor));
  for (let k = 0; k < 9; k++) add(`canopy-rib-${k}`, box(30, Math.hypot(DY + 600, CZf - CZb), 30, true).rotateX(-sl).translate(-HX - 180 + k * 420, 0, (CZf + CZb) / 2 + 60).color(canopyColor));
  add("canopy-gutter", blk(-80, HY + 320, CZb - 120, DX + 400, 120, 120).color('#3a3d40'));
}

return p.model();
