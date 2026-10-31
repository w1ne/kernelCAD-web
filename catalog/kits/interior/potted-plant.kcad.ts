// Original kernelCAD low-poly potted plant: tapered faceted pot, soil and a
// rosette of flat faceted leaves. Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'potted-plant',
  title: 'Potted plant',
  description: 'Indoor houseplant in a tapered pot with a rosette of faceted leaves. Knobs: size, leaf count, pot and leaf colours.',
  tags: ['plant', 'potted plant', 'houseplant', 'pot', 'greenery', 'decor'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'living-room', 'office', 'bedroom', 'kitchen'],
  triangleBudget: 300,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const leafCount = param('leafCount', '7', { choices: ['5', '7', '9'], label: 'Leaves' });
const pot = param('pot', '#c96f45', { label: 'Pot' });
const leaves = param('leaves', '#3f8a4a', { label: 'Leaves' });
const soil = param('soil', '#4a3424', { label: 'Soil' });

presets({
  white: { pot: '#eeede8' },
  concrete: { pot: '#8f8f8a', leaves: '#5c8f3a' },
});

const s = size.value === 'small' ? 0.5 : size.value === 'medium' ? 1 : 1.6;
const n = Number(leafCount.value);
const sides = 8;
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < sides; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / sides), r * Math.sin((2 * Math.PI * k) / sides));
  return p.close();
};

const potH = 260 * s;
const potR = 150 * s;
const plant = assembly('potted-plant');
plant.part('pot', ngon(potR * 0.72).loft(ngon(potR), { spacing: potH, ruled: true }).color(pot));
plant.part('rim', ngon(potR * 1.06).extrude(30 * s).translate(0, 0, potH - 30 * s).color(pot));
plant.part('soil', ngon(potR * 0.95).extrude(10).translate(0, 0, potH - 30 * s).color(soil));

// A leaf is a flat diamond-ish blade in the XZ plane, tilted outward and spun about Z.
const leafL = 520 * s;
const leafW = 130 * s;
const blade = () => extrudePolygon([
  [0, 0],
  [leafW * 0.5, leafL * 0.35],
  [leafW * 0.35, leafL * 0.75],
  [0, leafL],
  [-leafW * 0.35, leafL * 0.75],
  [-leafW * 0.5, leafL * 0.35],
], 8 * s).translate(0, 0, -4 * s).rotateX(90);
for (let i = 0; i < n; i++) {
  // Inner leaves stand more upright; alternating tilt gives a loose rosette.
  const tilt = 18 + (i % 3) * 14;
  const yaw = (360 / n) * i + (i % 2) * 11;
  const leaf = blade().rotateY(tilt).rotateZ(yaw).translate(0, 0, potH - 40 * s);
  plant.part(`leaf-${i + 1}`, leaf.color(leaves));
}

return plant.model();
