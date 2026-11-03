// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-live-tank-breaker",
  license: "CC0-1.0",
  title: "Live tank circuit breaker",
  description: "Three upright interrupter poles on a common frame with overhead terminal arms. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-live-tank-breaker");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("breaker-base", [2600, 1100, 300], [0, 0, 0]);
C("interrupter-pole-1", 2652, 175, [-754, 0, 300]);
B("terminal-arm-1", [520, 180, 150], [-754, 0, 3660]);
C("interrupter-pole-2", 2652, 175, [0, 0, 300]);
B("terminal-arm-2", [520, 180, 150], [0, 0, 3660]);
C("interrupter-pole-3", 2652, 175, [754, 0, 300]);
B("terminal-arm-3", [520, 180, 150], [754, 0, 3660]);
B("mechanism-cabinet", [598, 440, 1482], [676, 0, 300]);
B("terminal-link", [2288, 150, 170], [0, -308.00, 3690]);

return p.model();
