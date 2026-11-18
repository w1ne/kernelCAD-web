// SPDX-License-Identifier: CC0-1.0
// Prop table: the backstage table where every hand prop lives between
// entrances, each in its own taped-out, labelled spot.
// What makes it a prop table rather than a work bench: a black-painted
// frame with a lower shelf and a storage tote; a pale paper-covered top with
// a low lip at the back and ends so nothing rolls off; each prop sitting
// inside a rectangle of spike tape with a name card at the front edge (a
// goblet, a book, a lantern, a dagger and a letter); and a blue-gelled clip
// light on a gooseneck so the crew can see the spots in the dark.
// Generic visualization geometry at about real size (1.8 m x 0.75 m, top at
// 0.88 m), millimetres, Z up, front toward -Y, standing on z = 0.

meta({
  name: "prop-table",
  license: 'CC0-1.0',
  title: "Prop table",
  description: "Backstage prop table at about real size: black-painted frame with lower shelf and storage tote, paper-covered top with a back and end lip, spike-tape outlines with name cards for each prop (goblet, book, lantern, dagger, letter) and a blue-gelled gooseneck clip light. Material controls: painted frame, paper-covered top, spike tape and cards, running light. houseShow, touring and rehearsalRoom presets.",
  tags: ['prop table', 'props', 'backstage', 'spike tape', 'running light', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const frame = param('frame', '#232629', { label: 'Painted frame and shelf' });
const worktop = param('worktop', '#e6dfcf', { label: 'Paper-covered top' });
const tape = param('tape', '#f0f0ea', { label: 'Spike tape and name cards' });
const runningLight = param('runningLight', '#2f62d8', { label: 'Running light gel' });

presets({
  houseShow: { frame: '#232629', worktop: '#e6dfcf', tape: '#f0f0ea', runningLight: '#2f62d8' },
  touring: { frame: '#1d2023', worktop: '#3a3f44', tape: '#e8d43a', runningLight: '#3d6de0' },
  rehearsalRoom: { frame: '#7a5a3a', worktop: '#d8c6a2', tape: '#e2413a', runningLight: '#e8e2c8' },
});

const INK = '#2a2c2e';
const GOLD = '#c9a03a';
const LEATHER = '#7a2430';
const PAGES = '#efe6cc';
const BRASS = '#9b7c3a';
const FLAME = '#f3b23a';
const STEEL = '#b9c1c4';
const TOTE = '#3d78b8';
const RUBBER = '#1a1c1e';

const p = assembly("prop-table");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const W = 1800;
const D = 750;
const TZ = 880; // top surface

// Frame: legs on rubber feet, aprons, lower shelf with a storage tote.
for (const x of [-W / 2 + 40, W / 2 - 40])
  for (const y of [-D / 2 + 40, D / 2 - 40]) {
    const id = `${x < 0 ? 'l' : 'r'}${y < 0 ? 'f' : 'b'}`;
    add(`leg-${id}`, blk(x, y, 20, 50, 50, TZ - 45).color(frame));
    add(`foot-${id}`, cylinder(20, 30, 12).translate(x, y, 0).color(RUBBER));
  }
add("apron-front", blk(0, -D / 2 + 40, TZ - 120, W - 60, 24, 95).color(frame));
add("apron-back", blk(0, D / 2 - 40, TZ - 120, W - 60, 24, 95).color(frame));
add("shelf", blk(0, 0, 200, W - 60, D - 60, 22).color(frame));
add("tote", blk(-450, 20, 222, 560, 400, 260).color(TOTE));
add("tote-lid", blk(-450, 20, 482, 590, 420, 24).color(TOTE));

// Paper-covered top with a lip at the back and both ends.
add("top", blk(0, 0, TZ - 25, W, D, 25).color(worktop));
add("lip-back", blk(0, D / 2 - 10, TZ, W, 20, 40).color(frame));
add("lip-left", blk(-W / 2 + 10, 0, TZ, 20, D, 40).color(frame));
add("lip-right", blk(W / 2 - 10, 0, TZ, 20, D, 40).color(frame));

// Spike-tape outline with a name card at its front edge.
const spot = (id: string, x: number, y: number, w: number, d: number) => {
  add(`tape-${id}-f`, blk(x, y - d / 2, TZ, w, 20, 2).color(tape));
  add(`tape-${id}-b`, blk(x, y + d / 2, TZ, w, 20, 2).color(tape));
  add(`tape-${id}-l`, blk(x - w / 2, y, TZ, 20, d, 2).color(tape));
  add(`tape-${id}-r`, blk(x + w / 2, y, TZ, 20, d, 2).color(tape));
  add(`card-${id}`, blk(x, -D / 2 + 45, TZ, Math.min(w, 140), 50, 3).color(tape));
  add(`card-${id}-ink`, blk(x, -D / 2 + 45, TZ + 3, Math.min(w, 140) - 40, 12, 1).color(INK));
};

// Goblet.
spot("goblet", -640, 30, 200, 200);
add("goblet", turned([[0, 0], [44, 0], [44, 6], [9, 16], [9, 80], [32, 96], [44, 160], [38, 160], [28, 104], [0, 100]]).translate(-640, 30, TZ).color(GOLD));

// Book.
spot("book", -330, 20, 300, 240);
add("book-cover", blk(-330, 20, TZ, 240, 180, 44).color(LEATHER));
add("book-pages", blk(-326, 16, TZ + 6, 236, 170, 32).color(PAGES));

// Lantern with its wire handle.
spot("lantern", 20, 40, 240, 240);
add("lantern-base", cylinder(30, 80, 16).translate(20, 40, TZ).color(BRASS));
add("lantern-glass", cylinder(150, 64, 16).translate(20, 40, TZ + 30).color(FLAME));
for (const a of [0, 90, 180, 270]) {
  const t = (a * Math.PI) / 180;
  add(`lantern-post-${a}`, cylinder(150, 6, 6).translate(20 + 70 * Math.cos(t), 40 + 70 * Math.sin(t), TZ + 30).color(BRASS));
}
add("lantern-cap", turned([[0, 0], [86, 0], [50, 50], [14, 70], [0, 70]]).translate(20, 40, TZ + 180).color(BRASS));
add("lantern-handle", torus(50, 5, 16).rotateX(90).subtract(box(140, 20, 60, true).translate(0, 0, -30)).translate(20, 40, TZ + 250).color(BRASS));

// Dagger lying on the table.
spot("dagger", 420, 0, 420, 160);
add("dagger-blade", extrudePolygon([[0, -16], [250, -10], [290, 0], [250, 10], [0, 16]], 6).translate(380, 0, TZ).color(STEEL));
add("dagger-guard", blk(374, 0, TZ, 16, 110, 14).color(GOLD));
add("dagger-grip", cylinder(110, 13, 10).rotateY(90).translate(256, 0, TZ + 14).color(LEATHER));
add("dagger-pommel", sphere(20).translate(250, 0, TZ + 16).color(GOLD));

// Letter, sealed.
spot("letter", 720, 10, 220, 180);
add("letter", box(170, 110, 4, true).rotateZ(12).translate(720, 10, TZ + 2).color(PAGES));
add("letter-seal", cylinder(4, 16, 12).translate(720, 10, TZ + 4).color(LEATHER));

// Gooseneck clip light on the back lip, blue gel pointing at the spots.
add("lamp-clamp", blk(260, D / 2 - 10, TZ + 20, 60, 50, 50).color(frame));
add("lamp-stalk", cylinder(260, 8, 8).translate(260, D / 2 - 10, TZ + 70).color(frame));
add("lamp-arm", cylinder(180, 8, 8).rotateX(90).translate(260, D / 2 - 10, TZ + 330).color(frame));
add("lamp-head", turned([[0, -70], [52, -70], [30, 0], [0, 0]]).translate(260, D / 2 - 190, TZ + 345).color(frame));
add("lamp-gel", cylinder(6, 50, 16).translate(260, D / 2 - 190, TZ + 269).color(runningLight));
add("lamp-gel-frame", torus(53, 7, 16).translate(260, D / 2 - 190, TZ + 276).color(runningLight));

return p.model();
