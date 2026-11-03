// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "game-token-counter",
  license: "CC0-1.0",
  title: "Game token counter",
  description: "Midway exchange counter with a token hopper, change tray, service window, and queue-side awning. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#8a765e", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("game-token-counter");

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

B("counter-body", [1580, 680, 850], [0, 0, 425]);
B("service-window", [1000, 70, 500], [0, -355, 1170]);
B("counter-ledge", [1800, 360, 110], [0, -320, 900]);
C("token-hopper", 380, 190, [-490, 30, 900], [0, 0, 0], 12);
B("change-tray", [420, 300, 80], [490, -250, 980]);
B("awning", [1950, 760, 100], [0, 10, 1710]);
B("awning-post-0", [70, 70, 840], [-820, 300, 1290]);
B("awning-post-1", [70, 70, 840], [820, 300, 1290]);

return p.model();
