// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "pipe-rack-fork-pocket",
  license: "CC0-1.0",
  title: "Pipe rack with fork pockets",
  description: "Stackable pipe storage rack with upright dividers, fork pockets, a retaining rail, and a removable end stop. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "block and material movement"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#70827b", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("pipe-rack-fork-pocket");

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

B("base-skid-0", [2600, 180, 180], [0, -600, 90]);
B("base-skid-1", [2600, 180, 180], [0, 600, 90]);
B("divider-0", [150, 1120, 740], [-1000, 0, 550]);
B("divider-1", [150, 1120, 740], [-500, 0, 550]);
B("divider-2", [150, 1120, 740], [0, 0, 550]);
B("divider-3", [150, 1120, 740], [500, 0, 550]);
B("divider-4", [150, 1120, 740], [1000, 0, 550]);
B("fork-pocket-0", [420, 300, 240], [-700, 0, 210]);
B("fork-pocket-1", [420, 300, 240], [700, 0, 210]);
B("retaining-rail", [2700, 120, 170], [0, 620, 920]);
B("removable-stop", [130, 1160, 850], [1320, 0, 500]);

return p.model();
