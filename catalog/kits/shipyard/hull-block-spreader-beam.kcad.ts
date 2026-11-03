// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "hull-block-spreader-beam",
  license: "CC0-1.0",
  title: "Hull block spreader beam",
  description: "Generic lifting spreader with a central beam, four adjustable drop links, and soft-contact end shoes. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "block and material movement"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#78827a", { label: "Asset color" });
const originOffsetMm = -360;
const p = assembly("hull-block-spreader-beam");

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

B("main-beam", [3100, 260, 300], [0, 0, 1500]);
B("lifting-lug-0", [260, 240, 420], [-1150, 0, 1860]);
B("lifting-lug-1", [260, 240, 420], [1150, 0, 1860]);
B("drop-link-0", [110, 110, 980], [-1320, -580, 1000]);
B("drop-link-1", [110, 110, 980], [-1320, 580, 1000]);
B("drop-link-2", [110, 110, 980], [1320, -580, 1000]);
B("drop-link-3", [110, 110, 980], [1320, 580, 1000]);
B("contact-shoe-0", [500, 420, 160], [-1320, -580, 440]);
B("contact-shoe-1", [500, 420, 160], [-1320, 580, 440]);
B("contact-shoe-2", [500, 420, 160], [1320, -580, 440]);
B("contact-shoe-3", [500, 420, 160], [1320, 580, 440]);
C("shackle-pin-0", 320, 80, [-1150, 0, 1990], [90, 0, 0], 10);
C("shackle-pin-1", 320, 80, [1150, 0, 1990], [90, 0, 0], 10);

return p.model();
