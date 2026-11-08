// SPDX-License-Identifier: CC0-1.0
// Cable ramp crossing: two linked sections of drop-over cable protector
// carrying a stage's feeder and signal cables across a walkway, one lid
// closed and one lid flipped open to show the cables in their channels.
// What makes it a cable ramp rather than a speed bump: a moulded body with
// sloped tread ramps either side, five cable channels down the middle, a
// hinged high-visibility lid over the channels, a dog-bone connector joining
// the sections, anti-slip tread ribs on the ramps, and real cables running
// through and out of the ends onto the floor.
// Generic visualization geometry at about real size (two 900 mm sections,
// 500 mm wide, 85 mm high), millimetres, Z up, cables run along X, standing
// on z = 0.

meta({
  name: "cable-ramp-crossing",
  license: 'CC0-1.0',
  title: "Cable ramp crossing",
  description: "Drop-over cable protector at about real size: two linked 900 mm sections with sloped tread ramps either side, five cable channels, hinged high-visibility lids (one closed, one flipped open), a dog-bone connector between sections, anti-slip tread ribs, and five feeder and signal cables running through the channels and out across the floor. Material controls: ramp body, channel lid, cable jackets, feeder cable. houseShow, touring and outdoorEvent presets.",
  tags: ['cable ramp', 'cable protector', 'cable crossover', 'yellow jacket', 'cable cover', 'stage power', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const body = param('body', '#d9661f', { label: 'Ramp body' });
const lid = param('lid', '#f2c418', { label: 'Channel lid' });
const cable = param('cable', '#1d1f22', { label: 'Signal cable jackets' });
const feeder = param('feeder', '#2a62b8', { label: 'Feeder cable' });

presets({
  houseShow: { body: '#2a2c2f', lid: '#f2c418', cable: '#1d1f22', feeder: '#2a62b8' },
  touring: { body: '#d9661f', lid: '#f2c418', cable: '#1d1f22', feeder: '#2a62b8' },
  outdoorEvent: { body: '#3b4a2f', lid: '#e8e4d8', cable: '#2b2b2b', feeder: '#c23b2a' },
});

const RUBBER = '#1a1b1d';

const p = assembly("cable-ramp-crossing");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const alongX = (len: number, r: number, n = 12) => cylinder(len, r, n).rotateY(90); // x from 0 to len

const SL = 900; // section length
const HW = 250; // half width
const TOP = 75; // body top
const CH = 5; // channels
const CW = 34; // channel width
const RIB = 10;
const CD = 46; // channel depth
const CHW = (CH * CW + (CH + 1) * RIB) / 2; // half width of channel block

// Body outline: ramps up to the top, then the channel comb open at the top.
const outline: number[][] = [[-HW, 0], [HW, 0], [HW, 6], [CHW, TOP]];
for (let i = CH - 1; i >= 0; i--) {
  const y0 = -CHW + RIB + i * (CW + RIB);
  outline.push([y0 + CW, TOP], [y0 + CW, TOP - CD], [y0, TOP - CD], [y0, TOP]);
}
outline.push([-CHW, TOP], [-HW, 6]);

const sections: [string, number][] = [["a", -SL / 2 - 5], ["b", SL / 2 + 5]];
for (const [s, x] of sections) {
  add(`body-${s}`, profileYZ(outline, SL).translate(x, 0, 0).color(body));
  // Anti-slip tread ribs on both ramps.
  for (const side of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const t = 0.25 + k * 0.25;
      const y = side * (HW - t * (HW - CHW));
      const z = 6 + t * (TOP - 6);
      const tilt = (Math.atan2(TOP - 6, HW - CHW) * 180) / Math.PI;
      add(`tread-${s}-${side < 0 ? 'f' : 'b'}-${k}`, box(SL - 60, 14, 6, true).rotateX(side < 0 ? tilt : -tilt).translate(x, y, z + 2).color(RUBBER));
    }
}

// Lids: closed on section a, flipped open on its back hinge on section b.
const LT = 10;
const lidShape = () => box(SL - 20, 2 * CHW + 6, LT, true);
add("lid-a", lidShape().translate(sections[0][1], 0, TOP + LT / 2).color(lid));
add("lid-a-hinge", alongX(SL - 20, 8).translate(sections[0][1] - SL / 2 + 10, CHW + 2, TOP + 4).color(lid));
add("lid-b", lidShape().translate(0, -(CHW + 3), LT / 2).rotateX(-115).translate(sections[1][1], CHW + 3, TOP).color(lid));
add("lid-b-hinge", alongX(SL - 20, 8).translate(sections[1][1] - SL / 2 + 10, CHW + 2, TOP + 4).color(lid));

// Dog-bone connector bridging the two ramp feet.
for (const side of [-1, 1]) {
  const y = side * (HW - 40);
  add(`dogbone-${side < 0 ? 'f' : 'b'}`, box(120, 30, 10, true).translate(0, y, 8).color(RUBBER));
  for (const dx of [-60, 60]) add(`dogbone-knob-${side < 0 ? 'f' : 'b'}-${dx < 0 ? 'l' : 'r'}`, cylinder(10, 26, 12).translate(dx, y, 3).color(RUBBER));
}

// Cables in the channels, dropping out of both ends onto the floor.
const rodXZ = (x0: number, z0: number, x1: number, z1: number, r: number) =>
  cylinder(Math.hypot(x1 - x0, z1 - z0), r, 12).rotateY((Math.atan2(x1 - x0, z1 - z0) * 180) / Math.PI).translate(x0, 0, z0);
const XI = SL + 5; // section ends
for (let i = 0; i < CH; i++) {
  const y = -CHW + RIB + i * (CW + RIB) + CW / 2;
  const r = i === 2 ? 16 : 13;
  const c = i === 2 ? feeder : cable;
  const zc = TOP - CD + r;
  add(`cable-${i}`, alongX(2 * XI, r).translate(-XI, y, zc).color(c));
  for (const sx of [-1, 1]) {
    const end = sx < 0 ? 'in' : 'out';
    add(`cable-${i}-drop-${end}`, rodXZ(sx * XI, zc, sx * (XI + 160), r, r).translate(0, y, 0).color(c));
    add(`cable-${i}-run-${end}`, alongX(320 + i * 40, r).translate(sx < 0 ? -(XI + 160) - 320 - i * 40 : XI + 160, y, r).color(c));
  }
}

return p.model();
