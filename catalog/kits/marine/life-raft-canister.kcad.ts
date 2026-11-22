// Life raft canister: A cylindrical raft canister is retained by two straps in a paired cradle. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "life-raft-canister",
  license: 'CC0-1.0',
  title: "Life raft canister",
  description: "Life raft canister: A cylindrical raft canister is retained by two straps in a paired cradle. Low-poly visualization prop. Material controls: painted fiberglass, nylon webbing, stainless steel.",
  tags: ["life raft canister", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedFiberglass = param('paintedFiberglass', '#d6a849', { label: 'Painted fiberglass' });
const nylonWebbing = param('nylonWebbing', '#314954', { label: 'Nylon webbing' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { paintedFiberglass: '#bb974e', nylonWebbing: '#445356', stainlessSteel: '#a9b1af' },
  highVisibility: { paintedFiberglass: '#e59b35' },
});
const p = assembly("life-raft-canister");
p.part("shell", (cylinder(520, 114, 12).rotate([0, 1, 0], 90).translate(-260, 0, 150)).translate(0, 0, 0).scale(scale).color(paintedFiberglass));
p.part("end-left", (sphere(114).translate(-260, 0, 150)).translate(0, 0, 0).scale(scale).color(paintedFiberglass));
p.part("end-right", (sphere(114).translate(260, 0, 150)).translate(0, 0, 0).scale(scale).color(paintedFiberglass));
p.part("strap-left", (box(30, 240, 240, true).translate(-170, 0, 150)).translate(0, 0, 0).scale(scale).color(nylonWebbing));
p.part("strap-right", (box(30, 240, 240, true).translate(170, 0, 150)).translate(0, 0, 0).scale(scale).color(nylonWebbing));
p.part("cradle-left", (box(650, 46, 30, true).translate(0, -92, 15)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("cradle-right", (box(650, 46, 30, true).translate(0, 92, 15)).translate(0, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
