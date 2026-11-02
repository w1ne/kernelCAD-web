meta({
  name: 'agitated-reactor-vessel',
  license: 'CC0-1.0',
  title: 'Agitated reactor vessel',
  description: 'Jacketed reactor vessel with domed-look top cap, drive assembly, support skirt and process nozzles. Knobs: size, vessel, steel and safety colours.',
  tags: ['reactor vessel', 'jacketed vessel', 'agitator', 'factory', 'industrial'],
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
const a = assembly('agitated-reactor-vessel');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const R = 510 * S, H = 1650 * S;
for (let i = 0; i < 4; i++) {
  const ang = Math.PI / 4 + i * Math.PI / 2;
  block(`leg-${i}`, 76 * S, 76 * S, 250 * S, Math.cos(ang) * R * 0.76, Math.sin(ang) * R * 0.76, 0, steel);
}
a.part('reactor-shell', ngon(R, 10).extrude(H).translate(0, 0, 250 * S).color(body));
a.part('jacket', ringZ(R + 30 * S, 85 * S, 0, 0, 430 * S, steel));
a.part('top-cap', ngon(R * 0.96, 10).loft(ngon(R * 0.62, 10), { spacing: 210 * S, ruled: true }).translate(0, 0, H + 250 * S).color(body));
a.part('drive', ngon(155 * S, 8).extrude(240 * S).translate(0, 0, H + 460 * S).color(accent));
a.part('agitator-shaft', ngon(30 * S, 6).extrude(1300 * S).translate(0, 0, 350 * S).color(steel));
block('agitator-blade', 620 * S, 52 * S, 30 * S, 0, 0, 760 * S, steel);
for (let i = 0; i < 3; i++) a.part(`nozzle-${i}`, ngon(55 * S, 8).extrude(170 * S).translate((i - 1) * 210 * S, 0, H + 430 * S).color(accent));

return a.model();
