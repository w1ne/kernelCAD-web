meta({
  name: "bird-feeder-post",
  license: 'CC0-1.0',
  title: "Bird feeder on post",
  description: "Raised bird feeder with a seed tray, four supporting columns and a pitched rain roof. Knobs: feeder body and roof and post colours.",
  tags: ["bird feeder", "seed tray", "garden wildlife", "backyard birds"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 360,
});

const body = param('body', '#8c6744', { label: 'Feeder body' });
const roof = param('roof', '#576147', { label: 'Roof' });
const post = param('post', '#76563b', { label: 'Post' });
presets({ cedar: { body: '#b17a48' }, green: { body: '#557353', roof: '#3e593d' } });
const a = assembly('bird-feeder-post');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('post', box(80, 80, 1600, true).translate(0, 0, 800).color(post));
addPart('tray', box(560, 500, 60, true).translate(0, 0, 1630).color(body));
for (const x of [-210, 210]) for (const y of [-180, 180]) addPart('roof-column', box(45, 45, 360, true).translate(x, y, 1840).color(body));
addPart('seed-hopper', box(390, 330, 300, true).translate(0, 0, 1900).color(body));
addPart('roof-left', box(640, 340, 55, true).rotateX(-28).translate(0, -170, 2110).color(roof));
addPart('roof-right', box(640, 340, 55, true).rotateX(28).translate(0, 170, 2110).color(roof));

return a.model();
