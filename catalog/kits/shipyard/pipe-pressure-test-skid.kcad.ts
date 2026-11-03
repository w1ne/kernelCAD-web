// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "pipe-pressure-test-skid",
  license: "CC0-1.0",
  title: "Pipe pressure test skid",
  description: "Service skid with a manifold header, short pipe sections, handwheel-shaped valves, and a drip tray. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "outfitting and yard services"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#71847d", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("pipe-pressure-test-skid");

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

B("drip-tray", [1850, 840, 110], [0, 0, 55]);
B("header", [1420, 150, 160], [0, 0, 920]);
B("test-leg-0", [140, 140, 650], [-500, 0, 515]);
B("test-leg-1", [140, 140, 650], [0, 0, 515]);
B("test-leg-2", [140, 140, 650], [500, 0, 515]);
C("valve-handwheel-0", 55, 130, [-500, -120, 800], [90, 0, 0], 12);
C("valve-handwheel-1", 55, 130, [0, -120, 800], [90, 0, 0], 12);
C("valve-handwheel-2", 55, 130, [500, -120, 800], [90, 0, 0], 12);
B("support-0", [130, 130, 700], [-680, -280, 405]);
B("support-1", [130, 130, 700], [680, -280, 405]);
B("support-2", [130, 130, 700], [-680, 280, 405]);
B("support-3", [130, 130, 700], [680, 280, 405]);
B("gauge-panel", [420, 100, 420], [800, -250, 600]);

return p.model();
