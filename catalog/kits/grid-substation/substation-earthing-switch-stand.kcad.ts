// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-earthing-switch-stand",
  license: "CC0-1.0",
  title: "Earthing switch stand",
  description: "Grounding switch stand with a short operating blade and grounded support base. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-earthing-switch-stand");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base-frame", [1700, 900, 220], [0, 0, 0]);
C("phase-1-support--1", 990.00, 95, [0, -198, 220]);
C("phase-1-insulator--1", 342, 145, [0, -198, 990.00]);
C("phase-1-support-1", 990.00, 95, [0, 198, 220]);
C("phase-1-insulator-1", 342, 145, [0, 198, 990.00]);
B("phase-1-blade", [459.00, 115, 110], [0, 0, 1350]);
B("drive-cabinet", [306, 270, 612], [-612, 0, 220]);
B("operating-link", [1054, 95, 90], [0, 342, 756]);

return p.model();
