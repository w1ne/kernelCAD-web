meta({
  name: "garden-hose-reel",
  license: 'CC0-1.0',
  title: "Garden hose reel",
  description: "Freestanding garden hose reel with a wound drum, side cheeks, support post and turning crank. Knobs: drum size and frame and hose colours.",
  tags: ["hose reel", "garden hose", "irrigation", "backyard"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 340,
});

const diameter = param('diameter', '560', { choices: ['440', '560', '680'], label: 'Reel diameter (mm)' });
const frame = param('frame', '#596149', { label: 'Frame' });
const hose = param('hose', '#4f7891', { label: 'Hose' });
const axle = param('axle', '#555d5d', { label: 'Axle' });
presets({ green: { frame: '#455a43', hose: '#4f8051' }, blue: { hose: '#397fa5' } });
const D = Number(diameter.value);
const a = assembly('garden-hose-reel');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-D / 2, D / 2]) addPart('side-cheek', cylinder(55, D / 2).rotateY(90).translate(x - 27, 0, D / 2 + 180).color(frame));
addPart('drum-core', cylinder(460, D * 0.29).rotateY(90).translate(-230, 0, D / 2 + 180).color(hose));
addPart('axle', cylinder(D + 130, 32).rotateY(90).translate(-D / 2 - 65, 0, D / 2 + 180).color(axle));
addPart('back-plate', box(120, 560, 620, true).translate(0, 0, D / 2 + 180).color(frame));
addPart('ground-stand', box(130, 130, 300, true).translate(0, 0, 150).color(frame));
addPart('crank-arm', box(260, 40, 40, true).translate(D / 2 + 150, 0, D / 2 + 180).color(axle));
addPart('crank-grip', cylinder(140, 30).translate(D / 2 + 275, 0, D / 2 + 100).color(frame));
for (let i = 0; i < 6; i++) addPart('hose-coil', box(38, 300 + i * 8, 38, true).rotateZ(i * 60).translate(0, 0, D / 2 + 180).color(hose));

return a.model();
