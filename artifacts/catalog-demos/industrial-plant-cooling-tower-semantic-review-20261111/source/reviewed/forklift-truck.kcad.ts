// SPDX-License-Identifier: CC0-1.0
// Counterbalance forklift truck, the 2.5 t LPG warehouse type. What makes it
// one: a heavy cast counterweight with a rounded rear over small steer wheels,
// big drive tyres under a two-stage mast that carries the fork carriage, load
// backrest and two L-shaped fork tines; an overhead guard of slanted posts and
// a slatted roof over a sprung seat and steering column; tilt cylinders tying
// the mast to the cowl, and the LPG bottle strapped across the counterweight.
// Millimetres, Z up, base origin, the forks point along +X.
meta({
  name: 'forklift-truck',
  license: 'CC0-1.0',
  title: 'Forklift truck',
  description: 'Counterbalance LPG forklift at about real size: rounded cast counterweight over steer wheels, drive tyres, two-stage mast with lift and tilt cylinders, fork carriage with load backrest and L-shaped tines, overhead guard with slatted roof and beacon, seat, steering column, step pods and a strapped LPG bottle. Material controls: body paint, mast and guard steel, tyres and seat, bottle and fittings; weathered, highVisibility and electric-blue presets.',
  tags: ['industrial plant', 'factory', 'warehouse', 'forklift', 'lift truck', 'counterbalance', 'material handling', 'vehicle', 'CC0'],
  kit: 'industrial-plant',
  category: 'vehicle',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene', 'warehouse'],
  triangleBudget: 5000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#e3a51c', { label: 'Body and counterweight paint' });
const frame = param('frame', '#2c3135', { label: 'Mast, guard and forks steel' });
const rubber = param('rubber', '#1c1e20', { label: 'Tyres, seat and floor mat' });
const fittings = param('fittings', '#c9ccc8', { label: 'LPG bottle, hubs and chains' });

presets({
  weathered: { body: '#a87b2c', frame: '#3b3a36', rubber: '#2a2a28', fittings: '#9a9688' },
  highVisibility: { body: '#f5c640', frame: '#1f2326' },
  'electric-blue': { body: '#2a5f9e', frame: '#2b2f33', fittings: '#e8e8e2' },
});

const p = assembly('forklift-truck');
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
// Side profile [[x, z], ...] extruded across Y from y0 to y1.
const prismY = (pts, y0, y1) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
// Straight strut between two points, square section s.
const strut = (a, b, s) => {
  const dx = b[0] - a[0], dz = b[2] - a[2];
  const len = Math.hypot(dx, dz);
  const tilt = (Math.atan2(dx, dz) * 180) / Math.PI;
  return box(s, s, len, true).rotateY(tilt).translate((a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2);
};

const lensWhite = '#f1efe2', beaconAmber = '#f08c00';

// ---- Wheels: drive tyres at the front, narrower steer tyres at the rear ----
const tyre = (name, x, y, r, w) => {
  add(`${name}-tyre`, turned([[r * 0.6, -w / 2], [r - 30, -w / 2], [r, -w / 2 + 30], [r, w / 2 - 30], [r - 30, w / 2], [r * 0.6, w / 2]]).rotateX(90).translate(x, y, r).color(rubber));
  add(`${name}-rim`, turned([[0, -w / 2 + 15], [r * 0.6, -w / 2 + 15], [r * 0.6, w / 2 - 15], [0, w / 2 - 15]]).rotateX(90).translate(x, y, r).color(fittings));
  add(`${name}-hub`, rod(r * 0.22, w / 2 - 15, w / 2 + 15).rotateX(y > 0 ? -90 : 90).translate(x, y, r).color(frame));
};
for (const s of [-1, 1]) {
  tyre(`drive-${s}`, 180, s * 440, 330, 230);
  tyre(`steer-${s}`, -800, s * 400, 250, 180);
}

// ---- Chassis tub, step pods and floor plate ----
add('chassis-tub', blk(-1060, -320, 130, 330, 320, 560).color(frame));
for (const s of [-1, 1]) {
  add(`step-pod-${s}`, prismY([[-520, 180], [-160, 180], [-140, 460], [-540, 460]], s > 0 ? 320 : -545, s > 0 ? 545 : -320).color(body));
  add(`step-tread-${s}`, blk(-470, s > 0 ? 330 : -540, 300, -230, s > 0 ? 540 : -330, 312).color(frame));
  // Front wing over the drive tyre, from a side profile arch.
  const arch = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - (Math.PI * i) / 8;
    arch.push([180 + 380 * Math.cos(a), 330 + 380 * Math.sin(a)]);
  }
  for (let i = 8; i >= 0; i--) {
    const a = Math.PI - (Math.PI * i) / 8;
    arch.push([180 + 350 * Math.cos(a), 330 + 350 * Math.sin(a)]);
  }
  add(`front-wing-${s}`, prismY(arch, s > 0 ? 320 : -560, s > 0 ? 560 : -320).color(body));
}
add('floor-plate', blk(-560, -540, 460, -120, 540, 480).color(rubber));

// ---- Counterweight: lower rear block plus rounded upper mass over the steer wheels ----
add('counterweight-lower', blk(-1270, -545, 140, -1060, 545, 560).color(body));
add('counterweight-upper', prismY([[-1290, 560], [-540, 560], [-540, 920], [-640, 1010], [-1120, 1060], [-1230, 1010], [-1290, 900]], -560, 560).color(body));
add('tow-pin-housing', blk(-1310, -90, 300, -1270, 90, 420).color(frame));
for (const s of [-1, 1]) add(`tail-lamp-${s}`, blk(-1300, s * 430 - 50, 760, -1286, s * 430 + 50, 830).color('#b3261e'));

// ---- Engine hood, seat and operator controls ----
add('engine-hood', prismY([[-640, 480], [-120, 480], [-120, 820], [-200, 880], [-640, 880]], -430, 430).color(body));
add('seat-cushion', prismY([[-600, 880], [-260, 880], [-250, 960], [-590, 960]], -250, 250).color(rubber));
add('seat-back', prismY([[-640, 940], [-560, 940], [-590, 1380], [-680, 1360]], -240, 240).color(rubber));
add('cowl', prismY([[-120, 480], [340, 480], [340, 720], [160, 1010], [40, 1010], [-120, 820]], -420, 420).color(body));
add('dash-top', prismY([[40, 1010], [160, 1010], [150, 1030], [40, 1030]], -380, 380).color(frame));
add('steering-column', rod(35, 0, 420).rotateY(-28).translate(90, 0, 1000).color(frame));
add('steering-wheel', ring(150, 175, -15, 15).rotateY(-28).translate(-110, 0, 1370).color(rubber));
add('steering-knob', rod(18, 0, 60).translate(-110, 140, 1370).color(rubber));
for (const [i, y] of [[0, -120], [1, -60], [2, 0]]) add(`hydraulic-lever-${i}`, rod(10, 0, 220).rotateY(-10).translate(120, y, 1020).color(frame));
for (const [i, y] of [[0, -120], [1, -60], [2, 0]]) add(`lever-knob-${i}`, turned([[0, 0], [22, 10], [22, 40], [0, 50]]).translate(158, y, 1230).color(rubber));

// ---- Overhead guard: slanted front posts, rear posts, slatted roof ----
for (const s of [-1, 1]) {
  add(`guard-post-front-${s}`, strut([280, s * 470, 720], [130, s * 470, 2160], 70).color(frame));
  add(`guard-post-rear-${s}`, strut([-760, s * 470, 1040], [-800, s * 470, 2160], 70).color(frame));
  add(`guard-side-rail-${s}`, blk(-860, s * 470 - 40, 2140, 190, s * 470 + 40, 2210).color(frame));
}
for (const x of [-830, 160]) add(`guard-end-rail-${x}`, blk(x - 35, -510, 2140, x + 35, 510, 2210).color(frame));
for (let i = 0; i < 7; i++) add(`guard-slat-${i}`, blk(-800, -360 + i * 120 - 22, 2170, 130, -360 + i * 120 + 22, 2200).color(frame));
add('beacon-base', rod(55, 2210, 2240).translate(-700, 0, 0).color(frame));
add('beacon', turned([[0, 2240], [45, 2240], [45, 2320], [30, 2350], [0, 2350]]).translate(-700, 0, 0).color(beaconAmber));
for (const s of [-1, 1]) add(`work-light-${s}`, rod(55, 0, 60).rotateY(90).translate(150, s * 400, 2060).color(lensWhite));

// ---- LPG bottle across the counterweight, in a cradle with a strap ----
add('lpg-bottle', turned([[0, -480], [110, -460], [150, -400], [150, 380], [110, 440], [0, 460]]).rotateX(90).translate(-1000, 0, 1240).color(fittings));
add('lpg-valve-guard', ring(55, 70, 0, 80).rotateX(-90).translate(-1000, 460, 1240).color(fittings));
add('lpg-valve', rod(22, 0, 70).rotateX(-90).translate(-1000, 460, 1240).color(frame));
add('lpg-cradle', prismY([[-1160, 1060], [-840, 1060], [-860, 1170], [-1140, 1170]], -420, 420).color(frame));
for (const y of [-260, 260]) add(`lpg-strap-${y}`, ring(152, 162, -25, 25).rotateX(90).translate(-1000, y, 1240).color(frame));

// ---- Mast: outer channels, nested inner channels, crossheads, cylinders and chains ----
const mx = 470;
for (const s of [-1, 1]) {
  add(`mast-outer-${s}`, blk(mx, s * 300, 120, mx + 110, s * 390, 2200).color(frame));
  add(`mast-inner-${s}`, blk(mx + 20, s * 230, 160, mx + 100, s * 300, 2280).color(frame));
  add(`mast-roller-${s}`, rod(30, 0, 30).rotateX(90).translate(mx + 60, s * 300, 2160).color(fittings));
  // Tilt cylinder from the cowl to the outer channel, with chromed rod.
  add(`tilt-cylinder-${s}`, strut([200, s * 360, 800], [mx - 10, s * 360, 1000], 70).color(frame));
  add(`tilt-rod-${s}`, strut([340, s * 360, 905], [mx + 10, s * 360, 1020], 34).color(fittings));
  add(`lift-chain-${s}`, blk(mx + 115, s * 150 - 15, 600, mx + 125, s * 150 + 15, 2250).color(fittings));
}
for (const z of [180, 1200, 2160]) add(`mast-crosshead-${z}`, blk(mx, -390, z - 40, mx + 60, 390, z + 40).color(frame));
add('lift-cylinder', rod(55, 160, 1500).translate(mx + 55, 0, 0).color(frame));
add('lift-ram', rod(35, 1500, 2240).translate(mx + 55, 0, 0).color(fittings));
add('chain-sheave', ring(15, 90, -30, 30).rotateY(90).translate(mx + 120, 0, 2260).color(frame));
add('sheave-beam', blk(mx + 40, -200, 2240, mx + 130, 200, 2300).color(frame));

// ---- Fork carriage, load backrest and L-shaped tines ----
const cx = mx + 130;
for (const z of [240, 600]) add(`carriage-bar-${z}`, blk(cx, -560, z - 70, cx + 50, 560, z + 70).color(frame));
for (const s of [-1, 1]) add(`carriage-side-${s}`, blk(cx, s * 540 - 20, 170, cx + 50, s * 540 + 20, 670).color(frame));
add('backrest-top', blk(cx, -560, 1320, cx + 40, 560, 1370).color(frame));
for (let i = 0; i < 7; i++) add(`backrest-bar-${i}`, blk(cx + 5, -540 + i * 180 - 15, 670, cx + 35, -540 + i * 180 + 15, 1320).color(frame));
for (const s of [-1, 1]) {
  add(`fork-${s}`, prismY([[cx + 50, 40], [cx + 1200, 40], [cx + 1200, 58], [cx + 160, 95], [cx + 100, 95], [cx + 100, 680], [cx + 50, 680]], s * 300 - 60, s * 300 + 60).color(frame));
  add(`fork-hook-${s}`, blk(cx + 30, s * 300 - 60, 640, cx + 100, s * 300 + 60, 690).color(frame));
  add(`headlight-${s}`, rod(60, 0, 45).rotateY(90).translate(cx - 50, s * 395, 1500).color(lensWhite));
}

return p.model();
