// SPDX-License-Identifier: CC0-1.0
// Litter fence panel: powder-coated corner posts frame narrow mesh bars between top and bottom rails. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "litter-fence-panel",
  license: 'CC0-1.0',
  title: "Litter fence panel",
  description: "Litter fence panel: powder-coated posts carry galvanized rails and narrow mesh bars. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#6e775d', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#686f5d', stainlessSteel: '#9ea7a5' },
  highVisibility: { paintedSteel: '#d77632' },
});
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("litter-fence-panel");
p.part("bottom-rail", b(0,0,80,1000,80,80).color(stainlessSteel));
p.part("top-rail", b(0,0,1290,1000,80,80).color(stainlessSteel));
p.part("left-post", b(-480.0,0,0,90,90,1370).color(paintedSteel));
p.part("right-post", b(480.0,0,0,90,90,1370).color(paintedSteel));
p.part("mesh-bar-1", b(-360.0,0,120,35,45,1130).color(stainlessSteel));
p.part("mesh-bar-2", b(-120.0,0,120,35,45,1130).color(stainlessSteel));
p.part("mesh-bar-3", b(120.0,0,120,35,45,1130).color(stainlessSteel));
p.part("mesh-bar-4", b(360.0,0,120,35,45,1130).color(stainlessSteel));
p.part("foot-left", b(-480.0,0,0,180,260,100).color(stainlessSteel));
p.part("foot-right", b(480.0,0,0,180,260,100).color(stainlessSteel));

return p.model();
