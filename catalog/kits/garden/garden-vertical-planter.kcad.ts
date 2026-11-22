meta({
  name: "garden-vertical-planter",
  license: 'CC0-1.0',
  title: "Garden vertical planter",
  description: "Freestanding tiered planter with three planting troughs and compact foliage for small patios. Knobs: height and frame and trough and foliage colours.",
  tags: ["vertical planter", "patio garden", "planter tower", "small space gardening"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 440,
});

const height = param('height', '1500', { choices: ['1100', '1500', '1900'], label: 'Height (mm)' });
const frame = param('frame', '#815b39', { label: 'Frame' });
const planter = param('planter', '#9a593c', { label: 'Troughs' });
const foliage = param('foliage', '#4a8745', { label: 'Foliage' });
presets({ terracotta: { planter: '#b96443' }, painted: { frame: '#4d684c', planter: '#d2c7a6' } });
const H = Number(height.value);
const a = assembly('garden-vertical-planter');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-360, 360]) addPart('side-upright', box(55, 70, H, true).translate(x, 0, H / 2).color(frame));
for (let i = 0; i < 3; i++) {
  const z = 280 + i * (H - 430) / 2;
  const w = 820 - i * 80;
  addPart(`trough-${i}`, box(w, 330, 180, true).translate(0, -40, z).color(planter));
  for (let j = 0; j < 3; j++) addPart(`plant-${i}-${j}`, sphere(115).scale([1, 0.8, 1.4]).translate(-w * 0.32 + j * w * 0.32, -35, z + 155).color(foliage));
}
addPart('base-crossbar', box(900, 90, 55, true).translate(0, 0, 45).color(frame));

return a.model();
