// Original kernelCAD low-poly speed bump: a row of modular rubber hump
// segments with a trapezoid cross-section in alternating colours and tapered
// end caps. Millimetres, Z up, laid across the road along X.

meta({
  name: 'speed-bump',
  license: 'CC0-1.0',
  title: 'Speed bump',
  description: 'Modular rubber speed bump in alternating yellow and black segments with tapered ends. Knobs: segments, two segment colours.',
  tags: ['speed bump', 'speed hump', 'traffic calming', 'road', 'parking', 'rubber', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'road', 'parking'],
  triangleBudget: 200,
});

const segments = param('segments', '6', { choices: ['4', '6', '8'], label: 'Segments' });
const colorA = param('colorA', '#f2c418', { label: 'Segment A' });
const colorB = param('colorB', '#1e1e1e', { label: 'Segment B' });

presets({
  grey: { colorA: '#55585c', colorB: '#f2f2ee' },
});

const n = Number(segments.value);
const L = 500;
// Side-profile prism: points are (y, z), thickness t along X from x0.
const sideProfile = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);
const profile: [number, number][] = [[-250, 0], [250, 0], [110, 60], [-110, 60]];

const sb = assembly('speed-bump');
for (let i = 0; i < n; i++) {
  const x0 = -(n * L) / 2 + i * L;
  sb.part(`segment-${i + 1}`, sideProfile(profile, x0, L).color(i % 2 === 0 ? colorA : colorB));
}
// End caps: a lower, narrower hump closing each end.
const cap: [number, number][] = [[-200, 0], [200, 0], [70, 35], [-70, 35]];
sb.part('end-left', sideProfile(cap, -(n * L) / 2 - 160, 170).color(colorB));
sb.part('end-right', sideProfile(cap, (n * L) / 2 - 10, 170).color(n % 2 === 0 ? colorA : colorB));

return sb.model();
