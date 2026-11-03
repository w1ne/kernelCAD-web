// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "floating-drydock-pontoon-module",
  license: "CC0-1.0",
  title: "Floating drydock pontoon module",
  description: "Modular floating dock section with paired buoyancy tanks, a deck bridge, side fender blocks, and a boarding ladder. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "yard and dock operations"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#728985", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("floating-drydock-pontoon-module");

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

B("pontoon-0", [1900, 470, 580], [0, -580, 290]);
B("pontoon-1", [1900, 470, 580], [0, 580, 290]);
B("deck-bridge", [1980, 870, 160], [0, 0, 660]);
B("fender-0", [240, 170, 420], [-650, -840, 580]);
B("fender-1", [240, 170, 420], [650, -840, 580]);
B("fender-2", [240, 170, 420], [-650, 840, 580]);
B("fender-3", [240, 170, 420], [650, 840, 580]);
B("ladder-rung-0", [420, 100, 75], [0, -845, 240]);
B("ladder-rung-1", [420, 100, 75], [0, -845, 470]);
B("ladder-rung-2", [420, 100, 75], [0, -845, 700]);
B("ladder-rung-3", [420, 100, 75], [0, -845, 930]);
B("ladder-side-left", [70, 100, 850], [-210, -845, 545]);
B("ladder-side-right", [70, 100, 850], [210, -845, 545]);

return p.model();
