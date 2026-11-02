// Original kernelCAD channel marker buoy with an editable top marker.

meta({
  name: 'harbor-buoy', license: 'CC0-1.0', title: 'Harbor channel buoy',
  description: 'Weighted channel marker with a broad foot, faceted float, contrast band and selectable top marker. Knobs: type, body, band and marker colours.',
  tags: ['buoy', 'channel marker', 'navigation', 'harbor', 'watercraft', 'marine'], kit: 'watercraft', category: 'prop', origin: 'base',
  compat: ['water', 'harbor', 'coastal', 'navigation'], triangleBudget: 320,
});

const type = param('type', 'can', { choices: ['can', 'spar'], label: 'Marker shape' });
const body = param('body', '#df563e', { label: 'Buoy body' });
const band = param('band', '#efe5c7', { label: 'Contrast band' });
const marker = param('marker', '#35434a', { label: 'Top marker' });
presets({ port: { body: '#df563e', band: '#efe5c7' }, starboard: { body: '#2e9b72', band: '#f2ead3' } });

const buoy = assembly('harbor-buoy');
buoy.part('weighted-foot', cylinder(70, 135, 10).translate(0, 0, 0).color(marker));
if (type.value === 'can') {
  buoy.part('float', cylinder(300, 105, 10).translate(0, 0, 70).color(body));
  buoy.part('band', cylinder(65, 108, 10).subtract(cylinder(67, 96, 10).translate(0, 0, -1)).translate(0, 0, 175).color(band));
} else {
  buoy.part('float', cylinder(420, 82, 10).translate(0, 0, 70).color(body));
  buoy.part('band', cylinder(65, 85, 10).subtract(cylinder(67, 73, 10).translate(0, 0, -1)).translate(0, 0, 185).color(band));
}
buoy.part('top-cap', cylinder(28, 48, 8).translate(0, 0, type.value === 'can' ? 370 : 490).color(marker));
buoy.part('marker-post', cylinder(95, 12, 6).translate(0, 0, type.value === 'can' ? 398 : 518).color(marker));
return buoy.model();
