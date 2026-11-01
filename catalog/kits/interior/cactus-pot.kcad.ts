// Original kernelCAD low-poly potted cactus: a terracotta pot with a ribbed
// column cactus with an arm, a round ribbed barrel cactus, or a prickly-pear
// of stacked flat pads, with an optional flower. Millimetres, Z up, standing
// on z = 0 centred on x = y = 0.

meta({
  name: 'cactus-pot',
  license: 'CC0-1.0',
  title: 'Potted cactus',
  description: 'Small potted cactus for a desk or windowsill: ribbed column with an arm, round barrel or prickly-pear pads, with an optional flower. Knobs: style, flower, pot, cactus, flower and soil colours.',
  tags: ['cactus', 'succulent', 'potted plant', 'houseplant', 'plant', 'pot', 'desk', 'windowsill', 'decor'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'office', 'living-room', 'kitchen', 'desert'],
  triangleBudget: 350,
});

const style = param('style', 'column', { choices: ['column', 'barrel', 'pads'], label: 'Style' });
const flower = param('flower', 'yes', { choices: ['yes', 'no'], label: 'Flower' });
const pot = param('pot', '#c0683f', { label: 'Pot' });
const cactus = param('cactus', '#4f8a4a', { label: 'Cactus' });
const bloom = param('bloom', '#e8508a', { label: 'Flower' });
const soil = param('soil', '#d9c08a', { label: 'Soil and pebbles' });

presets({
  white: { pot: '#efeee9', bloom: '#f2c230' },
  blue: { pot: '#3c6e9f', cactus: '#6d9a5a' },
});

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Ribbed cross-section: a 12-point star with shallow grooves.
const ribs = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < 12; k++) {
    const a = (2 * Math.PI * k) / 12;
    const rr = k % 2 === 0 ? r : r * 0.84;
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};
const stack = (rs: [number, number][], x = 0, y = 0) =>
  ribs(rs[0][0]).loft(rs.slice(1).map(([r]) => ribs(r)), {
    planes: rs.map(([, z]) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
    ruled: true,
  });
const star = (r: number, t: number) => {
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const a = (Math.PI * k) / 5;
    const rr = k % 2 === 0 ? r : r * 0.45;
    pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
  }
  return extrudePolygon(pts, t);
};

const c = assembly('cactus-pot');
const potH = 110;
c.part('pot', ngon(55, 8).loft(ngon(72, 8), { spacing: potH - 18, ruled: true }).color(pot));
c.part('rim', ngon(80, 8).extrude(20).translate(0, 0, potH - 20).color(pot));
c.part('soil', ngon(74, 8).extrude(6).translate(0, 0, potH - 10).color(soil));
const zb = potH - 12;
let flowerAt: [number, number, number] = [0, 0, 0];
if (style.value === 'column') {
  c.part('column', stack([[40, zb], [42, zb + 150], [30, zb + 250], [12, zb + 275]]).color(cactus));
  // Arm: a short side stub then an upturned tip.
  c.part('arm-out', ribs(18).extrude(70).rotateY(90).translate(20, 0, zb + 110).color(cactus));
  c.part('arm-up', stack([[20, zb + 100], [20, zb + 170], [8, zb + 185]], 78, 0).color(cactus));
  flowerAt = [0, 0, zb + 268];
} else if (style.value === 'barrel') {
  c.part('barrel', stack([[45, zb], [66, zb + 50], [58, zb + 110], [20, zb + 140]]).color(cactus));
  flowerAt = [0, 0, zb + 134];
} else {
  const pad = (rx: number, rz: number) => ngon(1, 10).extrude(24).translate(0, 0, -12).scale([rx, rz, 1]).rotateX(90);
  c.part('pad-1', pad(55, 75).translate(0, 0, zb + 65).color(cactus));
  c.part('pad-2', pad(40, 55).rotateY(30).translate(45, 6, zb + 165).color(cactus));
  c.part('pad-3', pad(38, 52).rotateY(-35).translate(-42, -6, zb + 155).color(cactus));
  flowerAt = [62, 6, zb + 210];
}
if (flower.value === 'yes') {
  c.part('flower', star(26, 8).translate(flowerAt[0], flowerAt[1], flowerAt[2]).color(bloom));
}

return c.model();
