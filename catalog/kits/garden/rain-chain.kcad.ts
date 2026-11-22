meta({
  name: "rain-chain",
  license: 'CC0-1.0',
  title: "Rain chain",
  description: "Decorative rain chain suspended from a short gutter bracket with repeated cup links and a stone landing bowl. Knobs: cup count and chain and bowl and water colours.",
  tags: ["rain chain", "downspout", "rainwater", "garden ornament"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 360,
});

const count = param('count', '8', { choices: ['6', '8', '10'], label: 'Cup links' });
const chain = param('chain', '#9a774c', { label: 'Chain cups' });
const bowl = param('bowl', '#77766b', { label: 'Landing bowl' });
const water = param('water', '#628d98', { label: 'Water' });
presets({ copper: { chain: '#a66b45' }, dark: { chain: '#535b5b', bowl: '#555953' } });
const N = Number(count.value);
const a = assembly('rain-chain');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('gutter-bracket', box(420, 110, 65, true).translate(0, 0, 1700).color(bowl));
addPart('hanger', cylinder(180, 28).translate(0, 0, 1520).color(chain));
for (let i = 0; i < N; i++) {
  const z = 1450 - i * 145;
  addPart(`cup-${i}`, box(115, 115, 55, true).translate(0, 0, z).color(chain));
  addPart(`link-${i}`, box(25, 25, 95, true).translate(0, 0, z - 75).color(chain));
}
addPart('landing-bowl', cylinder(120, 310).color(bowl));
addPart('water', cylinder(20, 230).translate(0, 0, 120).color(water));

return a.model();
