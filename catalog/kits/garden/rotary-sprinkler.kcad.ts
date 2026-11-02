meta({
  name: "rotary-sprinkler",
  license: 'CC0-1.0',
  title: "Rotary sprinkler",
  description: "Low tripod rotary sprinkler with four angled spray arms and a hose inlet. Knobs: body and arm and nozzle colours.",
  tags: ["rotary sprinkler", "lawn sprinkler", "irrigation", "garden watering"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 260,
});

const body = param('body', '#58634b', { label: 'Body' });
const arm = param('arm', '#8c9b8d', { label: 'Spray arms' });
const nozzle = param('nozzle', '#b28f3e', { label: 'Nozzles' });
presets({ green: { body: '#4b6846', arm: '#a4b1a2' }, brass: { nozzle: '#c69f3e' } });
const a = assembly('rotary-sprinkler');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('base', box(260, 260, 75, true).translate(0, 0, 37.5).color(body));
addPart('hub', cylinder(160, 95).translate(0, 0, 75).color(body));
addPart('riser', cylinder(140, 38).translate(0, 0, 210).color(arm));
for (let i = 0; i < 4; i++) {
  const angle = i * 90;
  addPart(`spray-arm-${i}`, box(390, 48, 42, true).rotateZ(angle).translate(0, 0, 320).color(arm));
  addPart(`nozzle-${i}`, box(55, 60, 70, true).rotateZ(angle).translate(185, 0, 375).color(nozzle));
}
addPart('hose-coupler', cylinder(110, 42).rotateY(90).translate(105, 0, 115).color(nozzle));

return a.model();
