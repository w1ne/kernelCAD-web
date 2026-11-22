meta({
  name: "plant-label-set",
  license: 'CC0-1.0',
  title: "Garden plant label set",
  description: "Cluster of five blank plant labels on pointed stakes for a vegetable bed or seed tray. Knobs: stake and label and marker colours.",
  tags: ["plant labels", "garden markers", "plant tags", "allotment"],
  kit: 'garden',
  category: "item",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 220,
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const stake = param('stake', '#76563b', { label: 'Stakes' });
const label = param('label', '#eee4c9', { label: 'Labels' });
const marker = param('marker', '#394542', { label: 'Marker tips' });
presets({ bamboo: { stake: '#a6814d', label: '#e5d8b8' }, slate: { stake: '#626b69', label: '#424a49' } });
const a = assembly('plant-label-set');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape.scale(overallScale));
};

for (let i = 0; i < 5; i++) {
  const x = -420 + i * 210;
  const z = 150 + (i % 2) * 70;
  addPart(`stake-${i}`, box(24, 24, z + 80, true).translate(x, 0, (z + 80) / 2).color(stake));
  addPart(`label-${i}`, box(150, 35, 95, true).rotateY((i - 2) * 4).translate(x + 25, 0, z + 125).color(label));
  addPart(`tip-${i}`, box(48, 40, 18, true).translate(x + 85, -8, z + 125).color(marker));
}

return a.model();
