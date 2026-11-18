// Original kernelCAD low-poly wall sconce: a chamfered back plate with one or
// two bent arms, each holding a faceted tapered drum, tulip or candle-sleeve shade
// with a glowing bulb. Meant for wall mounting: the plate's back face is the
// wall side (+Y), the lamp reaches out to -Y. Millimetres, Z up, plate bottom
// on z = 0, centred on x = y = 0.

meta({
  name: 'wall-sconce',
  license: 'CC0-1.0',
  title: 'Wall sconce',
  description: 'Wall-mounted sconce lamp with a back plate and one or two bent arms holding drum, tulip or candle shades with glowing bulbs, for hallways, bedrooms and hotel corridors. Knobs: shade style, arms, metal, shade and bulb colours.',
  tags: ['wall sconce', 'wall lamp', 'wall light', 'sconce', 'lamp', 'hallway', 'interior lighting', 'hotel'],
  kit: 'lighting',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'hallway', 'hotel', 'office'],
  triangleBudget: 380,
});

const style = param('style', 'drum', { choices: ['drum', 'tulip', 'candle'], label: 'Shade style' });
const arms = param('arms', '1', { choices: ['1', '2'], label: 'Arms' });
const metal = param('metal', '#b8913f', { label: 'Plate and arm' });
const shade = param('shade', '#f2e6cc', { label: 'Shade' });
const bulb = param('bulb', '#fff2b0', { label: 'Bulb' });

presets({
  black: { metal: '#232325', shade: '#232325', bulb: '#ffd98a' },
  chrome: { metal: '#c4c8cc', shade: '#ffffff' },
  'art-deco': { style: 'tulip', metal: '#2f2a24', shade: '#e8d8a8' },
});

const ngon = (r: number, n: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / n), r * Math.sin(rot + (2 * Math.PI * k) / n));
  return p.close();
};
const rings = (rs: [number, number][], n: number, x: number, y: number) =>
  ngon(rs[0][0], n).loft(rs.slice(1).map(([r]) => ngon(r, n)), {
    planes: rs.map(([, z]) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
    ruled: true,
  });
// A square bar between two (y, z) points in the YZ plane at height x.
const segYZ = (x: number, y0: number, z0: number, y1: number, z1: number, t: number) => {
  const len = Math.hypot(y1 - y0, z1 - z0);
  const a = (Math.atan2(z1 - z0, y1 - y0) * 180) / Math.PI;
  return box(t, len + t, t, true).rotateX(a).translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
};

const two = arms.value === '2';
const W = two ? 80 : 55; // half plate width
const PY = 90; // wall side of the plate
const s = assembly('wall-sconce');
s.part('plate', extrudePolygon([[-W + 25, 0], [W - 25, 0], [W, 30], [W, 220], [W - 25, 250], [-W + 25, 250], [-W, 220], [-W, 30]], 18)
  .rotateX(90).translate(0, PY, 0).color(metal));
const xs = two ? [-130, 130] : [0];
// Two arms branch from a cross bar in front of the plate.
if (two) s.part('crossbar', box(276, 16, 16, true).translate(0, PY - 26, 110).color(metal));
const SY = -90; // shade centre
xs.forEach((x, i) => {
  // Arm: out from the plate, dipping, then up into the shade holder.
  s.part(`arm-${i + 1}a`, segYZ(x, PY - 20, 110, SY + 45, 85, 16).color(metal));
  s.part(`arm-${i + 1}b`, segYZ(x, SY + 45, 85, SY, 125, 16).color(metal));
  s.part(`cup-${i + 1}`, rings([[14, 115], [26, 140]], 6, x, SY).color(metal));
  if (style.value === 'drum') {
    s.part(`shade-${i + 1}`, rings([[80, 150], [52, 270]], 8, x, SY)
      .subtract(rings([[74, 140], [46, 280]], 8, x, SY)).color(shade));
    s.part(`bulb-${i + 1}`, rings([[16, 136], [30, 175], [12, 210]], 6, x, SY).color(bulb));
  } else if (style.value === 'tulip') {
    s.part(`shade-${i + 1}`, rings([[28, 130], [70, 200], [92, 290]], 8, x, SY)
      .subtract(rings([[18, 150], [62, 205], [85, 300]], 8, x, SY)).color(shade));
    s.part(`bulb-${i + 1}`, rings([[16, 136], [30, 180], [12, 215]], 6, x, SY).color(bulb));
  } else {
    s.part(`shade-${i + 1}`, ngon(20, 6).extrude(120).translate(x, SY, 135).color(shade));
    s.part(`bulb-${i + 1}`, rings([[14, 250], [22, 275], [2, 320]], 5, x, SY).color(bulb));
  }
});

return s.model();
