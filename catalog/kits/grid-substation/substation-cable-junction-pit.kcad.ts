// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-cable-junction-pit",
  license: "CC0-1.0",
  title: "Cable junction pit",
  description: "Square pull pit with a raised rim, removable cover, and four side conduit stubs. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-cable-junction-pit");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("pit-floor", [1500, 1450, 180], [0, 0, 0]);
B("wall-front", [1500, 180, 820], [0, -635, 180]);
B("wall-back", [1500, 180, 820], [0, 635, 180]);
B("wall-left", [180, 1450, 820], [-660, 0, 180]);
B("wall-right", [180, 1450, 820], [660, 0, 180]);
B("cover", [1260, 1218, 130], [0, 0, 870]);
B("conduit-stub", [300, 160, 180], [-750, 0, 260]);
B("conduit-stub-2", [300, 160, 180], [750, 0, 260]);

return p.model();
