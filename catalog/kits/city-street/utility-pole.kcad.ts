// Original kernelCAD low-poly utility pole: a tapered timber pole with one or
// two crossarms on diagonal braces, ceramic insulators and an optional pole
// transformer drum. Millimetres, Z up, crossarms along X.

meta({
  name: 'utility-pole',
  license: 'CC0-1.0',
  title: 'Utility pole',
  description: 'Wooden telephone and power pole with crossarms, braces, insulators and an optional transformer. Knobs: height, crossarms, transformer, wood, insulator and transformer colours.',
  tags: ['utility pole', 'telephone pole', 'power pole', 'electric', 'pylon', 'wires', 'street', 'rural'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'rural'],
  triangleBudget: 520,
});

const heightM = param('heightM', '9', { choices: ['7', '9', '11'], label: 'Height (m)' });
const arms = param('arms', '2', { choices: ['1', '2'], label: 'Crossarms' });
const transformer = param('transformer', 'yes', { choices: ['yes', 'no'], label: 'Transformer' });
const wood = param('wood', '#6e5440', { label: 'Pole and arms' });
const insulator = param('insulator', '#7fb0c0', { label: 'Insulators' });
const drum = param('drum', '#8e959b', { label: 'Transformer' });

presets({
  weathered: { wood: '#7d7368' },
  concrete: { wood: '#a9a8a2', insulator: '#e8e6dc' },
});

const H = Number(heightM.value) * 1000;
const na = Number(arms.value);
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const up = assembly('utility-pole');
up.part('pole', ngon(150, 8, Math.PI / 8).loft(ngon(105, 8, Math.PI / 8), { spacing: H, ruled: true }).color(wood));
const armL = 2400;
for (let i = 0; i < na; i++) {
  const z = H - 350 - i * 700;
  up.part(`arm-${i + 1}`, box(armL, 100, 110, true).translate(0, -150, z).color(wood));
  for (const side of [-1, 1]) {
    // Brace from the pole down-and-in to the arm, in the XZ plane at the arm's Y.
    const len = Math.hypot(620, 560);
    const a = (Math.atan2(560, 620) * 180) / Math.PI;
    const brace = box(len, 40, 50, true).rotateY(side * a).translate(side * 330, -150, z - 300);
    up.part(`brace-${i + 1}-${side < 0 ? 'l' : 'r'}`, brace.color(wood));
  }
  for (const [k, x] of [-1100, -650, 650, 1100].entries()) {
    const ins = ngon(55, 6).loft(ngon(24, 6), { spacing: 170, ruled: true }).translate(x, -150, z + 50);
    up.part(`insulator-${i + 1}-${k + 1}`, ins.color(insulator));
  }
}
if (transformer.value === 'yes') {
  const tz = H - 2600;
  up.part('bracket', box(80, 260, 500, true).translate(0, 200, tz + 250).color(drum));
  up.part('transformer', ngon(290, 10).extrude(820).translate(0, 520, tz).color(drum));
  up.part('transformer-lid', ngon(310, 10).loft(ngon(200, 10), { spacing: 90, ruled: true }).translate(0, 520, tz + 820).color(drum));
}

return up.model();
