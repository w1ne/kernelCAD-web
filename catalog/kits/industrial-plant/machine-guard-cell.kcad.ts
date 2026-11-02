meta({
  name: 'machine-guard-cell',
  license: 'CC0-1.0',
  title: 'Machine guard cell',
  description: 'Modular machine safety cell with base frame, mesh-like infill grid, corner posts and a swing access gate. Knobs: size, frame, steel and safety colours.',
  tags: ['machine guard', 'safety cell', 'factory', 'industrial', 'machine enclosure'],
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
const a = assembly('machine-guard-cell');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));


const W = 2100 * S, D = 1400 * S, H = 1900 * S;
for (let i = 0; i < 4; i++) {
  const x = i < 2 ? -W / 2 : W / 2, y = i % 2 ? D / 2 : -D / 2;
  post(`corner-post-${i}`, 55 * S, H, x, y, 0, accent);
}
for (const y of [-D / 2, D / 2]) {
  beamX(`top-rail-${y < 0 ? 'front' : 'back'}`, W, 38 * S, -W / 2, y, H - 30 * S, steel);
  for (let i = 1; i < 6; i++) post(`mesh-bar-${y < 0 ? 'f' : 'b'}-${i}`, 12 * S, H - 100 * S, (i - 2.5) * W / 6, y, 0, body);
}
for (let i = 0; i < 4; i++) block(`floor-anchor-${i}`, 150 * S, 150 * S, 32 * S, (i < 2 ? -1 : 1) * W * 0.46, (i % 2 ? 1 : -1) * D * 0.46, 0, steel);

return a.model();
