// SPDX-License-Identifier: CC0-1.0
// Scenic flat panel: a Broadway-style hard flat painted as a parlour wall,
// stood up on stage by two hinged stage jacks with stage weights on their feet.
// What makes it a scenic flat rather than a board: a thin painted face on a
// visible 1x4 timber frame (stiles, rails and toggles seen on edge), a
// painted-in window with casing, sash bars and a sky backing, a chair rail,
// wainscot panels and a baseboard picked out in trim paint, and triangular
// stage jacks behind it with cast-iron stage weights holding them down.
// Generic visualization geometry at about real size (1.2 m wide, 2.4 m
// tall), millimetres, Z up, painted face toward -Y, standing on z = 0.

meta({
  name: "scenic-flat-panel",
  license: 'CC0-1.0',
  title: "Scenic flat panel",
  description: "Hard scenic flat at about real size: painted face on a visible timber frame with toggles, painted-in window with casing, sash bars and sky backing, chair rail, two wainscot panels and baseboard in trim paint, and two triangular stage jacks behind it with stage weights. Material controls: wall paint, trim paint, frame timber, stage weights. parlour, cottage and blackBox presets.",
  tags: ['scenic flat', 'hard flat', 'theatre flat', 'stage jack', 'scenery wall', 'set piece', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const wallPaint = param('wallPaint', '#6f8f6a', { label: 'Wall paint' });
const trimPaint = param('trimPaint', '#efe6d2', { label: 'Trim paint' });
const timber = param('timber', '#c7a272', { label: 'Frame timber' });
const weights = param('weights', '#2a2d30', { label: 'Stage weights' });

presets({
  parlour: { wallPaint: '#6f8f6a', trimPaint: '#efe6d2', timber: '#c7a272', weights: '#2a2d30' },
  cottage: { wallPaint: '#d9b98a', trimPaint: '#6b3f2a', timber: '#b58d5c', weights: '#3a3f44' },
  blackBox: { wallPaint: '#1d1e20', trimPaint: '#4a4d50', timber: '#2b2b2b', weights: '#121314' },
});

const SKY = '#8fb8dc';

const p = assembly("scenic-flat-panel");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1200;
const H = 2400;
const FT = 6; // face skin
const FR = 90; // frame depth behind the skin
const WX = 120; // window centre x
const WZ = 1450; // window centre z
const WW = 560;
const WH = 720;

// Painted face with a window opening and a sky backing behind it.
add("face", blk(0, 0, 0, W, FT, H).subtract(blk(WX, 0, WZ - WH / 2, WW, 40, WH)).color(wallPaint));
add("sky-backing", blk(WX, FT / 2 + 20, WZ - WH / 2 - 40, WW + 80, 4, WH + 80).color(SKY));

// Timber frame seen on edge: stiles, rails, toggles and window framing.
for (const sx of [-1, 1]) add(`stile-${sx < 0 ? 'l' : 'r'}`, blk(sx * (W / 2 - 45), FT / 2 + FR / 2, 0, 90, FR, H).color(timber));
add("bottom-rail", blk(0, FT / 2 + FR / 2, 0, W - 180, FR, 90).color(timber));
add("top-rail", blk(0, FT / 2 + FR / 2, H - 90, W - 180, FR, 90).color(timber));
add("toggle-low", blk(0, FT / 2 + FR / 2, 700, W - 180, FR, 70).color(timber));
add("window-head", blk(WX, FT / 2 + FR / 2, WZ + WH / 2, WW + 140, FR, 70).color(timber));
add("window-sill-frame", blk(WX, FT / 2 + FR / 2, WZ - WH / 2 - 70, WW + 140, FR, 70).color(timber));

// Painted-in trim: casing, sill, sash bars, chair rail, wainscot, baseboard.
for (const sx of [-1, 1]) add(`casing-${sx < 0 ? 'l' : 'r'}`, blk(WX + sx * (WW / 2 + 35), -FT / 2 - 8, WZ - WH / 2 - 30, 70, 16, WH + 100).color(trimPaint));
add("casing-head", blk(WX, -FT / 2 - 10, WZ + WH / 2, WW + 180, 20, 90).color(trimPaint));
add("sill", blk(WX, -FT / 2 - 25, WZ - WH / 2 - 50, WW + 140, 50, 40).color(trimPaint));
add("sash-mullion", blk(WX, FT / 2 + 12, WZ - WH / 2, 30, 12, WH).color(trimPaint));
add("sash-meeting-rail", blk(WX, FT / 2 + 12, WZ - 20, WW, 12, 40).color(trimPaint));
add("chair-rail", blk(0, -FT / 2 - 12, 880, W, 24, 50).color(trimPaint));
add("baseboard", blk(0, -FT / 2 - 10, 0, W, 20, 150).color(trimPaint));
for (const x of [-290, 290]) {
  const tag = x < 0 ? 'l' : 'r';
  add(`wainscot-${tag}-top`, blk(x, -FT / 2 - 5, 760, 440, 10, 30).color(trimPaint));
  add(`wainscot-${tag}-bottom`, blk(x, -FT / 2 - 5, 240, 440, 10, 30).color(trimPaint));
  for (const sx of [-1, 1]) add(`wainscot-${tag}-side-${sx < 0 ? 'a' : 'b'}`, blk(x + sx * 205, -FT / 2 - 5, 240, 30, 10, 550).color(trimPaint));
}

// Stage jacks: triangular timber braces hinged to the back, with stage weights.
const JD = 900; // jack depth behind the flat
const JH = 1800;
const jack: [number, number][] = [
  [FT / 2 + FR, 0], [FT / 2 + FR + JD, 0], [FT / 2 + FR + JD, 80], [FT / 2 + FR + 140, JH],
  [FT / 2 + FR, JH], [FT / 2 + FR, JH - 200], [FT / 2 + FR + 60, JH - 200], [FT / 2 + FR + 650, 90],
  [FT / 2 + FR, 90],
];
for (const x of [-W / 2 + 200, W / 2 - 200]) {
  const tag = x < 0 ? 'l' : 'r';
  add(`jack-${tag}`, profileYZ(jack, 22).translate(x, 0, 0).color(timber));
  add(`jack-stile-${tag}`, blk(x, FT / 2 + FR + 30, 90, 22, 60, JH - 290).color(timber));
  add(`jack-hinge-${tag}`, blk(x, FT / 2 + FR + 2, JH - 160, 60, 4, 110).color(weights));
  // Stacked cast stage weights on the jack foot.
  for (let k = 0; k < 2; k++) {
    add(`weight-${tag}-${k}`, blk(x, FT / 2 + FR + 470, 90 + k * 60, 300, 140, 55).color(weights));
    add(`weight-${tag}-${k}-notch`, blk(x, FT / 2 + FR + 470, 90 + k * 60 + 55, 60, 140, 5).color(weights));
  }
}

return p.model();
