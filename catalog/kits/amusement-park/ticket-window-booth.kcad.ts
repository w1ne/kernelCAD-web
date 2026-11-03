// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "ticket-window-booth",
  license: "CC0-1.0",
  title: "Ticket window booth",
  description: "Compact staffed entry booth with a deep transaction ledge, shuttered window, side door, and rain canopy. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#9c7550", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("ticket-window-booth");

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

B("booth-body", [1500, 1050, 1900], [0, 0, 950]);
B("front-counter", [1600, 240, 190], [0, -620, 1030]);
B("window-frame", [780, 70, 570], [0, -545, 1490]);
B("window-sill", [930, 150, 65], [0, -625, 1190]);
B("service-shutter", [650, 35, 330], [0, -590, 1500]);
B("side-door", [400, 45, 1120], [520, 535, 570]);
B("canopy", [1780, 720, 110], [0, -80, 1990]);
B("step", [620, 350, 90], [0, -700, 45]);

return p.model();
