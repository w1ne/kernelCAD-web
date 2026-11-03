// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "park-entry-arch",
  license: "CC0-1.0",
  title: "Park entry arch",
  description: "Freestanding entry portal with paired columns, overhead canopy, and a raised central crest. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d66d4d", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("park-entry-arch");

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
const S = (name: string, radius: number, at: [number, number, number]) => place(name, sphere(radius), at);

B("left-column", [220, 260, 2750], [-1060, 0, 1375]);
B("right-column", [220, 260, 2750], [1060, 0, 1375]);
B("header-beam", [2380, 320, 260], [0, 0, 2760]);
B("canopy", [2740, 640, 120], [0, 0, 2950]);
B("crest-plinth", [600, 230, 220], [0, -20, 3130]);
S("crest", 150, [0, -35, 3300]);
B("column-band-0", [275, 278, 55], [-1060, 0, 420]);
B("column-band-1", [275, 278, 55], [1060, 0, 950]);

return p.model();
