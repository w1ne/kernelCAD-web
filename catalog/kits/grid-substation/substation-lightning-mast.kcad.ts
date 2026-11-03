// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-lightning-mast",
  license: "CC0-1.0",
  title: "Lightning protection mast",
  description: "Freestanding pointed mast with a compact upper crossarm and wide footing. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-lightning-mast");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("foundation", [623.20, 623.20, 420], [0, 0, 0]);
C("mast-shaft", 10380, 100, [0, 0, 420]);
B("main-crossarm", [1722, 260, 220], [0, 0, 9870]);
B("upper-crossarm", [1189, 220, 180], [0, 0, 9250]);
C("crossarm-insulator-1", 450, 92, [-754.40, 0, 9420]);
C("crossarm-insulator-2", 450, 92, [0, 0, 9420]);
C("crossarm-insulator-3", 450, 92, [754.40, 0, 9420]);
C("pointed-tip", 700, 34, [0, 0, 10100]);

return p.model();
