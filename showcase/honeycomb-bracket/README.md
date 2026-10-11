# Honeycomb L-bracket (DFM-gated, STEP-ready)

> Honeycomb bracket: filleted L-bracket with a generative hex lattice.

Two 90 × 70 mm legs are fused with a concave fillet in the inside corner (`innerFillet`) and rounded outer edges. Each leg has two Ø5.5 mm M5 clearance holes made with `holes()`, so they are real hole features rather than subtracted cylinders. The lattice is generated, not drawn. A hex grid centred on the bracket width is laid over each leg, and a cell is kept only if the whole hexagon fits inside the frame margin, clears the largest corner fillet the param allows, and stays outside a keep-out ring around every bolt hole. Change `cellSize` or `web` and the pattern regenerates. Beyond the prompt, the script declares an FDM print gate with `dfmSpec` (0.4 mm nozzle, 45° overhang limit, 1.6 mm minimum wall, printed on its side). `kernelcad dfm` passes: thinnest wall 2.0 mm (the lattice web), 0 mm² unsupported overhang, fits the bed. `kernelcad export step` writes a single solid. `kernelcad inspect step` on that file reads back a 90 × 70 × 70 mm bounding box, 46,342 mm³, and the four Ø5.5 through-holes with their axes. The STEP file is not committed; regenerate it with the command below. Params: `thickness`, `innerFillet`, `cellSize`, `web`.

```bash
kernelcad dfm showcase/honeycomb-bracket/honeycomb-bracket.kcad.ts
kernelcad export step showcase/honeycomb-bracket/honeycomb-bracket.kcad.ts -o bracket.step
```

Source: [`honeycomb-bracket.kcad.ts`](honeycomb-bracket.kcad.ts).
