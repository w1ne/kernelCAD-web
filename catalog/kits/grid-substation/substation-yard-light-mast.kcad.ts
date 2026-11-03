// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-yard-light-mast",
  license: "CC0-1.0",
  title: "Yard light mast",
  description: "Tall lighting mast with a projecting luminaire bracket and compact lamp housing. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-yard-light-mast");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base-plate", [800, 800, 300], [0, 0, 0]);
C("mast-pole", 6500, 115, [0, 0, 300]);
B("outreach-arm", [1160, 170, 160], [384, 0, 6180]);
B("luminaire", [576, 352, 220], [840, 0, 5960]);

return p.model();
