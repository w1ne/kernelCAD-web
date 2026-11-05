// SPDX-License-Identifier: CC0-1.0
// Hydroponic controller console: Floor console with raised display hood, selector knobs, lower service door and base plinth. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "hydroponic-controller-console",
  license: 'CC0-1.0',
  title: "Hydroponic controller console",
  description: "Floor console with raised display hood, selector knobs, lower service door and base plinth. Parameters: overall scale, powder-coated steel, polymer, instrument glass, safety amber; weathered and highVisibility presets.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel=param('powderCoatedSteel','#557b70',{label:'Powder-coated steel'});
const polymer=param('polymer','#ddd8c7',{label:'Polymer'});
const glass=param('glass','#51afc1',{label:'Instrument glass'});
const safetyAmber=param('safetyAmber','#e4a52e',{label:'Safety amber'});
presets({
  weathered: {powderCoatedSteel:'#69766e', polymer:'#b4b5aa', glass:'#548e98', safetyAmber:'#b9842f'},
  highVisibility: {powderCoatedSteel:'#e87832', polymer:'#f2c84b', glass:'#38c5dc', safetyAmber:'#ffd139'},
});
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const section=(radius:number,sides:number)=>{
  let outline=path().moveTo(radius*Math.cos(Math.PI/2),radius*Math.sin(Math.PI/2));
  for(let k=1;k<sides;k++){
    const angle=Math.PI/2+(2*Math.PI*k)/sides;
    outline=outline.lineTo(radius*Math.cos(angle),radius*Math.sin(angle));
  }
  return outline.close();
};
const loftCylinder=(height:number,radius:number,sides:number)=>{
  const levels=[0,height*0.08,height*0.92,height];
  const radii=[radius*0.9,radius,radius,radius*0.9];
  const profiles=levels.map((_,index)=>section(radii[index],sides));
  return profiles[0].loft(profiles.slice(1),{
    planes:levels.map((z)=>({plane:'XY' as const,origin:[0,0,z] as [number,number,number]})),
    ruled:true,
  });
};
const c=(x:number,y:number,z:number,h:number,r:number,s:number)=>loftCylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("hydroponic-controller-console");
p.part("plinth", b(0,0,0,760,560,100).color(powderCoatedSteel));
p.part("cabinet", b(0,0,100,700,500,1120).color(polymer));
p.part("display-hood", b(0,-80,1220,650,350,140).color(glass));
p.part("screen", b(0,-262,890,420,25,280).color(glass));
p.part("lower-door", b(0,-255,360,520,30,420).color(polymer));
p.part("left-button", b(-240,-285,610,70,35,70).color(safetyAmber));
p.part("right-button", b(240,-285,610,70,35,70).color(safetyAmber));
p.part("selector-left", c(-230,-290,500,75,38,10).color(safetyAmber));
p.part("selector-right", c(230,-290,500,75,38,10).color(safetyAmber));
p.part("signal-stack", c(270,210,1230,280,34,10).color(safetyAmber));

return p.model();
