# vase_wave_dune (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Create a dune-like decorative vase featuring a broad body with slow rolling, mathematically driven wave surface patterns.

## Geometry and Dimensions
Approx. 105.0 mm × 105.0 mm × 188.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable (Single solid body)

## Mechanical Condition
Freestanding decorative object, suitable for standalone display or holding lightweight items (e.g., dried flowers).

## Structural Features
Single hollow body; closed bottom base; open top rim; undulating lofted outer wall.

## Special Requirements
The generated geometry must maintain a continuous, manifold shell to ensure successful slicing and 3D printing.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 188.0 (128.0 ~ 268.0 mm). Controls the overall vertical dimension of the vase.
- **wall_thickness**: 3.2 (2.0 ~ 5.2 mm). Determines the shell thickness for structural integrity and printability.
- **steps**: 16 (10.0 ~ 26.0). Defines the vertical resolution (number of layers) for the lofting operation.
- **pts_per_layer**: 96 (72.0 ~ 132.0). Defines the radial resolution (number of points) for the spline curves on each layer.
- **wave_count**: 4 (3.0 ~ 8.0). Number of primary wave undulations around the circumference.
- **twist**: 0.012 (0.0 ~ 0.042). Controls the helical twist of the waves along the Z-axis.
- **secondary_amp**: 0.4 (0.0 ~ 1.6). Amplitude of the secondary high-frequency waves for surface texture.
- **profile_radius**: 48.0 (14.0 ~ 64.0 mm). Base radius range for the vase profile.
- **wave_amp**: 4.6 (0.8 ~ 6.6 mm). Amplitude of the primary waves.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate inner and outer spline profiles layer by layer based on mathematical wave functions.
2. Loft the profiles to create the inner and outer shells.
3. Cap the top and bottom with ruled surfaces and faces.
4. Sew all surfaces into a single solid body.

---

### 1. vase_body
The main and only structural entity of the vase.
* **Component Purpose**: Acts as the decorative shell and container.
* **Assembly Direction**: Built vertically from the base (+Z axis) during 3D printing.
* **Connection & Kinematics**: Not applicable (Single solid body).

---

## Component Assembly Graph (Textual)
vase_body -> Standalone | Joint: None | Note: Single continuous part.
