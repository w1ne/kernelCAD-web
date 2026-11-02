meta({
  name: 'silo-bin',
  license: 'CC0-1.0',
  title: 'Silo bin',
  description: 'Tall bulk-material silo with a conical discharge hopper, support legs, top rim and outlet. Knobs: size, shell, steel and safety colours.',
  tags: ['silo', 'bulk storage', 'hopper', 'factory', 'industrial', 'grain'],
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
const a = assembly('silo-bin');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const R = 620 * S, H = 3100 * S, coneH = 700 * S;
a.part('silo-shell', ngon(R, 10).extrude(H - coneH).translate(0, 0, coneH).color(body));
a.part('hopper', ngon(R, 10).loft(ngon(130 * S, 10), { spacing: coneH, ruled: true }).color(steel));
a.part('top-rim', ringZ(R + 22 * S, 36 * S, 0, 0, H, steel));
a.part('outlet', ngon(120 * S, 8).extrude(170 * S).translate(0, 0, 0).color(accent));
for (let i = 0; i < 4; i++) {
  const ang = Math.PI / 4 + i * Math.PI / 2, x = Math.cos(ang) * R * 0.82, y = Math.sin(ang) * R * 0.82;
  block(`leg-${i}`, 85 * S, 85 * S, coneH + 90 * S, x, y, 0, steel);
}

return a.model();
