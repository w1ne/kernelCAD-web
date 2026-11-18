// Original kernelCAD low-poly palisade wall: a 2 m section of sharpened log
// stakes of uneven height, lashed to two horizontal rails behind and set in
// an earth bank. Runs along X, centred, so sections join end to end on the
// 2 m grid; the rails sit on the inner (+Y) side.

meta({
  name: 'palisade-wall',
  license: 'CC0-1.0',
  title: 'Palisade wall',
  description: 'Two-metre section of sharpened log palisade on an earth bank with rear binding rails, for forts and villages. Knobs: height, log count, earth bank, log, point, rail and earth colours.',
  tags: ['palisade', 'stockade', 'wall', 'fence', 'logs', 'fort', 'village', 'medieval', 'defence', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'village', 'fort', 'forest'],
  triangleBudget: 600,
});

const heightM = param('heightM', '2.5', { choices: ['2', '2.5', '3'], label: 'Height (m)' });
const logsP = param('logs', '8', { choices: ['7', '8', '10'], label: 'Logs' });
const bank = param('bank', 'yes', { choices: ['yes', 'no'], label: 'Earth bank' });
const log = param('log', '#8a6240', { label: 'Logs' });
const point = param('point', '#c9a06a', { label: 'Sharpened points' });
const rail = param('rail', '#6a4a30', { label: 'Rails' });
const earth = param('earth', '#7a5a3a', { label: 'Earth bank' });

presets({
  weathered: { log: '#80776a', point: '#b2a891', rail: '#5f574c' },
  dark: { log: '#5a3f2a', point: '#9a7550', rail: '#3f2c1e' },
});

const S = 2000;
const H = Number(heightM.value) * 1000;
const n = Number(logsP.value);
const r = S / n / 2; // log radius so logs touch
const ptH = r * 2.2; // point length

const ngon = (rr: number, s: number, rot = 0) => {
  let p = path().moveTo(rr * Math.cos(rot), rr * Math.sin(rot));
  for (let k = 1; k < s; k++) p = p.lineTo(rr * Math.cos(rot + (2 * Math.PI * k) / s), rr * Math.sin(rot + (2 * Math.PI * k) / s));
  return p.close();
};

const pw = assembly('palisade-wall');
for (let i = 0; i < n; i++) {
  const x = -S / 2 + r + i * 2 * r;
  const hh = H - ptH - 120 * (0.5 + 0.5 * Math.sin(i * 2.9));
  const lean = 1.5 * Math.sin(i * 1.7);
  pw.part(`log-${i + 1}`, ngon(r * 0.97, 6, i * 0.3).extrude(hh).rotateX(lean).translate(x, 0, r * 0.05).color(log));
  // Sharpened point: a short hexagonal cone, cut wood colour.
  pw.part(`point-${i + 1}`, ngon(r * 0.97, 6, i * 0.3).loft(ngon(r * 0.12, 6, i * 0.3), { spacing: ptH, ruled: true })
    .translate(0, 0, hh - 1).rotateX(lean).translate(x, 0, r * 0.05).color(point));
}
for (const z of [H * 0.25, H * 0.65]) {
  pw.part(`rail-${Math.round(z)}`, box(S, 110, 140, true).translate(0, r * 0.97 + 50, z).color(rail));
}
if (bank.value === 'yes') {
  // Earth heaped against both sides of the foot of the wall.
  const prof: [number, number][] = [[-520, 0], [520, 0], [260, 220], [-260, 260]];
  pw.part('bank', extrudePolygon(prof, S).rotateX(90).rotateZ(90).translate(-S / 2, 0, 0).color(earth));
}

return pw.model();
