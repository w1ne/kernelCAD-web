// SPDX-License-Identifier: CC0-1.0
// Top-running double-girder overhead bridge crane, the travelling crane of a
// fabrication or machine hall. What makes it one: two deep box girders
// spanning the bay between end trucks whose wheels run on rails along the
// runway beams, which sit on corbels of the building columns; a crab trolley
// on top of the girders carrying the hoist drum, gearbox and motor; wire-rope
// falls down to a hook block with a forged hook; a service walkway along one
// girder and a pendant control hanging from the trolley. Millimetres, Z up,
// base origin on the floor, the runway runs along X and the bridge spans Y.
meta({
  name: 'bridge-crane',
  license: 'CC0-1.0',
  title: 'Bridge crane',
  description: 'Top-running double-girder bridge crane in one runway bay at about real size: I-section building columns with corbels and base plates, runway beams with rails and end stops, end trucks with wheels, bridge drive motors and buffers, two box girders with stiffeners and a capacity board, walkway with handrail, crab trolley with hoist drum, gearbox and motor, wire-rope falls, hook block with forged hook and a pendant controller. Material controls: crane girders, building steel, hoist machinery, hook and block; weathered, highVisibility and blue-crane presets.',
  tags: ['industrial plant', 'factory', 'workshop', 'crane', 'overhead crane', 'bridge crane', 'hoist', 'lifting', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene', 'warehouse'],
  triangleBudget: 6000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const girder = param('girder', '#e5b023', { label: 'Crane girders and end trucks' });
const building = param('building', '#6b7378', { label: 'Building columns and runway' });
const hoist = param('hoist', '#34495c', { label: 'Hoist machinery and trolley' });
const hook = param('hook', '#c7372c', { label: 'Hook block and hook' });

presets({
  weathered: { girder: '#a88a3c', building: '#55524c', hoist: '#3b4247', hook: '#8d3a2c' },
  highVisibility: { girder: '#f5c640', hook: '#f08c00' },
  'blue-crane': { girder: '#2a5f9e', hook: '#e5b023' },
});

const p = assembly('bridge-crane');
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
// Cross-section [[y, z], ...] extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Side profile [[x, z], ...] extruded across Y from y0 to y1.
const prismY = (pts, y0, y1) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
const alongX = (shape) => shape.rotateY(90);
const alongY = (shape) => shape.rotateX(-90);
// I-section of depth d, flange width b, centred on (u, v) in a 2D plane.
const iSection = (u, v, b, d, tf, tw) => [
  [u - b / 2, v - d / 2], [u + b / 2, v - d / 2], [u + b / 2, v - d / 2 + tf], [u + tw / 2, v - d / 2 + tf],
  [u + tw / 2, v + d / 2 - tf], [u + b / 2, v + d / 2 - tf], [u + b / 2, v + d / 2], [u - b / 2, v + d / 2],
  [u - b / 2, v + d / 2 - tf], [u - tw / 2, v + d / 2 - tf], [u - tw / 2, v - d / 2 + tf], [u - b / 2, v - d / 2 + tf],
];

const X = 3600, Y = 4600, zr = 6800; // runway half-length, half-span, rail top
const warn = '#1d1f21', board = '#f4f2ea';

// ---- Building columns with corbels and base plates ----
for (const x of [-3000, 3000]) {
  for (const s of [-1, 1]) {
    const y = s * (Y + 450);
    add(`column-${x}-${s}`, extrudePolygon(iSection(x, y, 300, 400, 25, 15), 8400).color(building));
    add(`base-plate-${x}-${s}`, blk(x - 260, y - 300, 0, x + 260, y + 300, 30).color(building));
    add(`corbel-${x}-${s}`, prismY([[x - 150, zr - 900], [x + 150, zr - 900], [x + 150, zr - 420]], s > 0 ? y - 640 : y + 200, s > 0 ? y - 200 : y + 640).color(building));
    add(`corbel-top-${x}-${s}`, blk(x - 250, s * Y - 260, zr - 450, x + 250, s * Y + 260, zr - 420).color(building));
  }
}

// ---- Runway beams with crane rails and end stops ----
for (const s of [-1, 1]) {
  add(`runway-beam-${s}`, prismX(iSection(s * Y, zr - 230, 300, 360, 25, 14), -X, X).color(building));
  add(`crane-rail-${s}`, prismX([[s * Y - 35, zr - 50], [s * Y + 35, zr - 50], [s * Y + 18, zr - 30], [s * Y + 18, zr - 15], [s * Y + 30, zr - 15], [s * Y + 30, zr], [s * Y - 30, zr], [s * Y - 30, zr - 15], [s * Y - 18, zr - 15], [s * Y - 18, zr - 30]], -X, X).color(building));
  for (const x of [-X, X]) add(`end-stop-${x}-${s}`, blk(x - Math.sign(x) * 120, s * Y - 140, zr - 50, x, s * Y + 140, zr + 300).color(warn));
}

// ---- End trucks: box beams riding the rails on four wheels ----
const tl = 1700, zt = zr + 300;
for (const s of [-1, 1]) {
  const y = s * Y;
  add(`end-truck-${s}`, blk(-tl, y - 200, zt - 150, tl, y + 200, zt + 300).color(girder));
  for (const x of [-tl + 350, tl - 350]) {
    add(`wheel-${x}-${s}`, alongY(rod(250, -60, 60)).translate(x, y, zr + 250).color(hoist));
    add(`wheel-flange-${x}-${s}`, alongY(ring(0, 290, -80, -60)).translate(x, y, zr + 250).color(hoist));
  }
  for (const x of [-tl, tl]) add(`buffer-${x}-${s}`, alongX(turned([[0, 0], [90, 0], [90, 140], [70, 180], [0, 180]]).rotateY(x < 0 ? 180 : 0)).translate(x, y, zt + 50).color(warn));
  // Bridge drive: geared motor on the inner face of each end truck.
  add(`drive-gearbox-${s}`, blk(-tl + 200, y - s * 200 - s * 260 - 130, zt - 100, -tl + 600, y - s * 200 - s * 260 + 130, zt + 220).color(hoist));
  add(`drive-motor-${s}`, alongX(turned([[0, -tl + 600], [150, -tl + 600], [160, -tl + 640], [160, -tl + 1050], [120, -tl + 1100], [0, -tl + 1100]])).translate(0, y - s * 460, zt + 60).color(hoist));
}

// ---- Two box girders across the bay, with stiffeners and a capacity board ----
const gx = 750, gw = 500, gz0 = zt + 300, gz1 = gz0 + 1000;
for (const s of [-1, 1]) {
  const x = s * gx;
  add(`girder-${s}`, blk(x - gw / 2, -Y + 100, gz0, x + gw / 2, Y - 100, gz1).color(girder));
  add(`girder-top-flange-${s}`, blk(x - gw / 2 - 40, -Y + 100, gz1, x + gw / 2 + 40, Y - 100, gz1 + 30).color(girder));
  add(`girder-bottom-flange-${s}`, blk(x - gw / 2 - 40, -Y + 100, gz0 - 30, x + gw / 2 + 40, Y - 100, gz0).color(girder));
  for (let y = -Y + 700; y < Y - 500; y += 900) add(`stiffener-${s}-${y}`, blk(x + s * gw / 2, y - 12, gz0, x + s * (gw / 2 + 20), y + 12, gz1).color(girder));
  add(`girder-rail-${s}`, blk(x - 25, -Y + 300, gz1 + 30, x + 25, Y - 300, gz1 + 80).color(building));
}
add('capacity-board', blk(-gx - gw / 2 - 30, -900, gz0 + 250, -gx - gw / 2 - 10, 900, gz0 + 750).color(board));
add('capacity-text', blk(-gx - gw / 2 - 34, -700, gz0 + 420, -gx - gw / 2 - 30, 700, gz0 + 580).color(warn));

// ---- Service walkway with handrail along the +X girder ----
const wx0 = gx + gw / 2 + 40, wx1 = wx0 + 750;
add('walkway-deck', blk(wx0, -Y + 300, gz0 - 30, wx1, Y - 300, gz0).color(girder));
add('walkway-toe', blk(wx1 - 10, -Y + 300, gz0, wx1, Y - 300, gz0 + 100).color(girder));
for (const z of [gz0 + 500, gz0 + 1000]) add(`walkway-rail-${z}`, blk(wx1 - 40, -Y + 300, z, wx1, Y - 300, z + 40).color(girder));
for (let y = -Y + 300; y <= Y - 300; y += 1300) add(`walkway-post-${y}`, blk(wx1 - 40, y - 20, gz0, wx1, y + 20, gz0 + 1040).color(girder));
for (let y = -Y + 1000; y < Y - 500; y += 1600) add(`walkway-bracket-${y}`, prismY([[wx0, gz0 - 30], [wx1 - 60, gz0 - 30], [wx0, gz0 - 500]], y - 10, y + 10).color(girder));

// ---- Crab trolley: frame, wheels, hoist drum, gearbox and motor ----
const ty = 900, tz = gz1 + 80;
add('trolley-frame', blk(-gx - 350, ty - 900, tz + 150, gx + 350, ty + 900, tz + 350).color(hoist));
for (const s of [-1, 1]) for (const dy of [-650, 650]) add(`trolley-wheel-${s}-${dy}`, alongX(rod(150, -50, 50)).translate(s * gx, ty + dy, tz + 150).color(hoist));
add('hoist-drum', alongY(rod(450, -650, 650)).translate(0, ty, tz + 820).color(hoist));
for (let i = 0; i < 12; i++) add(`rope-wrap-${i}`, alongY(ring(450, 470, -600 + i * 100, -560 + i * 100)).translate(0, ty, tz + 820).color('#9da3a6'));
for (const dy of [-700, 700]) add(`drum-bearing-${dy}`, prismX([[ty + dy - 60, tz + 350], [ty + dy + 60, tz + 350], [ty + dy + 60, tz + 900], [ty + dy - 60, tz + 900]], -300, 300).color(hoist));
add('hoist-gearbox', blk(-450, ty + 760, tz + 350, 450, ty + 1100, tz + 1150).color(hoist));
add('hoist-motor', alongX(turned([[0, -900], [230, -900], [250, -860], [250, -300], [200, -250], [0, -250]])).translate(0, ty + 930, tz + 640).color(girder));
add('hoist-brake', alongX(rod(170, -1000, -900)).translate(0, ty + 930, tz + 640).color(hook));
add('trolley-cover', prismY([[-gx - 350, tz + 1150], [gx + 350, tz + 1150], [gx + 200, tz + 1350], [-gx - 200, tz + 1350]], ty + 700, ty + 1150).color(hoist));

// ---- Wire-rope falls and hook block ----
const hz = 2600;
for (const dx of [-160, 160]) for (const dy of [-80, 80]) add(`rope-${dx}-${dy}`, rod(14, hz + 380, tz + 820).translate(dx, ty + dy, 0).color('#9da3a6'));
add('hook-block', prismY([[-330, hz + 120], [330, hz + 120], [330, hz + 420], [200, hz + 560], [-200, hz + 560], [-330, hz + 420]], ty - 160, ty + 160).color(hook));
add('hook-block-cheek', blk(-340, ty - 170, hz + 330, 340, ty + 170, hz + 380).color(warn));
add('hook-crosshead', alongY(rod(70, -170, 170)).translate(0, ty, hz + 120).color(hoist));
add('hook-nut', rod(80, hz - 20, hz + 80).translate(0, ty, 0).color(hoist));
add('hook-shank', rod(55, hz - 260, hz).translate(0, ty, 0).color(hook));
// Forged hook: a C-section bowl hanging from the shank, open towards +X.
const hookPts = [];
for (let i = 0; i <= 12; i++) {
  const a = ((20 - (200 * i) / 12) * Math.PI) / 180;
  hookPts.push([Math.cos(a) * 230, hz - 480 + Math.sin(a) * 230]);
}
hookPts.push([-230, hz - 300], [-60, hz - 250], [60, hz - 250], [60, hz - 300], [-100, hz - 400]);
for (let i = 0; i <= 12; i++) {
  const a = ((180 + (200 * i) / 12) * Math.PI) / 180;
  hookPts.push([Math.cos(a) * 110, hz - 480 + Math.sin(a) * 110]);
}
add('hook', prismY(hookPts, ty - 45, ty + 45).color(hook));
add('hook-latch', blk(0, -10, -12, 150, 10, 12).rotateY(-35).translate(40, ty, hz - 400).color(warn));

// ---- Pendant controller hanging from the trolley ----
add('pendant-cable', rod(12, 1400, tz + 150).translate(gx + 300, ty - 700, 0).color(warn));
add('pendant-box', blk(gx + 230, ty - 770, 1050, gx + 370, ty - 630, 1400).color(girder));
for (let i = 0; i < 3; i++) add(`pendant-button-${i}`, alongX(rod(18, 0, 15)).translate(gx + 370, ty - 700, 1330 - i * 90).color(warn));

return p.model();
