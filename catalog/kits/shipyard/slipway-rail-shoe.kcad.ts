// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "slipway-rail-shoe",
  license: "CC0-1.0",
  title: "Slipway rail shoe",
  description: "Short paired launch-way rails on timber sleepers with replaceable guide shoes and a stop block. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "yard and dock operations"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#75827c", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("slipway-rail-shoe");

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

B("rail-0", [2300, 120, 190], [0, -440, 220]);
B("rail-1", [2300, 120, 190], [0, 440, 220]);
B("sleeper-0", [220, 1120, 170], [-900, 0, 85]);
B("sleeper-1", [220, 1120, 170], [-300, 0, 85]);
B("sleeper-2", [220, 1120, 170], [300, 0, 85]);
B("sleeper-3", [220, 1120, 170], [900, 0, 85]);
B("wear-shoe-0", [850, 170, 55], [-600, -440, 345]);
B("wear-shoe-1", [850, 170, 55], [600, -440, 345]);
B("wear-shoe-2", [850, 170, 55], [-600, 440, 345]);
B("wear-shoe-3", [850, 170, 55], [600, 440, 345]);
B("end-stop", [180, 1120, 320], [1080, 0, 440]);

return p.model();
