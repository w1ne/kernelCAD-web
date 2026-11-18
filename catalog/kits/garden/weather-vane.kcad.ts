meta({
  name: "weather-vane",
  license: 'CC0-1.0',
  title: "Garden weather vane",
  description: "Roof-mounted garden weather vane with compass arms, a directional arrow and a tail fin. Knobs: pole and vane and fin colours.",
  tags: ["weather vane", "wind direction", "garden ornament", "weather station"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 320,
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const pole = param('pole', '#565c59', { label: 'Pole' });
const vane = param('vane', '#a68b4b', { label: 'Vane' });
const fin = param('fin', '#7b5540', { label: 'Tail fin' });
presets({ brass: { vane: '#c09b43', fin: '#9a6c44' }, dark: { pole: '#343a3a', vane: '#818b88' } });
const a = assembly('weather-vane');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape.scale(overallScale));
};

addPart('base-foot', cylinder(55, 180).color(pole));
addPart('roof-mount', cylinder(110, 150).translate(0, 0, 55).color(pole));
addPart('mast', cylinder(1350, 28).translate(0, 0, 110).color(pole));
addPart('compass-east-west', box(700, 30, 30, true).translate(0, 0, 950).color(vane));
addPart('compass-north-south', box(30, 700, 30, true).translate(0, 0, 950).color(vane));
addPart('arrow-shaft', box(720, 45, 55, true).translate(250, 0, 1050).color(vane));
addPart('arrow-head', box(220, 160, 65, true).rotateZ(45).translate(650, 0, 1050).color(vane));
addPart('tail-fin', box(180, 35, 300, true).translate(-180, 0, 1050).color(fin));
addPart('fin-top', box(300, 35, 50, true).translate(-220, 0, 1200).color(fin));

return a.model();
