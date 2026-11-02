meta({
  name: "garden-gnome",
  license: 'CC0-1.0',
  title: "Garden gnome",
  description: "Small low-poly garden gnome with a rounded coat, pale face, light beard, tall cap and boots. Knobs: coat and hat and skin and beard colours.",
  tags: ["garden gnome", "gnome statue", "garden ornament", "folklore"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 300,
});

const coat = param('coat', '#4a6f53', { label: 'Coat' });
const hat = param('hat', '#b64d3b', { label: 'Hat' });
const skin = param('skin', '#dfc4a1', { label: 'Face' });
const beard = param('beard', '#e2dccb', { label: 'Beard' });
presets({ classic: { coat: '#3f744b', hat: '#c24d3c', beard: '#eee7d7' }, autumn: { coat: '#ad6b35', hat: '#4d627d', beard: '#d3c9b4' } });
const a = assembly('garden-gnome');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-41, 41]) addPart('boot', box(67, 87, 41, true).translate(x, -14, 20.5).color(hat));
addPart('coat', sphere(106).scale([1, 0.78, 1.25]).translate(0, 0, 138).color(coat));
addPart('beard', sphere(58).scale([0.8, 0.5, 1.05]).translate(0, -43, 188).color(beard));
addPart('face', sphere(67).scale([0.86, 0.78, 1]).translate(0, -19, 232).color(skin));
addPart('nose', box(22, 15, 18, true).translate(0, -78, 225).color(skin));
addPart('hat', sphere(83).scale([0.82, 0.82, 1.45]).rotateY(-12).translate(0, 0, 317).color(hat));
for (const x of [-18, 18]) addPart('eye', box(8, 5, 7, true).translate(x, -78, 241).color(coat));

return a.model();
