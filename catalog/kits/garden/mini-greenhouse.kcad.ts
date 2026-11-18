meta({
  name: "mini-greenhouse",
  license: 'CC0-1.0',
  title: "Mini greenhouse",
  description: "Small walk-in garden greenhouse with a pitched roof, glazed wall panels and a framed door. Knobs: length and frame and glazing colours.",
  tags: ["greenhouse", "glasshouse", "garden shed", "growing", "horticulture"],
  kit: 'garden',
  category: "structure",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 560,
});

const length = param('length', '1800', { choices: ['1400', '1800', '2200'], label: 'Length (mm)' });
const frame = param('frame', '#62704c', { label: 'Frame' });
const glazing = param('glazing', '#9bc7af', { label: 'Glazing' });
presets({ forest: { frame: '#455a43' }, whiteFrame: { frame: '#ddd8c8', glazing: '#aed6c2' } });
const L = Number(length.value);
const a = assembly('mini-greenhouse');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-L / 2, L / 2]) for (const y of [-650, 650]) addPart('corner-post', box(55, 55, 1700, true).translate(x, y, 850).color(frame));
for (const y of [-650, 650]) addPart('eave-beam', box(L, 55, 55, true).translate(0, y, 1660).color(frame));
for (const x of [-L / 2, L / 2]) addPart('end-wall-glazing', box(40, 1250, 1150, true).translate(x, 0, 900).color(glazing));
addPart('side-glazing', box(L - 70, 35, 1050, true).translate(0, -630, 900).color(glazing));
addPart('side-glazing', box(L - 70, 35, 1050, true).translate(0, 630, 900).color(glazing));
for (const y of [-650, 650]) addPart('roof-slope', box(L, 820, 45, true).rotateX(y < 0 ? 29 : -29).translate(0, y * 0.5, 1870).color(glazing));
addPart('roof-ridge', box(L, 55, 45, true).translate(0, 0, 2040).color(frame));
for (const y of [-650, 650]) addPart('roof-rail', box(L, 45, 55, true).translate(0, y, 1690).color(frame));
addPart('door-panel', box(680, 55, 1500, true).translate(0, -665, 770).color(glazing));
addPart('door-handle', box(35, 35, 180, true).translate(280, -705, 800).color(frame));

return a.model();
