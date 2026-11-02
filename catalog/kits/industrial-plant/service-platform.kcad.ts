meta({
  name: 'service-platform',
  license: 'CC0-1.0',
  title: 'Industrial service platform',
  description: 'Raised service platform with toe boards, four columns, wraparound handrails and access opening. Knobs: size, deck, steel and safety colours.',
  tags: ['service platform', 'maintenance access', 'factory', 'industrial', 'walkway'],
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
const a = assembly('service-platform');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 1700 * S, D = 1200 * S, H = 1250 * S;
block('deck', W, D, 90 * S, 0, 0, H, body);
block('toe-board-front', W, 35 * S, 120 * S, 0, -D / 2, H + 90 * S, steel);
block('toe-board-back', W, 35 * S, 120 * S, 0, D / 2, H + 90 * S, steel);
for (let i = 0; i < 4; i++) post(`column-${i}`, 48 * S, H, (i < 2 ? -1 : 1) * W * 0.42, (i % 2 ? 1 : -1) * D * 0.42, 0, steel);
for (const y of [-D / 2, D / 2]) {
  beamX(`top-rail-${y < 0 ? 'front' : 'back'}`, W, 30 * S, -W / 2, y, H + 1120 * S, accent);
  beamX(`mid-rail-${y < 0 ? 'front' : 'back'}`, W, 22 * S, -W / 2, y, H + 610 * S, steel);
}

return a.model();
