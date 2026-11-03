// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "coating-mix-cabinet",
  license: "CC0-1.0",
  title: "Coating mix cabinet",
  description: "Ventilated material cabinet with a mixing worktop, paired lower doors, top extraction hood, and side shelf. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "surface preparation and coating"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#7d7567", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("coating-mix-cabinet");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("cabinet-body", [1440, 820, 1360], [0, 0, 760]);
B("toe-kick", [1510, 880, 140], [0, 0, 70]);
B("mixing-top", [1580, 960, 120], [0, 0, 1500]);
B("lower-door-0", [650, 50, 920], [-350, -420, 650]);
B("lower-door-1", [650, 50, 920], [350, -420, 650]);
B("extraction-hood", [900, 620, 230], [0, 80, 1675]);
B("side-shelf", [520, 560, 110], [980, 50, 1040]);
B("vent-stack", [170, 170, 570], [0, 80, 2075]);

return p.model();
