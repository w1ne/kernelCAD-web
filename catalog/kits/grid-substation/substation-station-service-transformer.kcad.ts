// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-station-service-transformer",
  license: "CC0-1.0",
  title: "Station service transformer",
  description: "Compact auxiliary transformer with a simplified tank, bushings, and cooling fins. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-station-service-transformer");

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

B("transport-base", [2600, 1764, 320], [0, 0, 0]);
B("main-tank", [1612, 1386, 1728], [0, 0, 320]);
B("tank-cover", [1708.72, 1469.16, 180], [0, 0, 2048]);
B("cooler-fin-left-1", [100, 420, 1347.84], [-999.44, 0, 430]);
B("cooler-fin-right-1", [100, 420, 1347.84], [999.44, 0, 430]);
B("cooler-fin-left-2", [100, 420, 1347.84], [-999.44, 0, 430]);
B("cooler-fin-right-2", [100, 420, 1347.84], [999.44, 0, 430]);
B("cooler-fin-left-3", [100, 420, 1347.84], [-999.44, 0, 430]);
B("cooler-fin-right-3", [100, 420, 1347.84], [999.44, 0, 430]);
B("cooler-fin-left-4", [100, 420, 1347.84], [-999.44, 0, 430]);
B("cooler-fin-right-4", [100, 420, 1347.84], [999.44, 0, 430]);
B("cooler-fin-left-5", [100, 420, 1347.84], [-999.44, 0, 430]);
B("cooler-fin-right-5", [100, 420, 1347.84], [999.44, 0, 430]);
B("cooler-fin-left-6", [100, 420, 1347.84], [-999.44, 0, 430]);
B("cooler-fin-right-6", [100, 420, 1347.84], [999.44, 0, 430]);
B("cooler-fin-left-7", [100, 420, 1347.84], [-999.44, 0, 430]);
B("cooler-fin-right-7", [100, 420, 1347.84], [999.44, 0, 430]);
B("conservator", [999.44, 388.08, 280], [0, -665.28, 2688]);
B("conservator-pipe", [180, 221.76, 896.00], [0, -485.10, 1920]);
C("bushing-1", 640, 145, [-548.08, 166.32, 2228]);
C("bushing-2", 640, 145, [-193.44, 166.32, 2228]);
C("bushing-3", 640, 145, [161.20, 166.32, 2228]);
C("bushing-4", 640, 145, [515.84, 166.32, 2228]);
CY("transport-wheel", 260, 205, [-806, -609, 0]);
CY("transport-wheel-2", 260, 205, [-806, 609, 0]);
CY("transport-wheel-3", 260, 205, [806, -609, 0]);
CY("transport-wheel-4", 260, 205, [806, 609, 0]);

return p.model();
