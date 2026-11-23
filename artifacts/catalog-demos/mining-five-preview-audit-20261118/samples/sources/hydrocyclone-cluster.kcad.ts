// SPDX-License-Identifier: CC0-1.0
// Hydrocyclone cluster (radial "cyclopac"), the classifier that closes the
// grinding circuit: fine slurry leaves over the top, coarse sand drops out of
// the cone apex back to the mill. What makes it one: a ring of long, slim
// cyclones - short cylindrical head with a tangential feed inlet, long cone
// tapering to a small apex - leaning outwards round a central feed
// distributor; each overflow pipe rises from the head and turns out into a
// ring-shaped overflow launder, each apex sprays into an underflow launder
// below; knife-gate valves on the feeds; the whole on a column-supported
// ring platform with handrail, fed by one big pipe from the cyclone feed pump.
// Millimetres, Z up, cluster axis vertical, feed pipe arriving from +X.
meta({
  name: "hydrocyclone-cluster",
  license: 'CC0-1.0',
  title: "Hydrocyclone cluster",
  description: "Radial hydrocyclone cluster at about real size: ring of rubber-lined cyclones with cylindrical heads, tangential feed inlets with knife-gate valves and long cones to the apex, round a central feed distributor with pressure gauge; overflow pipes turning into a ring overflow launder, apex sprays into an underflow launder, column-supported ring platform with handrail and ladder, main feed pipe from the pump. Material controls: cyclone body coating, platform and launder steel, rubber lining and hoses, valve steel, plus a cyclone count choice (6, 8, 10). weathered, highVisibility and greyPlant presets.",
  tags: ['mining', 'mineral processing', 'classification', 'hydrocyclone', 'cyclone cluster', 'grinding circuit', 'slurry', 'concentrator'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 6400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3d6fa8', { label: 'Cyclone body coating' });
const structuralSteel = param('structuralSteel', '#4f5b62', { label: 'Platform and launder steel' });
const rubber = param('rubber', '#272a2c', { label: 'Rubber lining and hoses' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Valve and gauge steel' });
const count = param('count', '8', { choices: ['6', '8', '10'], label: 'Cyclones in the cluster' });
presets({
  weathered: { coatedSteel: '#5d6d78', structuralSteel: '#666a66', rubber: '#393a38', stainlessSteel: '#969f9e' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#24282a', stainlessSteel: '#c5ccca' },
  greyPlant: { coatedSteel: '#c9cdcf', structuralSteel: '#2f5a8a', rubber: '#2c2f31', stainlessSteel: '#d0d6d6' },
});

const p = assembly("hydrocyclone-cluster");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Flat ring (annulus) from z0 to z1.
const ring = (ro, ri, z0, z1, n = 24) => rod(ro, z0, z1, n).subtract(rod(ri, z0 - 10, z1 + 10, n));
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const slurry = '#6f6a60', warn = '#e8c21e';
const n = Number(count.value);
const Zp = 3600; // ring platform deck
const Zh = 5600; // cyclone head (top of cone) height
const Rc = 1700; // radius of the cyclone ring
const lean = -6; // heads lean in towards the distributor, apexes out

// ---- Ring platform on columns ----
add('platform-deck', ring(Rc + 1150, Rc + 450, Zp, Zp + 60, 24).color(structuralSteel));
for (let k = 0; k < 6; k++) {
  const a = (2 * Math.PI * k) / 6 + Math.PI / 6;
  const x = Math.cos(a) * (Rc + 800), y = Math.sin(a) * (Rc + 800);
  add(`column-${k}`, blk(x - 120, y - 120, 0, x + 120, y + 120, Zp).color(structuralSteel));
  add(`column-base-${k}`, blk(x - 250, y - 250, 0, x + 250, y + 250, 40).color(structuralSteel));
  add(`handrail-post-${k}`, rod(25, Zp + 60, Zp + 1160, 6).translate(Math.cos(a) * (Rc + 1120), Math.sin(a) * (Rc + 1120), 0).color(warn));
}
add('handrail-top', ring(Rc + 1145, Rc + 1095, Zp + 1120, Zp + 1170, 24).color(warn));
add('handrail-mid', ring(Rc + 1145, Rc + 1095, Zp + 580, Zp + 620, 24).color(warn));
for (const y of [-200, 200]) add(`ladder-rail-${y}`, rod(25, 0, Zp + 1000, 6).translate(-(Rc + 1300), y, 0).color(warn));
for (let z = 300; z < Zp; z += 300) add(`ladder-rung-${z}`, tube([-(Rc + 1300), -200, z], [-(Rc + 1300), 200, z], 18, 4).color(warn));

// ---- Central feed distributor and main feed pipe ----
add('distributor', lathe([[650, Zh - 900], [650, Zh + 200], [450, Zh + 450]], 16).color(coatedSteel));
add('distributor-flange', rod(720, Zh - 950, Zh - 850, 16).color(coatedSteel));
add('distributor-cone', lathe([[200, 1500], [650, Zh - 950]], 12).color(coatedSteel));
add('feed-pipe-riser', rod(220, 1200, 1700, 10).color(rubber));
add('feed-pipe', tube([4600, 0, 1300], [-30, 0, 1300], 230, 10).color(rubber));
add('feed-pipe-support', blk(3600, -250, 0, 3800, 250, 1070).color(structuralSteel));
add('pressure-gauge-stem', tube([0, 0, Zh + 450], [0, 0, Zh + 650], 30, 6).color(stainlessSteel));
add('pressure-gauge', rod(160, 0, 70, 12).rotateX(70).translate(0, -40, Zh + 760).color(stainlessSteel));

// ---- Overflow and underflow launders ----
const Ro = Rc + 1100; // overflow launder centre radius
const Zo = Zh + 300;
add('overflow-launder', ring(Ro + 350, Ro - 350, Zo - 500, Zo, 24).subtract(ring(Ro + 280, Ro - 280, Zo - 430, Zo + 20, 24)).color(structuralSteel));
add('overflow-slurry', ring(Ro + 280, Ro - 280, Zo - 430, Zo - 200, 24).color(slurry));
for (let k = 0; k < 4; k++) {
  const a = (2 * Math.PI * k) / 4 + Math.PI / 4;
  add(`launder-hanger-${k}`, tube([Math.cos(a) * (Rc + 850), Math.sin(a) * (Rc + 850), Zp + 60], [Math.cos(a) * Ro, Math.sin(a) * Ro, Zo - 500], 55, 6).color(structuralSteel));
}
const oa = -Math.PI / 3;
add('overflow-outlet', tube([Ro * Math.cos(oa), Ro * Math.sin(oa), Zo - 450], [(Ro + 900) * Math.cos(oa), (Ro + 900) * Math.sin(oa), 900], 220, 8).color(structuralSteel));
add('underflow-launder', ring(Rc + 700, Rc - 700, 1700, 2200, 24).subtract(ring(Rc + 630, Rc - 630, 1770, 2220, 24)).color(structuralSteel));
add('underflow-sand', ring(Rc + 630, Rc - 630, 1770, 1900, 24).color('#8a7d6c'));
add('underflow-outlet', tube([-Rc, -400, 1750], [-Rc - 500, -1600, 400], 260, 8).color(structuralSteel));
for (let k = 0; k < 4; k++) {
  const a = (2 * Math.PI * k) / 4;
  add(`underflow-leg-${k}`, rod(80, 0, 1700, 6).translate(Math.cos(a) * (Rc + 500), Math.sin(a) * (Rc + 500), 0).color(structuralSteel));
}

// ---- The cyclones, built upright on +X at the origin then leaned and yawed ----
const H = Zh - 2500; // apex to head
const cyc = (k) => {
  const yaw = (360 * k) / n + 180 / n;
  const place = (s) => s.rotateY(lean).translate(Rc, 0, 2500).rotateZ(yaw);
  add(`cyclone-cone-${k}`, place(lathe([[70, 0], [320, H - 300], [330, H]], 10)).color(coatedSteel));
  add(`cyclone-head-${k}`, place(rod(340, H, H + 650, 12)).color(coatedSteel));
  add(`cyclone-head-flange-${k}`, place(rod(400, H + 600, H + 680, 12)).color(coatedSteel));
  add(`apex-spigot-${k}`, place(rod(85, -150, 0, 8)).color(rubber));
  add(`apex-spray-${k}`, place(lathe([[150, -500], [70, -150]], 8)).color(slurry));
  // Tangential feed inlet box and knife-gate valve on the line from the distributor.
  add(`feed-inlet-${k}`, place(blk(-420, -340, H + 250, 0, -150, H + 550)).color(coatedSteel));
  add(`feed-line-${k}`, place(tube([-420, -245, H + 400], [-Rc + 700, -245, H + 400], 120, 8)).color(rubber));
  add(`knife-gate-${k}`, place(blk(-620, -400, H + 230, -520, -90, H + 900)).color(stainlessSteel));
  add(`knife-gate-actuator-${k}`, place(rod(70, H + 900, H + 1250, 8).translate(-570, -245, 0)).color(warn));
  // Overflow pipe up from the head and out into the launder.
  add(`overflow-riser-${k}`, place(rod(150, H + 680, H + 1050, 8)).color(rubber));
  add(`overflow-pipe-${k}`, place(tube([0, 0, H + 1000], [Ro - Rc + 100, 0, H + 100], 150, 8)).color(rubber));
};
for (let k = 0; k < n; k++) cyc(k);

return p.model();
