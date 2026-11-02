meta({
  name: "birdhouse-post",
  license: 'CC0-1.0',
  title: "Birdhouse on post",
  description: "Small pitched-roof birdhouse mounted on a garden post, with a round entrance and landing peg. Knobs: house and roof and post and entrance colours.",
  tags: ["birdhouse", "nest box", "bird habitat", "garden wildlife"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 320,
});

const house = param('house', '#9a7149', { label: 'House body' });
const roof = param('roof', '#596149', { label: 'Roof' });
const post = param('post', '#76563b', { label: 'Post' });
const entrance = param('entrance', '#302a22', { label: 'Entrance shadow' });
presets({ cedar: { house: '#b17a48' }, bluebird: { house: '#526f8c', roof: '#394b60' } });
const a = assembly('birdhouse-post');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('post', box(90, 90, 1500, true).translate(0, 0, 750).color(post));
addPart('house-body', box(460, 420, 500, true).translate(0, 0, 1780).color(house));
addPart('roof-left', box(520, 300, 55, true).rotateX(-32).translate(0, -145, 2050).color(roof));
addPart('roof-right', box(520, 300, 55, true).rotateX(32).translate(0, 145, 2050).color(roof));
addPart('entrance', cylinder(22, 72).rotateX(90).translate(0, -215, 1850).color(entrance));
addPart('landing-peg', cylinder(110, 16).rotateX(90).translate(0, -250, 1760).color(post));
addPart('post-cap', box(520, 480, 35, true).translate(0, 0, 1535).color(post));

return a.model();
