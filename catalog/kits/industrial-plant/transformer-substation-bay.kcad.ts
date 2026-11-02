meta({
  name: 'transformer-substation-bay',
  license: 'CC0-1.0',
  title: 'Transformer substation bay',
  description: 'Outdoor substation bay with two bus supports, insulator posts, overhead conductors and transformer pad. Knobs: size, frame, steel and safety colours.',
  tags: ['substation', 'transformer bay', 'electrical infrastructure', 'factory', 'industrial'],
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
const a = assembly('transformer-substation-bay');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));


const W = 2200 * S, H = 2350 * S;
block('transformer-pad', W, 900 * S, 160 * S, 0, 0, 0, body);
for (let i = 0; i < 4; i++) {
  const x = (i - 1.5) * W * 0.25;
  post(`insulator-${i}`, 82 * S, 720 * S, x, 0, 160 * S, steel);
  a.part(`cap-${i}`, ngon(115 * S, 8).extrude(44 * S).translate(x, 0, 880 * S).color(accent));
}
beamX('busbar', W * 0.9, 45 * S, -W * 0.45, 0, H - 180 * S, accent);
for (let i = 0; i < 2; i++) block(`guard-post-${i}`, 70 * S, 70 * S, H, (i ? 1 : -1) * W * 0.45, 350 * S, 0, steel);

return a.model();
