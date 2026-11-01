// Original kernelCAD low-poly sandbag wall: pillow-shaped bags (bevelled
// prisms, swollen in the middle) laid in staggered courses, straight or as
// a curved emplacement. Millimetres, Z up, base on z = 0 centred on
// x = y = 0, wall along X.

meta({
  name: 'sandbags',
  license: 'CC0-1.0',
  title: 'Sandbags',
  description: 'Staggered wall of pillow-shaped sandbags for trenches, checkpoints and flood defences, straight or curved. Knobs: courses, bags per course, layout, bag and second bag colours.',
  tags: ['sandbags', 'sandbag', 'barricade', 'cover', 'wall', 'military', 'trench', 'flood', 'bunker'],
  kit: 'props',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'military', 'post-apocalyptic', 'street', 'beach', 'industrial'],
  triangleBudget: 520,
});

const courses = param('courses', '3', { choices: ['2', '3'], label: 'Courses' });
const perCourse = param('perCourse', '4', { choices: ['3', '4'], label: 'Bags per course' });
const layout = param('layout', 'straight', { choices: ['straight', 'curved'], label: 'Layout' });
const bag = param('bag', '#b8a47a', { label: 'Bags' });
const bag2 = param('bag2', '#97835a', { label: 'Second bag shade' });

presets({
  military: { bag: '#7a7a52', bag2: '#626240' },
  white: { bag: '#e4e0d4', bag2: '#c4bfac' },
});

const nc = Number(courses.value);
const nb = Number(perCourse.value);
const BL = 480; // bag length (X)
const BW = 330; // bag width (Y)
const BH = 190; // bag height
const curved = layout.value === 'curved';

// Bag: a bevelled octagon section (width x, height y from 0) lofted along Z
// to a fuller middle and back, so the bag is pillowed at both ends; then
// stood up (section height to +Z) and turned to run along X, base at z = 0.
const sect = (w: number, h: number) => {
  const c = Math.min(w, h) * 0.3;
  return path().moveTo(-w / 2 + c, 0).lineTo(w / 2 - c, 0).lineTo(w / 2, c).lineTo(w / 2, h - c).lineTo(w / 2 - c, h)
    .lineTo(-w / 2 + c, h).lineTo(-w / 2, h - c).lineTo(-w / 2, c).close();
};
// Crimped ends: the section pinches to a low narrow seam at both tips.
const pillow = () => sect(BW * 0.85, BH * 0.7).loft([sect(BW, BH), sect(BW * 0.85, BH * 0.7)], {
  planes: [
    { plane: 'XY', origin: [0, 0, -BL / 2] },
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, BL / 2] },
  ],
  ruled: true,
}).rotateX(90).rotateZ(90);

const sb = assembly('sandbags');
const pitch = BL + 15; // a small gap so each bag reads on its own
const radius = 1400;
let id = 0;
for (let c = 0; c < nc; c++) {
  const k = c % 2 === 0 ? nb : nb - 1;
  const z = c * (BH - 12);
  for (let i = 0; i < k; i++) {
    id++;
    const u = (i - (k - 1) / 2) * pitch;
    let b = pillow();
    const yaw = 2.5 * Math.sin(id * 1.9);
    if (curved) {
      const a = u / radius;
      b = b.rotateZ(yaw + (a * 180) / Math.PI).translate(radius * Math.sin(a), radius * (1 - Math.cos(a)) - radius * 0.05, z);
    } else {
      b = b.rotateZ(yaw).translate(u, 0, z);
    }
    sb.part(`bag-${id}`, b.color(id % 3 === 0 ? bag2 : bag));
  }
}

return sb.model();
