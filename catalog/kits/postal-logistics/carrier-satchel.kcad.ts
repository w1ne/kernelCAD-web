// SPDX-License-Identifier: CC0-1.0
// Carrier satchel: Postal carrier shoulder bag with flap, side gussets, strap loops and a broad carrying strap. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "carrier-satchel",
  license: 'CC0-1.0',
  title: "Carrier satchel",
  description: "Postal carrier shoulder bag with flap, side gussets, strap loops and a broad carrying strap. Scale, woven fabric, stainless steel, moulded polymer, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const fabric = param('fabric', '#596f7e', { label: 'Woven fabric' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const polymer = param('polymer', '#477c8e', { label: 'Moulded polymer' });
presets({
  weathered: { fabric: '#6c6b60', stainlessSteel: '#9ea7a6', polymer: '#6c7c7c' },
  highVisibility: { fabric: '#d66a35', stainlessSteel: '#d9e0de', polymer: '#e0b245' },
});
const octRect = (w:number,d:number,cut:number) => path()
  .moveTo(-w/2+cut,-d/2).lineTo(w/2-cut,-d/2).lineTo(w/2,-d/2+cut)
  .lineTo(w/2,d/2-cut).lineTo(w/2-cut,d/2).lineTo(-w/2+cut,d/2)
  .lineTo(-w/2,d/2-cut).lineTo(-w/2,-d/2+cut).close();
const bevelled = (w:number,d:number,h:number) => {
  const edge = Math.min(w,d,h) * 0.08;
  const profiles = [
    octRect(w-edge*2,d-edge*2,Math.min(w-edge*2,d-edge*2)*0.08),
    octRect(w,d,Math.min(w,d)*0.08),
    octRect(w,d,Math.min(w,d)*0.08),
    octRect(w-edge*2,d-edge*2,Math.min(w-edge*2,d-edge*2)*0.08),
  ];
  const levels = [0,edge,h-edge,h];
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })),
    ruled: true,
  });
};
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => bevelled(w,d,h).translate(x,y,z).scale(scale);
const softBag=(x:number,y:number,z:number,w:number,d:number,h:number)=>{
  const dims=[[w*0.76,d*0.78],[w,d],[w*0.94,d*0.93],[w*0.72,d*0.78]];
  const levels=[0,h*0.12,h*0.84,h];
  const profiles=dims.map(([pw,pd])=>octRect(pw,pd,Math.min(pw,pd)*0.15));
  return profiles[0].loft(profiles.slice(1), {
    planes:levels.map((z)=>({plane:'XY' as const,origin:[0,0,z] as [number,number,number]})),
    ruled:true,
  }).translate(x,y,z).scale(scale);
};
const tiltedX = (x:number,y:number,z:number,w:number,d:number,h:number,a:number) => bevelled(w,d,h).translate(0,0,-h/2).rotateX(a).translate(x,y,z+h/2).scale(scale);

const p = assembly("carrier-satchel");
p.part("bag-body", softBag(0,0,0,420,210,370).color(fabric));
p.part("front-pocket", b(0,-112,60,310,28,160).color(polymer));
p.part("flap", tiltedX(0,-8,330,450,245,80,25).color(fabric));
p.part("side-gusset-left", b(-225,0,0,35,200,350).color(fabric));
p.part("side-gusset-right", b(225,0,0,35,200,350).color(fabric));
p.part("strap-left", b(-190,-132,300,42,42,310).color(fabric));
p.part("strap-right", b(190,-132,300,42,42,310).color(fabric));
p.part("shoulder-strap", b(0,-132,600,440,42,40).color(fabric));
p.part("strap-end-left", b(-170,-146,300,90,45,70).color(stainlessSteel));
p.part("strap-end-right", b(170,-146,300,90,45,70).color(stainlessSteel));

return p.model();
