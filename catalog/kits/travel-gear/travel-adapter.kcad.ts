// SPDX-License-Identifier: CC0-1.0
// Universal travel plug adapter. What makes it one rather than a white cube:
// a rounded two-tone housing with a recessed universal socket on the front
// (the shaped aperture that takes EU, UK, US and AU plugs), a row of USB-A
// and USB-C ports with a power LED, colour-coded slider tabs on the sides
// that push out one set of prongs, and the selected prongs - two round EU
// pins, three rectangular UK pins or two flat US blades - standing out of
// the back. Generic visualization geometry at real size (housing 64 x 48 x
// 56 mm), millimetres, Z up, standing on z = 0, socket facing -Y, prongs +Y.
meta({
  name: 'travel-adapter',
  license: 'CC0-1.0',
  title: 'Travel plug adapter',
  description: 'Universal travel plug adapter: rounded two-tone housing, recessed universal socket, USB-A and USB-C ports with power LED, colour-coded prong sliders on the sides, and EU, UK or US prongs out of the back. One or two USB-A ports. Material controls: housing plastic, faceplate, prong metal, slider accent; arcticWhite, stealthBlack and signalBlue presets.',
  tags: ['travel adapter', 'plug adapter', 'universal adapter', 'power adapter', 'usb charger', 'travel', 'electronics', 'low poly'],
  kit: 'travel-gear',
  category: 'prop',
  origin: 'base',
  compat: ['travel', 'hotel', 'electronics'],
  triangleBudget: 1100,
});

const plug = param('plug', 'EU', { choices: ['EU', 'UK', 'US'], label: 'Plug prongs' });
const ports = param('ports', '2', { choices: ['1', '2'], label: 'USB-A sockets' });
const housing = param('housing', '#ecebe6', { label: 'Housing (PC plastic)' });
const faceplate = param('faceplate', '#3a4048', { label: 'Socket faceplate (plastic)' });
const prongMetal = param('prongMetal', '#c9c4b4', { label: 'Prongs (nickel-plated brass)' });
const sliderAccent = param('sliderAccent', '#e5732c', { label: 'Prong sliders (accent)' });
presets({
  arcticWhite: { housing: '#f2f2ee', faceplate: '#cfd3d6', prongMetal: '#c9c4b4', sliderAccent: '#2e8bd6' },
  stealthBlack: { housing: '#25272b', faceplate: '#121315', prongMetal: '#b9b4a6', sliderAccent: '#d8433a' },
  signalBlue: { housing: '#2f5f9e', faceplate: '#e9ecef', prongMetal: '#d2cdbd', sliderAccent: '#f2c230' },
});

const p = assembly('travel-adapter');
const add = (name, shape) => p.part(name, shape);
const W = 64;
const D = 48;
const H = 56;
const R = 8;

// Two-tone housing: main shell and a darker front faceplate.
add('housing', extrudeRoundedRect(W, H, R, D - 6, { axis: 'y' }).translate(0, -D / 2 + 6, H / 2).color(housing));
add('faceplate', extrudeRoundedRect(W - 4, H - 4, R - 2, 6, { axis: 'y' }).translate(0, -D / 2 + 1, H / 2).color(faceplate));
add('rear-bezel', extrudeRoundedRect(W - 10, H - 10, R - 3, 3, { axis: 'y' }).translate(0, D / 2, H / 2).color(faceplate));

// Universal socket: recessed round well with the combined aperture shapes.
const SZ = H * 0.6;
add('socket-well', cylinder(2, 19, 24).rotateX(90).translate(0, -D / 2 + 0.5, SZ).color(housing));
for (const sx of [-1, 1]) {
  add(`socket-round-${sx}`, cylinder(1, 2.6, 10).rotateX(90).translate(sx * 9.5, -D / 2 - 0.6, SZ).color(faceplate));
  add(`socket-slot-${sx}`, box(2.2, 1, 8, true).rotateY(sx * 30).translate(sx * 9, -D / 2 - 1.8, SZ + 7).color(faceplate));
}
add('socket-earth', box(3, 1, 7, true).translate(0, -D / 2 - 1.8, SZ - 10).color(faceplate));

// USB ports and power LED along the bottom of the front.
const usbA = Number(ports.value);
const UZ = H * 0.18;
for (let i = 0; i < usbA; i += 1) {
  add(`usb-a-${i}`, box(13, 2, 5.5, true).translate(-20 + i * 16, -D / 2 - 1.5, UZ).color(housing));
  add(`usb-a-tongue-${i}`, box(11, 2.4, 1.6, true).translate(-20 + i * 16, -D / 2 - 1.7, UZ + 1).color(sliderAccent));
}
add('usb-c', extrudeRoundedRect(9, 3.4, 1.7, 2, { axis: 'y' }).translate(14, -D / 2 - 1.5, UZ).color(housing));
add('power-led', cylinder(1, 1.4, 8).rotateX(90).translate(24, -D / 2 - 0.5, UZ + 6).color('#4fd16b'));

// Prong sliders: a tab in a track on each side, plus one on top.
for (const sx of [-1, 1]) {
  add(`slider-track-${sx}`, box(1.5, 26, 8, true).translate(sx * (W / 2 + 0.2), 4, H * 0.55).color(faceplate));
  add(`slider-tab-${sx}`, extrudeRoundedRect(12, 10, 3, 3, { axis: 'x' }).translate(sx > 0 ? W / 2 : -W / 2 - 3, 10, H * 0.55).color(sliderAccent));
}
add('slider-top', extrudeRoundedRect(10, 14, 3, 3).translate(0, 6, H).color(sliderAccent));
add('slider-top-track', box(6, 24, 1, true).translate(0, 6, H + 0.2).color(faceplate));

// Selected prongs standing out of the back (+Y).
const PY = D / 2 + 3;
const PZ = H * 0.5;
if (plug.value === 'EU') {
  for (const sx of [-1, 1]) {
    add(`eu-pin-${sx}`, cylinder(19, 2.4, 12).rotateX(-90).translate(sx * 9.5, PY, PZ).color(prongMetal));
    add(`eu-sleeve-${sx}`, cylinder(9, 2.6, 12).rotateX(-90).translate(sx * 9.5, PY, PZ).color(faceplate));
  }
} else if (plug.value === 'UK') {
  for (const sx of [-1, 1]) add(`uk-pin-${sx}`, box(6.4, 18, 4, true).translate(sx * 11, PY + 9, PZ - 6).color(prongMetal));
  add('uk-earth', box(4, 23, 8, true).translate(0, PY + 11.5, PZ + 10).color(prongMetal));
} else {
  for (const sx of [-1, 1]) add(`us-blade-${sx}`, box(1.6, 16, 6.4, true).translate(sx * 6.3, PY + 8, PZ).color(prongMetal));
}

return p.model();
