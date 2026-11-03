// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "dock-gate-caisson",
  license: "CC0-1.0",
  title: "Dock gate caisson",
  description: "Floating drydock gate module with a broad caisson body, stiffening ribs, deck walkway, and paired ballast housings. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "yard and dock operations"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#748987", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("dock-gate-caisson");

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

B("gate-body", [2800, 340, 1900], [0, 0, 950]);
B("deck-cap", [2940, 470, 150], [0, 0, 1975]);
B("vertical-stiffener-0", [120, 150, 1800], [-1100, 185, 900]);
B("vertical-stiffener-1", [120, 150, 1800], [-660, 185, 900]);
B("vertical-stiffener-2", [120, 150, 1800], [-220, 185, 900]);
B("vertical-stiffener-3", [120, 150, 1800], [220, 185, 900]);
B("vertical-stiffener-4", [120, 150, 1800], [660, 185, 900]);
B("vertical-stiffener-5", [120, 150, 1800], [1100, 185, 900]);
B("lower-flotation-cell-0", [500, 620, 360], [-720, 0, 180]);
B("lower-flotation-cell-1", [500, 620, 360], [720, 0, 180]);
B("deck-cleat-0", [150, 100, 120], [-950, -205, 2110]);
B("deck-cleat-1", [150, 100, 120], [950, -205, 2110]);

return p.model();
