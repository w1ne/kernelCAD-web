// Softbox light: a studio strobe fitted with a fabric light modifier that turns a
// small hard flash into a broad, soft source. What makes it this thing rather
// than a panel on a pole: a tapered fabric shell lofted from a round speedring
// out to a wide front, a white front diffuser recessed inside a black rim, a
// monolight head behind the speedring with its rear control panel and cooling
// grille, a tilting umbrella bracket with a lever handle, and a three-leg light
// stand with braces, telescoping column sections and lock knobs.
// Generic visualization geometry at real size (about 1.9 m tall), millimetres,
// Z up, feet on z = 0, light pointing to -Y.
meta({
  name: "softbox-light",
  license: 'CC0-1.0',
  title: "Softbox light",
  description: "Studio softbox on a monolight: tapered fabric shell lofted from the speedring to a wide front, recessed white diffuser in a black rim, strobe head with control panel and grille, tilting umbrella bracket with lever, and a braced three-leg light stand with telescoping column and lock knobs. Material controls: diffuser fabric, shell fabric, metal, rubber. Shape choice rectangle, octabox or strip; studioBlack and fieldRental presets.",
  tags: ["softbox light", "softbox", "strobe", "monolight", "light stand", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1500,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shape = param('shape', 'rectangle', { choices: ['rectangle', 'octabox', 'strip'], label: 'Softbox shape' });
const diffusionFabric = param('diffusionFabric', '#fff7e8', { label: 'Front diffuser fabric' });
const fabric = param('fabric', '#2a2d31', { label: 'Softbox shell fabric' });
const metal = param('metal', '#a9b5ba', { label: 'Stand and strobe metal' });
const rubber = param('rubber', '#1b2024', { label: 'Knobs, feet and panel rubber' });

presets({
  studioBlack: { diffusionFabric: '#fff7e8', fabric: '#2a2d31', metal: '#a9b5ba', rubber: '#1b2024' },
  fieldRental: { diffusionFabric: '#fff0c8', fabric: '#6f6a5c', metal: '#657780', rubber: '#292b2d' },
});

const p = assembly("softbox-light");
const add = (name, s) => p.part(name, s.scale(scale));

// Round polygon of n points.
const circle = (r, n = 10, rot = 0.5) => Array.from({ length: n }, (_, i) => {
  const t = ((i + rot) / n) * Math.PI * 2;
  return [r * Math.cos(t), r * Math.sin(t)];
});
// Closed path through [x, y] points.
const outline = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) pb = pb.lineTo(x, y);
  return pb.close();
};
// Revolve an (r, z) profile about Z.
const turned = (pts) => outline(pts).revolve();
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Rectangle of w x h centred on the origin, as [x, y] points.
const rect = (w, h) => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];

// Light axis height and softbox depth from speedring (y = 0) to the front (y = -DEPTH).
const C = 1480;
const DEPTH = shape.value === 'strip' ? 300 : 400;
// Front opening, and the small rear opening it is lofted from, as [x, z-up] points.
const front = shape.value === 'octabox' ? circle(460, 8) : shape.value === 'strip' ? rect(320, 1200) : rect(620, 880);
const rear = shape.value === 'octabox' ? circle(90, 8) : rect(150, 150);
const inset = (pts, k) => pts.map(([x, y]) => [x * k, y * k]);
// Lofted along +Z, then turned so the profile's y is world z and the loft runs to -Y.
const toLight = (s) => s.rotateX(90).translate(0, 0, C);

add('softbox-shell', toLight(outline(rear).loft(outline(front), { spacing: DEPTH, ruled: true })).color(fabric));
add('front-diffuser', toLight(extrudePolygon(inset(front, 0.94), 4).translate(0, 0, DEPTH)).color(diffusionFabric));
add('speedring', toLight(turned([[60, -30], [98, -30], [98, 6], [60, 6]])).color(metal));

// Monolight head behind the speedring: body, cooling grille, rear control panel and handle.
add('strobe-body', rod([0, 30, C], [0, 230, C], 62, 14).color(metal));
add('strobe-grille', rod([0, 120, C], [0, 180, C], 64, 14).color(rubber));
add('strobe-rear-panel', rod([0, 230, C], [0, 240, C], 56, 14).color(rubber));
add('strobe-display', box(50, 2, 26, true).translate(0, 241, C + 18).color(diffusionFabric));
add('strobe-handle', box(26, 140, 18, true).translate(0, 150, C + 72).color(rubber));

// Umbrella bracket: tilt hub, lever handle and the spigot socket on the stand.
const SY = 140;
add('bracket-yoke', box(40, 60, 90, true).translate(0, SY, C - 98).color(metal));
add('bracket-tilt-hub', rod([-34, SY, C - 120], [34, SY, C - 120], 26, 12).color(metal));
add('bracket-lever', rod([34, SY, C - 120], [70, SY + 110, C - 180], 8, 8).color(metal));
add('bracket-lever-grip', rod([58, SY + 74, C - 160], [72, SY + 116, C - 183], 12, 8).color(rubber));
add('bracket-socket', rod([0, SY, C - 230], [0, SY, C - 143], 17, 10).color(metal));

// Light stand: telescoping column with lock knobs, a braced leg collar and three feet.
const LEG_TOP = 520;
const BRACE = 330;
add('column-lower', rod([0, SY, BRACE - 30], [0, SY, 1060], 17).color(metal));
add('column-middle', rod([0, SY, 1050], [0, SY, 1300], 14).color(metal));
add('column-upper', rod([0, SY, 1290], [0, SY, C - 220], 11).color(metal));
for (const [i, z] of [1060, 1300].entries()) {
  add(`column-collar-${i}`, turned([[0, 0], [22, 0], [22, 26], [0, 26]]).translate(0, SY, z - 13).color(rubber));
  add(`column-lock-knob-${i}`, rod([0, SY, z], [36, SY, z], 9, 8).color(rubber));
}
add('leg-collar', turned([[0, 0], [28, 0], [28, 40], [0, 40]]).translate(0, SY, LEG_TOP - 20).color(metal));
add('brace-collar', turned([[0, 0], [26, 0], [26, 30], [0, 30]]).translate(0, SY, BRACE - 15).color(metal));
add('brace-collar-knob', rod([0, SY, BRACE], [0, SY + 46, BRACE], 9, 8).color(rubber));
for (let i = 0; i < 3; i += 1) {
  const a = (i * 2 * Math.PI) / 3 + Math.PI / 2;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const top = [28 * c, SY + 28 * s, LEG_TOP];
  const foot = [500 * c, SY + 500 * s, 14];
  const mid = [top[0] + (foot[0] - top[0]) * 0.55, top[1] + (foot[1] - top[1]) * 0.55, top[2] + (foot[2] - top[2]) * 0.55];
  add(`leg-${i}`, rod(top, foot, 11).color(metal));
  add(`brace-${i}`, rod([24 * c, SY + 24 * s, BRACE], mid, 6, 8).color(metal));
  add(`foot-${i}`, turned([[0, 0], [20, 0], [18, 8], [12, 22], [0, 22]]).translate(foot[0], foot[1], 0).color(rubber));
}

return p.model();
