// SPDX-License-Identifier: CC0-1.0
// Retail recycling station: the three-stream bin unit by the store exit.
// What makes it a sorting station rather than a cabinet: three colour-coded
// raked lids, each with an aperture shaped for its stream (a round hole for
// bottles and cans, a letterbox slot for paper, a square push opening for
// general waste), matching pictograms on each front door, recessed door
// pulls, and a back upstand carrying colour header tiles. Generic
// visualization geometry at about real size (1.2 m wide, 1.27 m tall),
// millimetres, Z up, front on -Y.

meta({
  name: "recycling-station",
  license: 'CC0-1.0',
  title: "Retail recycling station",
  description: "Three-stream recycling station at about real size: colour-coded raked lids with a round bottle-and-can hole, a paper letterbox slot and a square general-waste opening, matching pictograms on each front door, recessed pulls, a dark kick plinth and a back upstand with colour header tiles. Material controls: cabinet, plastics stream, paper stream and general stream. councilClassic, stainlessLobby and ecoTimber presets.",
  tags: ['recycling station', 'recycling bin', 'waste sorting', 'litter bin', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#e4e8e8', { label: 'Cabinet' });
const plastics = param('plastics', '#f2b51a', { label: 'Plastics and cans stream' });
const paper = param('paper', '#2f6fc1', { label: 'Paper stream' });
const general = param('general', '#3a3f44', { label: 'General waste stream' });

presets({
  councilClassic: { cabinet: '#e4e8e8', plastics: '#f2b51a', paper: '#2f6fc1', general: '#3a3f44' },
  stainlessLobby: { cabinet: '#b9c1c4', plastics: '#e0782c', paper: '#3a8f5a', general: '#5a2a2a' },
  ecoTimber: { cabinet: '#a07a4c', plastics: '#d8b13a', paper: '#4a7fb0', general: '#2b2f33' },
});

const p = assembly("recycling-station");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const W = 1200;
const D = 450;
const TOP = 890;
const BW = 390;
const DARK = '#141618';

// Shared cabinet on a recessed kick plinth, with a back upstand.
add("plinth", blk(0, 15, 0, W - 40, D - 40, 70).color(DARK));
add("cabinet", blk(0, 0, 70, W, D, TOP - 70).color(cabinet));
add("upstand", blk(0, D / 2 - 15, TOP, W, 30, 380).color(cabinet));
add("side-sticker", blk(-W / 2 - 2, -20, 420, 4, 260, 200).color('#f6f3ea'));
add("side-sticker-band", blk(-W / 2 - 4, -20, 580, 4, 260, 40).color(paper));

// Per-stream pictogram outlines in the (x, z) plane.
const icons = [
  // Bottle beside a can.
  [[[-70, 0], [-10, 0], [-10, 150], [-30, 195], [-30, 235], [-50, 235], [-50, 195], [-70, 150]], [[10, 0], [70, 0], [70, 120], [10, 120]]],
  // Sheet of paper with a folded corner.
  [[[-60, 0], [60, 0], [60, 140], [25, 175], [-60, 175]]],
  // Tied rubbish bag.
  [[[-60, 0], [60, 0], [72, 130], [28, 145], [20, 180], [-20, 180], [-28, 145], [-72, 130]]],
];
const streams = [plastics, paper, general];

streams.forEach((tone, i) => {
  const x = (i - 1) * (BW + 15);
  // Raked lid with its stream aperture cut through.
  let lid = profileYZ([[-D / 2, 0], [D / 2 - 30, 0], [D / 2 - 30, 90], [-D / 2, 40]], BW).translate(x, 0, TOP);
  const hole = i === 0
    ? cylinder(200, 78, 20).translate(x, -30, TOP - 50)
    : i === 1 ? blk(x, -30, TOP - 50, 280, 46, 200) : blk(x, -20, TOP - 50, 240, 170, 200);
  lid = lid.subtract(hole);
  add(`lid-${i}`, lid.color(tone));
  add(`aperture-${i}`, (i === 0 ? cylinder(2, 78, 20).translate(x, -30, TOP + 1) : i === 1 ? blk(x, -30, TOP + 1, 280, 46, 2) : blk(x, -20, TOP + 1, 240, 170, 2)).color(DARK));
  if (i === 2) add("push-flap", blk(0, 0, 0, 236, 166, 4).rotateX(10).translate(x, -20, TOP + 12).color('#26292c'));
  // Front door with pull, stream band and pictogram.
  add(`door-${i}`, blk(x, -D / 2 - 3, 90, BW - 10, 6, TOP - 120).color(cabinet));
  add(`door-band-${i}`, blk(x, -D / 2 - 7, TOP - 140, BW - 10, 6, 90).color(tone));
  add(`door-pull-${i}`, blk(x, -D / 2 - 8, TOP - 190, 170, 6, 24).color(DARK));
  icons[i].forEach((pts, k) => add(`icon-${i}-${k}`, profileXZ(pts, 6).translate(x, -D / 2 - 8, 380).color(tone)));
  add(`icon-plate-${i}`, blk(x, -D / 2 - 5, 340, 230, 4, 280).color('#f6f3ea'));
  // Header tile on the upstand.
  add(`tile-${i}`, blk(x, D / 2 - 33, TOP + 150, BW - 20, 6, 190).color(tone));
  add(`tile-text-${i}`, blk(x, D / 2 - 37, TOP + 270, BW - 120, 4, 34).color('#f6f3ea'));
  add(`tile-icon-${i}`, cylinder(4, 44, 16).rotateX(90).translate(x, D / 2 - 35, TOP + 205).color('#f6f3ea'));
});

return p.model();
