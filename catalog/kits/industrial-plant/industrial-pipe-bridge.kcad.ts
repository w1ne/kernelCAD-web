meta({
  name: 'industrial-pipe-bridge',
  license: 'CC0-1.0',
  title: 'Industrial pipe bridge',
  description: 'Elevated pipe bridge module with two trestles, cross bracing, twin process pipes and shoe supports. Knobs: size, frame, steel and safety colours.',
  tags: ['pipe bridge', 'pipe support structure', 'process piping', 'factory', 'industrial'],
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
const a = assembly('industrial-pipe-bridge');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 2300 * S, H = 2400 * S;
for (let bay = 0; bay < 2; bay++) {
  const x = (bay ? 1 : -1) * W * 0.42;
  for (let i = 0; i < 2; i++) post(`column-${bay}-${i}`, 70 * S, H, x, (i ? 1 : -1) * 480 * S, 0, steel);
  beamY(`cap-${bay}`, 1050 * S, 58 * S, x, -525 * S, H - 100 * S, accent);
}
for (let i = 0; i < 2; i++) {
  const y = (i ? 1 : -1) * 260 * S;
  beamX(`pipe-${i}`, W * 0.95, 95 * S, -W * 0.475, y, H - (i ? 230 : 500) * S, i ? body : accent);
}
beamX('lower-brace', W * 0.84, 32 * S, -W * 0.42, 0, 780 * S, steel);

return a.model();
