meta({
  name: 'industrial-mixer',
  license: 'CC0-1.0',
  title: 'Industrial batch mixer',
  description: 'Open-top batch mixer with angular bowl, crossbar drive, mixing paddle, side trunnions and service feet. Knobs: size, bowl, steel and safety colours.',
  tags: ['batch mixer', 'industrial mixer', 'factory', 'industrial', 'process'],
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
const a = assembly('industrial-mixer');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 1050 * S, D = 850 * S, H = 920 * S;
block('stand', W + 250 * S, D + 220 * S, 120 * S, 0, 0, 0, steel);
block('mixer-bowl', W, D, H, 0, 0, 120 * S, body);
block('rim', W + 90 * S, D + 90 * S, 70 * S, 0, 0, H + 120 * S, accent);
beamX('drive-bar', W * 0.8, 46 * S, -W * 0.4, 0, H + 330 * S, steel);
beamZ('mixing-shaft', 640 * S, 35 * S, 0, 0, 300 * S, accent);
block('paddle', W * 0.65, 48 * S, 34 * S, 0, 0, 470 * S, steel);

return a.model();
