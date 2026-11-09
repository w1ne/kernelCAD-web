// SPDX-License-Identifier: CC0-1.0
// Return water header: the gravity drain at the low end of an NFT bench
// that catches the solution running off every channel and carries it
// back to the sump for re-dosing.
// What makes it a return header: closed white NFT channels with lettuce
// in their lids, each ending over an open funnel inlet with a stream of
// solution falling into it; the funnels stand on a large PVC collection
// pipe resting in cut-out saddle stands; the far end has a cleanout cap
// with a square nut, and the near end turns down into an open sump tank.
// Generic visualization geometry at about real size (1.8 m header,
// channels at 0.85 m), millimetres, Z up, front -Y.

meta({
  name: "return-water-header",
  license: 'CC0-1.0',
  title: "Return water header",
  description: "NFT gravity return header at about real size: closed white channels with lettuce ending over open funnel inlets with falling solution, a large PVC collection pipe in cut-out saddle stands, a cleanout cap and an outlet elbow dropping into an open sump tank. Material controls: header PVC, NFT channels, stands and solution, plus channel count (4 or 6) and flow (running or dry). standard, greyPvc, weathered and highVisibility presets.",
  tags: ['return header', 'drain header', 'gravity return', 'nft', 'funnel inlet', 'sump', 'recirculating', 'greenhouse', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 4800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pvc = param('headerPvc', '#e3e5e0', { label: 'Collection header and funnels (PVC)' });
const channel = param('nftChannels', '#f4f4f0', { label: 'NFT channels' });
const stand = param('stands', '#6f777b', { label: 'Saddle stands and bench legs' });
const water = param('solution', '#4f9fc4', { label: 'Nutrient solution' });
const channels = param('channels', '4', { choices: ['4', '6'], label: 'NFT channels' });
const flow = param('flow', 'running', { choices: ['running', 'dry'], label: 'Flow' });

presets({
  standard: { headerPvc: '#e3e5e0', nftChannels: '#f4f4f0', stands: '#6f777b', solution: '#4f9fc4' },
  greyPvc: { headerPvc: '#7f878c', nftChannels: '#ecedea', stands: '#3d4245', solution: '#5aa88e' },
  weathered: { headerPvc: '#c9c6b6', nftChannels: '#d9d6c8', stands: '#6b665c', solution: '#6b8f7a' },
  highVisibility: { headerPvc: '#f2f2ee', nftChannels: '#ffffff', stands: '#e87832', solution: '#2a7fd0' },
});

const p = assembly("return-water-header");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const turned = (pts: [number, number][], seg = 14) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

const HX = 900, HZ = 450, R = 75, CZ = 850, CY1 = 1300, TX = -1250;
const running = flow.value === 'running';
const leaf = '#5fae3e', heart = '#a6d468';

// Collection header in cut-out saddle stands.
add("header", cylX(-HX, 0, HZ, 2 * HX, R, 18).color(pvc));
for (const x of [-650, 0, 650]) {
  add(`saddle-${x}`, blk(x, 0, 0, 110, 260, HZ).subtract(cylX(x - 60, 0, HZ, 120, R + 2, 18)).color(stand));
  add(`saddle-foot-${x}`, blk(x, 0, 0, 200, 320, 12).color(stand));
  add(`strap-${x}`, cylX(x - 20, 0, HZ, 40, R + 6, 18).subtract(cylX(x - 30, 0, HZ, 60, R + 1, 18)).subtract(blk(x, 0, HZ - 120, 80, 300, 120)).color(stand));
}
// Cleanout at the far end: socket, cap, square nut.
add("cleanout-socket", cylX(HX, 0, HZ, 50, R + 10, 18).color(pvc));
add("cleanout-cap", cylX(HX + 50, 0, HZ, 30, R + 4, 18).color('#c7cac5'));
add("cleanout-nut", blk(HX + 95, 0, HZ - 30, 30, 60, 60).color('#c7cac5'));

// Outlet: elbow over the sump and drop into it.
add("outlet-run", cylX(TX, 0, HZ, -TX - HX + 10, R, 18).color(pvc));
add("outlet-elbow", blk(TX, 0, HZ - R - 10, 2 * R + 20, 2 * R + 20, 2 * R + 20).color(pvc));
add("outlet-drop", cylZ(TX, 0, 230, HZ - R - 240, R, 18).color(pvc));
// Open sump tank with the solution level inside.
add("sump", blk(TX, 0, 0, 560, 640, 400).subtract(blk(TX, 0, 30, 500, 580, 400)).color('#2f3437'));
add("sump-rim", blk(TX, 0, 390, 580, 660, 20).subtract(blk(TX, 0, 380, 500, 580, 60)).color('#2f3437'));
add("sump-solution", blk(TX, 0, 30, 500, 580, running ? 250 : 120).color(water));

// NFT channels ending over funnel inlets, on a two-crossbar bench.
const n = Number(channels.value);
const xs = Array.from({ length: n }, (_, i) => -600 + (i * 1200) / (n - 1));
for (const y of [380, 1150]) {
  add(`bench-bar-${y}`, blk(0, y, CZ - 50, 1500, 50, 50).color(stand));
  for (const x of [-720, 720]) add(`bench-leg-${y}-${x}`, blk(x, y, 0, 50, 50, CZ - 50).color(stand));
}
const funnel: [number, number][] = [[24, 0], [34, 0], [105, 130], [95, 130]];
xs.forEach((x, i) => {
  add(`inlet-riser-${i}`, cylZ(x, 0, HZ + R - 15, 90, 30, 12).color(pvc));
  add(`funnel-${i}`, turned(funnel).translate(x, 0, HZ + R + 70).color(pvc));
  add(`channel-${i}`, blk(x, (60 + CY1) / 2, CZ, 110, CY1 - 60, 60).color(channel));
  add(`channel-cap-${i}`, blk(x, 52, CZ - 6, 120, 16, 72).color(channel));
  add(`spout-${i}`, cylZ(x, 95, CZ - 50, 50, 16, 10).color(channel));
  if (running) add(`stream-${i}`, cylZ(x, 95, HZ + R + 110, CZ - 50 - (HZ + R + 110), 13, 8).color(water));
  for (let k = 0; k < 3; k++) {
    const y = 330 + k * 340;
    add(`lettuce-${i}-${k}`, sphere(85).scale(1, 1, 0.6).translate(x, y, CZ + 85).color(leaf));
    add(`heart-${i}-${k}`, cylZ(x, y, CZ + 120, 22, 40, 8).color(heart));
  }
});

return p.model();
