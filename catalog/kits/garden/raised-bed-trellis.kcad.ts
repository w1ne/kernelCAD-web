meta({
  name: "raised-bed-trellis",
  license: 'CC0-1.0',
  title: "Raised bed with trellis",
  description: "Raised timber growing bed with a rear climbing trellis and visible soil surface. Knobs: length and timber and soil and trellis colours.",
  tags: ["raised bed", "trellis", "vegetable garden", "climbing plants", "allotment"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 420,
});

const length = param('length', '1400', { choices: ['1000', '1400', '1800'], label: 'Bed length (mm)' });
const timber = param('timber', '#8a6745', { label: 'Timber' });
const soil = param('soil', '#594536', { label: 'Soil' });
const trellis = param('trellis', '#62704c', { label: 'Trellis' });
presets({ cedar: { timber: '#b07b49' }, darkSoil: { soil: '#3e3128', trellis: '#516b48' } });
const L = Number(length.value);
const a = assembly('raised-bed-trellis');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('bed-base', box(L, 710, 10, true).translate(0, 0, 5).color(timber));
for (const y of [-380, 380]) addPart('bed-wall', box(L, 55, 330, true).translate(0, y, 170).color(timber));
for (const x of [-L / 2 + 28, L / 2 - 28]) addPart('end-wall', box(55, 710, 330, true).translate(x, 0, 170).color(timber));
addPart('soil', box(L - 90, 650, 85, true).translate(0, 0, 335).color(soil));
for (const x of [-L * 0.38, L * 0.38]) addPart('trellis-post', box(50, 50, 1500, true).translate(x, 360, 1080).color(trellis));
for (let i = 0; i < 5; i++) addPart(`trellis-rail-${i}`, box(L * 0.8, 35, 35, true).translate(0, 360, 480 + i * 280).color(trellis));
for (let i = 0; i < 4; i++) addPart(`trellis-upright-${i}`, box(28, 35, 1200, true).translate(-L * 0.34 + i * L * 0.226, 360, 1050).color(trellis));

return a.model();
