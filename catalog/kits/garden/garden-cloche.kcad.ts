meta({
  name: "garden-cloche",
  license: 'CC0-1.0',
  title: "Garden cloche",
  description: "Bell-shaped low garden cloche with a faceted clear cover and a low planting rim. Knobs: diameter and cover and rim colours.",
  tags: ["garden cloche", "plant cover", "seedling protection", "greenhouse"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 260,
});

const diameter = param('diameter', '600', { choices: ['450', '600', '750'], label: 'Diameter (mm)' });
const cover = param('cover', '#a9cbbb', { label: 'Cover' });
const rim = param('rim', '#596347', { label: 'Rim' });
presets({ glass: { cover: '#bad8cc' }, smoke: { cover: '#899c9b', rim: '#454b40' } });
const D = Number(diameter.value);
const a = assembly('garden-cloche');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('base-rim', cylinder(45, D / 2).color(rim));
addPart('dome', sphere(D * 0.48).scale([1, 1, 0.72]).translate(0, 0, D * 0.43).color(cover));
for (let i = 0; i < 8; i++) addPart(`vent-${i}`, box(35, 18, 20, true).rotateZ(i * 45).translate(D * 0.36, 0, D * 0.62).color(rim));
addPart('top-handle', cylinder(70, 42).translate(0, 0, D * 0.75).color(rim));

return a.model();
