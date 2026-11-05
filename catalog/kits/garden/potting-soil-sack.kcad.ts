meta({
  name: "potting-soil-sack",
  license: 'CC0-1.0',
  title: "Potting soil sack",
  description: "Tie-top garden soil sack with a soft faceted body, folded collar and carrying seam. Knobs: sack and soil and tie colours.",
  tags: ["potting soil", "soil bag", "garden supplies", "sack"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 220,
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const sack = param('sack', '#8b7958', { label: 'Sack' });
const soil = param('soil', '#4c3a2c', { label: 'Soil' });
const tie = param('tie', '#ba9d68', { label: 'Tie' });
presets({ burlap: { sack: '#9d8659' }, dark: { sack: '#53644f', tie: '#c2b48f' } });
const a = assembly('potting-soil-sack');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape.scale(overallScale));
};

addPart('sack-body', sphere(300).scale([1.2, 0.82, 0.92]).translate(0, 0, 276).color(sack));
addPart('top-fold', cylinder(90, 190).translate(0, 0, 520).color(sack));
addPart('soil-opening', cylinder(42, 148).translate(0, 0, 600).color(soil));
addPart('tie-band', box(300, 38, 35, true).translate(0, -150, 515).color(tie));
addPart('seam', box(22, 440, 30, true).translate(0, -245, 280).color(tie));

return a.model();
