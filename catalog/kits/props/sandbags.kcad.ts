// Original kernelCAD low-poly sandbag wall: pillow-shaped woven-canvas bags
// with contrasting closure seams, laid in staggered courses, straight or as a
// curved emplacement. Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'sandbags',
  license: 'CC0-1.0',
  title: 'Sandbags',
  description: 'Staggered wall of pillow-shaped woven-canvas sandbags with visible closure seams, for trenches, checkpoints and flood defences. Knobs: courses, bags per course, layout, canvas, alternate canvas and stitching-thread colours.',
  tags: ['sandbags', 'sandbag', 'canvas', 'stitching', 'barricade', 'cover', 'wall', 'military', 'trench', 'flood', 'bunker'],
  kit: 'props',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'military', 'post-apocalyptic', 'street', 'beach', 'industrial'],
  triangleBudget: 900,
});

const courses = param('courses', '3', { choices: ['2', '3'], label: 'Courses' });
const perCourse = param('perCourse', '4', { choices: ['3', '4'], label: 'Bags per course' });
const layout = param('layout', 'straight', { choices: ['straight', 'curved'], label: 'Layout' });
const canvasColor = param('canvasColor', '#b8a47a', { label: 'Woven canvas' });
const alternateCanvasColor = param('alternateCanvasColor', '#97835a', { label: 'Alternate canvas' });
const stitchingThreadColor = param('stitchingThreadColor', '#69583b', { label: 'Stitching thread' });

presets({
  military: {
    canvasColor: '#7a7a52',
    alternateCanvasColor: '#626240',
    stitchingThreadColor: '#45452f',
  },
  white: {
    canvasColor: '#e4e0d4',
    alternateCanvasColor: '#c4bfac',
    stitchingThreadColor: '#898372',
  },
  floodControl: {
    canvasColor: '#c6ad7b',
    alternateCanvasColor: '#a88e61',
    stitchingThreadColor: '#6a5436',
  },
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
    const a = curved ? u / radius : 0;
    const rotation = yaw + (curved ? (a * 180) / Math.PI : 0);
    const x = curved ? radius * Math.sin(a) : u;
    const y = curved ? radius * (1 - Math.cos(a)) - radius * 0.05 : 0;
    b = b.rotateZ(rotation).translate(x, y, z);
    const stitchOffset = BL * 0.32;
    const stitchTop = BH * (0.7 + 0.3 * (1 - stitchOffset / (BL / 2)));
    const stitchA = box(8, BW * 0.64, 4, true).translate(-stitchOffset, 0, stitchTop - 2)
      .rotateZ(rotation).translate(x, y, z);
    const stitchB = box(8, BW * 0.64, 4, true).translate(stitchOffset, 0, stitchTop - 2)
      .rotateZ(rotation).translate(x, y, z);
    if (id % 3 === 0) sb.part(`bag-${id}`, b.color(alternateCanvasColor));
    else sb.part(`bag-${id}`, b.color(canvasColor));
    sb.part(`closure-stitch-${id}-a`, stitchA.color(stitchingThreadColor));
    sb.part(`closure-stitch-${id}-b`, stitchB.color(stitchingThreadColor));
  }
}

return sb.model();
