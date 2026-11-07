meta({
  name: "drip-irrigation-row",
  license: 'CC0-1.0',
  title: "Drip irrigation row",
  description: "Garden drip irrigation line with a main hose, repeated emitters and two ground stakes. Knobs: row length and hose and emitter colours.",
  tags: ["drip irrigation", "garden hose", "irrigation line", "vegetable row"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 360,
});

const length = param('length', '1800', { choices: ['1200', '1800', '2400'], label: 'Row length (mm)' });
const hose = param('hose', '#4e6c49', { label: 'Hose' });
const emitter = param('emitter', '#252d2c', { label: 'Emitters' });
presets({ green: { hose: '#52804c' }, black: { hose: '#313737', emitter: '#131817' } });
const L = Number(length.value);
const a = assembly('drip-irrigation-row');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('main-line', box(L, 38, 38, true).translate(0, 0, 38).color(hose));
for (let i = 0; i < 6; i++) {
  const x = -L * 0.36 + i * L * 0.144;
  addPart(`riser-${i}`, box(26, 26, 85, true).translate(x, 0, 97.5).color(emitter));
  addPart(`dripper-${i}`, box(48, 48, 28, true).translate(x, 0, 125).color(emitter));
}
for (const x of [-L * 0.4, L * 0.4]) addPart('stake', box(28, 28, 260, true).translate(x, 0, 130).color(emitter));
addPart('end-cap', cylinder(45, 30).rotateY(90).translate(L / 2, 0, 38).color(emitter));

return a.model();
