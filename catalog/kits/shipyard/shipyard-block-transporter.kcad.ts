// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "shipyard-block-transporter",
  license: "CC0-1.0",
  title: "Shipyard block transporter",
  description: "Low heavy-haul platform with a reinforced deck, wheel bogies, guide posts, and a tractor coupling beam. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "block and material movement"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#c07842", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("shipyard-block-transporter");

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

B("transport-deck", [3100, 1680, 260], [0, 0, 500]);
B("bogie-frame-0", [620, 1840, 240], [-1080, 0, 210]);
B("bogie-frame-1", [620, 1840, 240], [1080, 0, 210]);
C("bogie-wheel-0", 220, 170, [-1110, -760, 170], [90, 0, 0], 12);
C("bogie-wheel-1", 220, 170, [-1110, -260, 170], [90, 0, 0], 12);
C("bogie-wheel-2", 220, 170, [-1110, 260, 170], [90, 0, 0], 12);
C("bogie-wheel-3", 220, 170, [-1110, 760, 170], [90, 0, 0], 12);
C("bogie-wheel-4", 220, 170, [1110, -760, 170], [90, 0, 0], 12);
C("bogie-wheel-5", 220, 170, [1110, -260, 170], [90, 0, 0], 12);
C("bogie-wheel-6", 220, 170, [1110, 260, 170], [90, 0, 0], 12);
C("bogie-wheel-7", 220, 170, [1110, 760, 170], [90, 0, 0], 12);
B("guide-post-0", [140, 140, 620], [-1450, -650, 940]);
B("guide-post-1", [140, 140, 620], [1450, -650, 940]);
B("guide-post-2", [140, 140, 620], [-1450, 650, 940]);
B("guide-post-3", [140, 140, 620], [1450, 650, 940]);
B("tractor-coupling", [720, 300, 180], [-1900, 0, 350]);

return p.model();
