// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "pipe-spool-saddle-stand",
  license: "CC0-1.0",
  title: "Pipe spool saddle stand",
  description: "Adjustable pipe support with a broad base, twin uprights, saddle crossbar, locking collars, and storage tray. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#778780", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("pipe-spool-saddle-stand");

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

B("base", [1600, 700, 150], [0, 0, 75]);
B("upright-0", [130, 150, 980], [-560, 0, 640]);
B("upright-1", [130, 150, 980], [560, 0, 640]);
B("saddle-crossbar", [1420, 240, 180], [0, 0, 1190]);
B("saddle-cap", [950, 280, 170], [0, 0, 1365]);
B("locking-collar-0", [230, 210, 120], [-560, 0, 940]);
B("locking-collar-1", [230, 210, 120], [560, 0, 940]);
B("tool-tray", [1200, 430, 100], [0, -150, 230]);

return p.model();
