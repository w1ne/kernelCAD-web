meta({
  name: 'jib-crane',
  license: 'CC0-1.0',
  title: 'Wall-mounted jib crane',
  description: 'Compact factory jib crane with mounting mast, triangular brace, outreach boom, trolley and lifting hook. Knobs: size, frame, steel and safety colours.',
  tags: ['jib crane', 'wall crane', 'factory', 'industrial', 'material handling'],
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
const a = assembly('jib-crane');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const H = 2500 * S, reach = 1700 * S;
post('mast', 110 * S, H, 0, 0, 0, steel);
beamX('boom', reach, 90 * S, 0, 0, H - 160 * S, body);
a.part('brace', box(reach * 0.48, 85 * S, 90 * S, true).translate(reach * 0.25, 0, H - 375 * S).rotateY(28).color(accent));
block('trolley', 330 * S, 300 * S, 170 * S, reach * 0.62, 0, H - 330 * S, steel);
beamZ('chain', 440 * S, 20 * S, reach * 0.62, 0, H - 770 * S, accent);
block('hook', 115 * S, 80 * S, 150 * S, reach * 0.62, 0, H - 920 * S, steel);

return a.model();
