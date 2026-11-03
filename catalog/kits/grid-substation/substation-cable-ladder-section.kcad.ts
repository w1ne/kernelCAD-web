// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-cable-ladder-section",
  license: "CC0-1.0",
  title: "Cable ladder section",
  description: "Open cable ladder with twin stringers, evenly spaced rungs, and support feet. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-cable-ladder-section");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("stringer-left", [3000, 130, 500], [0, -281.25, 0]);
B("stringer-right", [3000, 130, 500], [0, 281.25, 0]);
B("rung-1", [95, 570, 90], [-1350, 0, 160]);
B("rung-2", [95, 570, 90], [-900, 0, 160]);
B("rung-3", [95, 570, 90], [-450, 0, 160]);
B("rung-4", [95, 570, 90], [0, 0, 160]);
B("rung-5", [95, 570, 90], [450, 0, 160]);
B("rung-6", [95, 570, 90], [900, 0, 160]);
B("rung-7", [95, 570, 90], [1350, 0, 160]);
B("rung-8", [95, 570, 90], [1800, 0, 160]);
B("rung-9", [95, 570, 90], [2250, 0, 160]);
B("rung-10", [95, 570, 90], [2700, 0, 160]);
B("rung-11", [95, 570, 90], [3150, 0, 160]);
B("rung-12", [95, 570, 90], [3600, 0, 160]);
B("rung-13", [95, 570, 90], [4050, 0, 160]);
B("support-foot", [240, 285, 160], [-975, 0, 0]);
B("support-foot-2", [240, 285, 160], [975, 0, 0]);

return p.model();
