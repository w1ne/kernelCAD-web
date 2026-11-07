// Leash and collar hook board: Wall board with spaced pegs for leashes, collars and lead loops in a treatment area. Separate molded polymer, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "leash-hook-board",
  license: 'CC0-1.0',
  title: "Leash and collar hook board",
  description: "Wall board with spaced pegs for leashes, collars and lead loops in a treatment area. Material controls: molded polymer, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "leash", "and", "collar", "hook", "board", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const polymerColor = param('polymerColor', '#d3dfdc', { label: 'Molded polymer' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { polymerColor: '#e8ece8' },
  softTeal: { polymerColor: '#9bbfc0', stainlessSteelColor: '#8daeb0' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "lower-rail": return stainlessSteelColor;
    case "peg-1": return stainlessSteelColor;
    case "peg-2": return stainlessSteelColor;
    case "peg-3": return stainlessSteelColor;
    case "peg-4": return stainlessSteelColor;
    case "peg-5": return stainlessSteelColor;
    case "peg-6": return stainlessSteelColor;
  }
  return polymerColor;
};
const p = assembly("leash-hook-board");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(finishFor(name)));
};
const c = (name: string, h: number, r: number, segments: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {
  let shape = cylinder(h, r, segments);
  if (axis && degrees) shape = shape.rotate(axis, degrees);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(finishFor(name)));
};

b("backboard", [900, 66, 420], [0, 0, 210]);
b("top-cap", [940, 82, 35], [0, 0, 420]);
b("lower-rail", [900, 54, 42], [0, 0, 48]);
c("peg-1", 54, 14, 8, [-330, -42, 225], [1, 0, 0], 90);
c("peg-2", 54, 14, 8, [-200, -42, 225], [1, 0, 0], 90);
c("peg-3", 54, 14, 8, [-70, -42, 225], [1, 0, 0], 90);
c("peg-4", 54, 14, 8, [70, -42, 225], [1, 0, 0], 90);
c("peg-5", 54, 14, 8, [200, -42, 225], [1, 0, 0], 90);
c("peg-6", 54, 14, 8, [330, -42, 225], [1, 0, 0], 90);

return p.model();
