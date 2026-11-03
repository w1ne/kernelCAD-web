// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-bay-identification-post",
  license: "CC0-1.0",
  title: "Bay identification post",
  description: "Yard post carrying a blank bay identifier panel for scene layout. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-bay-identification-post");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("post-left", [100, 100, 2011], [-114.40, 0, 0]);
B("post-right", [100, 100, 2011], [114.40, 0, 0]);
B("sign-plate", [520, 120, 231.00], [0, 0, 1914.40]);
B("lower-brace", [286, 100, 90], [0, 0, 1864]);

return p.model();
