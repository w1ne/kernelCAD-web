// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "panel-line-strongback",
  license: "CC0-1.0",
  title: "Panel line strongback",
  description: "Long modular strongback fixture with spaced cross rails, clamp blocks, end stops, and datum feet. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#78867d", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("panel-line-strongback");

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

B("longitudinal-rail-0", [3000, 150, 180], [0, -620, 90]);
B("longitudinal-rail-1", [3000, 150, 180], [0, 620, 90]);
B("cross-rail-0", [165, 1320, 130], [-1200, 0, 245]);
B("cross-rail-1", [165, 1320, 130], [-600, 0, 245]);
B("cross-rail-2", [165, 1320, 130], [0, 0, 245]);
B("cross-rail-3", [165, 1320, 130], [600, 0, 245]);
B("cross-rail-4", [165, 1320, 130], [1200, 0, 245]);
B("clamp-block-0", [230, 280, 230], [-900, -620, 425]);
B("clamp-block-1", [230, 280, 230], [0, -620, 425]);
B("clamp-block-2", [230, 280, 230], [900, -620, 425]);
B("clamp-block-3", [230, 280, 230], [-900, 620, 425]);
B("clamp-block-4", [230, 280, 230], [0, 620, 425]);
B("clamp-block-5", [230, 280, 230], [900, 620, 425]);
B("datum-foot-0", [230, 220, 180], [-1350, -620, 90]);
B("datum-foot-1", [230, 220, 180], [1350, -620, 90]);
B("datum-foot-2", [230, 220, 180], [-1350, 620, 90]);
B("datum-foot-3", [230, 220, 180], [1350, 620, 90]);

return p.model();
