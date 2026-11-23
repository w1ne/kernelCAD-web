// SPDX-License-Identifier: CC0-1.0
// Leachate recirculation pump: the skid that lifts leachate out of a
// landfill collection sump and sends it back up to the waste cells, so the
// cells stay wet enough to break down faster and less leachate goes off
// site for treatment.
// What makes it a leachate pump set: a concrete wet-well riser with a
// lockable steel hatch, a black HDPE suction line with a gate valve and
// handwheel, an end-suction centrifugal pump (round volute, discharge
// nozzle on top, bearing frame), an orange coupling guard, a finned motor
// with fan cowl and terminal box, all on a fabricated baseplate. The
// discharge climbs through a check valve past a pressure gauge, turns at
// an elbow and runs back toward the cells. A control panel on a post
// carries run and fault lamps and an amber beacon.
// Generic visualization geometry at about real size (3.6 m long, 2.2 m
// deep, 2.2 m high), millimetres, Z up, gauge and panel facing -Y.

meta({
  name: "leachate-recirculation-pump",
  license: 'CC0-1.0',
  title: "Leachate recirculation pump",
  description: "Landfill leachate recirculation pump set at about real size: concrete wet-well riser with steel hatch, HDPE suction line with gate valve and handwheel, end-suction centrifugal pump with volute and bearing frame, orange coupling guard, finned motor with fan cowl and terminal box on a fabricated baseplate, discharge riser with check valve, pressure gauge and elbow, and a control panel on a post with lamps and beacon. Material controls: cast iron pump and motor, HDPE pipework, concrete wet well, safety orange guard. plantBlue, sewageGreen, stainless and weathered presets.",
  tags: ['leachate', 'pump', 'centrifugal pump', 'recirculation', 'landfill', 'wet well', 'sump', 'HDPE pipe', 'gate valve', 'check valve', 'control panel', 'recycling', 'waste management', 'organics', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const castIron = param('castIron', '#2f5fa8', { label: 'Pump, motor and baseplate (painted cast iron)' });
const hdpe = param('hdpe', '#26292b', { label: 'Suction and discharge pipe (HDPE)' });
const concrete = param('concrete', '#a9a59b', { label: 'Wet-well riser (concrete)' });
const safety = param('safety', '#f07a1a', { label: 'Coupling guard and beacon (safety paint)' });

presets({
  plantBlue: { castIron: '#2f5fa8', hdpe: '#26292b', concrete: '#a9a59b', safety: '#f07a1a' },
  sewageGreen: { castIron: '#3f7f4a', hdpe: '#2a2d2f', concrete: '#b3afa5', safety: '#f2c230' },
  stainless: { castIron: '#a8b0b4', hdpe: '#3a3e40', concrete: '#c2bdb1', safety: '#e85d3a' },
  weathered: { castIron: '#4a5a6a', hdpe: '#3a3a36', concrete: '#8a857a', safety: '#a8623a' },
});

const p = assembly("leachate-recirculation-pump");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Cylinders along each axis, starting at (x, y, z) and running +len.
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateX(-90).translate(x, y, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const AX = 560;

// Concrete wet-well riser with a steel hatch.
const WX = -1500;
add("wet-well", cylZ(WX, 0, 0, 640, 700, 24).subtract(cylZ(WX, 0, 40, 700, 600, 24)).color(concrete));
add("wet-well-slab", cylZ(WX, 0, 560, 80, 690, 24).color(concrete));
add("hatch", blk(WX - 80, 0, 640, 760, 760, 30).color('#7f8a8c'));
add("hatch-hinge", cylY(WX - 460, -320, 680, 640, 22, 10).color('#5d6366'));
add("hatch-padlock", blk(WX + 300, -200, 670, 60, 30, 70).color('#c9a640'));
for (let i = 0; i < 5; i++) add(`hatch-tread-${i}`, blk(WX - 80, -280 + i * 140, 670, 700, 20, 6).color('#5d6366'));

// Fabricated baseplate on a plinth.
add("plinth", blk(400, 0, 0, 2000, 900, 120).color(concrete));
add("baseplate", blk(400, 0, 120, 1900, 700, 100).color(castIron));
for (const x of [-450, 1250]) for (const s of [-1, 1]) add(`anchor-${x}-${s}`, cylZ(x, s * 290, 220, 40, 26, 8).color('#5d6366'));

// End-suction pump: volute, suction and discharge nozzles, bearing frame.
add("volute", cylX(-260, 0, AX, 220, 300, 24).color(castIron));
add("volute-boss", cylX(-300, 0, AX, 40, 200, 20).color(castIron));
add("volute-foot", blk(-150, 0, 220, 160, 360, AX - 300).color(castIron));
add("suction-nozzle", cylX(-480, 0, AX, 180, 110).color(castIron));
add("suction-flange", cylX(-500, 0, AX, 30, 160).color(castIron));
add("discharge-nozzle", cylZ(-150, 0, AX + 200, 260, 90).color(castIron));
add("discharge-flange", cylZ(-150, 0, AX + 440, 30, 140).color(castIron));
add("bearing-frame", blk(80, 0, AX - 140, 300, 260, 280).color(castIron));
add("bearing-foot", blk(80, 0, 220, 260, 360, AX - 360).color(castIron));
// Coupling guard: a half-round orange cover.
add("coupling-guard", cylX(230, 0, AX, 300, 170, 16).subtract(blk(380, 0, AX - 400, 400, 400, 400)).color(safety));
add("guard-skirt", blk(380, 0, 220, 300, 340, AX - 220).color(safety));
// Finned motor, fan cowl and terminal box.
add("motor", cylX(530, 0, AX, 700, 250, 24).color(castIron));
for (let i = 0; i < 8; i++) {
  const a = (i * 360) / 8 + 22.5;
  add(`motor-fin-${i}`, box(640, 40, 40, true).translate(0, 0, 255).rotateX(a).translate(880, 0, AX).color(castIron));
}
add("fan-cowl", cylX(1230, 0, AX, 160, 240, 24).color('#5d6366'));
add("fan-grille", cylX(1388, 0, AX, 6, 200, 20).color('#2f3437'));
add("terminal-box", blk(780, 0, AX + 240, 260, 220, 160).color(castIron));
add("cable-gland", cylY(780, -140, AX + 300, 40, 30, 10).color('#2f3437'));
for (const x of [620, 1140]) add(`motor-foot-${x}`, blk(x, 0, 220, 140, 460, AX - 380).color(castIron));
add("nameplate", blk(880, -252, AX + 60, 160, 4, 90).color('#d8dcdc'));

// Suction line from the wet well with a gate valve and handwheel.
add("suction-pipe", cylX(WX + 600, 0, AX, -WX - 1100, 110).color(hdpe));
add("suction-drop", cylZ(WX + 200, 0, 200, AX - 200, 110).color(hdpe));
add("suction-elbow", sphere(118).translate(WX + 200, 0, AX).color(hdpe));
add("suction-elbow-run", cylX(WX + 200, 0, AX, 420, 110).color(hdpe));
add("gate-valve", blk(-850, 0, AX - 180, 220, 300, 360).color(castIron));
add("valve-bonnet", cylZ(-850, 0, AX + 180, 300, 70).color(castIron));
add("valve-stem", cylZ(-850, 0, AX + 480, 120, 18, 8).color('#c9ced1'));
add("handwheel", torus(160, 18, 16).translate(-850, 0, AX + 590).color('#c0392b'));
for (const a of [0, 60, 120]) add(`handwheel-spoke-${a}`, box(320, 16, 16, true).rotateZ(a).translate(-850, 0, AX + 590).color('#c0392b'));
for (const x of [-980, -720]) add(`valve-flange-${x}`, cylX(x - 15, 0, AX, 30, 165).color(castIron));

// Discharge riser: check valve, gauge, elbow and the run back to the cells.
const RZ = AX + 470;
add("check-valve", blk(-150, 0, RZ, 260, 240, 260).color(castIron));
add("check-valve-cap", cylY(-150, -150, RZ + 130, 30, 90).color(castIron));
add("discharge-pipe", cylZ(-150, 0, RZ + 260, 1700 - RZ - 260, 95).color(hdpe));
add("discharge-elbow", sphere(104).translate(-150, 0, 1700).color(hdpe));
add("discharge-run", cylY(-150, 0, 1700, 1100, 95).color(hdpe));
add("discharge-drop", cylZ(-150, 1100, 0, 1700, 95).color(hdpe));
add("discharge-elbow-2", sphere(104).translate(-150, 1100, 1700).color(hdpe));
add("pipe-support", blk(-150, 1100, 0, 300, 300, 300).color(concrete));
add("gauge-tee", cylY(-150, -220, RZ + 520, 130, 22, 8).color('#c9ced1'));
add("gauge-body", cylY(-150, -260, RZ + 520, 40, 80, 16).color('#2f3437'));
add("gauge-dial", cylY(-150, -264, RZ + 520, 4, 68, 16).color('#f2f2ec'));
add("gauge-needle", box(6, 4, 54, true).rotateY(-40).translate(-140, -268, RZ + 540).color('#c0392b'));
add("flow-meter", cylY(-150, 300, 1700, 300, 140, 16).color('#5d6366'));
add("flow-meter-display", blk(-150, 450, 1840, 200, 200, 120).color('#5d6366'));

// Control panel on a post, with run/fault lamps and a beacon.
const PX = 1300;
const PY = -800;
add("panel-post", blk(PX, PY + 120, 0, 100, 100, 2000).color('#7f8a8c'));
add("panel-foot", blk(PX, PY + 120, 0, 300, 300, 20).color('#7f8a8c'));
add("control-panel", blk(PX, PY, 1000, 560, 200, 700).color('#d8dcdc'));
add("panel-door-seam", blk(PX, PY - 101, 1040, 500, 3, 620).color('#b8bcbc'));
add("lamp-run", cylY(PX - 140, PY - 120, 1580, 24, 30, 12).color('#2e9a63'));
add("lamp-fault", cylY(PX, PY - 120, 1580, 24, 30, 12).color('#c0392b'));
add("isolator", blk(PX + 160, PY - 110, 1450, 90, 20, 140).color('#f2c230'));
add("isolator-handle", blk(PX + 160, PY - 130, 1490, 30, 30, 70).color('#c0392b'));
add("beacon", cylZ(PX, PY, 1700, 140, 70, 16).color(safety));
add("beacon-base", cylZ(PX, PY, 1700, 30, 80, 16).color('#2f3437'));
add("conduit", cylZ(PX - 200, PY + 40, 0, 1000, 25, 8).color('#5d6366'));

return p.model();
