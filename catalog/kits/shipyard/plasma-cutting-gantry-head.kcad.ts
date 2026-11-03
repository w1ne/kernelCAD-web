// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "plasma-cutting-gantry-head",
  license: "CC0-1.0",
  title: "Plasma cutting gantry head",
  description: "Compact cutting carriage with a bridge beam, end trucks, torch head, cable loop, and operator pendant. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d19443", { label: "Asset color" });
const originOffsetMm = -640;
const p = assembly("plasma-cutting-gantry-head");

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

B("bridge", [2300, 230, 220], [0, 0, 1680]);
B("end-truck-0", [380, 470, 330], [-1110, 0, 1520]);
B("end-truck-1", [380, 470, 330], [1110, 0, 1520]);
B("torch-carriage", [320, 430, 360], [180, 0, 1400]);
B("torch-nozzle", [90, 90, 580], [180, 0, 930]);
B("cable-loop", [80, 170, 780], [650, 30, 1170]);
B("pendant", [230, 120, 320], [900, -350, 1050]);

return p.model();
