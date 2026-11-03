// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "temporary-work-light-mast",
  license: "CC0-1.0",
  title: "Temporary work light mast",
  description: "Portable telescoping light mast on a stabilizing base with a four-lamp head and cable hook. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "outfitting and yard services"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d5a951", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("temporary-work-light-mast");

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

B("base-foot", [760, 760, 150], [0, 0, 75]);
B("mast-lower", [140, 140, 1750], [0, 0, 1025]);
B("mast-upper", [100, 100, 1400], [0, 0, 2600]);
B("lamp-bar", [1050, 140, 120], [0, 0, 3260]);
B("lamp-0", [190, 180, 250], [-390, -70, 3060]);
B("lamp-1", [190, 180, 250], [-130, -70, 3060]);
B("lamp-2", [190, 180, 250], [130, -70, 3060]);
B("lamp-3", [190, 180, 250], [390, -70, 3060]);
B("stabilizer-0", [700, 120, 90], [-520, 0, 45]);
B("stabilizer-1", [700, 120, 90], [520, 0, 45]);
B("stabilizer-2", [700, 120, 90], [0, -520, 45]);
B("stabilizer-3", [700, 120, 90], [0, 520, 45]);
B("cable-hook", [120, 120, 310], [170, 180, 1750]);

return p.model();
