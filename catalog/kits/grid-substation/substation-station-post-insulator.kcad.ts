// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-station-post-insulator",
  license: "CC0-1.0",
  title: "Station post insulator",
  description: "Schematic ribbed post insulator on a broad mounting foot for yard equipment. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-station-post-insulator");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("mounting-foot", [440, 440, 160], [0, 0, 0]);
C("core", 1000, 79.20, [0, 0, 160]);
C("shed-1", 90, 167.20, [0, 0, 250]);
C("shed-2", 90, 167.20, [0, 0, 396]);
C("shed-3", 90, 167.20, [0, 0, 542]);
C("shed-4", 90, 167.20, [0, 0, 688]);
C("shed-5", 90, 167.20, [0, 0, 834]);
C("shed-6", 90, 167.20, [0, 0, 980]);
B("top-cap", [272.80, 272.80, 145], [0, 0, 1205]);

return p.model();
