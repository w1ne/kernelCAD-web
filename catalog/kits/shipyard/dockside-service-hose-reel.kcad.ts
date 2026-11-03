// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "dockside-service-hose-reel",
  license: "CC0-1.0",
  title: "Dockside service hose reel",
  description: "Quay-side hose station with a large drum, guarded side plates, swivel base, and outlet standpipe. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "outfitting and yard services"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#72827c", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("dockside-service-hose-reel");

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

B("base-plinth", [1160, 980, 180], [0, 0, 90]);
C("reel-side-plate-0", 110, 520, [0, -400, 820], [90, 0, 0], 16);
C("reel-side-plate-1", 110, 520, [0, 400, 820], [90, 0, 0], 16);
C("reel-drum", 620, 360, [0, 0, 820], [90, 0, 0], 16);
B("outlet-pipe", [150, 150, 620], [560, 0, 490]);
B("handle", [120, 780, 100], [470, 0, 1200]);
B("hose-guide", [120, 170, 380], [640, 0, 960]);

return p.model();
