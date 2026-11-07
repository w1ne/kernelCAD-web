// SPDX-License-Identifier: CC0-1.0
// Cooling-tower cell: one cell of an induced-draft counterflow cooling tower
// serving a data centre's condenser-water loop. What makes it one: a square
// ribbed FRP casing on a cold-water basin, air-inlet louvres slanting round
// the lower walls, a fan deck carrying a tall flared velocity-recovery fan
// stack with the axial fan inside, a galvanised handrail round the deck, a
// caged access ladder, the hot-water riser climbing to the deck and the
// cold-water outlet leaving the basin.
// Millimetres, Z up, the ladder and outlet face -X.
meta({
  name: "cooling-tower-cell",
  license: 'CC0-1.0',
  title: "Cooling-tower cell",
  description: "Induced-draft counterflow cooling-tower cell: cold-water basin, ribbed FRP casing with slanted air-inlet louvres on two faces, access door, fan deck with flared turned velocity-recovery stack, six pitched fan blades on a hub, galvanised deck handrail, caged access ladder, hot-water riser with elbow into the distribution header and flanged cold-water outlet. Material controls: casing FRP, inlet louvres, fan stack, galvanised steel and piping; sandFRP, greyFRP and weathered presets.",
  tags: ['data center', 'cooling', 'cooling tower', 'condenser water', 'HVAC', 'critical infrastructure', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 9000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const casing = param('casing', '#6f9fb2', { label: 'Casing FRP panels' });
const louvre = param('louvre', '#34505c', { label: 'Air-inlet louvres' });
const stack = param('stack', '#e6e8e3', { label: 'Fan stack' });
const galv = param('galv', '#a6adb0', { label: 'Galvanised ladder and handrail' });
const piping = param('piping', '#2d5c99', { label: 'Condenser-water piping' });

presets({
  sandFRP: { casing: '#d2c39f', louvre: '#5b5242', stack: '#ece5d2' },
  greyFRP: { casing: '#9ea4a6', louvre: '#3a3e40', stack: '#d4d7d6', piping: '#6b7c3a' },
  weathered: { casing: '#7f9aa1', louvre: '#3d4a4c', stack: '#c9cbc2', galv: '#8f8f88', piping: '#4b6178' },
});

const p = assembly("cooling-tower-cell");
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
// Turned part with its axis along -X.
const outOfEnd = (shape) => shape.rotateY(-90);

const H = 1200; // half width of the square cell
const basinTop = 450, inletTop = 1350, deckZ = 2750;

// ---- Cold-water basin ----
add('basin', blk(-H - 40, -H - 40, 0, H + 40, H + 40, basinTop).color(casing));
add('basin-lip', blk(-H - 60, -H - 60, basinTop - 50, H + 60, H + 60, basinTop).color(galv));

// ---- Air-inlet zone: dark void behind slanted louvres on -X and -Y faces ----
add('inlet-void', blk(-H + 30, -H + 30, basinTop, H - 30, H - 30, inletTop).color(louvre));
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  add(`corner-post-${sx}-${sy}`, blk(sx * H - 60, sy * H - 60, basinTop, sx * H + 60, sy * H + 60, deckZ).color(casing));
}
for (let i = 0; i < 7; i++) {
  const z = basinTop + 70 + 120 * i;
  add(`louvre-y-${i}`, blk(-H + 60, -40, -10, H - 60, 40, 10).rotateX(-35).translate(0, -H - 20, z).color(louvre));
  add(`louvre-x-${i}`, blk(-40, -H + 60, -10, 40, H - 60, 10).rotateY(35).translate(-H - 20, 0, z).color(louvre));
}
for (const t of [-400, 400]) {
  add(`louvre-mullion-y-${t}`, blk(t - 25, -H - 70, basinTop, t + 25, -H + 30, inletTop).color(casing));
  add(`louvre-mullion-x-${t}`, blk(-H - 70, t - 25, basinTop, -H + 30, t + 25, inletTop).color(casing));
}

// ---- Ribbed FRP casing above the inlet ----
add('casing-upper', blk(-H, -H, inletTop, H, H, deckZ).color(casing));
for (const t of [-800, -400, 0, 400, 800]) {
  add(`rib-y-${t}`, blk(t - 30, -H - 30, inletTop, t + 30, -H, deckZ).color(casing));
  add(`rib-x-${t}`, blk(-H - 30, t - 30, inletTop, -H, t + 30, deckZ).color(casing));
}
add('belt-rail-y', blk(-H - 40, -H - 40, inletTop, H + 40, -H, inletTop + 80).color(casing));
add('belt-rail-x', blk(-H - 40, -H - 40, inletTop, -H, H + 40, inletTop + 80).color(casing));
add('access-door', blk(-H - 44, 300, 1700, -H - 30, 900, 2450).color(stack));
add('access-door-handle', blk(-H - 70, 360, 2040, -H - 44, 390, 2140).color(galv));

// ---- Fan deck and flared velocity-recovery stack with fan ----
add('fan-deck', blk(-H - 60, -H - 60, deckZ, H + 60, H + 60, deckZ + 80).color(casing));
const d = deckZ + 80;
add('fan-stack', turned([[860, d], [920, d], [920, d + 260], [990, d + 700], [1060, d + 820], [1000, d + 820], [930, d + 710], [860, d + 260]]).color(stack));
add('fan-stack-band', ring(920, 945, d + 220, d + 280).color(stack));
add('fan-gearbox', rod(150, d - 40, d + 180).color(galv));
add('fan-hub', turned([[0, d + 180], [190, d + 180], [170, d + 250], [0, d + 270]]).color(louvre));
for (let k = 0; k < 6; k++) {
  add(`fan-blade-${k}`, blk(150, -90, -10, 850, 90, 10).rotateX(18).rotateZ(60 * k + 15).translate(0, 0, d + 220).color(louvre));
}

// ---- Galvanised deck handrail ----
const hr = H + 30;
for (const [x, y] of [[-hr, -hr], [hr, -hr], [-hr, hr], [hr, hr], [0, -hr], [-hr, 0], [hr, 0], [0, hr]]) {
  add(`rail-post-${x}-${y}`, blk(x - 22, y - 22, d, x + 22, y + 22, d + 1070).color(galv));
}
for (const z of [d + 520, d + 1040]) {
  add(`rail-front-${z}`, blk(-hr, -hr - 18, z, hr, -hr + 18, z + 36).color(galv));
  add(`rail-back-${z}`, blk(-hr, hr - 18, z, hr, hr + 18, z + 36).color(galv));
  add(`rail-left-${z}`, blk(-hr - 18, -hr, z, -hr + 18, hr, z + 36).color(galv));
  add(`rail-right-${z}`, blk(hr - 18, -hr, z, hr + 18, hr, z + 36).color(galv));
}

// ---- Caged access ladder on the -X face ----
const lx = -H - 130, ly = -700;
for (const y of [ly - 230, ly + 230]) {
  add(`ladder-rail-${y}`, blk(lx - 22, y - 22, basinTop, lx + 22, y + 22, d + 1070).color(galv));
}
for (let i = 0; i < 9; i++) {
  add(`ladder-rung-${i}`, blk(lx - 14, ly - 230, basinTop + 280 * (i + 1) - 14, lx + 14, ly + 230, basinTop + 280 * (i + 1) + 14).color(galv));
}
for (let i = 0; i < 5; i++) {
  add(`cage-hoop-${i}`, ring(330, 360, 1500 + 380 * i, 1540 + 380 * i).translate(lx, ly, 0).color(galv));
}
for (const a of [150, 180, 210]) {
  const t = (a * Math.PI) / 180;
  add(`cage-strap-${a}`, blk(-15, -15, 1500, 15, 15, d + 900).translate(lx + 345 * Math.cos(t), ly + 345 * Math.sin(t), 0).color(galv));
}

// ---- Hot-water riser and cold-water outlet ----
add('riser', rod(130, 0, d - 360).translate(H + 260, 400, 0).color(piping));
add('riser-elbow', turned([[0, 0], [150, 0], [150, 300], [0, 300]]).translate(H + 260, 400, d - 420).color(piping));
add('riser-header', rod(130, 0, 330).rotateY(-90).translate(H + 260, 400, d - 270).color(piping));
add('riser-flange', ring(130, 200, -25, 25).rotateY(90).translate(H + 30, 400, d - 270).color(galv));
add('riser-support', blk(H + 60, 340, 1400, H + 260, 460, 1460).color(galv));
add('outlet', outOfEnd(rod(150, 0, 420)).translate(-H - 40, 500, 230).color(piping));
add('outlet-flange', outOfEnd(ring(0, 230, 380, 420)).translate(-H - 40, 500, 230).color(galv));

return p.model();
