// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-dead-tank-breaker",
  license: "CC0-1.0",
  title: "Dead tank circuit breaker",
  description: "Schematic dead tank breaker with three terminal bushings and a side operating cabinet. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-dead-tank-breaker");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("breaker-base", [3000, 1600, 300], [0, 0, 0]);
B("tank-pole-1", [660, 480, 1044], [-870.00, 0, 350]);
C("bushing-1", 986.00, 130, [-870.00, 0, 1798]);
B("tank-pole-2", [660, 480, 1044], [0, 0, 350]);
C("bushing-2", 986.00, 130, [0, 0, 1798]);
B("tank-pole-3", [660, 480, 1044], [870.00, 0, 350]);
C("bushing-3", 986.00, 130, [870.00, 0, 1798]);
B("mechanism-cabinet", [690, 640, 1102], [780, 0, 300]);
B("terminal-link", [2640, 150, 170], [0, -448.00, 2690]);

return p.model();
