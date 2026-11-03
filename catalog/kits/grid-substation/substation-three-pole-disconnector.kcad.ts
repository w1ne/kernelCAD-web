// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-three-pole-disconnector",
  license: "CC0-1.0",
  title: "Three pole disconnector",
  description: "Three phase outdoor disconnector with a shared base and visible blade arms. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-three-pole-disconnector");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base-frame", [3900, 1100, 220], [0, 0, 0]);
C("phase-1-support--1", 1320, 95, [-1092, -242, 220]);
C("phase-1-insulator--1", 456, 145, [-1092, -242, 1320]);
C("phase-1-support-1", 1320, 95, [-1092, 242, 220]);
C("phase-1-insulator-1", 456, 145, [-1092, 242, 1320]);
B("phase-1-blade", [1053, 115, 110], [-1092, 0, 1800]);
C("phase-2-support--1", 1320, 95, [0, -242, 220]);
C("phase-2-insulator--1", 456, 145, [0, -242, 1320]);
C("phase-2-support-1", 1320, 95, [0, 242, 220]);
C("phase-2-insulator-1", 456, 145, [0, 242, 1320]);
B("phase-2-blade", [1053, 115, 110], [0, 0, 1800]);
C("phase-3-support--1", 1320, 95, [1092, -242, 220]);
C("phase-3-insulator--1", 456, 145, [1092, -242, 1320]);
C("phase-3-support-1", 1320, 95, [1092, 242, 220]);
C("phase-3-insulator-1", 456, 145, [1092, 242, 1320]);
B("phase-3-blade", [1053, 115, 110], [1092, 0, 1800]);
B("drive-cabinet", [702, 330, 816.00], [-1404, 0, 220]);
B("operating-link", [2418, 95, 90], [0, 418, 1008]);

return p.model();
