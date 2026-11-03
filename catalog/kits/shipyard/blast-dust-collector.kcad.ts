// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "blast-dust-collector",
  license: "CC0-1.0",
  title: "Blast dust collector",
  description: "Compact dust extraction skid with filter canisters, inlet duct, service door, and wheeled base. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "surface preparation and coating"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#71837c", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("blast-dust-collector");

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
const C = (name: string, height: number, radius: number, at: [number, number, number], rotation: [number, number, number] = [0, 0, 0], segments = 10) => {
  let shape = cylinder(height, radius, segments);
  if (rotation[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("skid", [1650, 980, 150], [0, 0, 75]);
C("filter-canister-0", 1320, 240, [-520, 0, 810], [0, 0, 0], 12);
C("filter-canister-1", 1320, 240, [0, 0, 810], [0, 0, 0], 12);
C("filter-canister-2", 1320, 240, [520, 0, 810], [0, 0, 0], 12);
B("inlet-duct", [1350, 190, 190], [0, -410, 1480]);
B("fan-housing", [520, 520, 420], [760, 0, 430]);
B("service-door", [420, 70, 720], [-820, 0, 780]);
B("caster-0", [170, 170, 120], [-680, -380, 60]);
B("caster-1", [170, 170, 120], [680, -380, 60]);
B("caster-2", [170, 170, 120], [-680, 380, 60]);
B("caster-3", [170, 170, 120], [680, 380, 60]);

return p.model();
