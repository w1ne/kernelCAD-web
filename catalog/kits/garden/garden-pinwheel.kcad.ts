meta({
  name: "garden-pinwheel",
  license: 'CC0-1.0',
  title: "Garden pinwheel",
  description: "Bright garden pinwheel on a slender stake with four broad blades around a central hub. Knobs: blade and hub and pole colours.",
  tags: ["garden pinwheel", "wind spinner", "garden decoration", "yard"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 220,
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const blade = param('blade', '#d26842', { label: 'Blades' });
const hub = param('hub', '#e0b64c', { label: 'Hub' });
const pole = param('pole', '#76563b', { label: 'Stake' });
presets({ primary: { blade: '#d45439', hub: '#e6bd45' }, cool: { blade: '#4c8aa0', hub: '#e5d5b1' } });
const a = assembly('garden-pinwheel');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape.scale(overallScale));
};

addPart('stake', cylinder(1050, 22).translate(0, 0, 0).color(pole));
for (let i = 0; i < 4; i++) addPart(`blade-${i}`, box(210, 190, 24, true).rotateZ(i * 90 + 45).translate(100, 0, 1010).color(blade));
addPart('center-hub', sphere(62).translate(0, 0, 1010).color(hub));
addPart('rear-spindle', cylinder(150, 18).translate(0, 0, 850).color(pole));

return a.model();
