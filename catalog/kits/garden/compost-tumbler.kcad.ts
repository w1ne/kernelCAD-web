meta({
  name: "compost-tumbler",
  license: 'CC0-1.0',
  title: "Compost tumbler",
  description: "Rotating barrel composter on an A-frame stand with an axle and reinforcing bands. Knobs: drum length and frame and drum colours.",
  tags: ["compost tumbler", "rotating composter", "garden waste", "recycling"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 340,
});

const length = param('length', '800', { choices: ['650', '800', '950'], label: 'Drum length (mm)' });
const frame = param('frame', '#596149', { label: 'Frame' });
const drum = param('drum', '#4f7250', { label: 'Drum' });
const axle = param('axle', '#545b5d', { label: 'Axle' });
presets({ green: { frame: '#454d40', drum: '#477447' }, black: { drum: '#303638', axle: '#a2a8a7' } });
const L = Number(length.value);
const a = assembly('compost-tumbler');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const y of [-360, 360]) {
  addPart('stand-leg', box(75, 75, 760, true).rotateY(-24).translate(-260, y, 380).color(frame));
  addPart('stand-leg', box(75, 75, 760, true).rotateY(24).translate(260, y, 380).color(frame));
}
for (const x of [-260, 260]) for (const y of [-360, 360]) addPart('foot', box(150, 150, 35, true).translate(x, y, 17.5).color(frame));
addPart('lower-brace', box(650, 820, 70, true).translate(0, 0, 120).color(frame));
addPart('axle', cylinder(L + 240, 35).rotateY(90).translate(0, 0, 1050).color(axle));
addPart('drum', cylinder(L, 340).rotateY(90).translate(-L / 2, 0, 1050).color(drum));
for (const x of [-L / 2 + 90, L / 2 - 90]) addPart('drum-band', cylinder(45, 355).rotateY(90).translate(x - 22, 0, 1050).color(frame));
addPart('hand-crank', box(250, 45, 45, true).translate(L / 2 + 150, 0, 940).color(axle));

return a.model();
