// Camera tripod: a portable three-leg stand that holds a stills camera steady.
// What makes it a photo tripod rather than three sticks: a cast spider at the top
// with hinged leg lugs, three telescoping leg tubes that step down in diameter
// with a coloured flip-lock clamp at each joint, foam grips on the upper
// sections, a centre column with a lock collar and ballast hook, rubber feet, and
// a head on top: a ball head with lock knob and quick-release clamp, or a
// pan-tilt head with a long pan handle.
// Generic visualization geometry at real size (about 1.45 m to the platform),
// millimetres, Z up, feet on z = 0.
meta({
  name: "camera-tripod",
  license: 'CC0-1.0',
  title: "Camera tripod",
  description: "Three-section aluminium camera tripod: cast spider with hinged leg lugs, telescoping legs with flip-lock clamps and foam grips, rubber feet, centre column with lock collar and ballast hook, and a ball head with quick-release clamp or a pan-tilt head with pan handle. Material controls: tube metal, rubber, anodized accent. Head choice ball or pan-tilt; studioBlack and fieldRental presets.",
  tags: ["camera tripod", "tripod", "ball head", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const head = param('head', 'ball', { choices: ['ball', 'pan-tilt'], label: 'Tripod head' });
const metal = param('metal', '#a9b5ba', { label: 'Leg tube and casting metal' });
const rubber = param('rubber', '#1b2024', { label: 'Feet, grips and knobs rubber' });
const anodized = param('anodized', '#c2412d', { label: 'Anodized clamps and plate' });

presets({
  studioBlack: { metal: '#3a4045', rubber: '#1b2024', anodized: '#c2412d' },
  fieldRental: { metal: '#657780', rubber: '#292b2d', anodized: '#3f7fc4' },
});

const p = assembly("camera-tripod");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Round polygon of n points.
const circle = (r, n = 10) => Array.from({ length: n }, (_, i) => {
  const t = ((i + 0.5) / n) * Math.PI * 2;
  return [r * Math.cos(t), r * Math.sin(t)];
});
// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Spider casting at the top of the legs, with a lug per leg hinge.
const APEX = 1190;
const SPLAY = (23 * Math.PI) / 180;
add('spider', turned([[0, APEX - 24], [44, APEX - 24], [48, APEX - 8], [40, APEX + 14], [0, APEX + 14]]).color(metal));

for (let i = 0; i < 3; i += 1) {
  const az = (i * 2 * Math.PI) / 3 + Math.PI / 6;
  const [c, s] = [Math.cos(az), Math.sin(az)];
  const top = [54 * c, 54 * s, APEX - 12];
  const foot = [top[0] + (APEX - 26) * Math.tan(SPLAY) * c, top[1] + (APEX - 26) * Math.tan(SPLAY) * s, 14];
  const at = (t) => [top[0] + (foot[0] - top[0]) * t, top[1] + (foot[1] - top[1]) * t, top[2] + (foot[2] - top[2]) * t];
  add(`leg-${i}-hinge-lug`, box(30, 26, 34, true).rotateZ((az * 180) / Math.PI).translate(46 * c, 46 * s, APEX - 6).color(metal));
  add(`leg-${i}-hinge-pin`, rod([46 * c - 16 * s, 46 * s + 16 * c, APEX - 4], [46 * c + 16 * s, 46 * s - 16 * c, APEX - 4], 5, 8).color(anodized));
  // Three telescoping sections, each thinner than the one above it.
  add(`leg-${i}-upper`, rod(at(0), at(0.42), 14).color(metal));
  add(`leg-${i}-middle`, rod(at(0.4), at(0.72), 11.5).color(metal));
  add(`leg-${i}-lower`, rod(at(0.7), at(0.99), 9).color(metal));
  add(`leg-${i}-foam-grip`, rod(at(0.04), at(0.22), 17).color(rubber));
  add(`leg-${i}-lock-1`, rod(at(0.4), at(0.45), 18, 8).color(anodized));
  add(`leg-${i}-lock-2`, rod(at(0.7), at(0.75), 15, 8).color(anodized));
  add(`leg-${i}-lock-1-lever`, box(10, 30, 50, true).rotateZ((az * 180) / Math.PI).translate(...at(0.425)).translate(18 * c, 18 * s, 0).color(anodized));
  add(`leg-${i}-lock-2-lever`, box(9, 26, 44, true).rotateZ((az * 180) / Math.PI).translate(...at(0.725)).translate(15 * c, 15 * s, 0).color(anodized));
  add(`leg-${i}-foot`, turned([[0, 0], [20, 0], [19, 6], [13, 26], [0, 26]]).translate(foot[0], foot[1], 0).color(rubber));
}

// Centre column with its lock collar below the spider and a ballast hook.
add('column-lock-collar', turned([[0, APEX - 60], [26, APEX - 60], [26, APEX - 24], [0, APEX - 24]]).color(anodized));
add('column-lock-knob', rod([0, 0, APEX - 42], [44, 0, APEX - 42], 8, 8).color(rubber));
add('centre-column', rod([0, 0, 840], [0, 0, APEX + 120], 15).color(metal));
add('ballast-hook-stem', rod([0, 0, 800], [0, 0, 842], 5, 8).color(metal));
add('ballast-hook', turned([[14, 0], [20, 0], [20, 6], [14, 6]]).rotateX(90).translate(0, 3, 792).color(metal));
add('column-top-plate', turned([[0, 0], [30, 0], [30, 10], [0, 10]]).translate(0, 0, APEX + 120).color(metal));

// Head on the column top.
const HZ = APEX + 130;
if (head.value === 'pan-tilt') {
  add('pan-base', turned([[0, 0], [32, 0], [30, 22], [0, 22]]).translate(0, 0, HZ).color(metal));
  add('pan-lock-knob', rod([0, 30, HZ + 10], [0, 52, HZ + 10], 8, 8).color(rubber));
  add('tilt-block', box(54, 46, 50, true).translate(0, 0, HZ + 47).color(metal));
  add('tilt-hub', rod([-34, 0, HZ + 52], [34, 0, HZ + 52], 20, 12).color(metal));
  add('pan-handle', rod([-30, 0, HZ + 52], [-260, -40, HZ - 40], 9).color(metal));
  add('pan-handle-grip', rod([-170, -24, HZ - 4], [-260, -40, HZ - 40], 13).color(rubber));
  add('platform', box(80, 70, 12, true).translate(0, 0, HZ + 78).color(metal));
  add('quick-release-plate', box(70, 46, 10, true).translate(0, 0, HZ + 89).color(anodized));
} else {
  add('ball-base', turned([[0, 0], [30, 0], [31, 8], [27, 34], [0, 34]]).translate(0, 0, HZ).color(metal));
  add('ball', sphere(24).translate(0, 0, HZ + 46).color(metal));
  add('ball-lock-knob', turned([[0, 0], [14, 0], [14, 16], [10, 22], [0, 22]]).rotateY(90).translate(26, 0, HZ + 22).color(rubber));
  add('ball-neck', rod([0, 0, HZ + 60], [0, 0, HZ + 78], 11, 10).color(metal));
  add('clamp-body', box(66, 60, 16, true).translate(0, 0, HZ + 84).color(anodized));
  add('clamp-knob', rod([0, 30, HZ + 84], [0, 48, HZ + 84], 9, 10).color(rubber));
  add('quick-release-plate', box(80, 42, 9, true).translate(0, 0, HZ + 96).color(metal));
  add('camera-screw', rod([0, 0, HZ + 100], [0, 0, HZ + 104], 6, 8).color(anodized));
}

return p.model();
