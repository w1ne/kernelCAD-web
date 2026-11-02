meta({
  name: 'water-filter-skid',
  license: 'CC0-1.0',
  title: 'Water filter skid',
  description: 'Three-vessel water filtration skid with service frame, connecting headers, isolation handles and a pump block. Knobs: size, vessels, steel and safety colours.',
  tags: ['water filter', 'filter skid', 'treatment plant', 'factory', 'industrial'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial', 'factory'],
  triangleBudget: 600,
});

const scale = param('size', '1', { choices: ['0.8', '1', '1.25'], label: 'Size scale' });
const body = param('body', '#607478', { label: 'Main body' });
const steel = param('steel', '#3f484b', { label: 'Steelwork' });
const accent = param('accent', '#dda91f', { label: 'Safety accent' });

presets({ stainless: { body: '#aeb9b9', steel: '#596468', accent: '#cc9d20' }, safety: { body: '#e4c34b', accent: '#cf3f31' } });
const S = Number(scale.value);
const a = assembly('water-filter-skid');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const aW = 1650 * S;
for (let i = 0; i < 3; i++) {
  const x = (i - 1) * 520 * S;
  a.part(`filter-${i}`, ngon(190 * S, 8).extrude(980 * S).translate(x, 0, 420 * S).color(body));
  a.part(`cap-${i}`, ngon(205 * S, 8).extrude(65 * S).translate(x, 0, 1340 * S).color(steel));
  block(`foot-${i}`, 270 * S, 300 * S, 400 * S, x, 0, 0, steel);
}
beamX('supply-header', aW, 55 * S, -aW / 2, -240 * S, 1190 * S, accent);
beamX('return-header', aW, 55 * S, -aW / 2, 240 * S, 520 * S, steel);
block('pump', 420 * S, 360 * S, 300 * S, 0, -400 * S, 0, accent);

return a.model();
