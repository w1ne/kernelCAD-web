meta({
  name: "plant-obelisk",
  license: 'CC0-1.0',
  title: "Plant obelisk",
  description: "Tapered timber climbing frame with reducing square rings and a small top cap. Knobs: height and timber and cap colours.",
  tags: ["plant obelisk", "climbing support", "garden tower", "trellis"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 360,
});

const height = param('height', '1800', { choices: ['1400', '1800', '2200'], label: 'Height (mm)' });
const timber = param('timber', '#815b39', { label: 'Timber' });
const cap = param('cap', '#4d5554', { label: 'Top cap' });
presets({ cedar: { timber: '#b07c4b' }, green: { timber: '#526d4c', cap: '#3a403e' } });
const H = Number(height.value);
const a = assembly('plant-obelisk');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-1, 1]) for (const y of [-1, 1]) {
  addPart('foot', box(120, 120, 55, true).translate(x * 330, y * 330, 27.5).color(cap));
  addPart('leg', box(55, 55, H, true).rotateY(-x * 12).rotateX(y * 12).translate(x * 330, y * 330, H / 2).color(timber));
}
for (let i = 0; i < 4; i++) {
  const z = 260 + i * (H - 420) / 4;
  const r = 400 - i * 75;
  for (let j = 0; j < 4; j++) addPart(`ring-${i}-${j}`, box(r * 1.35, 32, 32, true).rotateZ(j * 90).translate(0, 0, z).color(timber));
}
addPart('top-cap', cylinder(90, 75).translate(0, 0, H - 45).color(cap));

return a.model();
