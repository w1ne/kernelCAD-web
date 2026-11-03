// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "ride-operator-console",
  license: "CC0-1.0",
  title: "Ride operator console",
  description: "Freestanding dispatch console with a slanted control face, stop button, status lamps, and weather hood. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#778983", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("ride-operator-console");

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

B("pedestal", [520, 480, 840], [0, 0, 420]);
B("control-face", [830, 200, 500], [0, -90, 1030], [-12, 0, 0]);
B("hood", [980, 580, 100], [0, 0, 1390]);
C("status-lamp-0", 85, 62, [-260, -220, 1260], [0, 0, 0], 8);
C("status-lamp-1", 85, 62, [-90, -220, 1260], [0, 0, 0], 8);
C("status-lamp-2", 85, 62, [90, -220, 1260], [0, 0, 0], 8);
C("status-lamp-3", 85, 62, [260, -220, 1260], [0, 0, 0], 8);
B("stop-button-guard", [200, 170, 60], [0, -215, 1150]);
B("side-grab-left", [80, 520, 80], [-500, 0, 860]);
B("side-grab-right", [80, 520, 80], [500, 0, 860]);

return p.model();
