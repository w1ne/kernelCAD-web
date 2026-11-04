// SPDX-License-Identifier: CC0-1.0
// Layered accordion fold of attack hose with a carrying strap and outlet coupling. Material controls: webbing and safety trim, hose fabric, coupling metal; weathered and highVisibility presets.
meta({
  name: "folded-hose-pack",
  license: 'CC0-1.0',
  title: "Folded fire hose pack",
  description: "Layered accordion fold of attack hose with a carrying strap and outlet coupling. Material controls: webbing and safety trim, hose fabric, coupling metal; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const webbingColor = param('webbingColor', '#dfc35b', { label: 'Webbing and safety trim' });
const hoseFabricColor = param('hoseFabricColor', '#c94732', { label: 'Hose fabric' });
const couplingMetalColor = param('couplingMetalColor', '#aeb9bc', { label: 'Coupling metal' });
presets({
  weathered: { webbingColor: '#b4a66c', hoseFabricColor: '#965443', couplingMetalColor: '#8c9698' },
  highVisibility: { webbingColor: '#f2df62', hoseFabricColor: '#e17825', couplingMetalColor: '#c1c2b5' },
});
const p = assembly("folded-hose-pack");
const groundOffset = 2;
const add = (name, shape, finish = hoseFabricColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("pack-base", box(500, 360, 34, true).translate(0, 0, 32), webbingColor);
add("fold-0-0", box(95, 50.4, 100, true).translate(-180, -122.4, 98), hoseFabricColor);
add("fold-0-1", box(95, 50.4, 100, true).translate(-60, -122.4, 98), hoseFabricColor);
add("fold-0-2", box(95, 50.4, 100, true).translate(60, -122.4, 98), hoseFabricColor);
add("fold-0-3", box(95, 50.4, 100, true).translate(180, -122.4, 98), hoseFabricColor);
add("fold-1-0", box(95, 50.4, 100, true).translate(-180, -61.2, 118), hoseFabricColor);
add("fold-1-1", box(95, 50.4, 100, true).translate(-60, -61.2, 118), hoseFabricColor);
add("fold-1-2", box(95, 50.4, 100, true).translate(60, -61.2, 118), hoseFabricColor);
add("fold-1-3", box(95, 50.4, 100, true).translate(180, -61.2, 118), hoseFabricColor);
add("fold-2-0", box(95, 50.4, 100, true).translate(-180, 0, 98), hoseFabricColor);
add("fold-2-1", box(95, 50.4, 100, true).translate(-60, 0, 98), hoseFabricColor);
add("fold-2-2", box(95, 50.4, 100, true).translate(60, 0, 98), hoseFabricColor);
add("fold-2-3", box(95, 50.4, 100, true).translate(180, 0, 98), hoseFabricColor);
add("fold-3-0", box(95, 50.4, 100, true).translate(-180, 61.2, 118), hoseFabricColor);
add("fold-3-1", box(95, 50.4, 100, true).translate(-60, 61.2, 118), hoseFabricColor);
add("fold-3-2", box(95, 50.4, 100, true).translate(60, 61.2, 118), hoseFabricColor);
add("fold-3-3", box(95, 50.4, 100, true).translate(180, 61.2, 118), hoseFabricColor);
add("fold-4-0", box(95, 50.4, 100, true).translate(-180, 122.4, 98), hoseFabricColor);
add("fold-4-1", box(95, 50.4, 100, true).translate(-60, 122.4, 98), hoseFabricColor);
add("fold-4-2", box(95, 50.4, 100, true).translate(60, 122.4, 98), hoseFabricColor);
add("fold-4-3", box(95, 50.4, 100, true).translate(180, 122.4, 98), hoseFabricColor);
add("carry-strap", box(60, 302.4, 24, true).translate(0, 0, 180), webbingColor);
add("coupling", cylinder(130, 42, 8).rotateY(90).translate(210, 0, 40), couplingMetalColor);

return p.model();
