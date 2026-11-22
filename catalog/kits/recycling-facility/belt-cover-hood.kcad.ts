// SPDX-License-Identifier: CC0-1.0
// Belt cover hood: a conveyor section fitted with the half-round covers that
// keep wind, rain and litter off a troughed belt. What makes it that hood
// rather than a duct: hinged semicircular sheet covers in short lengths with
// clamp bands at each joint, latches on the walkway side, one cover swung
// open on its back hinge to show the loaded troughed belt, three-roll
// troughing idlers on channel stringers, and the return belt on rollers below,
// all on braced trestle legs.
// Generic visualization geometry at about real size (4 m section, 800 mm
// belt, 1.6 m tall), millimetres, Z up, latches on -Y.

meta({
  name: "belt-cover-hood",
  license: 'CC0-1.0',
  title: "Belt cover hood",
  description: "Conveyor belt cover section at about real size: hinged half-round sheet hoods with clamp bands and latches, one hood swung open to show the loaded troughed belt, three-roll troughing idlers on channel stringers, return belt and rollers below, braced trestle legs. One hood open or all closed. Material controls: hood, frame, belt and idler rolls. galvanised, painted and stainless presets.",
  tags: ["recycling", "conveyor", "belt cover", "conveyor hood", "troughed belt", "idler", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 5200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const hood = param('hood', '#b8bdbf', { label: 'Hood covers (galvanised sheet)' });
const frame = param('frame', '#2f6b8f', { label: 'Stringers and legs (paint)' });
const belt = param('belt', '#24272a', { label: 'Belt (rubber)' });
const rolls = param('rolls', '#c9a63a', { label: 'Idler rolls (paint)' });
const hoodState = param('hoodState', 'one-open', { choices: ['one-open', 'closed'], label: 'Hood covers' });

presets({
  galvanised: { hood: '#b8bdbf', frame: '#2f6b8f', belt: '#24272a', rolls: '#c9a63a' },
  painted: { hood: '#3f6e3a', frame: '#e0a526', belt: '#24272a', rolls: '#5d6366' },
  stainless: { hood: '#d4d8da', frame: '#5d6366', belt: '#2a3a4a', rolls: '#9aa0a4' },
});

const p = assembly("belt-cover-hood");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const L = 4000;
const ZB = 1000; // belt centre height
const SY = 520; // stringer offset
const ZS = 700; // stringer bottom
const RH = 560; // hood radius
const arc = (r: number, n: number, rev = false): [number, number][] => {
  const pts = Array.from({ length: n + 1 }, (_, i) => [r * Math.cos((Math.PI * i) / n), ZB + 20 + r * Math.sin((Math.PI * i) / n)] as [number, number]);
  return rev ? pts.reverse() : pts;
};
const crescent = (r0: number, r1: number, n = 14) => [...arc(r1, n), ...arc(r0, n, true)];

// Channel stringers on braced trestle legs.
for (const [s, sy] of [['f', -1], ['b', 1]] as const) {
  add(`stringer-${s}`, blk(0, sy * SY, ZS, L, 60, 150).subtract(blk(0, sy * (SY - 20), ZS + 15, L + 20, 40, 120)).color(frame));
  for (const x of [-1500, 1500]) {
    add(`leg-${s}-${x < 0 ? 'l' : 'r'}`, blk(x, sy * SY, 0, 90, 90, ZS).color(frame));
    add(`leg-foot-${s}-${x < 0 ? 'l' : 'r'}`, blk(x, sy * SY, 0, 200, 200, 15).color(frame));
  }
  add(`leg-brace-${s}`, rod([-1460, sy * SY, 120], [-700, sy * SY, ZS], 25, 8).color(frame));
  add(`leg-brace-${s}-r`, rod([1460, sy * SY, 120], [700, sy * SY, ZS], 25, 8).color(frame));
}
for (const x of [-1500, 1500]) add(`leg-tie-${x < 0 ? 'l' : 'r'}`, blk(x, 0, 300, 70, 2 * SY, 70).color(frame));

// Three-roll troughing idlers every 650 mm.
const WING = 35;
const wr = (WING * Math.PI) / 180;
for (let k = 0; k < 7; k++) {
  const x = -1950 + 50 + k * 650;
  add(`idler-base-${k}`, blk(x, 0, ZS + 150, 80, 2 * SY, 30).color(frame));
  for (const sy of [-1, 1]) add(`idler-bracket-${k}-${sy < 0 ? 'f' : 'b'}`, blk(x, sy * 460, ZS + 150, 60, 30, 260).color(frame));
  add(`idler-centre-${k}`, cylinder(320, 55, 10).rotateX(90).translate(x, 160, ZB - 60).color(rolls));
  for (const sy of [-1, 1]) {
    const y0 = sy * 170, z0 = ZB - 60;
    const y1 = y0 + sy * 300 * Math.cos(wr), z1 = z0 + 300 * Math.sin(wr);
    add(`idler-wing-${k}-${sy < 0 ? 'f' : 'b'}`, rod([x, y0, z0], [x, y1, z1], 55).color(rolls));
  }
}

// Troughed belt, with a ridge of mixed material on it.
const tz = Math.tan(wr) * 300;
const beltTop: [number, number][] = [[-460, ZB + tz], [-170, ZB], [170, ZB], [460, ZB + tz]];
const beltPts = [...beltTop, ...beltTop.map(([y, z]) => [y + (y > 0 ? 12 : y < 0 ? -12 : 0), z - 14] as [number, number]).reverse()];
add("belt-carry", profileYZ(beltPts, L).color(belt));
add("load-ridge", profileYZ([[-300, ZB + 60], [-180, ZB + 2], [180, ZB + 2], [300, ZB + 60], [140, ZB + 150], [-60, ZB + 170]], L - 200).color('#9a8b6a'));
const bits: [number, number, number][] = [[-1500, -90, 1], [-1200, 60, 0], [-900, -40, 2], [-650, 110, 3], [-350, -100, 0]];
bits.forEach(([x, y, c], k) => add(`load-bit-${k}`, box(180, 120, 50, true).rotateZ(k * 41).translate(x, y, ZB + 160).color(['#3c7fc0', '#e8e4d6', '#b0402c', '#5aa04a'][c])));
// Return belt on rollers below.
add("belt-return", blk(0, 0, ZS - 160, L, 900, 12).color(belt));
for (const x of [-1300, 0, 1300]) add(`return-roller-${x < 0 ? 'l' : x > 0 ? 'r' : 'c'}`, cylinder(1080, 50, 10).rotateX(90).translate(x, 540, ZS - 210).color(rolls));

// Half-round hood covers in four lengths, hinged on the back (+Y) edge.
const SEG = 4, SL = L / SEG;
for (let k = 0; k < SEG; k++) {
  const x0 = -L / 2 + k * SL;
  const open = hoodState.value === 'one-open' && k === 0;
  const hinge = (s: Shape) => (open ? s.translate(0, -RH, -(ZB + 20)).rotateX(-100).translate(0, RH, ZB + 20) : s);
  add(`hood-${k}`, hinge(profileYZ(crescent(RH, RH + 6), SL - 30).translate(x0 + SL / 2, 0, 0)).color(hood));
  for (const dx of [SL * 0.33, SL * 0.67]) add(`hood-${k}-rib-${Math.round(dx)}`, hinge(profileYZ(crescent(RH + 6, RH + 16, 10), 40).translate(x0 + dx, 0, 0)).color(hood));
  add(`hood-${k}-latch`, hinge(blk(x0 + SL / 2, -RH - 20, ZB - 40, 120, 30, 80)).color('#3a3d40'));
  add(`hood-${k}-hinge`, cylinder(200, 20, 8).rotateY(90).translate(x0 + SL / 2 - 100, RH + 10, ZB + 20).color('#3a3d40'));
}
for (let k = 0; k <= SEG; k++) add(`clamp-band-${k}`, profileYZ(crescent(RH + 6, RH + 26, 14), 70).translate(-L / 2 + k * SL, 0, 0).color(frame));
for (const [s, sy] of [['f', -1], ['b', 1]] as const) add(`hood-seat-${s}`, blk(0, sy * (RH + 10), ZS + 150, L, 50, ZB + 20 - ZS - 150).color(frame));

return p.model();
