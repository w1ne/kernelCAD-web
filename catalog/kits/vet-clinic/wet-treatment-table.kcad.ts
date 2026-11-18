// Wet treatment table: Stainless-style treatment table with raised edges, a central drain and a braced frame. Separate molded polymer, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "wet-treatment-table",
  license: 'CC0-1.0',
  title: "Wet treatment table",
  description: "Stainless-style treatment table with raised edges, a central drain and a braced frame. Material controls: molded polymer, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "wet", "treatment", "table", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });
const polymerColor = param('polymerColor', '#d3dfdc', { label: 'Molded polymer' });

presets({
  clinicClean: { stainlessSteelColor: '#e1e6e3' },
  softTeal: { stainlessSteelColor: '#8daeb0', polymerColor: '#9bbfc0' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "table-top": return polymerColor;
  }
  return stainlessSteelColor;
};
const p = assembly("wet-treatment-table");

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

b("table-top", [1320, 710, 70], [0, 0, 850]);
b("rear-lip", [1320, 34, 65], [0, 338, 910]);
b("left-lip", [34, 680, 60], [-642, 0, 910]);
b("right-lip", [34, 680, 60], [642, 0, 910]);
b("leg-front-left", [70, 70, 810], [-560, -270, 405]);
b("leg-front-right", [70, 70, 810], [560, -270, 405]);
b("leg-rear-left", [70, 70, 810], [-560, 270, 405]);
b("leg-rear-right", [70, 70, 810], [560, 270, 405]);
b("lower-brace", [1080, 48, 42], [0, 0, 170]);
c("drain", 20, 35, 12, [0, 0, 814]);
c("drain-stem", 130, 18, 10, [0, 0, 680]);

return p.model();
