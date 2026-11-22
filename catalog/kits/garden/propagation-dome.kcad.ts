meta({
  name: "propagation-dome",
  license: 'CC0-1.0',
  title: "Propagation dome",
  description: "Low propagation dome with a raised seed tray and ribbed transparent cover for young plants. Knobs: diameter and tray and soil and cover colours.",
  tags: ["propagation dome", "seed propagator", "greenhouse", "garden"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 300,
});

const diameter = param('diameter', '520', { choices: ['420', '520', '620'], label: 'Dome diameter (mm)' });
const tray = param('tray', '#536d4c', { label: 'Tray' });
const cover = param('cover', '#a9cbbb', { label: 'Cover' });
const soil = param('soil', '#514638', { label: 'Growing medium' });
presets({ green: { tray: '#4b7147' }, clear: { cover: '#c5ddd2', soil: '#45392e' } });
const D = Number(diameter.value);
const a = assembly('propagation-dome');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('tray', cylinder(65, D / 2).color(tray));
addPart('growing-bed', cylinder(55, D * 0.40).translate(0, 0, 65).color(soil));
addPart('dome', sphere(D * 0.46).scale([1, 1, 0.64]).translate(0, 0, D * 0.38 + 65).color(cover));
for (let i = 0; i < 8; i++) addPart('vent-ridge', box(20, D * 0.68, 24, true).rotateZ(i * 22.5).translate(0, 0, D * 0.56 + 65).color(tray));
addPart('handle', cylinder(55, 34).translate(0, 0, D * 0.64 + 65).color(tray));

return a.model();
