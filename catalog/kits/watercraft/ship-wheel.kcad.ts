// Original kernelCAD helm wheel with selectable spoke count and pedestal.

meta({
  name: 'ship-wheel', license: 'CC0-1.0', title: 'Ship helm wheel',
  description: 'Raised helm wheel with a polygonal rim, central hub, radial spokes and short support column. Knobs: spoke count, rim and hub colors.',
  tags: ['ship wheel', 'helm', 'steering', 'marine', 'watercraft', 'boat'], kit: 'watercraft', category: 'prop', origin: 'base',
  compat: ['boat', 'ship', 'harbor', 'coastal'], triangleBudget: 360,
});

const spokes = param('spokes', '8', { choices: ['6', '8'], label: 'Spoke count' });
const rim = param('rim', '#825632', { label: 'Wheel rim' });
const hub = param('hub', '#c09a5c', { label: 'Hub and spokes' });
presets({ teak: { rim: '#825632', hub: '#c09a5c' }, modern: { rim: '#394a50', hub: '#b8c1bd' } });

const R = 225;
const wheel = assembly('ship-wheel');
wheel.part('support-column', cylinder(170, 32, 8).translate(0, 0, 0).color(hub));
wheel.part('wheel-rim', cylinder(34, R, 12).subtract(cylinder(36, R - 31, 12).translate(0, 0, -1)).rotateX(90).translate(0, 17, R).color(rim));
wheel.part('center-hub', cylinder(70, 55, 10).translate(0, 0, R - 35).color(hub));
const count = Number(spokes.value);
for (let i = 0; i < count; i++) {
  wheel.part('spoke-' + (i + 1), box(R * 1.62, 24, 24, true).rotateY(i * 360 / count).translate(0, 17, R).color(hub));
}
wheel.part('pedestal-foot', box(190, 160, 28, true).translate(0, 0, 14).color(rim));
return wheel.model();
