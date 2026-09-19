# vase_wave_scallop (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Create a decorative scalloped vase with broad lobes, a small pinched opening, and a wave-like organic surface for aesthetic display.

## Geometry and Dimensions
Approx. 90.0 mm × 90.0 mm × 206.0 mm.

## Material
PLA

## Manufacturing Method
FDM 3D Printing

## Connection Method (Joint Type)
Not applicable (Single-piece component)

## Mechanical Condition
Static decorative display, freestanding container.

## Structural Features
Single continuous hollow shell; scalloped outer lobes; pinched top opening; flat bottom base.

## Special Requirements
Maintain smooth lofting between spline layers to prevent non-manifold geometry; ensure continuous outer perimeters for optimal 3D printing without supports.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 206.0 (146.0 ~ 286.0 mm). Controls the overall vertical dimension of the vase.
- **wall_thickness**: 3.0 (1.8 ~ 5.0 mm). Determines the shell thickness for structural rigidity and printability.
- **steps**: 18 (12.0 ~ 28.0). Defines the vertical resolution (number of lofting layers) for the smooth surface generation.
- **pts_per_layer**: 108 (84.0 ~ 144.0). Controls the horizontal resolution of the spline curves forming the scalloped waves.
- **wave_count**: 5 (3.0 ~ 9.0). Sets the number of primary lobes/scallops around the circumference.
- **twist**: 0.008 (0.0 ~ 0.038). Determines the helical rotation of the wave pattern along the Z-axis.
- **secondary_amp**: 0.7 (0.0 ~ 1.9 mm). Adds secondary high-frequency ripples to the primary wave profile for complex texturing.
- **profile_radius**: (10.0 ~ 54.0 mm). Controls the base radial profile of the vase at various heights.
- **wave_amp**: (0.2 ~ 8.2 mm). Controls the depth/amplitude of the primary scalloped lobes.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate inner and outer spline wires based on radial and wave amplitude functions.
2. Loft the wires vertically to create the inner and outer shells.
3. Cap the top and bottom with ruled surfaces/faces and sew into a single watertight solid.

---

### 1. vase_body
The main and only structural body of the vase.
* **Component Purpose**: Acts as a decorative container and aesthetic display piece.
* **Assembly Direction**: Not applicable (freestanding base positioned at absolute Z = 0).
* **Connection & Kinematics**: Not applicable (Single-piece component).

---

## Component Assembly Graph (Textual)
* **vase_body -> Standalone** | Joint: None | Note: Single continuous part; no assembly required.
