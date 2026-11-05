// SPDX-License-Identifier: CC0-1.0
// Mailpiece thickness gauge: Bench gauge with measuring bridge, adjustable stop and broad reference plate. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mailpiece-thickness-gauge",
  license: 'CC0-1.0',
  title: "Mailpiece thickness gauge",
  description: "Bench gauge with measuring bridge, adjustable stop and broad reference plate. Scale, painted steel, structural steel, safety amber, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#707d78', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const safetyAmber = param('safetyAmber', '#e7aa35', { label: 'Safety amber' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', safetyAmber: '#bb8c34' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', safetyAmber: '#ffd12f' },
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

const p = assembly("mailpiece-thickness-gauge");
p.part("base-plate", b(0,0,0,620,460,45).color(structuralSteel));
p.part("left-post", b(-240,0,45,55,55,420).color(structuralSteel));
p.part("right-post", b(240,0,45,55,55,420).color(structuralSteel));
p.part("bridge", b(0,0,430,540,80,65).color(paintedSteel));
p.part("gauge-slider", b(0,-40,250,130,90,190).color(paintedSteel));
p.part("measuring-foot", b(0,-30,195,180,160,45).color(structuralSteel));
p.part("stop-block", b(210,60,45,65,70,125).color(safetyAmber));
p.part("index-rail", b(-100,-100,140,300,28,35).color(structuralSteel));
p.part("dial", b(0,-95,455,115,55,25).color(paintedSteel));

return p.model();
