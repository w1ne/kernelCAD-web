// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "popcorn-warmer-kiosk",
  license: "CC0-1.0",
  title: "Popcorn warmer kiosk",
  description: "Countertop popcorn service kiosk with a tall warming case, serving shelf, and striped rain canopy. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d29a52", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("popcorn-warmer-kiosk");

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

B("counter", [1550, 1050, 840], [0, 0, 420]);
B("warmer-base", [920, 740, 240], [0, -80, 960]);
B("warming-case", [920, 740, 900], [0, -80, 1530]);
B("case-roof", [1050, 850, 90], [0, -80, 2010]);
B("serving-shelf", [1820, 480, 120], [0, -420, 900]);
B("awning", [1950, 1300, 100], [0, 0, 2370]);
B("awning-post-0", [70, 70, 1250], [-870, 500, 1750]);
B("awning-post-1", [70, 70, 1250], [870, 500, 1750]);
B("awning-post-2", [70, 70, 1250], [-870, -500, 1750]);
B("awning-post-3", [70, 70, 1250], [870, -500, 1750]);

return p.model();
