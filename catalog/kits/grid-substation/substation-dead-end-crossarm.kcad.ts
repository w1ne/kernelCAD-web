// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-dead-end-crossarm",
  license: "CC0-1.0",
  title: "Dead end crossarm support",
  description: "Tall steel support with a broad termination crossarm and suspended insulator points. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-dead-end-crossarm");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base-plate", [1305, 770.00, 280], [0, 0, 0]);
C("support-pole", 5920, 174, [0, 0, 280]);
B("termination-crossarm", [2900, 300, 260], [0, 0, 5520]);
B("lower-brace", [1798, 190, 180], [0, 0, 4820]);
C("hanging-insulator-1", 700, 78, [-1044, 0, 4820]);
C("hanging-insulator-2", 700, 78, [0, 0, 4820]);
C("hanging-insulator-3", 700, 78, [1044, 0, 4820]);

return p.model();
