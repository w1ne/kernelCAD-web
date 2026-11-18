meta({
  name: "tomato-cage",
  license: 'CC0-1.0',
  title: "Tomato cage",
  description: "Reusable steel tomato cage with upright support rods and four square support rings. Knobs: height and steel and connector colours.",
  tags: ["tomato cage", "plant support", "vegetable garden", "steel frame"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 300,
});

const height = param('height', '1500', { choices: ['1100', '1500', '1800'], label: 'Height (mm)' });
const steel = param('steel', '#7f8984', { label: 'Steel rods' });
const joint = param('joint', '#4a5f4a', { label: 'Ring ties' });
presets({ galvanized: { steel: '#a5abad' }, green: { steel: '#526d4c', joint: '#303a30' } });
const H = Number(height.value);
const a = assembly('tomato-cage');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-300, 300]) for (const y of [-300, 300]) addPart('upright', box(26, 26, H, true).translate(x, y, H / 2).color(steel));
for (let i = 0; i < 4; i++) {
  const z = 250 + i * (H - 400) / 3;
  const w = 650 - i * 50;
  for (const y of [-w / 2, w / 2]) addPart('ring-rail', box(w, 18, 18, true).translate(0, y, z).color(joint));
  for (const x of [-w / 2, w / 2]) addPart('ring-rail', box(18, w, 18, true).translate(x, 0, z).color(joint));
}

return a.model();
