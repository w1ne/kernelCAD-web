// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-portable-work-canopy",
  license: "CC0-1.0",
  title: "Portable work canopy",
  description: "Freestanding maintenance canopy with four posts, roof beams, and braced corners. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-portable-work-canopy");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("canopy-post", [170, 170, 2800], [-1722, -1170, 0]);
B("canopy-post-2", [170, 170, 2800], [-1722, 1170, 0]);
B("canopy-post-3", [170, 170, 2800], [1722, -1170, 0]);
B("canopy-post-4", [170, 170, 2800], [1722, 1170, 0]);
B("roof-frame-front", [4200, 220, 180], [0, -1170, 2800]);
B("roof-frame-back", [4200, 220, 180], [0, 1170, 2800]);
B("roof-frame-left", [220, 2340, 180], [-1722, 0, 2800]);
B("roof-frame-right", [220, 2340, 180], [1722, 0, 2800]);
B("roof-cover", [4536, 3240, 180], [0, 0, 2920]);
B("corner-brace", [630, 130, 130], [-1596, -825.00, 1736.00]);
B("corner-brace-2", [630, 130, 130], [1596, -825.00, 1736.00]);

return p.model();
