// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "park-operations-radio-rack",
  license: "CC0-1.0",
  title: "Park operations radio rack",
  description: "Back-of-house charging stand with six radio cradles, overhead status strip, and cable-routing shelf. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#6f8581", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("park-operations-radio-rack");

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

B("backplate", [1520, 130, 1800], [0, 350, 900]);
B("base", [1660, 660, 160], [0, 0, 80]);
B("charging-cradle-0", [180, 210, 460], [-600, 200, 630]);
B("charging-cradle-1", [180, 210, 460], [-360, 200, 630]);
B("charging-cradle-2", [180, 210, 460], [-120, 200, 630]);
B("charging-cradle-3", [180, 210, 460], [120, 200, 630]);
B("charging-cradle-4", [180, 210, 460], [360, 200, 630]);
B("charging-cradle-5", [180, 210, 460], [600, 200, 630]);
B("status-strip", [1450, 170, 180], [0, 200, 1500]);
B("cable-shelf", [1420, 500, 95], [0, 0, 260]);
C("status-indicator-0", 55, 42, [-570, 100, 1600], [0, 0, 0], 8);
C("status-indicator-1", 55, 42, [-342, 100, 1600], [0, 0, 0], 8);
C("status-indicator-2", 55, 42, [-114, 100, 1600], [0, 0, 0], 8);
C("status-indicator-3", 55, 42, [114, 100, 1600], [0, 0, 0], 8);
C("status-indicator-4", 55, 42, [342, 100, 1600], [0, 0, 0], 8);
C("status-indicator-5", 55, 42, [570, 100, 1600], [0, 0, 0], 8);

return p.model();
