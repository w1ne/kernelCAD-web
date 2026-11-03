// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "condiment-counter",
  license: "CC0-1.0",
  title: "Condiment counter",
  description: "Park dining condiment station with four bottle wells, napkin cubbies, tray return, and a wipe-clean top. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#927b61", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("condiment-counter");

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

B("cabinet", [1850, 720, 900], [0, 0, 450]);
B("top", [1980, 820, 100], [0, 0, 950]);
B("napkin-holder-left", [430, 340, 310], [-590, -70, 1160]);
B("napkin-holder-right", [430, 340, 310], [590, -70, 1160]);
C("sauce-bottle-0", 330, 82, [-350, -190, 1170], [0, 0, 0], 8);
C("sauce-bottle-1", 330, 82, [-120, -190, 1170], [0, 0, 0], 8);
C("sauce-bottle-2", 330, 82, [120, -190, 1170], [0, 0, 0], 8);
C("sauce-bottle-3", 330, 82, [350, -190, 1170], [0, 0, 0], 8);
B("tray-return", [700, 580, 110], [0, 650, 100]);
B("splash-guard", [1710, 55, 260], [0, 355, 1120]);

return p.model();
