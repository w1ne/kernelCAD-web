// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "drydock-edge-guard-section",
  license: "CC0-1.0",
  title: "Drydock edge guard section",
  description: "Removable edge protection with weighted feet, rail posts, twin guard rails, and a high-visibility end panel. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "block and material movement"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d3a347", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("drydock-edge-guard-section");

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

B("base-foot-0", [380, 440, 110], [-1000, 0, 55]);
B("base-foot-1", [380, 440, 110], [0, 0, 55]);
B("base-foot-2", [380, 440, 110], [1000, 0, 55]);
B("rail-post-0", [100, 100, 1150], [-1000, 0, 680]);
B("rail-post-1", [100, 100, 1150], [0, 0, 680]);
B("rail-post-2", [100, 100, 1150], [1000, 0, 680]);
B("guard-rail-0", [2050, 90, 100], [0, 0, 460]);
B("guard-rail-1", [2050, 90, 100], [0, 0, 1040]);
B("end-warning-panel", [420, 100, 780], [1040, 0, 790]);

return p.model();
