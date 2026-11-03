// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "character-meet-backdrop",
  license: "CC0-1.0",
  title: "Character meet-and-greet backdrop",
  description: "Photo-op backdrop with a decorative portal, shallow stage, curtain wings, and two waiting marks. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#a47783", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("character-meet-backdrop");

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

B("stage", [2400, 1200, 180], [0, 0, 90]);
B("backdrop", [2050, 130, 1770], [0, 480, 1065]);
B("portal-left", [220, 170, 1660], [-650, 360, 1010]);
B("portal-right", [220, 170, 1660], [650, 360, 1010]);
B("portal-top", [1510, 170, 230], [0, 360, 1900]);
B("curtain-wing-0", [260, 160, 1580], [-1060, 300, 890], [0, 0, -7]);
B("curtain-wing-1", [260, 160, 1580], [1060, 300, 890], [0, 0, 7]);
C("waiting-mark-0", 35, 240, [-620, -650, 18]);
C("waiting-mark-1", 35, 240, [620, -650, 18]);

return p.model();
