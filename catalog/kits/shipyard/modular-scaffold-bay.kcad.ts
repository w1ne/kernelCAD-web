// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "modular-scaffold-bay",
  license: "CC0-1.0",
  title: "Modular scaffold bay",
  description: "Short shipyard access scaffold with twin end frames, diagonal braces, a work deck, ladder rungs, and toe boards. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "outfitting and yard services"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#788781", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("modular-scaffold-bay");

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

B("upright-0", [110, 110, 2140], [-920, -430, 1070]);
B("upright-1", [110, 110, 2140], [920, -430, 1070]);
B("upright-2", [110, 110, 2140], [-920, 430, 1070]);
B("upright-3", [110, 110, 2140], [920, 430, 1070]);
B("ledger-0", [1840, 100, 100], [0, -430, 450]);
B("ledger-1", [1840, 100, 100], [0, 430, 450]);
B("ledger-2", [1840, 100, 100], [0, -430, 1590]);
B("ledger-3", [1840, 100, 100], [0, 430, 1590]);
B("cross-brace-0", [150, 920, 1100], [-920, -220, 1020]);
B("cross-brace-1", [150, 920, 1100], [920, 220, 1020]);
B("work-deck", [1740, 780, 110], [0, 0, 1570]);
B("toe-board", [1740, 80, 150], [0, -390, 1700]);
B("ladder-rung-0", [560, 85, 75], [-930, -470, 270]);
B("ladder-rung-1", [560, 85, 75], [-930, -470, 480]);
B("ladder-rung-2", [560, 85, 75], [-930, -470, 690]);
B("ladder-rung-3", [560, 85, 75], [-930, -470, 900]);
B("ladder-rung-4", [560, 85, 75], [-930, -470, 1110]);
B("ladder-rung-5", [560, 85, 75], [-930, -470, 1320]);

return p.model();
