// SPDX-License-Identifier: CC0-1.0
// Open PLC rack with modular I/O cards, status-indicator lenses, side rails and wire duct.
meta({
  name: 'plc-control-rack',
  license: 'CC0-1.0',
  title: 'PLC control rack',
  description: 'Open PLC rack with modular I/O cards, green channel and RUN indicators, red ERROR indicators, steel side rails and wire duct. Controls: overall scale, steel, channel LED, RUN LED and ERROR LED colors.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#667984', { label: 'Structural steel' });
const channelLed = param('channelLed', '#4faf6e', { label: 'Channel status LED lens' });
const runLed = param('runLed', '#4faf6e', { label: 'RUN status LED lens' });
const errorLed = param('errorLed', '#8a4449', { label: 'ERROR status LED lens' });
presets({
  weathered: { steel: '#575851', channelLed: '#438f5c', runLed: '#438f5c', errorLed: '#763e43' },
  highVisibility: { channelLed: '#55cf78', runLed: '#55cf78', errorLed: '#c44e52' },
});
const p = assembly('plc-control-rack');
p.part('rack-base', box(460, 210, 32, true).translate(0, 0, 16).scale(scale).color(steel));
p.part('backplane', box(349.6, 24, 421.2, true).translate(0, 0, 291.6).scale(scale).color(steel));
p.part('top-crossbar', box(414, 36, 26, true).translate(0, 0, 518.4).scale(scale).color(steel));
p.part('io-card-0', box(36.8, 42, 334.8, true).translate(-156.4, -28, 280.8).scale(scale).color(steel));
p.part('channel-led-0', box(9, 8, 9, true).translate(-161.4, -51, 189).scale(scale).color(channelLed));
p.part('run-led-0', box(9, 8, 9, true).translate(-161.4, -51, 213).scale(scale).color(runLed));
p.part('error-led-0', box(9, 8, 9, true).translate(-161.4, -51, 237).scale(scale).color(errorLed));
p.part('io-card-1', box(36.8, 42, 334.8, true).translate(-104.3, -28, 280.8).scale(scale).color(steel));
p.part('channel-led-1', box(9, 8, 9, true).translate(-109.3, -51, 189).scale(scale).color(channelLed));
p.part('run-led-1', box(9, 8, 9, true).translate(-109.3, -51, 213).scale(scale).color(runLed));
p.part('error-led-1', box(9, 8, 9, true).translate(-109.3, -51, 237).scale(scale).color(errorLed));
p.part('io-card-2', box(36.8, 42, 334.8, true).translate(-52.1, -28, 280.8).scale(scale).color(steel));
p.part('channel-led-2', box(9, 8, 9, true).translate(-57.1, -51, 189).scale(scale).color(channelLed));
p.part('run-led-2', box(9, 8, 9, true).translate(-57.1, -51, 213).scale(scale).color(runLed));
p.part('error-led-2', box(9, 8, 9, true).translate(-57.1, -51, 237).scale(scale).color(errorLed));
p.part('io-card-3', box(36.8, 42, 334.8, true).translate(0, -28, 280.8).scale(scale).color(steel));
p.part('channel-led-3', box(9, 8, 9, true).translate(-5, -51, 189).scale(scale).color(channelLed));
p.part('run-led-3', box(9, 8, 9, true).translate(-5, -51, 213).scale(scale).color(runLed));
p.part('error-led-3', box(9, 8, 9, true).translate(-5, -51, 237).scale(scale).color(errorLed));
p.part('io-card-4', box(36.8, 42, 334.8, true).translate(52.1, -28, 280.8).scale(scale).color(steel));
p.part('channel-led-4', box(9, 8, 9, true).translate(47.1, -51, 189).scale(scale).color(channelLed));
p.part('run-led-4', box(9, 8, 9, true).translate(47.1, -51, 213).scale(scale).color(runLed));
p.part('error-led-4', box(9, 8, 9, true).translate(47.1, -51, 237).scale(scale).color(errorLed));
p.part('io-card-5', box(36.8, 42, 334.8, true).translate(104.3, -28, 280.8).scale(scale).color(steel));
p.part('channel-led-5', box(9, 8, 9, true).translate(99.3, -51, 189).scale(scale).color(channelLed));
p.part('run-led-5', box(9, 8, 9, true).translate(99.3, -51, 213).scale(scale).color(runLed));
p.part('error-led-5', box(9, 8, 9, true).translate(99.3, -51, 237).scale(scale).color(errorLed));
p.part('io-card-6', box(36.8, 42, 334.8, true).translate(156.4, -28, 280.8).scale(scale).color(steel));
p.part('channel-led-6', box(9, 8, 9, true).translate(151.4, -51, 189).scale(scale).color(channelLed));
p.part('run-led-6', box(9, 8, 9, true).translate(151.4, -51, 213).scale(scale).color(runLed));
p.part('error-led-6', box(9, 8, 9, true).translate(151.4, -51, 237).scale(scale).color(errorLed));
p.part('wire-duct', box(441.6, 48, 60, true).translate(0, -46.2, 64.8).scale(scale).color(steel));

return p.model();
