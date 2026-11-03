// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "hull-panel-cutting-table",
  license: "CC0-1.0",
  title: "Hull panel cutting table",
  description: "Slatted cutting bed on a rigid underframe with rail ends, replaceable slats, and a side cable tray. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#6e7f7d", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("hull-panel-cutting-table");

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

B("underframe", [2600, 1750, 250], [0, 0, 125]);
B("cutting-slat-0", [2520, 60, 640], [0, -800, 570]);
B("cutting-slat-1", [2520, 60, 640], [0, -640, 570]);
B("cutting-slat-2", [2520, 60, 640], [0, -480, 570]);
B("cutting-slat-3", [2520, 60, 640], [0, -320, 570]);
B("cutting-slat-4", [2520, 60, 640], [0, -160, 570]);
B("cutting-slat-5", [2520, 60, 640], [0, 0, 570]);
B("cutting-slat-6", [2520, 60, 640], [0, 160, 570]);
B("cutting-slat-7", [2520, 60, 640], [0, 320, 570]);
B("cutting-slat-8", [2520, 60, 640], [0, 480, 570]);
B("cutting-slat-9", [2520, 60, 640], [0, 640, 570]);
B("cutting-slat-10", [2520, 60, 640], [0, 800, 570]);
B("end-rail-0", [180, 1900, 170], [-1240, 0, 980]);
B("end-rail-1", [180, 1900, 170], [1240, 0, 980]);
B("cable-tray", [2350, 120, 110], [0, 940, 300]);

return p.model();
