// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "weld-inspection-light-stand",
  license: "CC0-1.0",
  title: "Weld inspection light stand",
  description: "Portable inspection light with a weighted base, height mast, twin lamp heads, and a cable hook. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "inspection and refit support"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d2a64c", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("weld-inspection-light-stand");

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

B("weighted-base", [620, 620, 170], [0, 0, 85]);
B("mast", [100, 100, 1560], [0, 0, 950]);
B("crossbar", [900, 120, 100], [0, 0, 1750]);
B("lamp-head-0", [320, 230, 280], [-280, 0, 1620]);
B("lamp-head-1", [320, 230, 280], [280, 0, 1620]);
B("lamp-lens-0", [220, 50, 190], [-280, -130, 1620]);
B("lamp-lens-1", [220, 50, 190], [280, -130, 1620]);
B("cable-hook", [90, 330, 80], [120, 140, 1240]);
B("carry-handle", [320, 80, 100], [0, 0, 1860]);

return p.model();
