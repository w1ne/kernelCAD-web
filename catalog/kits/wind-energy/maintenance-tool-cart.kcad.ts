// SPDX-License-Identifier: CC0-1.0
// Turbine maintenance tool cart. Compact maintenance cart with two shelves, push handle and four low polygon casters. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "maintenance-tool-cart",
  license: 'CC0-1.0',
  title: "Turbine maintenance tool cart",
  description: "Compact maintenance cart with two shelves, push handle and four low polygon casters. Controls: scale and powder-coated steel, elastomer, stainless steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 550,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel = param('powderCoatedSteel', '#287082', { label: 'Powder-coated steel' });
const elastomer = param('elastomer', '#30383a', { label: 'Elastomer' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });

presets({
  weathered: {"powderCoatedSteel": "#1f5765", "elastomer": "#343c3f"},
  highVisibility: {"powderCoatedSteel": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const wheel=(x:number,y:number,z:number)=>cylinder(90,75,10).rotateX(90).translate(x,y+45,z+75).scale(scale);

const p=assembly("maintenance-tool-cart");
p.part("lower",b(0,0,120,850,520,65).color(powderCoatedSteel));
p.part("upper",b(0,0,520,850,520,65).color(powderCoatedSteel));
p.part("post--360--210",b(-360,-210,120,45,45,400).color(powderCoatedSteel));
p.part("post--360-210",b(-360,210,120,45,45,400).color(powderCoatedSteel));
p.part("post-360--210",b(360,-210,120,45,45,400).color(powderCoatedSteel));
p.part("post-360-210",b(360,210,120,45,45,400).color(powderCoatedSteel));
p.part("handle-post-left",b(-360,260,520,45,45,65).color(stainlessSteel));
p.part("handle-post-right",b(360,260,520,45,45,65).color(stainlessSteel));
p.part("handle",b(0,260,585,760,45,45).color(stainlessSteel));
p.part("wheel--330--210",wheel(-330,-210,0).color(elastomer));
p.part("wheel--330-210",wheel(-330,210,0).color(elastomer));
p.part("wheel-330--210",wheel(330,-210,0).color(elastomer));
p.part("wheel-330-210",wheel(330,210,0).color(elastomer));

return p.model();
