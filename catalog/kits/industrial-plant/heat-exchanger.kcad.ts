meta({
  name: 'heat-exchanger',
  license: 'CC0-1.0',
  title: 'Shell and tube heat exchanger',
  description: 'Horizontal shell and tube exchanger with end channel covers, tie rods, feet and service nozzles. Knobs: size, shell, steel and safety colours.',
  tags: ['heat exchanger', 'shell and tube', 'process equipment', 'factory', 'industrial'],
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
const a = assembly('heat-exchanger');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));


const L = 1800 * S, R = 340 * S, zc = 620 * S;
a.part('shell', ngon(R, 10).extrude(L).rotateY(90).translate(-L / 2, 0, zc).color(body));
for (const x of [-L / 2 - 70 * S, L / 2]) a.part(`channel-${x < 0 ? 'left' : 'right'}`, ngon(R * 0.9, 10).extrude(70 * S).rotateY(90).translate(x, 0, zc).color(steel));
for (let i = 0; i < 4; i++) {
  const y = (i % 2 ? 1 : -1) * R * 0.67, z = zc + (i < 2 ? -1 : 1) * R * 0.67;
  beamX(`tie-rod-${i}`, L + 140 * S, 15 * S, -L / 2 - 70 * S, y, z, accent);
}
for (const x of [-L * 0.28, L * 0.28]) block(`saddle-${x < 0 ? 'a' : 'b'}`, 180 * S, 560 * S, 340 * S, x, 0, 0, steel);
for (const x of [-L * 0.22, L * 0.22]) a.part(`nozzle-${x < 0 ? 'a' : 'b'}`, ngon(65 * S, 8).extrude(150 * S).translate(x, 0, zc + R - 2 * S).color(accent));

return a.model();
