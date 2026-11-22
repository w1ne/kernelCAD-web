// SPDX-License-Identifier: CC0-1.0
// Reject diverter gate: the flap gate under a sorting-line conveyor head
// that sends each slug of material either to the accept line or to the
// reject skip. What makes it that gate rather than a box on legs: a
// trouser (Y-shaped) chute splitting into two spouts, a wear-lined flap
// pivoting at the crotch so it blocks one leg, the flap's shaft brought out
// through the front plate to a lever and a pneumatic cylinder, an
// inspection window showing the flap position, the feed conveyor head
// pulley over the inlet, and a reject skip under one spout with a take-away
// belt under the other.
// Generic visualization geometry at about real size (3.4 m tall), millimetres,
// Z up, window and actuator on -Y.

meta({
  name: "reject-diverter-gate",
  license: 'CC0-1.0',
  title: "Reject diverter gate",
  description: "Pneumatic reject diverter gate at about real size: trouser chute splitting into accept and reject spouts, wear-lined flap at the crotch, shaft lever and pneumatic cylinder on the front, inspection window, four-column support frame, feed conveyor head over the inlet, reject skip under one spout and take-away belt under the other. Flap set to reject or accept. Material controls: chute, frame, wear liner and belt. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "diverter", "flap gate", "trouser chute", "pneumatic", "reject", "conveyor", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const chute = param('chute', '#5d7f8c', { label: 'Chute plate (paint)' });
const frame = param('frame', '#e0a526', { label: 'Support frame (paint)' });
const liner = param('liner', '#d9692c', { label: 'Flap wear liner (polyurethane)' });
const belt = param('belt', '#24272a', { label: 'Belts (rubber)' });
const flapPosition = param('flapPosition', 'reject', { choices: ['reject', 'accept'], label: 'Flap position' });

presets({
  plant: { chute: '#5d7f8c', frame: '#e0a526', liner: '#d9692c', belt: '#24272a' },
  weathered: { chute: '#6e6a62', frame: '#8a7a52', liner: '#9a6040', belt: '#2c2a28' },
  stainless: { chute: '#c4c9cb', frame: '#8a9196', liner: '#2f7d4f', belt: '#2a2c2e' },
  highVisibility: { chute: '#2f6b8f', frame: '#f0c419', liner: '#e2462e', belt: '#1c1d1e' },
});

const p = assembly("reject-diverter-gate");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const plane = (z: number) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] });
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const side = (s: number) => (s < 0 ? 'l' : 'r');

// Trouser chute: a hollow Y-shaped plate box, open at the inlet and both spouts.
const D = 900, PIV = 1717;
const outer: [number, number][] = [[-400, 2800], [400, 2800], [400, 2000], [1200, 1100], [1200, 600], [700, 600], [700, 1000], [0, 1700], [-700, 1000], [-700, 600], [-1200, 600], [-1200, 1100], [-400, 2000]];
const inner: [number, number][] = [[-388, 2900], [388, 2900], [388, 1996], [1188, 1096], [1188, 500], [712, 500], [712, 1005], [0, PIV], [-712, 1005], [-712, 500], [-1188, 500], [-1188, 1096], [-388, 1996]];
const WZ0 = 1780, WZ1 = 2560;
add("trouser-chute", profileXZ(outer, D).subtract(profileXZ(inner, D - 24)).subtract(blk(0, -D / 2, WZ0, 640, 40, WZ1 - WZ0)).color(chute));
add("inlet-flange", blk(0, 0, 2800, 900, D + 100, 40).subtract(blk(0, 0, 2790, 776, D - 24, 60)).color(chute));
for (const s of [-1, 1]) {
  add(`spout-flange-${side(s)}`, blk(s * 950, 0, 560, 600, D + 80, 40).subtract(blk(s * 950, 0, 550, 476, D - 24, 60)).color(chute));
  add(`leg-stiffener-${side(s)}`, box(70, D + 30, 50, true).rotateY(s * 48).translate(s * 820, 0, 1530).color(chute));
}
// Inspection window frame on the front plate.
for (const z of [WZ0 - 30, WZ1]) add(`window-rail-${z}`, blk(0, -D / 2 - 12, z, 720, 20, 30).color(liner));
for (const s of [-1, 1]) add(`window-stile-${side(s)}`, blk(s * 345, -D / 2 - 12, WZ0 - 30, 30, 20, WZ1 - WZ0 + 60).color(liner));

// Flap: a wear-lined blade pivoting at the crotch, blocking one leg.
const ang = flapPosition.value === 'reject' ? 54 : -54;
const swing = (s: Shape) => s.rotateY(ang).translate(0, 0, PIV);
add("flap-blade", swing(blk(0, 0, 0, 24, D - 40, 470)).color(liner));
add("flap-hub", rod([0, -D / 2 + 20, PIV], [0, D / 2 - 20, PIV], 45, 12).color('#3a3d40'));
add("flap-shaft", rod([0, -D / 2 - 90, PIV], [0, D / 2 + 60, PIV], 30, 10).color('#a8b4b6'));
for (const s of [-1, 1]) add(`shaft-bearing-${s < 0 ? 'f' : 'b'}`, blk(0, s * (D / 2 + 30), PIV - 90, 180, 50, 180).color('#3a3d40'));

