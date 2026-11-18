// Original low-poly table lamp: a faceted ceramic jar or column base, a narrow
// brass stem with a side switch, and a tapered textile shade with a neck ferrule.
// Those material changes and the stepped shade profile make it read as a lamp
// rather than a stack of generic solids. Millimetres, Z up, standing on z = 0.

meta({
  name: 'table-lamp',
  license: 'CC0-1.0',
  title: 'Table lamp',
  description: 'Bedside or desk lamp with a faceted ceramic jar or column base, brass stem and side switch, and tapered textile shade. Knobs: base style, ceramic, shade textile and hardware colours.',
  tags: ['table lamp', 'bedside lamp', 'desk lamp', 'lamp', 'light', 'lighting', 'ceramic', 'brass', 'textile shade'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'bedroom', 'living-room', 'office'],
  triangleBudget: 240,
});

const baseStyle = param('baseStyle', 'jar', { choices: ['jar', 'column'], label: 'Base style' });
const ceramic = param('ceramic', '#3f6f7a', { label: 'Glazed ceramic base' });
const textile = param('textile', '#f2ead8', { label: 'Shade textile' });
const hardware = param('hardware', '#bd8b48', { label: 'Brass hardware' });

presets({
  terracotta: { ceramic: '#b9653f', textile: '#efe6d2', hardware: '#b67b3b' },
  midCentury: { ceramic: '#d39b40', textile: '#eee1c5', hardware: '#9f6234' },
  monochrome: { ceramic: '#34363a', textile: '#d9d4c7', hardware: '#8c9299' },
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
  lamp.part('base-lower', ngon(55).loft(ngon(85), { spacing: 110, ruled: true }).color(ceramic));
  lamp.part('base-upper', ngon(85).loft(ngon(30), { spacing: 100, ruled: true }).translate(0, 0, 110).color(ceramic));
  neckZ = 210;
} else {
  lamp.part('base-foot', ngon(70).extrude(20).color(ceramic));
  lamp.part('base-column', ngon(28).extrude(200).translate(0, 0, 20).color(ceramic));
  neckZ = 220;
}
lamp.part('neck-ferrule', ngon(34).extrude(10).translate(0, 0, neckZ - 8).color(hardware));
lamp.part('stem', ngon(8).extrude(175).translate(0, 0, neckZ - 5).color(hardware));
lamp.part('side-switch', ngon(9).extrude(8).rotateX(90).translate(24, 0, neckZ + 42).color(hardware));
lamp.part('shade', ngon(150).loft(ngon(95), { spacing: 200, ruled: true }).translate(0, 0, neckZ + 85).color(textile));

return lamp.model();
