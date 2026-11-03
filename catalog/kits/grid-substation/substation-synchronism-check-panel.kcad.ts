// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-synchronism-check-panel",
  license: "CC0-1.0",
  title: "Synchronism check panel",
  description: "Narrow panel cabinet with a large meter window and grouped control buttons. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-synchronism-check-panel");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("panel-plinth", [1600, 720, 220], [0, 0, 0]);
B("panel-body", [1520, 612, 1770], [0, 0, 220]);
B("panel-cap", [1632, 662.40, 110], [0, 0, 1990]);
B("meter-window", [768, 80, 588], [0, -316.80, 1260]);
B("button-rail", [1216, 85, 95], [0, -316.80, 714]);
B("button-1", [60, 80, 75], [-480, -345.60, 714]);
B("button-2", [60, 80, 75], [-240, -345.60, 714]);
B("button-3", [60, 80, 75], [0, -345.60, 714]);
B("button-4", [60, 80, 75], [240, -345.60, 714]);
B("button-5", [60, 80, 75], [480, -345.60, 714]);

return p.model();
