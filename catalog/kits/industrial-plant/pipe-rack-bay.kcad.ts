meta({
  name: 'pipe-rack-bay',
  license: 'CC0-1.0',
  title: 'Pipe rack bay',
  description: 'Two-bent pipe-rack bay with braced columns, cross beams and three colour-coded process lines. Knobs: size, frame, steel and safety colours.',
  tags: ['pipe rack', 'process piping', 'plant structure', 'factory', 'industrial'],
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
const a = assembly('pipe-rack-bay');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));


const W = 1900 * S, H = 2300 * S;
for (let i = 0; i < 4; i++) {
  const x = (i < 2 ? -W / 2 : W / 2), y = (i % 2 ? 320 : -320) * S;
  block(`column-${i}`, 95 * S, 95 * S, H, x, y, 0, steel);
}
for (let z = 1550; z <= H; z += 700) {
  beamX(`crossbeam-${z}`, W + 120 * S, 60 * S, -W / 2 - 60 * S, 0, z * S, accent);
}
for (let i = 0; i < 3; i++) beamX(`process-line-${i}`, W + 200 * S, (65 + i * 12) * S, -W / 2 - 100 * S, (i - 1) * 220 * S, (1680 + i * 185) * S, i === 1 ? accent : body);

return a.model();
