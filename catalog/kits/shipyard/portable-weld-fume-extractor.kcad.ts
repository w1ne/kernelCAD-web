// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "portable-weld-fume-extractor",
  license: "CC0-1.0",
  title: "Portable weld fume extractor",
  description: "Mobile extraction unit with a filter cabinet, flexible-arm mast, capture hood, and guarded wheels. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "inspection and refit support"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#71857f", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("portable-weld-fume-extractor");

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

B("cabinet", [920, 760, 1120], [0, 0, 700]);
B("filter-cover", [980, 820, 160], [0, 0, 1340]);
B("arm-base", [180, 180, 520], [300, 250, 1620]);
B("arm-segment-0", [120, 120, 680], [300, 250, 2200]);
B("arm-segment-1", [120, 120, 680], [300, 250, 2760]);
B("capture-hood", [520, 400, 180], [300, 250, 3180]);
C("wheel-0", 90, 155, [-390, -320, 155], [90, 0, 0], 10);
C("wheel-1", 90, 155, [390, -320, 155], [90, 0, 0], 10);
C("wheel-2", 90, 155, [-390, 320, 155], [90, 0, 0], 10);
C("wheel-3", 90, 155, [390, 320, 155], [90, 0, 0], 10);
B("service-door", [650, 70, 620], [0, -410, 700]);

return p.model();
