meta({
  name: "coiled-garden-hose",
  license: 'CC0-1.0',
  title: "Coiled garden hose",
  description: "Compact polygonal coil of garden hose with a loose end and connector. Knobs: coil diameter and hose and connector colours.",
  tags: ["garden hose", "hose coil", "irrigation", "garden accessory"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 280,
});

const diameter = param('diameter', '700', { choices: ['550', '700', '850'], label: 'Coil diameter (mm)' });
const hose = param('hose', '#4e7891', { label: 'Hose' });
const connector = param('connector', '#666d6d', { label: 'Connector' });
presets({ green: { hose: '#4e8050' }, blue: { hose: '#387ca2' } });
const D = Number(diameter.value);
const a = assembly('coiled-garden-hose');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

const r = D * 0.34;
for (let i = 0; i < 12; i++) {
  const angle = i * 30;
  const rad = angle * Math.PI / 180;
  const x = r * Math.cos(rad);
  const y = r * Math.sin(rad);
  addPart(`coil-segment-${i}`, box(r * 0.62, 48, 48, true).rotateZ(angle + 90).translate(x, y, 24).color(hose));
}
const hoseAng = -38 * Math.PI / 180;
const p0 = [D * 0.328, -D * 0.088];
const p1 = [D * 0.6, -D * 0.3];
const hoseLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
addPart('loose-hose', box(hoseLen, 48, 48, true).rotateZ(-38).translate((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 24).color(hose));
addPart('hose-connector', cylinder(75, 35).translate(0, 0, -37.5).rotateY(90).rotateZ(-38).translate(p1[0] + 30 * Math.cos(hoseAng), p1[1] + 30 * Math.sin(hoseAng), 35).color(connector));

return a.model();
