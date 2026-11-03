// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-oil-containment-bund",
  license: "CC0-1.0",
  title: "Oil containment bund",
  description: "Low perimeter containment curb with internal drain sump and grated center panels. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-oil-containment-bund");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("base-slab", [7200, 5200, 180], [0, 0, 0]);
B("curb-front", [7200, 190, 470], [0, -2505, 180]);
B("curb-back", [7200, 190, 470], [0, 2505, 180]);
B("curb-left", [190, 5200, 470], [-3505, 0, 180]);
B("curb-right", [190, 5200, 470], [3505, 0, 180]);
B("drain-sump", [1224, 936, 160], [2232, 1508, 180]);
B("grate-panel-1", [864, 3640.00, 45], [-2448, 0, 181]);
B("grate-panel-2", [864, 3640.00, 45], [-504.00, 0, 181]);
B("grate-panel-3", [864, 3640.00, 45], [1440.00, 0, 181]);
B("grate-panel-4", [864, 3640.00, 45], [3384, 0, 181]);
B("grate-panel-5", [864, 3640.00, 45], [5328.00, 0, 181]);
B("grate-panel-6", [864, 3640.00, 45], [7272, 0, 181]);

return p.model();
