// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-line-trap",
  license: "CC0-1.0",
  title: "Line trap",
  description: "Hollow coil assembly suspended from a compact support frame above the bus. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-line-trap");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("support-frame", [1702, 684, 220], [0, 0, 0]);
B("end-support-left", [180, 450, 1015.00], [-629, 0, 220]);
B("end-support-right", [180, 450, 1015.00], [629, 0, 220]);
C("coil-turn-1", 899, 666, [0, 0, 250]);
C("coil-turn-2", 899, 601.25, [0, 0, 292]);
C("coil-turn-3", 899, 536.50, [0, 0, 334]);
C("coil-turn-4", 899, 471.75, [0, 0, 376]);
C("coil-turn-5", 899, 407.00, [0, 0, 418]);
B("terminal-pad-left", [300, 340, 150], [-758.50, 0, 1300]);
B("terminal-pad-right", [300, 340, 150], [758.50, 0, 1300]);

return p.model();
