// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "modular-axle-carrier",
  license: "CC0-1.0",
  title: "Modular axle carrier",
  description: "Short modular transporter unit with a central load deck, paired axle beams, eight wheels, and side control boxes. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "block and material movement"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#71837d", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("modular-axle-carrier");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};
const C = (name: string, height: number, radius: number, at: [number, number, number], rotation: [number, number, number] = [0, 0, 0], segments = 10) => {
  let shape = cylinder(height, radius, segments);
  if (rotation[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("load-deck", [2100, 1250, 220], [0, 0, 430]);
B("axle-beam-0", [280, 1550, 240], [-700, 0, 170]);
B("axle-beam-1", [280, 1550, 240], [700, 0, 170]);
C("wheel-0", 180, 170, [-700, -620, 170], [90, 0, 0], 10);
C("wheel-1", 180, 170, [-700, -210, 170], [90, 0, 0], 10);
C("wheel-2", 180, 170, [-700, 210, 170], [90, 0, 0], 10);
C("wheel-3", 180, 170, [-700, 620, 170], [90, 0, 0], 10);
C("wheel-4", 180, 170, [700, -620, 170], [90, 0, 0], 10);
C("wheel-5", 180, 170, [700, -210, 170], [90, 0, 0], 10);
C("wheel-6", 180, 170, [700, 210, 170], [90, 0, 0], 10);
C("wheel-7", 180, 170, [700, 620, 170], [90, 0, 0], 10);
B("control-box-0", [270, 360, 340], [-720, -790, 710]);
B("control-box-1", [270, 360, 340], [720, -790, 710]);
B("coupling-pin", [180, 180, 360], [0, 780, 650]);

return p.model();
