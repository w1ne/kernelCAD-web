// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-main-power-transformer",
  license: "CC0-1.0",
  title: "Main power transformer",
  description: "Large transformer tank with cooler banks, bushings, conservator, and transport base. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-main-power-transformer");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};
const CY = (name: string, length: number, radius: number, at: [number, number, number]) => {
  const shape = cylinder(length, radius, 10).rotate([1, 0, 0], 90);
  place(name, shape, [at[0], at[1] + length / 2, at[2] + radius]);
};

B("transport-base", [6400, 3276, 320], [0, 0, 0]);
B("main-tank", [3968, 2574, 2916], [0, 0, 320]);
B("tank-cover", [4206.08, 2728.44, 180], [0, 0, 3236]);
B("cooler-fin-left-1", [100, 780, 2274.48], [-2460.16, 0, 430]);
B("cooler-fin-right-1", [100, 780, 2274.48], [2460.16, 0, 430]);
B("cooler-fin-left-2", [100, 780, 2274.48], [-2460.16, 0, 430]);
B("cooler-fin-right-2", [100, 780, 2274.48], [2460.16, 0, 430]);
B("cooler-fin-left-3", [100, 780, 2274.48], [-2460.16, 0, 430]);
B("cooler-fin-right-3", [100, 780, 2274.48], [2460.16, 0, 430]);
B("cooler-fin-left-4", [100, 780, 2274.48], [-2460.16, 0, 430]);
B("cooler-fin-right-4", [100, 780, 2274.48], [2460.16, 0, 430]);
B("cooler-fin-left-5", [100, 780, 2274.48], [-2460.16, 0, 430]);
B("cooler-fin-right-5", [100, 780, 2274.48], [2460.16, 0, 430]);
B("cooler-fin-left-6", [100, 780, 2274.48], [-2460.16, 0, 430]);
B("cooler-fin-right-6", [100, 780, 2274.48], [2460.16, 0, 430]);
B("cooler-fin-left-7", [100, 780, 2274.48], [-2460.16, 0, 430]);
B("cooler-fin-right-7", [100, 780, 2274.48], [2460.16, 0, 430]);
B("conservator", [2460.16, 720.72, 280], [0, -1235.52, 4536]);
B("conservator-pipe", [180, 411.84, 1512.00], [0, -900.90, 3240]);
C("bushing-1", 1296, 145, [-1349.12, 308.88, 3416]);
C("bushing-2", 1296, 145, [-476.16, 308.88, 3416]);
C("bushing-3", 1296, 145, [396.80, 308.88, 3416]);
C("bushing-4", 1296, 145, [1269.76, 308.88, 3416]);
CY("transport-wheel", 260, 205, [-1984, -1131, 0]);
CY("transport-wheel-2", 260, 205, [-1984, 1131, 0]);
CY("transport-wheel-3", 260, 205, [1984, -1131, 0]);
CY("transport-wheel-4", 260, 205, [1984, 1131, 0]);

return p.model();
