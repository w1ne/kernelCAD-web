# Sedan study, E46 proportions: source provenance

`e46-sedan.kcad.ts` is a gallery/demo study of a four-door compact executive
sedan with the proportions and surface language of the 1998–2001 BMW E46
3 Series saloon (pre-facelift). It carries **no maker logos, roundels or
lettering**. It is not a cookbook recipe and is not a licensed replica.

Nothing third-party is redistributed in this directory. The only inputs are
published dimensions (facts) and landmark positions read from an openly
licensed drawing. No image or mesh is committed.

## Published dimensions (facts)

| quantity | value used | source (fetched 2026-10-10/11) |
|---|---|---|
| length | 4471 mm | auto-data.net 320i and 330i sedan pages; carsguide.com.au 2000 320i; vehiclesizes.com E46 sedan; ultimatespecs.com 320d sedan; carsized.com (447.1 cm) |
| width (no mirrors) | 1739 mm | same sources |
| width incl. mirrors | 1932 mm (reference only) | vehiclesizes.com E46 sedan 1998 |
| height | 1415 mm | auto-data.net, carsguide, ultimatespecs (vehiclesizes gives 1415–1434) |
| wheelbase | 2725 mm | auto-data.net, carsguide, ultimatespecs, en.wikipedia.org/wiki/BMW_3_Series_(E46) |
| front / rear track | 1481 / 1488 mm | auto-data.net 320i sedan (330i page: 1471 / 1483); ultimatespecs gives 1481 / 1488 as "front/rear axle" |
| tyres | 205/55 R16 → Ø632 mm (16 × 25.4 + 2 × 0.55 × 205) | gebrauchtwagenberater.de (325i/328i/330i), vehiclesizes.com |
| ground clearance | 107 mm unladen (carsguide), 130 mm max (carsized); the model's sill sits at about 200 mm | carsguide.com.au, carsized.com |
| Cd | 0.29 (context only) | ultimatespecs.com |

URLs:

- <https://www.auto-data.net/en/bmw-3-series-sedan-e46-320i-150hp-automatic-21139>
- <https://www.auto-data.net/en/bmw-3-series-sedan-e46-330i-231hp-9990>
- <https://www.carsguide.com.au/bmw/3-series/320i/car-dimensions/2000>
- <https://www.vehiclesizes.com/cars/bmw/3-series/3-series-sedan-e46-1998>
- <https://www.ultimatespecs.com/car-specs/BMW/4951/BMW-E46-3-Series-Sedan-320d.html>
- <https://www.carsized.com/en/cars/compare/bmw-3-1997-sedan-vs-audi-a4-1994-sedan/>
- <https://gebrauchtwagenberater.de/bmw-3er-e46-technische-daten-abmessungen/>
- <https://en.wikipedia.org/wiki/BMW_3_Series_(E46)>

**Not published by any source found:** front and rear overhang. The model uses
front overhang 770 mm (rear = 4471 − 2725 − 770 = 976 mm), read from the
reference side view below (front hub at ≈ 0.17–0.19 of the length). This is an
estimate and the main known dimensional uncertainty.

## Shape reference (landmarks only)

- **1998 BMW 3-Series E46 Sedan blueprint**, Outlines (getoutlines.com),
  listing <https://getoutlines.com/cbr.info/b/358>, free raster
  `https://getoutlines.com/blueprints/car/bmw/bmw-3-sedan-e46.gif` (1000 × 547,
  side / top / front / rear views). The listing states **License: Creative
  Commons Attribution 4.0** (<http://creativecommons.org/licenses/by/4.0/>).
  Attribution: "1998 BMW 3-Series E46 Sedan blueprint, Outlines
  (getoutlines.com), CC BY 4.0".
- How it was used: this build environment's egress policy blocks
  getoutlines.com, wikimedia, sketchfab and the other blueprint and mesh hosts
  for direct download. The drawing was read only through the hosted kernelCAD
  `trace_from_image` tool (via an images.weserv.nl GIF→PNG conversion). It
  returned coarse view bounding boxes and landmark positions (view layout,
  wheel hubs at ≈ 0.19 / 0.79 of the side-view width, roof peak at ≈ 0.48,
  cowl / rear-window base positions, belt height). Those landmarks, scaled to
  the published length, set the station knots for the bonnet length, cabin
  position, roof peak and deck. **No pixel-exact silhouette was extracted.** The
  section shapes, crease, lamp and grille outlines were drawn to match the
  car's known features (listed below), not traced.
- Not used: 3dmodels.org and the-blueprints.com drawings (royalty-free or
  commercial terms, not open), Sketchfab / CGTrader E46 meshes (not reachable,
  and none found under CC0/CC-BY).

## What the geometry encodes

- Lower body: monotone-cubic longitudinal tables (sill, widest line, shoulder
  crease, belt / bonnet / deck edge and crown, plan-view half-widths) sampled
  at 37 graded stations. Each station is a closed degree-3 `nurbsSegment`
  section, lofted in 3-span runs.
- Shoulder crease: three nearly coincident control points per section, with
  a slight undercut below. It rises from 750 mm at the nose to 914 mm at the
  tail, as on the real car.
- Greenhouse: separate loft (15 stations), roof peak 1415 mm at s ≈ 2450 mm,
  tumblehome from the belt to the roof rail.
- Daylight opening with a B-pillar, a fixed rear quarter light and a
  **Hofmeister kink** (the rear lower corner of the glass turns forward).
- 4 mm × 3.5 mm panel-gap grooves: bonnet, four door shut lines, door
  bottoms, boot lid, bumper tops, fuel flap.
- Front: twin kidney recesses (45 mm deep) with chrome surrounds and slats;
  four round lamps under two lenses; indicator strips; lower intake; fog lamps.
- Rear: L-shaped tail lamps wrapping round the quarter panel, with amber and
  reverse inserts; bumper strip; dark diffuser band; exhaust tip.
- Wheels: 205/55 R16 tyre section (revolved, rounded shoulders), 16" five
  double-spoke rims, Ø300 brake discs, calipers, dark wheel-well liners.
- Paint: Titanium Silver metallic (approximate sRGB); black window trim; dark
  glass.

## Tooling

- `compare.py`: builds render-vs-reference composites. Because the reference
  drawing cannot be stored or downloaded here, the "reference" panel is the
  published-dimension frame: length × height box, axle lines, Ø632 tyre
  circles, width and track lines. The render is shown with the same frame on
  top, at the same scale.
