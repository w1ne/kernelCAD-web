// Original kernelCAD low-poly 200-litre steel drum: a faceted cylinder with
// rolled top and bottom chimes, two rolling hoops and a painted band.
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'oil-drum',
  license: 'CC0-1.0',
  title: 'Oil drum',
  description: '200-litre steel oil drum with rolled rims, rolling hoops, a painted band and bung caps, closed or open-topped. Knobs: top, facets, drum, rim and band colours.',
  tags: ['drum', 'oil drum', 'barrel', 'steel drum', 'fuel', 'container', 'industrial', 'warehouse'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'warehouse', 'industrial', 'street', 'harbour'],
  triangleBudget: 480,
});

const top = param('top', 'closed', { choices: ['closed', 'open'], label: 'Top' });
const sides = param('sides', '10', { choices: ['8', '10', '12'], label: 'Facets' });
const drum = param('drum', '#2f6aa8', { label: 'Drum' });
const rim = param('rim', '#3a3d40', { label: 'Rims and hoops' });
const band = param('band', '#e8c33a', { label: 'Band' });

presets({
  red: { drum: '#b2302a', band: '#eeeeee' },
  rusty: { drum: '#8a4f2c', rim: '#5a3a26', band: '#a8693a' },
  toxic: { drum: '#e3b51e', rim: '#2a2a2a', band: '#2a2a2a' },
});

const n = Number(sides.value);
const R = 290;
const H = 880;

const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};
const ring = (r: number, z0: number, h: number) => ngon(r).extrude(h).translate(0, 0, z0);

const d = assembly('oil-drum');
const shell = ring(R, 0, H);
d.part('drum', (top.value === 'open' ? shell.subtract(ring(R - 18, 40, H)) : shell.subtract(ring(R - 12, H - 15, 30))).color(drum));
d.part('chime-bottom', ring(R + 8, 0, 30).color(rim));
d.part('chime-top', ring(R + 8, H - 30, 30).subtract(ring(R - 12, H - 40, 50)).color(rim));
d.part('hoop-1', ring(R + 12, H * 0.33 - 15, 30).color(rim));
d.part('hoop-2', ring(R + 12, H * 0.67 - 15, 30).color(rim));
d.part('band', ring(R + 4, H * 0.42, H * 0.16).color(band));
if (top.value === 'closed') {
  d.part('bung-large', cylinder(18, 40, 6).translate(R * 0.55, 0, H - 15).color(rim));
  d.part('bung-small', cylinder(18, 24, 6).translate(-R * 0.6, 0, H - 15).color(rim));
}

return d.model();
