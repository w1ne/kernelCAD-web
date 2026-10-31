// Original kernelCAD low-poly table lamp: faceted ceramic base and a tapered
// shade. Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'table-lamp',
  license: 'CC0-1.0',
  title: 'Table lamp',
  description: 'Bedside or desk table lamp with a faceted jar or column base and a tapered shade. Knobs: base style, base and shade colours.',
  tags: ['table lamp', 'bedside lamp', 'desk lamp', 'lamp', 'light', 'lighting'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'bedroom', 'living-room', 'office'],
  triangleBudget: 150,
});

const baseStyle = param('baseStyle', 'jar', { choices: ['jar', 'column'], label: 'Base style' });
const base = param('base', '#3f6f7a', { label: 'Base' });
const shade = param('shade', '#f2ead8', { label: 'Shade' });

presets({
  terracotta: { base: '#b9653f', shade: '#efe6d2' },
  black: { base: '#232323', shade: '#d9d4c7' },
});

const sides = 7;
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < sides; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / sides), r * Math.sin((2 * Math.PI * k) / sides));
  return p.close();
};

const lamp = assembly('table-lamp');
let neckZ: number;
if (baseStyle.value === 'jar') {
  // Bulging jar: two ruled lofts meeting at the widest ring.
  lamp.part('base-lower', ngon(55).loft(ngon(85), { spacing: 110, ruled: true }).color(base));
  lamp.part('base-upper', ngon(85).loft(ngon(30), { spacing: 100, ruled: true }).translate(0, 0, 110).color(base));
  neckZ = 210;
} else {
  lamp.part('base-foot', ngon(70).extrude(20).color(base));
  lamp.part('base-column', ngon(28).extrude(200).translate(0, 0, 20).color(base));
  neckZ = 220;
}
lamp.part('stem', ngon(8).extrude(130).translate(0, 0, neckZ - 5).color(base));
lamp.part('shade', ngon(150).loft(ngon(95), { spacing: 200, ruled: true }).translate(0, 0, neckZ + 60).color(shade));

return lamp.model();
