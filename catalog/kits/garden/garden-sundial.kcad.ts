meta({
  name: "garden-sundial",
  license: 'CC0-1.0',
  title: "Garden sundial",
  description: "Pedestal garden sundial with a broad engraved-looking dial plate and raised triangular gnomon. Knobs: stone and dial and gnomon colours.",
  tags: ["sundial", "garden ornament", "timepiece", "patio"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 300,
});

const stone = param('stone', '#999482', { label: 'Stone base' });
const dial = param('dial', '#c1ae7f', { label: 'Dial plate' });
const gnomon = param('gnomon', '#545b59', { label: 'Gnomon' });
presets({ limestone: { stone: '#b8ad94', dial: '#d4c497' }, bronze: { gnomon: '#947046' } });
const a = assembly('garden-sundial');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('foot', cylinder(100, 260).color(stone));
addPart('column', cylinder(560, 110).translate(0, 0, 100).color(stone));
addPart('dial', cylinder(75, 430).translate(0, 0, 620).color(dial));
addPart('gnomon', box(35, 28, 360, true).rotateY(38).translate(0, 0, 825).color(gnomon));
for (let i = 0; i < 12; i++) addPart(`hour-mark-${i}`, box(24, 65, 18, true).rotateZ(i * 30).translate(0, 315, 680).color(gnomon));

return a.model();