// Lever on the shaft and a pneumatic cylinder from a bracket on the -X leg.
const LR = 340, a = (ang * Math.PI) / 180;
const tip: [number, number, number] = [Math.sin(a) * LR, -D / 2 - 70, PIV + Math.cos(a) * LR];
add("lever-arm", swing(blk(0, -D / 2 - 70, 0, 60, 30, LR + 40).translate(0, 0, -20)).color('#3a3d40'));
const base: [number, number, number] = [-780, -D / 2 - 70, 2350];
add("cylinder-bracket", blk(-800, -D / 2 - 40, 2290, 120, 80, 130).color(frame));
const k = 0.62, mid: [number, number, number] = [base[0] + (tip[0] - base[0]) * k, base[1], base[2] + (tip[2] - base[2]) * k];
add("cylinder-barrel", rod(base, mid, 50, 12).color('#c9ccce'));
add("cylinder-cap", rod(base, [base[0] + (tip[0] - base[0]) * 0.1, base[1], base[2] + (tip[2] - base[2]) * 0.1], 62, 12).color('#2f5d9a'));
add("piston-rod", rod(mid, tip, 18, 8).color('#e6e8ea'));
add("air-line", rod([base[0], base[1] - 10, base[2]], [base[0] - 40, base[1] - 10, 3400], 10, 6).color('#2f5d9a'));
add("valve-box", blk(-560, -D / 2 - 60, 2650, 200, 90, 160).color('#2f5d9a'));

// Four-column support frame with a ring beam at the inlet.
for (const x of [-520, 520]) {
  for (const y of [-560, 560]) {
    const t = `${side(x)}-${y < 0 ? 'f' : 'b'}`;
    add(`column-${t}`, blk(x, y, 0, 120, 120, 2760).color(frame));
    add(`foot-${t}`, blk(x, y, 0, 260, 260, 20).color(frame));
  }
}
for (const y of [-560, 560]) add(`ring-beam-x-${y < 0 ? 'f' : 'b'}`, blk(0, y, 2640, 1160, 120, 120).color(frame));
for (const x of [-520, 520]) add(`ring-beam-y-${side(x)}`, blk(x, 0, 2640, 120, 1240, 120).color(frame));
for (const y of [-560, 560]) for (const s of [-1, 1]) add(`brace-${y < 0 ? 'f' : 'b'}-${side(s)}`, box(1443, 60, 60, true).rotateY(s * 44).translate(0, y, 850).color(frame));

// Feed conveyor head pulley over the inlet, belt running back toward +Y.
const CZ = 3150;
add("feed-belt", blk(0, 1500, CZ - 10, 700, 3000, 12).color(belt));
add("feed-load", profileXZ([[-300, CZ + 2], [-150, CZ + 70], [60, CZ + 95], [220, CZ + 50], [300, CZ + 2]], 2800).translate(0, 1600, 0).color('#8f8a6e'));
add("head-pulley", rod([-420, 0, CZ - 160], [420, 0, CZ - 160], 160, 14).color(frame));
for (const s of [-1, 1]) {
  add(`feed-stringer-${side(s)}`, blk(s * 420, 1500, CZ - 260, 70, 3100, 200).color(frame));
  add(`head-bearing-${side(s)}`, blk(s * 470, 0, CZ - 230, 60, 200, 140).color('#3a3d40'));
  add(`feed-leg-${side(s)}`, blk(s * 420, 2700, 0, 90, 90, CZ - 260).color(frame));
}
add("head-strut-l", blk(-480, 0, 2760, 120, 120, 140).color(frame));
add("head-strut-r", blk(480, 0, 2760, 120, 120, 140).color(frame));

// Reject skip under the -X spout.
add("reject-skip", rect(850, 760).loft([rect(1150, 960)], { planes: [plane(20), plane(540)], ruled: true })
  .subtract(rect(800, 710).loft([rect(1100, 910)], { planes: [plane(80), plane(560)], ruled: true })).translate(-950, 0, 0).color('#c8322a'));
add("reject-heap", sphere(380).scale([1.3, 1.15, 0.8]).translate(-950, 0, 520).color('#6f6a5e'));
for (const s of [-1, 1]) add(`skip-skid-${s < 0 ? 'f' : 'b'}`, blk(-950, s * 340, 0, 900, 90, 30).color('#3a3d40'));
add("reject-label", blk(-950, -455, 220, 520, 8, 140).color('#f2f2ee'));
add("reject-arrow", extrudePolygon([[-80, 0], [80, 0], [80, 160], [150, 160], [0, 300], [-150, 160], [-80, 160]], 8).rotateX(90).rotateY(180).translate(-950, -D / 2 - 6, 1300).color('#c8322a'));

// Take-away belt under the +X spout.
const TZ = 470;
add("takeaway-belt", blk(950, 0, TZ - 12, 620, 3000, 12).color(belt));
add("takeaway-load", profileXZ([[700, TZ], [820, TZ + 60], [960, TZ + 80], [1100, TZ + 50], [1200, TZ]], 1400).translate(0, -700, 0).color('#4f8a5c'));
for (const s of [-1, 1]) {
  add(`takeaway-stringer-${side(s)}`, blk(950 + s * 340, 0, TZ - 160, 60, 3000, 150).color(frame));
  for (const y of [-1200, 1200]) add(`takeaway-leg-${side(s)}-${y < 0 ? 'f' : 'b'}`, blk(950 + s * 340, y, 0, 70, 70, TZ - 160).color(frame));
}
add("accept-arrow", extrudePolygon([[-80, 0], [80, 0], [80, 160], [150, 160], [0, 300], [-150, 160], [-80, 160]], 8).rotateX(90).rotateY(180).translate(950, -D / 2 - 6, 1300).color('#2f9a4f'));

return p.model();
