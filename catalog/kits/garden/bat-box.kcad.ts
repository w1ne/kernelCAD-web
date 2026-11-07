meta({
  name: "bat-box",
  license: 'CC0-1.0',
  title: "Garden bat box",
  description: "Narrow timber bat roost mounted on a tall post with a dark entrance slit and rain cap. Knobs: box and post and roof and entrance colours.",
  tags: ["bat box", "bat house", "wildlife habitat", "garden conservation"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 280,
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const boxColor = param('boxColor', '#76563b', { label: 'Roost box' });
const post = param('post', '#815b39', { label: 'Post' });
const cap = param('cap', '#4c514b', { label: 'Rain cap' });
const entrance = param('entrance', '#252b26', { label: 'Entrance shadow' });
presets({ cedar: { boxColor: '#a16e43' }, dark: { boxColor: '#4e4b40', cap: '#333833' } });
const a = assembly('bat-box');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape.scale(overallScale));
};

addPart('post', box(85, 85, 1900, true).translate(0, 0, 950).color(post));
addPart('back', box(420, 60, 1050, true).translate(0, 70, 1710).color(boxColor));
addPart('side', box(55, 180, 1050, true).translate(-185, 0, 1710).color(boxColor));
addPart('side', box(55, 180, 1050, true).translate(185, 0, 1710).color(boxColor));
addPart('front', box(320, 40, 980, true).translate(0, -55, 1745).color(boxColor));
addPart('entrance-slit', box(210, 18, 70, true).translate(0, -83, 1230).color(entrance));
addPart('roof', box(520, 300, 60, true).translate(0, 0, 2255).color(cap));

return a.model();
