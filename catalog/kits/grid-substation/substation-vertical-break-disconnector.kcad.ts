// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-vertical-break-disconnector",
  license: "CC0-1.0",
  title: "Vertical break disconnector",
  description: "Vertical break switch with elevated blade pivots and three visible phase positions. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-vertical-break-disconnector");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base-frame", [3500, 1050, 220], [0, 0, 0]);
C("phase-1-support--1", 1650.00, 95, [-980.00, -231, 220]);
C("phase-1-insulator--1", 570, 145, [-980.00, -231, 1650.00]);
C("phase-1-support-1", 1650.00, 95, [-980.00, 231, 220]);
C("phase-1-insulator-1", 570, 145, [-980.00, 231, 1650.00]);
B("phase-1-blade", [945.00, 115, 110], [-980.00, 0, 2490]);
C("phase-2-support--1", 1650.00, 95, [0, -231, 220]);
C("phase-2-insulator--1", 570, 145, [0, -231, 1650.00]);
C("phase-2-support-1", 1650.00, 95, [0, 231, 220]);
C("phase-2-insulator-1", 570, 145, [0, 231, 1650.00]);
B("phase-2-blade", [945.00, 115, 110], [0, 0, 2490]);
C("phase-3-support--1", 1650.00, 95, [980.00, -231, 220]);
C("phase-3-insulator--1", 570, 145, [980.00, -231, 1650.00]);
C("phase-3-support-1", 1650.00, 95, [980.00, 231, 220]);
C("phase-3-insulator-1", 570, 145, [980.00, 231, 1650.00]);
B("phase-3-blade", [945.00, 115, 110], [980.00, 0, 2490]);
B("drive-cabinet", [630, 315, 1020.00], [-1260, 0, 220]);
B("operating-link", [2170, 95, 90], [0, 399, 1260]);

return p.model();
