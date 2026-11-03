// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "bumper-car",
  license: "CC0-1.0",
  title: "Bumper car",
  description: "Single electric bumper car with four perimeter bumper rails, a low cockpit, overhead pickup mast, steering control, and four floor rollers. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d27057", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("bumper-car");

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

B("floor-pan", [1250, 940, 180], [0, 0, 280]);
B("bumper-front", [1320, 95, 95], [0, -520, 250]);
B("bumper-rear", [1320, 95, 95], [0, 520, 250]);
B("bumper-left", [95, 1050, 95], [-650, 0, 250]);
B("bumper-right", [95, 1050, 95], [650, 0, 250]);
B("nose", [380, 640, 300], [510, 0, 440], [0, -15, 0]);
B("seat", [420, 500, 300], [-120, 0, 500]);
C("steering-column", 250, 24, [180, -20, 560], [0, -20, 0], 8);
C("steering-wheel", 42, 140, [180, -20, 790], [90, 0, 0], 10);
C("roller-0", 80, 110, [-410, -400, 110], [0, 90, 0], 8);
C("roller-1", 80, 110, [410, -400, 110], [0, 90, 0], 8);
C("roller-2", 80, 110, [-410, 400, 110], [0, 90, 0], 8);
C("roller-3", 80, 110, [410, 400, 110], [0, 90, 0], 8);
C("power-pickup", 650, 24, [-400, 0, 650], [0, 0, 0], 8);

return p.model();
