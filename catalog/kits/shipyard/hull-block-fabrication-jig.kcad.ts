// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "hull-block-fabrication-jig",
  license: "CC0-1.0",
  title: "Hull block fabrication jig",
  description: "Open box-section fixture with corner towers, transverse alignment beams, and replaceable block-contact pads. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#657c78", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("hull-block-fabrication-jig");

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

B("base-rail-0", [2700, 200, 190], [0, -1050, 95]);
B("base-rail-1", [2700, 200, 190], [0, 1050, 95]);
B("cross-rail-0", [180, 2200, 160], [-1000, 0, 190]);
B("cross-rail-1", [180, 2200, 160], [0, 0, 190]);
B("cross-rail-2", [180, 2200, 160], [1000, 0, 190]);
B("corner-tower-0", [220, 250, 1260], [-1150, -900, 900]);
B("corner-tower-1", [220, 250, 1260], [1150, -900, 900]);
B("corner-tower-2", [220, 250, 1260], [-1150, 900, 900]);
B("corner-tower-3", [220, 250, 1260], [1150, 900, 900]);
B("alignment-beam-0", [150, 2180, 180], [-930, 0, 1560]);
B("alignment-beam-1", [150, 2180, 180], [930, 0, 1560]);
B("contact-pad-0", [380, 420, 120], [-930, -730, 1710]);
B("contact-pad-1", [380, 420, 120], [930, -730, 1710]);
B("contact-pad-2", [380, 420, 120], [-930, 730, 1710]);
B("contact-pad-3", [380, 420, 120], [930, 730, 1710]);

return p.model();
