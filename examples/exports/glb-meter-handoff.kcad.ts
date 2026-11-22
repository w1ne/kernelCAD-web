// Standard glTF handoff example. Geometry is authored in millimetres; the
// default GLB export scales the hierarchy to metres for standard viewers.
const model = assembly('Meter-scale GLB handoff');

model.part(
  'base_plate',
  box(700, 300, 12).material({
    name: 'anodized aluminium',
    baseColor: '#30343b',
    metalness: 0.8,
    roughness: 0.3,
  }),
);
model.part(
  'brass_standoff',
  cylinder(40, 25).translate(80, 80, 12).finish('brass'),
);

return model.model();
