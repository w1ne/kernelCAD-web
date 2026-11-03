// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "height-check-marker",
  license: "CC0-1.0",
  title: "Rider height check marker",
  description: "Queue entry height guide with two graduated side posts, an overhead bar, and a free-standing base. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d0a44f", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("height-check-marker");

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

B("left-foot", [350, 460, 100], [-450, 0, 50]);
B("right-foot", [350, 460, 100], [450, 0, 50]);
B("left-post", [100, 110, 2050], [-450, 0, 1125]);
B("right-post", [100, 110, 2050], [450, 0, 1125]);
B("top-bar", [1000, 150, 130], [0, 0, 2170]);
B("graduation-0", [230, 40, 38], [-315, -64, 450]);
B("graduation-1", [230, 40, 38], [-315, -64, 590]);
B("graduation-2", [230, 40, 38], [-315, -64, 730]);
B("graduation-3", [230, 40, 38], [-315, -64, 870]);
B("graduation-4", [230, 40, 38], [-315, -64, 1010]);
B("graduation-5", [230, 40, 38], [-315, -64, 1150]);
B("graduation-6", [230, 40, 38], [-315, -64, 1290]);
B("graduation-7", [230, 40, 38], [-315, -64, 1430]);
B("graduation-8", [230, 40, 38], [-315, -64, 1570]);
B("graduation-9", [230, 40, 38], [-315, -64, 1710]);
B("marker-cap", [420, 60, 175], [-450, -80, 2210]);

return p.model();
