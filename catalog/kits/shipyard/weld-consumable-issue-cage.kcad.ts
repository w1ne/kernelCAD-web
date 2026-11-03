// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "weld-consumable-issue-cage",
  license: "CC0-1.0",
  title: "Weld consumable issue cage",
  description: "Lockable mesh-style store with framed walls, two shelves, a half-height counter, and a roof panel. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "block and material movement"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#7a8580", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("weld-consumable-issue-cage");

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

B("corner-post-0", [100, 100, 1750], [-950, -500, 875]);
B("corner-post-1", [100, 100, 1750], [950, -500, 875]);
B("corner-post-2", [100, 100, 1750], [-950, 500, 875]);
B("corner-post-3", [100, 100, 1750], [950, 500, 875]);
B("roof", [2050, 1150, 120], [0, 0, 1810]);
B("counter", [1900, 520, 170], [0, -250, 620]);
B("storage-shelf-0", [1800, 900, 100], [0, 0, 930]);
B("storage-shelf-1", [1800, 900, 100], [0, 0, 1350]);
B("wall-rail-0", [1850, 70, 70], [0, -500, 480]);
B("wall-rail-1", [1850, 70, 70], [0, 500, 480]);
B("wall-rail-2", [1850, 70, 70], [0, -500, 1320]);
B("wall-rail-3", [1850, 70, 70], [0, 500, 1320]);
B("lockable-door", [620, 80, 1240], [-600, -560, 980]);

return p.model();
