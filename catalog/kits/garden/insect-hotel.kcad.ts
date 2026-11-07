meta({
  name: "insect-hotel",
  license: 'CC0-1.0',
  title: "Insect hotel",
  description: "Timber insect hotel with small nest cavities, bundled reeds and a deep overhanging roof. Knobs: frame and nesting material and roof colours.",
  tags: ["insect hotel", "bug hotel", "pollinator habitat", "garden wildlife"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 420,
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const frame = param('frame', '#815b39', { label: 'Timber frame' });
const nesting = param('nesting', '#c19b67', { label: 'Nesting material' });
const roof = param('roof', '#596149', { label: 'Roof' });
presets({ cedar: { frame: '#b07b49' }, natural: { nesting: '#9c7750', roof: '#4c5742' } });
const a = assembly('insect-hotel');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape.scale(overallScale));
};

addPart('back', box(680, 130, 1050, true).translate(0, 0, 550).color(frame));
for (const x of [-350, 350]) addPart('side', box(55, 200, 1100, true).translate(x, 0, 550).color(frame));
for (let i = 0; i < 3; i++) addPart(`shelf-${i}`, box(650, 210, 55, true).translate(0, 0, 250 + i * 300).color(frame));
for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) addPart(`reed-bundle-${row}-${col}`, cylinder(180, 58).rotateX(90).translate(-120 + col * 240, -80, 380 + row * 300).color(nesting));
addPart('roof', box(900, 420, 90, true).translate(0, 0, 1150).color(roof));
addPart('roof-ridge', box(900, 55, 65, true).translate(0, 0, 1225).color(frame));

return a.model();
