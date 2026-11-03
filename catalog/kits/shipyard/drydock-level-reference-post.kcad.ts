// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "drydock-level-reference-post",
  license: "CC0-1.0",
  title: "Drydock level reference post",
  description: "Floor-mounted reference mast with a wide foot, graduated cross bars, a weather hood, and a float indicator. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "yard and dock operations"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d2a64f", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("drydock-level-reference-post");

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
const C = (name: string, height: number, radius: number, at: [number, number, number], rotation: [number, number, number] = [0, 0, 0], segments = 10) => {
  let shape = cylinder(height, radius, segments);
  if (rotation[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("base-plate", [700, 620, 120], [0, 0, 60]);
B("mast", [150, 160, 2570], [0, 0, 1405]);
B("graduation-0", [430, 70, 45], [0, -45, 300]);
B("graduation-1", [270, 70, 45], [0, -45, 450]);
B("graduation-2", [270, 70, 45], [0, -45, 600]);
B("graduation-3", [270, 70, 45], [0, -45, 750]);
B("graduation-4", [430, 70, 45], [0, -45, 900]);
B("graduation-5", [270, 70, 45], [0, -45, 1050]);
B("graduation-6", [270, 70, 45], [0, -45, 1200]);
B("graduation-7", [270, 70, 45], [0, -45, 1350]);
B("graduation-8", [430, 70, 45], [0, -45, 1500]);
B("graduation-9", [270, 70, 45], [0, -45, 1650]);
B("graduation-10", [270, 70, 45], [0, -45, 1800]);
B("graduation-11", [270, 70, 45], [0, -45, 1950]);
B("graduation-12", [430, 70, 45], [0, -45, 2100]);
B("graduation-13", [270, 70, 45], [0, -45, 2250]);
B("top-hood", [520, 380, 120], [0, 0, 2760]);
C("float-indicator", 130, 95, [0, 0, 2900], [0, 0, 0], 12);

return p.model();
