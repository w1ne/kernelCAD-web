// SPDX-License-Identifier: CC0-1.0
// Low-poly, non-pressure-rated fire hose nozzle prop: actual open fluid passage and three distinct material bodies.
meta({
  name: "fire-hose-nozzle",
  license: 'CC0-1.0',
  title: "Fire hose nozzle (illustrative)",
  description: "Illustrative CC0 static fire hose nozzle with one connected drilled metal flow body, an open axial bore from hose coupling to fixed front tip, an annular selector sleeve and a separate pistol grip. Not pressure-rated or manufacturer-grade CAD: no working selector valve, spray pattern, threaded hose fit, metal grade, tolerances or flow certification. Scale and colors are visual controls.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0', 'scene prop'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const nozzleMetalColor = param('nozzleMetalColor', '#aeb8ba', { label: 'Metal body appearance' });
const selectorFinishColor = param('selectorFinishColor', '#d2ad3e', { label: 'Selector sleeve appearance' });
const gripRubberColor = param('gripRubberColor', '#303539', { label: 'Grip appearance' });
presets({
  weathered: { nozzleMetalColor: '#858f91', selectorFinishColor: '#9b7e37', gripRubberColor: '#41423f' },
  highVisibility: { nozzleMetalColor: '#c4c8b8', selectorFinishColor: '#eedb59', gripRubberColor: '#303539' },
});
const p = assembly('fire-hose-nozzle');
const axisX = (length: number, radius: number, x: number, segments = 12) =>
  cylinder(length, radius, segments).rotateY(90).translate(x, 0, 54);

// Physical identity: the inlet, smaller barrel and outlet are one metal flow body.
// Overlap adjacent solids before subtracting one common bore through every segment.
const outer = axisX(80.6, 45, -111.6)
  .union(axisX(155.7, 34, -40), axisX(55.8, 22, 99.2));
const passage = axisX(272, 14, -114, 12);
const continuousBarrel = outer.subtract(passage);
// Static separate sleeve around the barrel. Its clearance is illustrative only;
// it does not implement rotation, variable flow or fog pattern mechanics.
const selectorSleeve = axisX(18, 42, 60)
  .subtract(axisX(20, 34.3, 59));
// Separate rubber over-moulded pistol grip, intentionally seated into the barrel.
const pistolGrip = cylinder(36, 20, 8).translate(-15, 0, -12);
p.part('one-piece-continuous-flow-body', continuousBarrel.translate(0, 0, 12).scale(scale).color(nozzleMetalColor));
p.part('annular-static-selector-sleeve', selectorSleeve.translate(0, 0, 12).scale(scale).color(selectorFinishColor));
p.part('separate-pistol-grip', pistolGrip.translate(0, 0, 12).scale(scale).color(gripRubberColor));
return p.model();
