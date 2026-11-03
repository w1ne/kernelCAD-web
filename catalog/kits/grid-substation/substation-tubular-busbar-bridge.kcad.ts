// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-tubular-busbar-bridge",
  license: "CC0-1.0",
  title: "Tubular busbar bridge",
  description: "Raised busbar span with paired support columns and insulator stacks. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-tubular-busbar-bridge");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base-left", [520, 720, 240], [-1610, 0, 0]);
C("support-left", 1600, 95, [-1610, 0, 240]);
C("insulator-left", 420, 145, [-1610, 0, 1840]);
B("base-right", [520, 720, 240], [1610, 0, 0]);
C("support-right", 1600, 95, [1610, 0, 240]);
C("insulator-right", 420, 145, [1610, 0, 1840]);
B("bus-span", [4600, 220, 220], [0, 0, 2040]);
B("terminal-left", [260, 400, 220], [-2170, 0, 2000]);
B("terminal-right", [260, 400, 220], [2170, 0, 2000]);

return p.model();
