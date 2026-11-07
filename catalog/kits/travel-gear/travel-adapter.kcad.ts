// Original kernelCAD compact multi-region plug adapter with USB ports.
// Millimetres, Z up, base sits at z = 0.
meta({
  name: 'travel-adapter', license: 'CC0-1.0', title: 'Travel plug adapter',
  description: 'Compact universal plug adapter with selectable EU, UK or US prongs and one or two USB sockets. Knobs: plug standard, port count and colors.',
  tags: ['travel adapter', 'plug adapter', 'USB', 'travel', 'electrical'],
  kit: 'travel-gear', category: 'prop', origin: 'base', compat: ['travel', 'hotel', 'electronics'], triangleBudget: 360,
});

const plug = param('plug', 'EU', { choices: ['EU', 'UK', 'US'], label: 'Plug prongs' });
const ports = param('ports', '2', { choices: ['1', '2'], label: 'USB sockets' });
const body = param('body', '#e4e3dc', { label: 'Adapter housing' });
const pins = param('pins', '#bbb8ae', { label: 'Metal contacts' });
const adapter = assembly('travel-adapter');
adapter.part('housing', box(142, 96, 76, true).translate(0, 0, 38).color(body));
adapter.part('face-plate', box(108, 8, 48, true).translate(0, -52, 38).color(pins));
const portCount = Number(ports.value);
for (let i = 0; i < portCount; i++) {
  const x = portCount === 1 ? 0 : (i === 0 ? -28 : 28);
  adapter.part(`usb-port-${i + 1}`, box(26, 8, 12, true).translate(x, -59, 38).color(body));
}

if (plug.value === 'EU') {
  for (const x of [-24, 24]) adapter.part(`eu-pin-${x}`, cylinder(34, 10, 8).translate(x, 20, 76).color(pins));
} else if (plug.value === 'US') {
  for (const x of [-24, 24]) adapter.part(`us-blade-${x}`, box(12, 8, 30, true).translate(x, 20, 91).color(pins));
} else {
  adapter.part('uk-live-pin', box(12, 8, 34, true).translate(0, 26, 93).color(pins));
  adapter.part('uk-neutral-pin', box(12, 8, 28, true).translate(-25, 12, 90).color(pins));
  adapter.part('uk-earth-pin', box(12, 8, 28, true).translate(25, 12, 90).color(pins));
}

return adapter.model();
