// SPDX-License-Identifier: CC0-1.0
// Fiber dome closure: Vertical dome splice enclosure with a domed-looking cap, lower collar and four cable ports.
// The dome, its cap and the port base are one moulded thermoplastic housing; only the
// cable ports and their jackets take the darker engineering polymer.

meta({
  name: "fiber-dome-closure",
  license: 'CC0-1.0',
  title: "Fiber dome closure",
  description: "Vertical dome splice enclosure with a domed-looking cap, lower collar and four cable ports. Knobs: overall scale; moulded thermoplastic closure shell, engineering polymer and cable jacket.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const closureShell = param('closureShell', '#4f585c', { label: 'Closure shell (moulded thermoplastic)' });
const polymer = param('polymer', '#315267', { label: 'Engineering polymer and cable jacket' });
presets({
  fieldSite: {
    closureShell: '#3a4245',
    polymer: '#263a37',
  },
  highVisibility: {
    closureShell: '#e0aa18',
    polymer: '#27363c',
  },
});

const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("fiber-dome-closure");
p.part("base", c(0, 0, 0, 90, 170, 8).color(closureShell));
p.part("body", c(0, 0, 90, 560, 140, 8).color(closureShell));
p.part("dome", c(0, 0, 650, 140, 155, 8).color(closureShell));
p.part("port-a", c(-105, -105, 20, 80, 42, 8).color(polymer));
p.part("port-b", c(105, -105, 20, 80, 42, 8).color(polymer));
p.part("port-c", c(-105, 105, 20, 80, 42, 8).color(polymer));
p.part("port-d", c(105, 105, 20, 80, 42, 8).color(polymer));

return p.model();
