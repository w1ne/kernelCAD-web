// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-transformer-fire-wall",
  license: "CC0-1.0",
  title: "Transformer fire wall",
  description: "Segmented fire separation wall on steel feet beside a transformer bay. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-transformer-fire-wall");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("panel-1", [1560, 500, 4136], [-2280, 0, 250]);
B("panel-foot-1", [1680.00, 700, 250], [-2280, 0, 0]);
B("panel-2", [1560, 500, 4136], [780, 0, 250]);
B("panel-foot-2", [1680.00, 700, 250], [780, 0, 0]);
B("panel-3", [1560, 500, 4136], [3840, 0, 250]);
B("panel-foot-3", [1680.00, 700, 250], [3840, 0, 0]);
B("panel-4", [1560, 500, 4136], [6900, 0, 250]);
B("panel-foot-4", [1680.00, 700, 250], [6900, 0, 0]);
B("top-cap", [6000, 540, 150], [0, 0, 4550]);

return p.model();
