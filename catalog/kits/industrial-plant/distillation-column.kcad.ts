// SPDX-License-Identifier: CC0-1.0
// Distillation column: the tall trayed tower that splits a feed by boiling
// point. What makes it one: a slender clad shell with elliptical heads on a
// skirt, manways and feed, reflux and reboiler nozzles at tray levels,
// part-circle platforms with handrails stacked up the side, a caged ladder
// running between them, the overhead vapour line that leaves the top head and
// drops back down the tower to the condenser, and a davit for lifting trays
// out of the top. Millimetres, Z up, base origin on the foundation.
meta({
  name: 'distillation-column',
  license: 'CC0-1.0',
  title: 'Distillation column',
  description: 'Trayed distillation column at about real size: insulated shell with elliptical heads on a skirt and foundation, banded cladding, manways, feed, reflux and reboiler-return nozzles, three part-circle platforms with handrails and toe plates, a full-height caged ladder, an overhead vapour line dropping down the tower on clips, a top davit and a relief valve. Material controls: cladding, platforms and ladder, process piping, skirt and foundation; weathered, highVisibility and bare-steel presets.',
  tags: ['industrial plant', 'refinery', 'petrochemical', 'process equipment', 'distillation', 'column', 'tower', 'platform', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene', 'refinery'],
  triangleBudget: 9000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const cladding = param('cladding', '#c9cdcf', { label: 'Insulation cladding' });
const structure = param('structure', '#e2b23c', { label: 'Platforms, handrails and ladder' });
const piping = param('piping', '#7d878d', { label: 'Process piping and flanges' });
const skirt = param('skirt', '#8f938f', { label: 'Skirt and foundation' });

presets({
  weathered: { cladding: '#a9aaa4', structure: '#a37c33', piping: '#6a6258', skirt: '#77756e' },
  highVisibility: { structure: '#f5c640' },
  'bare-steel': { cladding: '#5f6a70', piping: '#4d565b' },
});

const p = assembly('distillation-column');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const ring = (r0, r1, z0, z1) => turned([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);
const rod = (r, z0, z1) => turned([[0, z0], [r, z0], [r, z1], [0, z1]]);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Annular sector between radii r0..r1 and angles a0..a1 (degrees), z0..z1.
const sector = (r0, r1, a0, a1, z0, z1) => {
  const n = Math.max(3, Math.round((a1 - a0) / 10));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([Math.cos(a) * r1, Math.sin(a) * r1]);
  }
  for (let i = n; i >= 0; i--) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([Math.cos(a) * r0, Math.sin(a) * r0]);
  }
  return extrudePolygon(pts, z1 - z0).translate(0, 0, z0);
};
// A part built along +X from the column axis, swung to angle a (degrees) at height z.
const radial = (shape, a, z) => shape.rotateZ(a).translate(0, 0, z);
const outward = (shape) => shape.rotateY(90);

const R = 800, zb = 2400, zt = 13400;

// ---- Foundation, skirt and access opening ----
add('foundation', turned([[0, 0], [1350, 0], [1350, 30], [1250, 60], [0, 60]]).color(skirt));
add('base-ring', ring(700, 1050, 60, 110).color(skirt));
add('skirt', ring(780, 820, 110, zb - 200).color(skirt));
for (let i = 0; i < 12; i++) add(`anchor-chair-${i}`, radial(blk(820, -40, 110, 1000, 40, 360), i * 30 + 15, 0).color(skirt));
add('skirt-opening', radial(blk(810, -300, 300, 830, 300, 1300), 200, 0).color('#2a2d2f'));
add('skirt-vent', radial(outward(rod(60, 810, 900)), 20, 1900).color(skirt));

// ---- Shell with elliptical heads and cladding bands ----
add('shell', turned([[0, zb - 400], [420, zb - 350], [660, zb - 220], [780, zb - 90], [R, zb], [R, zt], [780, zt + 90], [660, zt + 220], [420, zt + 350], [0, zt + 400]]).color(cladding));
for (let z = zb + 900; z < zt; z += 1100) add(`cladding-band-${z}`, ring(R, R + 12, z, z + 40).color(piping));

// ---- Nozzles: manways with blind flanges, process nozzles with flanges ----
const nozzle = (name, a, z, r, len) => {
  add(`${name}-neck`, radial(outward(rod(r, R - 40, R + len)), a, z).color(piping));
  add(`${name}-flange`, radial(outward(rod(r + 60, R + len, R + len + 50)), a, z).color(piping));
};
for (const [i, z] of [[0, 3200], [1, 7400], [2, 11600]]) {
  nozzle(`manway-${i}`, 150, z, 320, 260);
  add(`manway-davit-${i}`, radial(blk(R + 330, -20, 380, R + 360, 20, 600), 150, z).color(piping));
}
nozzle('feed', 60, 8200, 110, 400);
nozzle('reflux', 60, 12600, 80, 400);
nozzle('reboiler-return', 90, 2900, 180, 450);
nozzle('bottoms', 0, zb - 330, 100, 300);
add('level-bridle', radial(rod(60, zb + 100, zb + 1600).translate(R + 380, 0, 0), 120, 0).color(piping));
for (const z of [zb + 200, zb + 1500]) add(`bridle-tap-${z}`, radial(outward(rod(35, R, R + 380)), 120, z).color(piping));

// Feed and reflux lines run in from the pipe rack side.
add('feed-line', radial(blk(R + 450, -110, 8090, R + 450 + 220, 110, 8310), 60, 0).color(piping));
add('feed-riser', radial(rod(110, 300, 8300).translate(R + 560, 0, 0), 60, 0).color(piping));
add('reflux-riser', radial(rod(80, 300, 12680).translate(R + 600, 0, 0), 75, 0).color(piping));
add('reflux-elbow', radial(outward(rod(80, R + 400, R + 680)), 75, 12600).color(piping));

// ---- Overhead vapour line: up off the top head, over, and down the tower ----
const vx = -(R + 650), vr = 200;
add('vapour-nozzle', rod(vr, zt + 300, zt + 900).color(piping));
add('vapour-flange', rod(vr + 70, zt + 600, zt + 660).color(piping));
add('vapour-elbow-top', sphere(vr * 1.05).translate(0, 0, zt + 1000).color(piping));
add('vapour-run', outward(rod(vr, vx, 0)).translate(0, 0, zt + 1000).color(piping));
add('vapour-elbow-side', sphere(vr * 1.05).translate(vx, 0, zt + 1000).color(piping));
add('vapour-drop', rod(vr, 1200, zt + 1000).translate(vx, 0, 0).color(piping));
add('vapour-elbow-base', sphere(vr * 1.05).translate(vx, 0, 1200).color(piping));
add('vapour-outlet', outward(rod(vr, vx - 1400, vx)).translate(0, 0, 1200).color(piping));
for (let z = 3000; z < zt; z += 2600) add(`vapour-clip-${z}`, blk(vx + vr - 10, -60, z, -R + 5, 60, z + 160).color(structure));
add('relief-valve', turned([[0, 0], [90, 0], [90, 260], [60, 300], [60, 520], [0, 520]]).translate(380, 0, zt + 250).color('#b3261e'));

// ---- Platforms: part-circle grating decks with handrails, toe plates and brackets ----
const rIn = R + 40, rOut = R + 1150;
const platform = (name, z, a0, a1) => {
  add(`${name}-deck`, sector(rIn, rOut, a0, a1, z - 50, z).color(structure));
  add(`${name}-toe`, sector(rOut - 15, rOut, a0, a1, z, z + 100).color(structure));
  add(`${name}-mid-rail`, sector(rOut - 40, rOut, a0, a1, z + 520, z + 560).color(structure));
  add(`${name}-top-rail`, sector(rOut - 50, rOut, a0, a1, z + 1060, z + 1110).color(structure));
  for (let a = a0; a <= a1 + 0.1; a += (a1 - a0) / Math.round((a1 - a0) / 30)) {
    add(`${name}-post-${Math.round(a)}`, radial(blk(rOut - 45, -22, z, rOut, 22, z + 1100), a, 0).color(structure));
    add(`${name}-bracket-${Math.round(a)}`, radial(extrudePolygon([[rIn, -600], [rOut - 60, -60], [rIn, -60]], 30).rotateX(90).translate(0, 15, z - 50 + 60), a, 0).color(structure));
  }
};
platform('platform-low', 3700, 100, 330);
platform('platform-mid', 7900, 30, 250);
platform('platform-top', 12100, -40, 220);

// ---- Caged ladder from grade to the top platform ----
const la = 330, lx = R + 700;
const ladder = (shape) => radial(shape, la, 0);
for (const dy of [-230, 230]) add(`ladder-rail-${dy}`, ladder(blk(lx - 30, dy - 15, 0, lx + 30, dy + 15, 13200)).color(structure));
for (let z = 300; z < 13200; z += 600) add(`ladder-rung-${z}`, ladder(blk(lx - 15, -230, z - 12, lx + 15, 230, z + 12)).color(structure));
const hoop = [];
for (let i = 0; i <= 12; i++) {
  const a = -Math.PI / 2 + (Math.PI * i) / 12;
  hoop.push([lx + Math.cos(a) * 380, Math.sin(a) * 380]);
}
for (let i = 12; i >= 0; i--) {
  const a = -Math.PI / 2 + (Math.PI * i) / 12;
  hoop.push([lx + Math.cos(a) * 340, Math.sin(a) * 340]);
}
for (let z = 2400; z < 13200; z += 900) add(`cage-hoop-${z}`, ladder(extrudePolygon(hoop, 40).translate(0, 0, z)).color(structure));
for (const a of [-60, -20, 20, 60]) {
  const t = (a * Math.PI) / 180;
  add(`cage-strap-${a}`, ladder(blk(lx + Math.cos(t) * 345 - 15, Math.sin(t) * 345 - 15, 2400, lx + Math.cos(t) * 345 + 15, Math.sin(t) * 345 + 15, 13200)).color(structure));
}

// ---- Top davit for lifting trays out through the top head ----
add('davit-post', rod(80, zt - 600, zt + 2000).translate(0, R + 150, 0).color(structure));
add('davit-arm', blk(-1300, R + 110, zt + 1920, 0, R + 190, zt + 2020).color(structure));
add('davit-sheave', ring(20, 120, -25, 25).rotateX(90).translate(-1250, R + 150, zt + 1820).color(piping));
for (const z of [zt - 500, zt - 100]) add(`davit-bracket-${z}`, blk(-80, R - 20, z, 80, R + 230, z + 80).color(structure));

return p.model();
