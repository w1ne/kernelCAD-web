meta({
  name: 'cable-tray-section',
  license: 'CC0-1.0',
  title: 'Perforated cable tray section',
  description: 'Straight industrial cable tray with folded side channels, repeating cross rungs and splice plates. Knobs: size, tray, steel and safety colours.',
  tags: ['cable tray', 'cable management', 'electrical installation', 'factory', 'industrial'],
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
const a = assembly('cable-tray-section');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const L = 1800 * S, W = 420 * S, H = 110 * S;
block('tray-bottom', L, W, 18 * S, 0, 0, 0, body);
block('left-flange', L, 26 * S, H, 0, -W / 2, 18 * S, steel);
block('right-flange', L, 26 * S, H, 0, W / 2, 18 * S, steel);
for (let i = 0; i < 9; i++) block(`rung-${i}`, 24 * S, W * 0.92, 20 * S, (i - 4) * L / 8, 0, 18 * S, accent);
for (const x of [-L / 2 + 80 * S, L / 2 - 80 * S]) {
  block(`splice-${x < 0 ? 'a' : 'b'}`, 110 * S, W + 60 * S, 28 * S, x, 0, H - 8 * S, steel);
}

return a.model();
