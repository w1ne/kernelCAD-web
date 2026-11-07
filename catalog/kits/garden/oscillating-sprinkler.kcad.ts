meta({
  name: "oscillating-sprinkler",
  license: 'CC0-1.0',
  title: "Oscillating sprinkler",
  description: "Long oscillating garden sprinkler bar on a weighted base with a row of spray nozzles. Knobs: bar length and body and nozzle colours.",
  tags: ["oscillating sprinkler", "lawn sprinkler", "irrigation bar", "garden watering"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 300,
});

const length = param('length', '900', { choices: ['650', '900', '1150'], label: 'Spray bar length (mm)' });
const body = param('body', '#57624b', { label: 'Body' });
const nozzle = param('nozzle', '#b28f3e', { label: 'Nozzles' });
const bar = param('bar', '#a7b1a2', { label: 'Spray bar' });
presets({ green: { body: '#4a6847', bar: '#bdc8bb' }, brass: { nozzle: '#c6a343' } });
const L = Number(length.value);
const a = assembly('oscillating-sprinkler');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('base', box(L + 120, 220, 65, true).translate(0, 0, 32.5).color(body));
addPart('pivot-left', cylinder(90, 65).translate(-L / 2 + 70, 0, 110).color(body));
addPart('pivot-right', cylinder(90, 65).translate(L / 2 - 160, 0, 110).color(body));
addPart('spray-bar', box(L, 55, 65, true).translate(0, 0, 180).color(bar));
for (let i = 0; i < 9; i++) addPart(`nozzle-${i}`, box(42, 42, 35, true).translate(-L * 0.42 + i * L * 0.105, 0, 225).color(nozzle));
addPart('inlet', cylinder(130, 38).rotateX(90).translate(0, -135, 55).color(nozzle));

return a.model();
