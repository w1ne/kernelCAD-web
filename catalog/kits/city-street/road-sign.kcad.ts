// Original kernelCAD low-poly road sign: a post with a bordered sign plate in
// one of four shapes (octagon stop sign, warning triangle, round, square).
// No text: the plate colours carry the meaning. Millimetres, Z up.

meta({
  name: 'road-sign',
  license: 'CC0-1.0',
  title: 'Road sign',
  description: 'Traffic sign on a post with an octagon, triangle, circle or square bordered plate. Knobs: shape, post height, face, border and post colours.',
  tags: ['sign', 'road sign', 'stop sign', 'traffic sign', 'warning', 'post', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 200,
});

const shape = param('shape', 'octagon', { choices: ['octagon', 'triangle', 'circle', 'square'], label: 'Shape' });
const heightMm = param('heightMm', '2400', { choices: ['2100', '2400', '2800'], label: 'Height (mm)' });
const face = param('face', '#c8261e', { label: 'Sign face' });
const border = param('border', '#f2f2ee', { label: 'Border' });
const post = param('post', '#9aa0a6', { label: 'Post' });

presets({
  warning: { face: '#f2c418', border: '#1e1e1e' },
  info: { face: '#2a5ea8', border: '#f2f2ee' },
  green: { face: '#2f7d4a', border: '#f2f2ee' },
});

const h = Number(heightMm.value);
const kind = shape.value;
// Sides and start angle per shape; a 'circle' is a 12-gon.
const spec: Record<string, [number, number, number]> = {
  octagon: [8, Math.PI / 8, 380],
  triangle: [3, Math.PI / 2, 470],
  circle: [12, 0, 330],
  square: [4, Math.PI / 4, 400],
};
const [s, a0, R] = spec[kind]!;
const poly = (r: number): [number, number][] => {
  const pts: [number, number][] = [];
  for (let k = 0; k < s; k++) {
    const a = a0 + (2 * Math.PI * k) / s;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
};

// Plate centre height: the top of the plate reaches about the sign height.
const zc = h - R;
const sign = assembly('road-sign');
sign.part('post', box(60, 60, zc + R * 0.3, true).translate(0, 0, (zc + R * 0.3) / 2).color(post));
// Plates are XY polygons stood up into the XZ plane, facing -Y, in front of the post.
const plate = (r: number, t: number, y0: number) =>
  extrudePolygon(poly(r), t).rotateX(90).translate(0, y0 + t - 44, zc);
// Border is a ring (outer plate minus the face), so the face sits flush in it.
sign.part('border', plate(R, 14, 0).subtract(plate(R * 0.86, 30, -8)).color(border));
sign.part('face', plate(R * 0.86, 10, 2).color(face));

return sign.model();
