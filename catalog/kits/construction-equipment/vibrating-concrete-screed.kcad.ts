// SPDX-License-Identifier: CC0-1.0
// A hand-guided vibrating screed is defined by its long shaped profile, a
// separate exciter, and a paired, damped handle frame that folds for storage.
meta({
  name: 'vibrating-concrete-screed',
  license: 'CC0-1.0',
  title: 'Vibrating concrete screed',
  description: 'Hand-guided concrete screed with a faceted extruded leveling profile, central eccentric exciter, paired vibration-isolated handle arms and rubber grips. Choose short, standard or wide profile and working or folded handle. Material controls: extruded aluminum, equipment enamel, structural steel and grip rubber; weathered and highVisibility presets.',
  tags: ['construction equipment', 'concrete finishing', 'vibrating screed', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const profileSize = param('profileSize', 'standard', { choices: ['short', 'standard', 'wide'], label: 'Screed profile length' });
const handlePosition = param('handlePosition', 'working', { choices: ['working', 'folded'], label: 'Handle position' });
const extrudedAluminum = param('extrudedAluminum', '#aeb9bc', { label: 'Extruded aluminum profile' });
const equipmentEnamel = param('equipmentEnamel', '#e1a31b', { label: 'Equipment enamel' });
const structuralSteel = param('structuralSteel', '#6f7d82', { label: 'Structural steel' });
const gripRubber = param('gripRubber', '#24282a', { label: 'Handle grip rubber' });
presets({
  weathered: { extrudedAluminum: '#899294', equipmentEnamel: '#a87b36', structuralSteel: '#716b61', gripRubber: '#302d2a' },
  highVisibility: { extrudedAluminum: '#c7d0cf', equipmentEnamel: '#f06b26', structuralSteel: '#c1c7c2', gripRubber: '#202326' },
});

const beamLength = profileSize.value === 'short' ? 1200 : profileSize.value === 'wide' ? 2200 : 1700;
const folded = handlePosition.value === 'folded';
const handY = folded ? -beamLength * 0.32 : -beamLength * 0.78;
const handZ = folded ? 430 : 850;
const p = assembly('vibrating-concrete-screed');
const colorMaterial = (shape, finish) => {
  if (finish === extrudedAluminum) return shape.color(extrudedAluminum);
  if (finish === equipmentEnamel) return shape.color(equipmentEnamel);
  if (finish === structuralSteel) return shape.color(structuralSteel);
  if (finish === gripRubber) return shape.color(gripRubber);
  return shape.color(finish);
};
const add = (name, shape, finish) => p.part(name, colorMaterial(shape.translate(0, 0, -13).scale(scale), finish));
const boxAt = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z);
const barBetween = (a, b, r, n = 10) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const length = Math.hypot(dx, dy, dz);
  return cylinder(length, r, n)
    .rotateY((Math.acos(dz / length) * 180) / Math.PI)
    .rotateZ((Math.atan2(dy, dx) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

// The six-sided profile is extruded across the working width; it has a flat
// strike edge, a deep center web and upper shoulders for stiffness.
const profile = path()
  .moveTo(-55, 0).lineTo(55, 0).lineTo(50, 24).lineTo(33, 88)
  .lineTo(22, 126).lineTo(-22, 126).lineTo(-33, 88).lineTo(-50, 24).close()
  .extrude(beamLength).rotateX(90).translate(0, beamLength / 2, 18);
add('extruded-screed-profile', profile, extrudedAluminum);
for (const y of [-beamLength * 0.36, beamLength * 0.36]) {
  add(`end-cap-${y}`, boxAt(0, y, 34, 122, 38, 42), structuralSteel);
  add(`end-damper-${y}`, cylinder(70, 42, 10).translate(0, y, 134), gripRubber);
}

// Exciter, engine housing, mount plates and a visible eccentric weight sit on
// the beam rather than merging into another undifferentiated block.
add('exciter-mount', boxAt(0, 0, 157, 330, 300, 34), structuralSteel);
add('vibrator-housing', boxAt(0, 10, 248, 220, 250, 142), equipmentEnamel);
add('engine-head', boxAt(0, 6, 338, 142, 164, 54), structuralSteel);
add('starter-guard', cylinder(22, 72, 12).rotateY(90).translate(-124, -30, 276), structuralSteel);
add('eccentric-shaft', cylinder(248, 42, 10).rotateX(90).translate(0, 10, 212), structuralSteel);
add('eccentric-weight-left', cylinder(58, 36, 10).translate(-92, -44, 210), structuralSteel);
add('eccentric-weight-right', cylinder(58, 36, 10).translate(92, 64, 210), structuralSteel);

// Twin damped arms meet a cross yoke and hand controls. Changing the handle
// choice actually folds the frame down over the profile.
for (const side of [-1, 1]) {
  const x = side * 134;
  add(`vibration-isolator-${side}`, cylinder(42, 34, 10).translate(x, -beamLength * 0.2, 169), gripRubber);
  add(`handle-arm-${side}`, barBetween([x, -beamLength * 0.2, 188], [side * 178, handY, handZ], 18), structuralSteel);
  add(`handle-brace-${side}`, barBetween([x, -beamLength * 0.1, 178], [side * 178, handY * 0.55, handZ * 0.65], 11), structuralSteel);
  add(`grip-${side}`, cylinder(188, 24, 10).rotateY(90).translate(side * 178 - 94, handY, handZ), gripRubber);
}
add('operator-yoke', cylinder(360, 17, 10).rotateY(90).translate(-180, handY, handZ - 54), structuralSteel);
add('throttle-trigger', barBetween([168, handY + 4, handZ - 20], [216, handY + 4, handZ - 86], 8), equipmentEnamel);
add('engine-switch', boxAt(0, 42, 378, 48, 40, 28), structuralSteel);

return p.model();
