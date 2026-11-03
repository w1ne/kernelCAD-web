// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-grading-ring-stand",
  license: "CC0-1.0",
  title: "Grading ring stand",
  description: "Tall grading ring and terminal support with a wide base and insulator stem. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-grading-ring-stand");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base", [986.00, 680, 220], [0, 0, 0]);
C("support", 1386, 105, [0, 0, 220]);
B("ring-side-left", [1450, 130, 130], [-217.50, 0, 1743]);
B("ring-side-right", [1450, 130, 130], [217.50, 0, 1743]);
B("ring-top", [899, 620, 130], [0, 0, 1953]);
B("terminal", [230, 230, 170], [0, 0, 1930]);

return p.model();
