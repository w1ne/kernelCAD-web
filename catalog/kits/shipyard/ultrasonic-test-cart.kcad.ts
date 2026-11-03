// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "ultrasonic-test-cart",
  license: "CC0-1.0",
  title: "Ultrasonic test cart",
  description: "Inspection trolley with a protective instrument case, probe holders, cable spool, and four swivel-style wheels. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "inspection and refit support"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#71867d", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("ultrasonic-test-cart");

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

B("cart-platform", [1150, 760, 130], [0, 0, 420]);
B("instrument-case", [780, 570, 650], [0, 0, 810]);
B("case-lid", [810, 600, 100], [0, 0, 1185]);
C("cable-spool", 180, 290, [470, 0, 900], [90, 0, 0], 14);
B("probe-holder-0", [130, 150, 260], [-280, -350, 1280]);
B("probe-holder-1", [130, 150, 260], [-90, -350, 1280]);
B("probe-holder-2", [130, 150, 260], [100, -350, 1280]);
B("probe-holder-3", [130, 150, 260], [290, -350, 1280]);
C("cart-wheel-0", 90, 155, [-500, -320, 155], [90, 0, 0], 10);
C("cart-wheel-1", 90, 155, [500, -320, 155], [90, 0, 0], 10);
C("cart-wheel-2", 90, 155, [-500, 320, 155], [90, 0, 0], 10);
C("cart-wheel-3", 90, 155, [500, 320, 155], [90, 0, 0], 10);
B("push-handle", [90, 700, 90], [-550, 0, 1120]);

return p.model();
