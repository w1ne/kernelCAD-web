// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-ground-bar-pedestal",
  license: "CC0-1.0",
  title: "Ground bar pedestal",
  description: "Insulated support stand carrying a long horizontal equipotential ground bar. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-ground-bar-pedestal");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("base", [1440, 620, 200], [0, 0, 0]);
B("insulating-support-left", [220, 220, 667], [-496, 0, 200]);
B("insulating-support-right", [220, 220, 667], [496, 0, 200]);
B("ground-bar", [1600, 180, 180], [0, 0, 828]);
B("connection-pad-1", [150, 280, 110], [-576, 0, 989]);
B("connection-pad-2", [150, 280, 110], [0, 0, 989]);
B("connection-pad-3", [150, 280, 110], [576, 0, 989]);
B("connection-pad-4", [150, 280, 110], [1152, 0, 989]);
B("connection-pad-5", [150, 280, 110], [1728, 0, 989]);

return p.model();
