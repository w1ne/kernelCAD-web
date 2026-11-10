// SPDX-License-Identifier: CC0-1.0
// Concentric pipe reducer: a hollow tapered barrel, two raised end collars,
// and a visible seal band make the change in pipe diameter clear in preview.
meta({
  name: 'pipe-reducer',
  license: 'CC0-1.0',
  title: 'Pipe reducer',
  description: 'Concentric hollow reducer with a tapered steel barrel, end collars and an elastomer seal. Size and outlet ratio change the model; barrel, collar and seal colors are independent.',
  tags: ['pipe reducer', 'concentric reducer', 'pipe fitting', 'adapter', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 620,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const reduction = param('reduction', '0.60', { choices: ['0.50', '0.60', '0.75'], label: 'Outlet / inlet ratio' });
const barrel = param('barrel', '#3f6e8c', { label: 'Painted steel barrel' });
const collars = param('collars', '#c5ccd0', { label: 'Zinc-plated steel collars' });
const gasket = param('gasket', '#c95836', { label: 'Red elastomer seal' });

presets({
  dark: { barrel: '#3e484e', collars: '#8f989d', gasket: '#202426' },
  brass: { barrel: '#646f75', collars: '#b0804d', gasket: '#382c23' },
  weathered: { barrel: '#665b4d', collars: '#8b8275', gasket: '#453f38' },
  stainless: { barrel: '#aeb8bd', collars: '#e1e5e6', gasket: '#25292b' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const ratio = Number(reduction.value);
const inletRadius = 22 * s;
const outletRadius = inletRadius * ratio;
const length = 42 * s;
const collarLand = 1.2 * s;
const wall = 3.5 * s;
const taperStart = 4 * s;
const taperEnd = length - taperStart;

// The radial/axial section closes through the bore before it is revolved.
const shell = path()
  .moveTo(inletRadius - collarLand, 0)
  .lineTo(inletRadius - collarLand, taperStart)
  .lineTo(outletRadius - collarLand, taperEnd)
  .lineTo(outletRadius - collarLand, length)
  .lineTo(outletRadius - wall, length)
  .lineTo(inletRadius - wall, 0)
  .close()
  .revolve();

const annulus = (height: number, outerRadius: number, innerRadius: number, z: number) =>
  cylinder(height, outerRadius, 24)
    .subtract(cylinder(height + 2 * s, innerRadius, 24).translate(0, 0, -s))
    .translate(0, 0, z);

// A narrow band crosses the tapered barrel so the elastomer is visible.
const sealZ = length * 0.38;
const sealRadius = inletRadius - collarLand - (inletRadius - outletRadius) * (sealZ / length);
const reducer = assembly('pipe-reducer');
reducer.part('tapered-barrel', shell.color(barrel));
reducer.part('inlet-collar', annulus(4 * s, inletRadius, inletRadius - collarLand, 0).color(collars));
reducer.part('outlet-collar', annulus(4 * s, outletRadius, outletRadius - collarLand, length - 4 * s).color(collars));
reducer.part('elastomer-band', annulus(1.1 * s, sealRadius + 0.55 * s, sealRadius - 0.55 * s, sealZ).color(gasket));

return reducer.model();
