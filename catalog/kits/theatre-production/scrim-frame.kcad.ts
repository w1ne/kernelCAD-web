// SPDX-License-Identifier: CC0-1.0
// Scrim frame: a painted gauze scrim stretched on a freestanding timber frame,
// the piece that reads as a solid painted scene when lit from the front and
// turns see-through when the lights behind it come up.
// What makes it a scrim frame rather than a flat: an open timber frame (stiles,
// rails and plywood corner blocks) with the gauze stretched inside the opening
// rather than a hard skin, a painted scene on the gauze (moon, layered hills
// and a pine treeline), and two hinged stage jacks behind it, each held down
// with cast-iron stage weights. The scene choice switches between the painted
// landscape and plain undyed gauze.
// Generic visualization geometry at about real size (2.4 m wide, 2.2 m tall,
// 0.9 m deep with the jacks), millimetres, Z up, scrim face toward -Y, the
// frame and jacks standing on z = 0.

meta({
  name: "scrim-frame",
  license: 'CC0-1.0',
  title: "Scrim frame",
  description: "Freestanding painted scrim at about real size: a 2.4 m by 2.2 m timber frame with plywood corner blocks, sharkstooth gauze stretched in the opening and painted with a moon, layered hills and a pine treeline, held up by two hinged stage jacks with cast-iron stage weights. Scene choice: painted landscape or plain gauze. Material controls: gauze, far and near scenic paint, timber, iron weights. houseShow, touring and duskScene presets.",
  tags: ['scrim', 'gauze', 'sharkstooth', 'painted drop', 'scenic flat', 'stage jack', 'stage weight', 'scenery', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const scene = param('scene', 'landscape', { choices: ['landscape', 'plain'], label: 'Painted scene' });

const gauze = param('gauze', '#b9c7d6', { label: 'Scrim gauze' });
const paint = param('paint', '#6f8ea6', { label: 'Scenic paint, far hills' });
const shadow = param('shadow', '#24323d', { label: 'Scenic paint, near hill and pines' });
const timber = param('timber', '#c8a676', { label: 'Frame timber' });
const iron = param('iron', '#2f3236', { label: 'Stage weights and hardware' });

presets({
  houseShow: { gauze: '#b9c7d6', paint: '#6f8ea6', shadow: '#24323d', timber: '#c8a676', iron: '#2f3236' },
  touring: { gauze: '#d9d5cc', paint: '#8f9a6a', shadow: '#33401f', timber: '#1f1f22', iron: '#9aa2a7' },
  duskScene: { gauze: '#e2a77a', paint: '#9a5a6e', shadow: '#2e1a33', timber: '#a5815a', iron: '#1c1d20' },
});

const MOON = '#f3ecd0';
const PLY = '#d9c296';

const p = assembly("scrim-frame");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (x, z) outline extruded `t` thick along Y, centred on y = 0.
const profileXZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 2400;
const H = 2200;
const M = 90; // member face width
const D = 40; // member depth

// Timber frame: stiles run full height, rails between them.
for (const sx of [-1, 1]) add(`stile-${sx < 0 ? 'left' : 'right'}`, blk(sx * (W / 2 - M / 2), 0, 0, M, D, H).color(timber));
add("bottom-rail", blk(0, 0, 0, W - 2 * M, D, M).color(timber));
add("top-rail", blk(0, 0, H - M, W - 2 * M, D, M).color(timber));
// Plywood corner blocks on the back face.
for (const sx of [-1, 1]) {
  for (const top of [false, true]) {
    const xc = sx * (W / 2 - M);
    const zc = top ? H - M : M;
    const tri = [[xc, zc], [xc - sx * 260, zc], [xc, zc + (top ? -260 : 260)]];
    add(`corner-block-${sx < 0 ? 'l' : 'r'}-${top ? 't' : 'b'}`, profileXZ(tri, 8).translate(0, D / 2 + 4, 0).color(PLY));
  }
}

// Gauze stretched in the opening, with staple tape around its edge.
const GW = W - 2 * M;
const GH = H - 2 * M;
add("gauze", blk(0, 0, M, GW, 3, GH).color(gauze));

if (scene.value === 'landscape') {
  const Y = -4; // paint sits on the front of the gauze
  add("moon", cylinder(3, 170, 24).rotateX(90).translate(520, Y + 1.5, M + GH - 420).color(MOON));
  // Far hills: a long rolling silhouette.
  const xs = [-GW / 2, -800, -450, -100, 250, 650, GW / 2];
  const far = [880, 1080, 960, 1180, 1020, 1120, 940];
  add("far-hills", profileXZ([[-GW / 2, M], [GW / 2, M], ...xs.map((x, i) => [x, M + far[i]]).reverse()], 3).translate(0, Y, 0).color(paint));
  // Near hill: a darker swell in front.
  const near = [[-GW / 2, M], [GW / 2, M], [GW / 2, M + 420], [600, M + 620], [100, M + 520], [-500, M + 700], [-GW / 2, M + 560]];
  add("near-hill", profileXZ(near, 3).translate(0, Y - 3, 0).color(shadow));
  // Pine treeline on the near hill.
  const pines = [[-980, 640, 520], [-820, 680, 420], [-640, 690, 600], [-300, 600, 380], [380, 560, 460], [760, 560, 560], [930, 500, 400]];
  for (const [k, [x, base, h]] of pines.entries()) {
    const w = h * 0.36;
    const tree = [[x - w, M + base], [x - w * 0.35, M + base + h * 0.4], [x - w * 0.7, M + base + h * 0.4], [x, M + base + h], [x + w * 0.7, M + base + h * 0.4], [x + w * 0.35, M + base + h * 0.4], [x + w, M + base]];
    add(`pine-${k}`, profileXZ(tree, 3).translate(0, Y - 6, 0).color(shadow));
  }
}

// Stage jacks: hinged triangular braces behind each stile, with weights.
const JD = 850; // jack depth along +Y
const JH = 1800; // jack height
for (const sx of [-1, 1]) {
  const tag = sx < 0 ? 'left' : 'right';
  const x = sx * (W / 2 - M - 120);
  const jack = [[D / 2, 0], [D / 2 + JD, 0], [D / 2 + JD, 70], [D / 2 + 70, JH], [D / 2, JH]];
  const hole = [[D / 2 + 70, 70], [D / 2 + JD - 160, 70], [D / 2 + 70, JH - 300]];
  add(`jack-${tag}`, profileYZ(jack, 30).subtract(profileYZ(hole, 40)).translate(x, 0, 0).color(timber));
  for (const z of [300, JH - 200]) add(`jack-hinge-${tag}-${z}`, blk(x, D / 2 + 2, z, 70, 4, 120).color(iron));
  // Cast-iron stage weights stacked on the jack foot.
  for (let k = 0; k < 2; k++) {
    add(`stage-weight-${tag}-${k}`, blk(x, D / 2 + JD - 220, 70 + k * 64, 300, 140, 60).color(iron));
  }
}

return p.model();
