// CC0 illustrative beam coupling, not dimensioned or rated supplier CAD.
// The flexible middle section uses a genuine continuous helical cut, not
// cosmetic axial slots. Both hubs are integral with the same machined body.
meta({
  name: 'beam-coupling',
  license: 'CC0-1.0',
  title: 'Helical beam coupling (illustrative)',
  description: 'One-piece bored shaft coupling with a continuous helical flexure cut, integral end hubs, and two radial set-screw bores. Illustrative geometry only; no fit tolerance, torque rating, or fatigue verification.',
  tags: ['beam coupling', 'helical coupling', 'flexible shaft coupling', 'low poly', 'scene prop', 'CC0'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 1000,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Illustrative model scale' });
const metal = param('metal', '#aebac0', { label: 'Alloy surface (color only)' });
presets({
  dark: { metal: '#586970' },
  brass: { metal: '#c29a5c' },
  weathered: { metal: '#788177' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const radiusSegments = 48;
// A single connected machined blank, with two enlarged end hubs.
let coupling = cylinder(30 * s, 7 * s, radiusSegments)
  .union(cylinder(5 * s, 9 * s, radiusSegments))
  .union(cylinder(5 * s, 9 * s, radiusSegments).translate(0, 0, 25 * s));
coupling = coupling.subtract(cylinder(32 * s, 4 * s, radiusSegments).translate(0, 0, -s));

// The tool profile penetrates the sleeve wall (r=4..7 mm) throughout a
// three-turn helix. Exact helical sweep gives a continuous spiral clearance;
// a set of vertical slots would be a different, much stiffer component.
const helicalSlot = path()
  .moveTo(-2 * s, -0.4 * s)
  .lineTo(2 * s, -0.4 * s)
  .lineTo(2 * s, 0.4 * s)
  .lineTo(-2 * s, 0.4 * s)
  .close()
  .sweep(helix({ radius: 5.5 * s, pitch: 5 * s, turns: 3 }), { spine: 'helix' })
  .translate(0, 0, 7.5 * s);
coupling = coupling.subtract(helicalSlot);

// Each hole opens from the outer hub surface into the 8 mm shaft bore.
for (const z of [2.5, 27.5]) {
  coupling = coupling.subtract(
    cylinder(12 * s, 1.3 * s, 16).rotateY(-90).translate(0, 0, z * s),
  );
}
return coupling.color(metal);
