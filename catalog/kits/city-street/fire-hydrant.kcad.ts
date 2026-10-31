// Original kernelCAD low-poly fire hydrant: faceted barrel with flanges, a
// domed bonnet, operating nut and outlet nozzles. Millimetres, Z up.

meta({
  name: 'fire-hydrant',
  license: 'CC0-1.0',
  title: 'Fire hydrant',
  description: 'Faceted pillar fire hydrant with flanges, domed bonnet and side outlets. Knobs: outlet count, facets, body and cap colours.',
  tags: ['hydrant', 'fire', 'water', 'sidewalk', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 300,
});

const outlets = param('outlets', '3', { choices: ['2', '3'], label: 'Outlets' });
const sides = param('sides', '8', { choices: ['6', '8'], label: 'Facets' });
const body = param('body', '#c8261e', { label: 'Body' });
const caps = param('caps', '#e8c33a', { label: 'Caps and nozzles' });

presets({
  yellow: { body: '#e8b81c', caps: '#2f5fa8' },
  silver: { body: '#a9adb0', caps: '#c8261e' },
});

const s = Number(sides.value);
const n = Number(outlets.value);

const ngon = (r: number, k0 = s) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < k0; k++) {
    p = p.lineTo(r * Math.cos((2 * Math.PI * k) / k0), r * Math.sin((2 * Math.PI * k) / k0));
  }
  return p.close();
};
const prism = (r: number, h: number, k0 = s) => ngon(r, k0).extrude(h);

const hy = assembly('fire-hydrant');
hy.part('base-flange', prism(150, 60).color(body));
hy.part('barrel', prism(108, 500).translate(0, 0, 60).color(body));
hy.part('top-flange', prism(135, 40).translate(0, 0, 540).color(body));
hy.part('bonnet', ngon(120).loft(ngon(45), { spacing: 140, ruled: true }).translate(0, 0, 580).color(caps));
hy.part('nut', prism(32, 45, 5).translate(0, 0, 715).color(caps));

// Outlets: two hose nozzles left/right, optional big pumper nozzle at the front.
const nozzle = (r: number, len: number) => prism(r, len, 6);
hy.part('outlet-right', nozzle(40, 95).rotateY(90).translate(90, 0, 420).color(caps));
hy.part('outlet-left', nozzle(40, 95).rotateY(-90).translate(-90, 0, 420).color(caps));
if (n === 3) {
  hy.part('pumper', nozzle(58, 100).rotateX(90).translate(0, -90, 370).color(caps));
}

return hy.model();
