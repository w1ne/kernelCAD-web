// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-gas-insulated-breaker-module",
  license: "CC0-1.0",
  title: "Gas insulated breaker module",
  description: "Compact enclosed switching module with three short bushings and an operator cabinet. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-gas-insulated-breaker-module");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("enclosure-base", [3300, 1300, 340], [0, 0, 0]);
B("sealed-enclosure", [2508, 936, 1196], [0, 0, 340]);
C("bushing-1", 851, 125, [-990, 0, 1679]);
B("terminal-1", [230, 260, 170], [-990, 0, 2120]);
C("bushing-2", 851, 125, [0, 0, 1679]);
B("terminal-2", [230, 260, 170], [0, 0, 2120]);
C("bushing-3", 851, 125, [990, 0, 1679]);
B("terminal-3", [230, 260, 170], [990, 0, 2120]);
B("service-cabinet", [759, 442.00, 1311], [693, 0, 340]);

return p.model();
