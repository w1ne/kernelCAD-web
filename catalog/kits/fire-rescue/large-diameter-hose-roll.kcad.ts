// SPDX-License-Identifier: CC0-1.0
// Wide supply hose rolled into a broad stacked bundle with heavy couplings. Material controls: hose fabric, coupling metal, webbing and safety trim; weathered and highVisibility presets.
meta({
  name: "large-diameter-hose-roll",
  license: 'CC0-1.0',
  title: "Large diameter supply hose roll",
  description: "Wide supply hose rolled into a broad stacked bundle with heavy couplings. Material controls: hose fabric, coupling metal, webbing and safety trim; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const hoseFabricColor = param('hoseFabricColor', '#c94732', { label: 'Hose fabric' });
const couplingMetalColor = param('couplingMetalColor', '#aeb9bc', { label: 'Coupling metal' });
const webbingColor = param('webbingColor', '#dfc35b', { label: 'Webbing and safety trim' });
presets({
  weathered: { hoseFabricColor: '#965443', couplingMetalColor: '#8c9698', webbingColor: '#b4a66c' },
  highVisibility: { hoseFabricColor: '#e17825', couplingMetalColor: '#c1c2b5', webbingColor: '#f2df62' },
});
const p = assembly("large-diameter-hose-roll");
const groundOffset = 7;
const add = (name, shape, finish = hoseFabricColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("hose-loop-0-0", box(151.9, 58, 32, true).rotateZ(-90).translate(245, 0, 44), hoseFabricColor);
add("hose-loop-0-1", box(151.9, 58, 32, true).rotateZ(-60).translate(212.176, 122.5, 44), hoseFabricColor);
add("hose-loop-0-2", box(151.9, 58, 32, true).rotateZ(-30).translate(122.5, 212.176, 44), hoseFabricColor);
add("hose-loop-0-3", box(151.9, 58, 32, true).rotateZ(0).translate(0, 245, 44), hoseFabricColor);
add("hose-loop-0-4", box(151.9, 58, 32, true).rotateZ(30).translate(-122.5, 212.176, 44), hoseFabricColor);
add("hose-loop-0-5", box(151.9, 58, 32, true).rotateZ(60).translate(-212.176, 122.5, 44), hoseFabricColor);
add("hose-loop-0-6", box(151.9, 58, 32, true).rotateZ(90).translate(-245, 0, 44), hoseFabricColor);
add("hose-loop-0-7", box(151.9, 58, 32, true).rotateZ(120).translate(-212.176, -122.5, 44), hoseFabricColor);
add("hose-loop-0-8", box(151.9, 58, 32, true).rotateZ(150).translate(-122.5, -212.176, 44), hoseFabricColor);
add("hose-loop-0-9", box(151.9, 58, 32, true).rotateZ(180).translate(-0, -245, 44), hoseFabricColor);
add("hose-loop-0-10", box(151.9, 58, 32, true).rotateZ(210).translate(122.5, -212.176, 44), hoseFabricColor);
add("hose-loop-0-11", box(151.9, 58, 32, true).rotateZ(240).translate(212.176, -122.5, 44), hoseFabricColor);
add("hose-loop-1-0", box(128.34, 58, 32, true).rotateZ(-90).translate(207, 0, 78), hoseFabricColor);
add("hose-loop-1-1", box(128.34, 58, 32, true).rotateZ(-60).translate(179.267, 103.5, 78), hoseFabricColor);
add("hose-loop-1-2", box(128.34, 58, 32, true).rotateZ(-30).translate(103.5, 179.267, 78), hoseFabricColor);
add("hose-loop-1-3", box(128.34, 58, 32, true).rotateZ(0).translate(0, 207, 78), hoseFabricColor);
add("hose-loop-1-4", box(128.34, 58, 32, true).rotateZ(30).translate(-103.5, 179.267, 78), hoseFabricColor);
add("hose-loop-1-5", box(128.34, 58, 32, true).rotateZ(60).translate(-179.267, 103.5, 78), hoseFabricColor);
add("hose-loop-1-6", box(128.34, 58, 32, true).rotateZ(90).translate(-207, 0, 78), hoseFabricColor);
add("hose-loop-1-7", box(128.34, 58, 32, true).rotateZ(120).translate(-179.267, -103.5, 78), hoseFabricColor);
add("hose-loop-1-8", box(128.34, 58, 32, true).rotateZ(150).translate(-103.5, -179.267, 78), hoseFabricColor);
add("hose-loop-1-9", box(128.34, 58, 32, true).rotateZ(180).translate(-0, -207, 78), hoseFabricColor);
add("hose-loop-1-10", box(128.34, 58, 32, true).rotateZ(210).translate(103.5, -179.267, 78), hoseFabricColor);
add("hose-loop-1-11", box(128.34, 58, 32, true).rotateZ(240).translate(179.267, -103.5, 78), hoseFabricColor);
add("hose-loop-2-0", box(104.78, 58, 32, true).rotateZ(-90).translate(169, 0, 112), hoseFabricColor);
add("hose-loop-2-1", box(104.78, 58, 32, true).rotateZ(-60).translate(146.358, 84.5, 112), hoseFabricColor);
add("hose-loop-2-2", box(104.78, 58, 32, true).rotateZ(-30).translate(84.5, 146.358, 112), hoseFabricColor);
add("hose-loop-2-3", box(104.78, 58, 32, true).rotateZ(0).translate(0, 169, 112), hoseFabricColor);
add("hose-loop-2-4", box(104.78, 58, 32, true).rotateZ(30).translate(-84.5, 146.358, 112), hoseFabricColor);
add("hose-loop-2-5", box(104.78, 58, 32, true).rotateZ(60).translate(-146.358, 84.5, 112), hoseFabricColor);
add("hose-loop-2-6", box(104.78, 58, 32, true).rotateZ(90).translate(-169, 0, 112), hoseFabricColor);
add("hose-loop-2-7", box(104.78, 58, 32, true).rotateZ(120).translate(-146.358, -84.5, 112), hoseFabricColor);
add("hose-loop-2-8", box(104.78, 58, 32, true).rotateZ(150).translate(-84.5, -146.358, 112), hoseFabricColor);
add("hose-loop-2-9", box(104.78, 58, 32, true).rotateZ(180).translate(-0, -169, 112), hoseFabricColor);
add("hose-loop-2-10", box(104.78, 58, 32, true).rotateZ(210).translate(84.5, -146.358, 112), hoseFabricColor);
add("hose-loop-2-11", box(104.78, 58, 32, true).rotateZ(240).translate(146.358, -84.5, 112), hoseFabricColor);
add("outer-coupling", cylinder(130, 42, 8).rotateY(90).translate(297, 0, 35), couplingMetalColor);
add("inner-coupling", cylinder(130, 42, 8).rotateY(90).translate(-297, 0, 35), couplingMetalColor);
add("carry-strap", box(112.7, 34, 30, true).translate(0, 0, 545), webbingColor);

return p.model();
