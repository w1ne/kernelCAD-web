meta({
  name: 'cooling-tower',
  license: 'CC0-1.0',
  title: 'Cooling tower',
  description: 'Induced-draft cooling tower with tapered cell body, fan deck, top guardrail and access legs. Knobs: size, body, steel and safety colours.',
  tags: ['cooling tower', 'HVAC', 'factory', 'industrial', 'power plant'],
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
const a = assembly('cooling-tower');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 1300 * S, D = 1300 * S, H = 2100 * S;
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
a.part('tower-body', rect(W, D).loft(rect(W * 0.78, D * 0.78), { spacing: H, ruled: true }).translate(0, 0, 180 * S).color(body));
block('fan-deck', W * 0.84, D * 0.84, 120 * S, 0, 0, H + 120 * S, steel);
a.part('fan-hub', ngon(115 * S, 8).extrude(90 * S).translate(0, 0, H + 180 * S).color(accent));
for (let i = 0; i < 4; i++) a.part(`fan-blade-${i}`, box(470 * S, 65 * S, 30 * S, true).translate(235 * S, 0, H + 215 * S).rotateZ(i * 90).color(i % 2 ? body : accent));
for (let i = 0; i < 4; i++) post(`support-${i}`, 48 * S, 220 * S, (i % 2 ? 1 : -1) * W * 0.36, (i < 2 ? 1 : -1) * D * 0.36, 0, steel);

return a.model();
