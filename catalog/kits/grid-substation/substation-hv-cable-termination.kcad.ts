// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-hv-cable-termination",
  license: "CC0-1.0",
  title: "High voltage cable termination",
  description: "Cable termination pedestal with a stepped insulator body and flared top fitting. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-hv-cable-termination");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base", [920, 920, 210], [0, 0, 0]);
C("cable-riser", 833.00, 147.20, [0, 0, 210]);
C("stress-cone-shed-1", 100, 266.80, [0, 0, 833.00]);
C("stress-cone-shed-2", 100, 220.80, [0, 0, 1029]);
C("stress-cone-shed-3", 100, 266.80, [0, 0, 1225]);
C("stress-cone-shed-4", 100, 220.80, [0, 0, 1421.00]);
C("stress-cone-shed-5", 100, 266.80, [0, 0, 1617]);
C("stress-cone-shed-6", 100, 220.80, [0, 0, 1813]);
B("terminal-pad", [460, 441.60, 170], [0, 0, 2280]);
B("cable-clamp", [386.40, 386.40, 180], [0, 0, 230]);

return p.model();
