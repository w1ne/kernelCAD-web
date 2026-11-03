// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "family-locker-bank",
  license: "CC0-1.0",
  title: "Family locker bank",
  description: "Six-door day-use locker unit with recessed-looking door panels, toe kick, and numbered header strip. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#728b80", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("family-locker-bank");

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

B("locker-case", [2300, 640, 1840], [0, 0, 920]);
B("toe-kick", [2330, 670, 130], [0, 0, 65]);
B("top-header", [2360, 700, 170], [0, 0, 1945]);
B("locker-door-0", [350, 35, 760], [-875, -340, 500]);
B("locker-door-1", [350, 35, 760], [0, -340, 500]);
B("locker-door-2", [350, 35, 760], [875, -340, 500]);
B("locker-door-3", [350, 35, 760], [-875, -340, 1350]);
B("locker-door-4", [350, 35, 760], [0, -340, 1350]);
B("locker-door-5", [350, 35, 760], [875, -340, 1350]);
B("locker-handle-0", [45, 50, 150], [-730, -385, 500]);
B("locker-handle-1", [45, 50, 150], [145, -385, 500]);
B("locker-handle-2", [45, 50, 150], [1020, -385, 500]);
B("locker-handle-3", [45, 50, 150], [-730, -385, 1350]);
B("locker-handle-4", [45, 50, 150], [145, -385, 1350]);
B("locker-handle-5", [45, 50, 150], [1020, -385, 1350]);

return p.model();
