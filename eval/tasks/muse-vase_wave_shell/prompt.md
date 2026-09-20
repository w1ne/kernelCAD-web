# vase_wave_shell (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Create a decorative, shell-like vase with a wavy, twisted outer surface and a hollow interior, designed primarily for aesthetic display.

## Geometry and Dimensions
Approx. 95.0 mm × 95.0 mm × 212.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
N/A (Single solid body)

## Mechanical Condition
Freestanding decorative object; suitable for holding lightweight dried flowers or acting as a standalone aesthetic centerpiece.

## Structural Features
Continuous wavy outer shell; hollow interior cavity; flat base; undulating top lip.

## Special Requirements
Must maintain a continuous, watertight shell (manifold solid) to ensure proper slicing and toolpath generation for 3D printing.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 212.0 (152.0 ~ 292.0 mm). Controls the overall vertical dimension of the vase.
- **wall_thickness**: 3.0 (1.8 ~ 5.0 mm). Determines the shell thickness, ensuring structural integrity and printability without requiring internal supports.
- **steps**: 18 (12.0 ~ 28.0). Defines the vertical resolution of the lofted layers.
- **pts_per_layer**: 108 (84.0 ~ 144.0). Defines the radial resolution of the spline points per layer.
- **wave_count**: 9 (7.0 ~ 13.0). Number of primary undulations/waves distributed around the circumference.
- **twist**: 0.028 (0.008 ~ 0.058). Controls the helical twist of the waves along the Z-axis.
- **secondary_amp**: 1.0 (0.2 ~ 2.2 mm). Amplitude of the secondary wave, adding complex surface texture to the primary undulations.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate radial spline profiles for both the inner and outer shells at varying Z-heights based on the wave and twist parameters.
2. Loft the outer wires to create the exterior surface and the inner wires to create the interior cavity.
3. Cap the bottom and bridge the top lip using ruled surfaces.
4. Sew all surfaces together into a single, closed solid body.

---

### 1. vase_body
The primary and only component of the model.
* **Component Purpose**: Acts as a decorative vessel, providing both the external aesthetic form and the internal containment volume.
* **Assembly Direction**: N/A (Freestanding base component, built vertically along the +Z axis).
* **Connection & Kinematics**: N/A (Single solid body).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 1-component model:

* **vase_body -> Standalone** | Joint: None | Note: Single continuous solid body; no assembly required.
