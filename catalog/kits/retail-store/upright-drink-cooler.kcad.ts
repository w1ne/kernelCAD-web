// SPDX-License-Identifier: CC0-1.0
// Upright drink cooler: the single-door glass-front fridge of cold drinks
// by the till. What makes it a drink cooler rather than a cupboard: a tall
// cabinet with a lit brand canopy on top, a glass door in a thick framed
// surround with a full-height pull handle, wire shelves with price strips
// stocked with rows of bottles and cans, and a louvred compressor grille
// in the plinth. The door can stand open so the stock shows. Generic
// visualization geometry at about real size (2 m tall, 600 mm wide),
// millimetres, Z up, door on -Y, hinged on the +X side.

meta({
  name: "upright-drink-cooler",
  license: 'CC0-1.0',
  title: "Upright drink cooler",
  description: "Single-door glass-front drink fridge at about real size: tall cabinet with lit brand canopy, framed glass door with full-height pull handle (open or closed), four wire shelves with price strips stocked with bottles and cans, and a louvred compressor plinth. Material controls: cabinet, door frame, glass, brand canopy. colaRed, energyBlack and dairyWhite presets; door choice.",
  tags: ['drink cooler', 'fridge', 'beverage cooler', 'refrigeration', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 4500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#c8232c', { label: 'Cabinet paint' });
const doorFrame = param('doorFrame', '#2a2d30', { label: 'Door frame' });
const glass = param('glass', '#a9d3df', { label: 'Door glass' });
const canopy = param('canopy', '#f4f1ea', { label: 'Brand canopy' });
const door = param('door', 'open', { choices: ['open', 'closed'], label: 'Door' });

presets({
  colaRed: { cabinet: '#c8232c', doorFrame: '#2a2d30', glass: '#a9d3df', canopy: '#f4f1ea' },
  energyBlack: { cabinet: '#1e2124', doorFrame: '#3a3f43', glass: '#8fb3bf', canopy: '#9bd23c' },
  dairyWhite: { cabinet: '#eef1f1', doorFrame: '#9aa3a8', glass: '#c4e0e8', canopy: '#2f6fc1' },
});

const p = assembly("upright-drink-cooler");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const W = 600;
const D = 620;
const H = 1800;
const PL = 160;

// Cabinet shell with the display bay cut out of the front.
add("cabinet", blk(0, 0, 0, W, D, H).subtract(blk(0, -60, PL + 40, W - 80, D, H - PL - 120)).color(cabinet));
add("bay-liner", blk(0, D / 2 - 50, PL + 40, W - 80, 6, H - PL - 120).color('#e9eeef'));
add("plinth-grille", blk(0, -D / 2 - 2, 20, W - 60, 4, PL - 40).color('#2a2d30'));
for (let i = 0; i < 5; i++) add(`louvre-${i}`, blk(0, -D / 2 - 6, 34 + i * 22, W - 90, 6, 8).color(doorFrame));
add("foot-strip", blk(0, 0, 0, W - 20, D - 20, 20).color(doorFrame));

// Lit brand canopy, raked forward.
add("canopy", profileYZ([[D / 2, 0], [-D / 2 - 20, 0], [-D / 2 - 40, 260], [D / 2, 240]], W).translate(0, 0, H).color(canopy));
add("canopy-band", profileYZ([[-D / 2 - 22, 40], [-D / 2 - 30, 40], [-D / 2 - 47, 200], [-D / 2 - 39, 200]], W - 40).translate(0, 0, H).color(cabinet));
add("canopy-wave", profileYZ([[-D / 2 - 26, 70], [-D / 2 - 35, 70], [-D / 2 - 46, 170], [-D / 2 - 37, 170]], W - 220).translate(0, 0, H).color('#ffffff'));

// Wire shelves with price strips, stocked with bottles and cans.
const shelfZ = [PL + 70, PL + 470, PL + 870, PL + 1270];
const bottle = turned([[0, 0], [30, 0], [30, 170], [11, 240], [0, 240]]);
const flavours = ['#c8232c', '#2f8a4a', '#f2a51a', '#c8232c', '#3d6fc1', '#8b2a8a'];
shelfZ.forEach((z, si) => {
  add(`shelf-${si}`, blk(0, 0, z - 14, W - 90, D - 120, 14).color('#c4cbcf'));
  add(`price-strip-${si}`, blk(0, -D / 2 + 58, z - 34, W - 90, 6, 40).color('#f4f1ea'));
  for (let c = 0; c < 2; c++) {
    const y = -150 + c * 140;
    if (si % 2 === 0 && c === 0) {
      for (let k = 0; k < 7; k++) add(`bottle-${si}-${c}-${k}`, bottle.translate(-225 + k * 75, y, z).color(flavours[(k + si) % 6]));
    } else {
      for (let k = 0; k < 8; k++) add(`can-${si}-${c}-${k}`, cylinder(122, 33, 10).translate(-232 + k * 66, y, z).color(flavours[(k + si + 2) % 6]));
    }
  }
});

// Glass door in a thick frame with a full-height pull handle. Hinge on +X.
const DW = W - 20;
const DH = H - PL - 60;
const frame = blk(-DW / 2, -30, 0, DW, 50, DH).subtract(blk(-DW / 2, -30, 70, DW - 120, 60, DH - 140));
const pane = blk(-DW / 2, -30, 70, DW - 120, 14, DH - 140);
const handle = blk(-DW + 40, -90, 300, 30, 30, DH - 600).union(blk(-DW + 40, -60, 300, 30, 40, 30)).union(blk(-DW + 40, -60, DH - 330, 30, 40, 30));
const swing = door.value === 'open' ? 105 : 0;
const hinge = (s: Shape) => s.rotateZ(swing).translate(W / 2 - 10, -D / 2, PL + 20);
add("door-frame", hinge(frame).color(doorFrame));
add("door-glass", hinge(pane).color(glass));
add("door-handle", hinge(handle).color('#c4cbcf'));
add("door-gasket", hinge(blk(-DW / 2, 4, 20, DW - 40, 6, DH - 40).subtract(blk(-DW / 2, 4, 40, DW - 80, 20, DH - 80))).color('#4a4f53'));

return p.model();
