// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "welding-gas-cylinder-trolley",
  license: "CC0-1.0",
  title: "Welding gas cylinder trolley",
  description: "Two-cylinder shop trolley with retaining straps, wheel guard, pull handle, and a low toe plate. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "outfitting and yard services"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#759084", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("welding-gas-cylinder-trolley");

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

B("toe-plate", [680, 500, 130], [0, 0, 65]);
C("gas-cylinder-0", 1320, 210, [-200, 0, 790], [0, 0, 0], 12);
C("gas-cylinder-1", 1320, 210, [200, 0, 790], [0, 0, 0], 12);
B("retaining-band-0", [650, 130, 80], [0, -20, 560]);
B("retaining-band-1", [650, 130, 80], [0, -20, 1040]);
C("trolley-wheel-0", 90, 230, [-420, 0, 230], [0, 90, 0], 12);
C("trolley-wheel-1", 90, 230, [420, 0, 230], [0, 90, 0], 12);
B("pull-handle", [90, 110, 1180], [-480, 0, 930]);
B("top-grip", [100, 660, 100], [-480, 0, 1510]);

return p.model();
