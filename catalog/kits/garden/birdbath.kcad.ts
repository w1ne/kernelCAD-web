meta({
  name: "birdbath",
  license: 'CC0-1.0',
  title: "Garden birdbath",
  description: "Classical garden birdbath with a faceted pedestal, broad shallow basin and water surface. Knobs: stone and bowl and water colours.",
  tags: ["birdbath", "bird bath", "garden ornament", "wildlife water"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 300,
});

const stone = param('stone', '#9b9585', { label: 'Stone' });
const bowl = param('bowl', '#b6aa8e', { label: 'Basin' });
const water = param('water', '#5a9aaa', { label: 'Water' });
presets({ limestone: { stone: '#b7ad97', bowl: '#d0c3a3' }, slate: { stone: '#657078', bowl: '#87939a' } });
const a = assembly('birdbath');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('foot', cylinder(90, 240).color(stone));
addPart('pedestal', cylinder(520, 120).translate(0, 0, 90).color(stone));
addPart('capital', cylinder(90, 260).translate(0, 0, 600).color(stone));
addPart('basin', sphere(470).scale([1, 1, 0.22]).translate(0, 0, 710).color(bowl));
addPart('water', cylinder(22, 350).translate(0, 0, 795).color(water));

return a.model();
