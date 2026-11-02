meta({
  name: 'industrial-blower',
  license: 'CC0-1.0',
  title: 'Industrial centrifugal blower',
  description: 'Centrifugal blower with volute case, square discharge, inlet ring and motor drive. Knobs: size, housing, steel and safety colours.',
  tags: ['centrifugal blower', 'industrial fan', 'air handling', 'factory', 'industrial'],
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
const a = assembly('industrial-blower');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const R = 430 * S;
block('base', 1250 * S, 650 * S, 85 * S, 0, 0, 0, steel);
a.part('blower-case', ngon(R, 10).extrude(230 * S).rotateX(90).translate(0, 115 * S, R + 90 * S).color(body));
a.part('inlet-ring', ringZ(R * 0.55, 45 * S, 0, 0, 0, steel).rotateX(90).translate(0, -140 * S, R + 90 * S));
block('discharge', 400 * S, 350 * S, 620 * S, 0, 0, 2 * R + 40 * S, body);
a.part('motor', ngon(170 * S, 8).extrude(550 * S).rotateY(90).translate(-100 * S, 0, 260 * S).color(accent));

return a.model();
