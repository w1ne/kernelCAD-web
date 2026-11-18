// SPDX-License-Identifier: CC0-1.0
// Radial stacker, the long inclined conveyor that builds a stockpile in an
// arc by swinging about a pinned tail. What makes it one: a 30 m trussed boom
// rising from a low feed end, a troughed belt carrying ore up to a head
// pulley under a discharge hood with the drive beside it, a walkway with
// handrail along one side, a pinned pivot base under the feed hopper, a
// wheeled undercarriage whose tyres face along the swing arc, and the cone of
// ore growing under the head.
// Millimetres, Z up, boom rising towards +X, walkway on the -Y side, ground
// origin under the tail pivot.
meta({
  name: "radial-stacker",
  license: 'CC0-1.0',
  title: "Radial stacker conveyor",
  description: "Pivoting radial stacker at about real size: 30 m trussed boom with chords, verticals and diagonals, troughed belt carrying a ridge of ore up to a head pulley under a discharge hood with drive gearbox and motor, side walkway with handrail, feed hopper and skirt board over the tail pulley on a pinned pivot base, wheeled undercarriage with A-frame legs, lift ram and tyres aligned to the swing arc, and a conical stockpile under the discharge. Material controls: boom coating, undercarriage and walkway steel, belt and tyre rubber, stockpile ore, plus a boom angle choice (10, 14, 18 degrees) that resizes the pile. weathered, highVisibility and ironOre presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'radial stacker', 'conveyor', 'stockpile', 'bulk materials', 'aggregate'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#e0a526', { label: 'Boom truss coating' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Undercarriage and walkway steel' });
const rubber = param('rubber', '#292d2f', { label: 'Belt and tyre rubber' });
const ore = param('ore', '#9a8a78', { label: 'Stockpile ore' });
const boomAngle = param('boomAngle', '14', { choices: ['10', '14', '18'], label: 'Boom angle (degrees)' });
presets({
  weathered: { coatedSteel: '#8d7d58', structuralSteel: '#666a66', rubber: '#393a38', ore: '#857868' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#24282a', ore: '#a99b88' },
  ironOre: { coatedSteel: '#2f6f9e', structuralSteel: '#4f5b62', rubber: '#1f2224', ore: '#7a4532' },
});

const p = assembly("radial-stacker");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Lathe along X: [[radius, x], ...] with x rising, centred on (y, z).
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// (y, z) outline extruded along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const dark = '#26292b', concrete = '#a6a196', guard = '#e8c21a', rim = '#c9cdc8';
const deg = Number(boomAngle.value);
const a = (deg * Math.PI) / 180;
const L = 30000; // boom length, tail pulley to head pulley
const Zt = 1500; // tail pulley height
// Boom frame: u along the boom, v square to it (up), y across.
const boom = (s) => s.rotateY(-deg).translate(0, 0, Zt);
const W = (u, y, v) => [u * Math.cos(a) - v * Math.sin(a), y, Zt + u * Math.sin(a) + v * Math.cos(a)];
const D = 1500; // truss depth
const P = 2500; // panel length

// ---- Boom truss: four chords, verticals and alternating diagonals ----
for (const y of [-650, 650]) {
  const s = y < 0 ? 'f' : 'b';
  add(`top-chord-${s}`, boom(blk(-300, y - 60, -130, L + 200, y + 60, 0)).color(coatedSteel));
  add(`bottom-chord-${s}`, boom(blk(600, y - 60, -D, L - 600, y + 60, -D + 130)).color(coatedSteel));
  for (let k = 0; k <= 11; k++) {
    const u = 600 + k * P;
    add(`vertical-${s}-${k}`, boom(blk(u - 40, y - 40, -D + 130, u + 40, y + 40, -130)).color(coatedSteel));
    if (k < 11) {
      const [u0, u1] = k % 2 ? [u, u + P] : [u + P, u];
      add(`diagonal-${s}-${k}`, tube(W(u0, y, -D + 130), W(u1, y, -130), 45, 6).color(coatedSteel));
    }
  }
}
add('tail-end-frame', boom(blk(-300, -650, -700, 600, 650, -130)).color(coatedSteel));

// ---- Troughed belt with a ridge of ore ----
add('belt-centre', boom(blk(-200, -230, 120, L, 230, 150)).color(rubber));
for (const s of [-1, 1]) add(`belt-wing-${s < 0 ? 'f' : 'b'}`, boom(blk(-200, -200, -15, L, 200, 15).rotateX(30 * s).translate(0, 390 * s, 225)).color(rubber));
add('ore-ridge', boom(profileYZ([[-420, 145], [420, 145], [150, 330], [-150, 330]], L - 3200).translate(L / 2 + 900, 0, 0)).color(ore));
for (let u = 1500; u < L - 500; u += 3000) add(`idler-frame-${u}`, boom(blk(u - 40, -600, 0, u + 40, 600, 90)).color(structuralSteel));

// ---- Head: pulley, hood, drive ----
add('head-pulley', boom(rod(420, -650, 650, 14).rotateX(90).translate(L, 0, 0)).color(structuralSteel));
add('discharge-hood', boom(profileYZ([[-760, -300], [760, -300], [760, 650], [-760, 650]], 1300).subtract(profileYZ([[-680, -320], [680, -320], [680, 560], [-680, 560]], 1400)).translate(L + 150, 0, 0)).color(coatedSteel));
add('hood-roof', boom(blk(L - 500, -800, 650, L + 850, 800, 720)).color(guard));
add('head-gearbox', boom(blk(L - 400, -1150, -350, L + 400, -700, 300)).color(structuralSteel));
add('head-motor', boom(rod(300, 0, 1000, 14).rotateY(-90).translate(L - 400, -930, -30)).color(structuralSteel));
add('motor-fan-cowl', boom(rod(260, 0, 220, 14).rotateY(-90).translate(L - 1400, -930, -30)).color(dark));

// ---- Walkway and handrail on the -Y side ----
add('walkway-deck', boom(blk(600, -1350, -180, L - 400, -660, -130)).color(structuralSteel));
add('handrail-top', boom(blk(600, -1350, 1000, L - 400, -1300, 1050)).color(guard));
add('handrail-mid', boom(blk(600, -1350, 450, L - 400, -1300, 490)).color(guard));
for (let u = 800; u < L - 300; u += 2500) add(`handrail-post-${u}`, boom(blk(u - 25, -1350, -130, u + 25, -1300, 1000)).color(guard));

// ---- Tail: feed hopper, skirt boards, pivot base ----
const hopper = lathe([[700, 0], [1500, 1300]], 4).rotateZ(45).scale([1, 0.85, 1]);
const [hx, , hz] = W(1100, 0, 450);
add('feed-hopper', hopper.subtract(lathe([[620, -10], [1420, 1320]], 4).rotateZ(45).scale([1, 0.85, 1])).translate(hx, 0, hz).color(coatedSteel));
add('hopper-ore', lathe([[900, 0], [300, 500]], 10).translate(hx, 0, hz + 700).color(ore));
for (const y of [-520, 520]) add(`skirt-board-${y < 0 ? 'f' : 'b'}`, boom(blk(0, y - 40, 130, 3000, y + 40, 520)).color(coatedSteel));
add('tail-pulley', boom(rod(350, -650, 650, 12).rotateX(90).translate(0, 0, -200)).color(structuralSteel));
add('pivot-pad', blk(-1300, -1300, 0, 1300, 1300, 250).color(concrete));
add('pivot-pedestal', lathe([[600, 250], [380, 600], [380, 750]], 12).color(structuralSteel));
for (const y of [-600, 600]) add(`tail-leg-${y < 0 ? 'f' : 'b'}`, tube([0, y, 750], W(150, y, -700), 90, 8).color(structuralSteel));
add('pivot-pin', rod(160, 600, 1000, 10).color(guard));

// ---- Undercarriage: A-frame legs, lift ram, axle beam and arc tyres ----
const us = L * 0.5;
const [ux] = W(us, 0, -D);
const R = 760;
add('axle-beam', blk(ux - 250, -3000, R + 50, ux + 250, 3000, R + 450).color(structuralSteel));
for (const y of [-2700, 2700]) {
  const s = y < 0 ? 'f' : 'b';
  for (const dx of [-650, 650]) {
    add(`tyre-${s}-${dx < 0 ? 'a' : 'b'}`, latheX([[R, ux + dx - 260], [R, ux + dx + 260]], y, R, 16).color(rubber));
    add(`rim-${s}-${dx < 0 ? 'a' : 'b'}`, latheX([[430, ux + dx - 280], [430, ux + dx + 280]], y, R, 10).color(rim));
  }
  add(`bogie-${s}`, blk(ux - 950, y - 180, R - 120, ux + 950, y + 180, R + 450).color(structuralSteel));
  add(`a-leg-${s}`, tube([ux, y * 0.92, R + 450], W(us, y < 0 ? -650 : 650, -D), 110, 8).color(structuralSteel));
}
add('lift-ram-barrel', tube([ux - 900, 0, R + 450], W(us - 2200, 0, -D), 140, 10).color(structuralSteel));
add('lift-ram-rod', tube(W(us - 1600, 0, -D - 400), W(us - 2200, 0, -D), 70, 8).color(rim));

// ---- Growing stockpile cone (37 degree angle of repose) fed by the falling stream ----
const [px, , pz] = W(L + 350, 0, -300);
const hp = (pz - 900) * 0.62;
add('stockpile', lathe([[hp * 1.33, 0], [380, hp], [120, hp + 120]], 18).translate(px, 0, 0).color(ore));
add('ore-stream', lathe([[160, hp + 60], [260, pz - 200]], 8).translate(px, 0, 0).color(ore));

return p.model();
