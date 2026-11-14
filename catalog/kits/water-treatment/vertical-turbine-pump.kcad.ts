// Vertical-turbine pump head: a long column rises into a flanged side-discharge head, with a separate finned vertical motor and terminal box.

meta({
  name: 'vertical-turbine-pump',
  license: 'CC0-1.0',
  title: 'Vertical turbine pump head',
  description: 'Vertical turbine pump head with a long column, cardinally selectable flanged discharge, motor support, finned drive motor and terminal box. Parameters: overall scale, discharge orientation, coated equipment steel, structural steel, stainless steel and motor finish; weathered and highVisibility presets.',
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const outletOrientation = param('outletOrientation', 'front', {
  choices: ['front', 'right', 'rear', 'left'],
  label: 'Discharge direction',
});
const coatedSteel = param('coatedSteel', '#287c82', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#59676b', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#c0c8c9', { label: 'Stainless steel' });
const motorFinish = param('motorFinish', '#477d9b', { label: 'Motor finish' });

presets({
  weathered: {
    coatedSteel: '#687b78',
    structuralSteel: '#625f59',
    stainlessSteel: '#9ca7a6',
    motorFinish: '#536d79',
  },
  highVisibility: {
    coatedSteel: '#e5682d',
    structuralSteel: '#505b60',
    stainlessSteel: '#e1ddd0',
    motorFinish: '#386b87',
  },
});

const angleByDirection: Record<string, number> = {
  front: 0,
  right: 90,
  rear: 180,
  left: 270,
};
const outletAngle = angleByDirection[outletOrientation.value] ?? 0;

const b = (x: number, y: number, z: number, w: number, d: number, h: number) =>
  box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const section = (radius: number, sides: number) => {
  let outline = path().moveTo(radius * Math.cos(Math.PI / 2), radius * Math.sin(Math.PI / 2));
  for (let k = 1; k < sides; k += 1) {
    const angle = Math.PI / 2 + (2 * Math.PI * k) / sides;
    outline = outline.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  return outline.close();
};
const loftCylinder = (height: number, radius: number, sides = 12) => {
  const levels = [0, height * 0.08, height * 0.92, height];
  const radii = [radius * 0.9, radius, radius, radius * 0.9];
  const profiles = levels.map((_, index) => section(radii[index]!, sides));
  return profiles[0]!.loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};
const c = (x: number, y: number, z: number, height: number, radius: number, sides = 12) =>
  loftCylinder(height, radius, sides).translate(x, y, z).scale(scale);
const yCylinder = (x: number, y: number, z: number, length: number, radius: number, sides = 12) =>
  loftCylinder(length, radius, sides).rotateX(90).translate(x, y, z).scale(scale);

const pump = assembly('vertical-turbine-pump');
pump.part('base-plate', b(0, 0, 0, 650, 650, 50).color(structuralSteel));
for (const [index, [x, y]] of [[-245, -245], [245, -245], [-245, 245], [245, 245]].entries()) {
  pump.part(`base-anchor-${index + 1}`, c(x, y, 50, 14, 18, 6).color(stainlessSteel));
}
pump.part('column-foot-flange', c(0, 0, 50, 34, 150, 12).color(structuralSteel));
pump.part('column', c(0, 0, 80, 700, 98, 10).color(coatedSteel));

// A broad discharge head and side nozzle replace the original cylinder-and-block elbow.
pump.part('head-lower-flange', c(0, 0, 748, 34, 222, 12).color(structuralSteel));
pump.part('discharge-head-body', c(0, 0, 770, 220, 188, 12).color(coatedSteel));
pump.part('head-top-rim', c(0, 0, 970, 24, 208, 12).color(stainlessSteel));
pump.part('discharge-neck', yCylinder(0, -165, 875, 235, 78).rotateZ(outletAngle).color(stainlessSteel));
pump.part('outlet-flange', yCylinder(0, -382, 875, 42, 140).rotateZ(outletAngle).color(structuralSteel));
pump.part('outlet-face', yCylinder(0, -420, 875, 5, 52).rotateZ(outletAngle).color(coatedSteel));
for (let i = 0; i < 8; i += 1) {
  const a = (2 * Math.PI * i) / 8;
  const x = 112 * Math.cos(a);
  const z = 875 + 112 * Math.sin(a);
  pump.part(
    `outlet-flange-bolt-${i + 1}`,
    loftCylinder(28, 10, 6)
      .rotateX(90)
      .translate(x, -416, z)
      .rotateZ(outletAngle)
      .scale(scale)
      .color(stainlessSteel),
  );
}

// The separate pedestal, ribbed motor, top fan cover, and terminal box make the drive legible at preview scale.
pump.part('motor-pedestal', b(0, 0, 988, 330, 330, 92).color(structuralSteel));
pump.part('shaft-coupling', c(0, 0, 1074, 30, 76, 12).color(stainlessSteel));
pump.part('motor-housing', c(0, 0, 1094, 282, 137, 12).color(motorFinish));
for (let i = 0; i < 6; i += 1) {
  pump.part(`motor-cooling-rib-${i + 1}`, c(0, 0, 1112 + i * 40, 10, 151, 12).color(structuralSteel));
}
pump.part('motor-fan-cowl', c(0, 0, 1370, 58, 149, 12).color(motorFinish));
pump.part('motor-fan-cap', c(0, 0, 1422, 22, 94, 12).color(stainlessSteel));
pump.part('terminal-box', b(130, 0, 1158, 155, 132, 120).color(motorFinish));
pump.part('terminal-cover', b(209, 0, 1177, 10, 106, 82).color(structuralSteel));
pump.part('terminal-gland', loftCylinder(36, 22, 8).rotateY(90).translate(280, 0, 1188).scale(scale).color(stainlessSteel));

return pump.model();
