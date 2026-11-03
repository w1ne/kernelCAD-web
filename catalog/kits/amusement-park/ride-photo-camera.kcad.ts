// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "ride-photo-camera",
  license: "CC0-1.0",
  title: "Ride photo camera",
  description: "Elevated attraction camera on a three-leg stand with a sun hood and a large front lens barrel. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#606f73", { label: "Asset color" });
const originOffsetMm = 14.219;
const p = assembly("ride-photo-camera");

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

B("camera-body", [650, 470, 440], [0, 0, 1960]);
B("lens-barrel", [180, 260, 180], [0, -355, 1950], [90, 0, 0]);
B("sun-hood", [430, 470, 80], [0, -40, 2210]);
C("lens", 65, 135, [0, -500, 1950], [90, 0, 0], 10);
C("mast", 1140, 58, [0, 0, 1090], [0, 0, 0], 8);
B("tripod-leg-0", [55, 60, 1100], [-420, 0, 530], [20, 0, 0]);
B("tripod-leg-1", [55, 60, 1100], [210, -365, 530], [-12, 0, 0]);
B("tripod-leg-2", [55, 60, 1100], [210, 365, 530], [-12, 0, 0]);
B("tripod-foot-0", [420, 160, 55], [-420, 0, 30]);
B("tripod-foot-1", [420, 160, 55], [210, -365, 30]);
B("tripod-foot-2", [420, 160, 55], [210, 365, 30]);

return p.model();
