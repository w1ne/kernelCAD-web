# vase_wave_ripple (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Create a decorative ripple vase with fine lobes, a straightened upper neck, and a hollow interior designed for aesthetic display.

## Geometry and Dimensions
Approx. 82.4 mm × 82.4 mm × 226.0 mm.

## Material
PLA

## Manufacturing Method
FDM 3D Printing

## Connection Method (Joint Type)
N/A (Single continuous body)

## Mechanical Condition
Static decorative display; capable of holding lightweight items such as dried flowers.

## Structural Features
Hollow vase body; rippled/lobed outer wall; flat base; open top neck.

## Special Requirements
The lofted shell must remain a closed, manifold solid to ensure proper slicing and 3D printability.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 226.0 (166.0 ~ 306.0 mm). Controls the overall vertical dimension of the vase.
- **wall_thickness**: 2.8 (1.6 ~ 4.8 mm). Determines the shell thickness, ensuring printability and structural integrity.
- **steps**: 18 (12.0 ~ 28.0). Defines the vertical resolution (number of lofting layers) for the B-Rep generation.
- **pts_per_layer**: 132 (108.0 ~ 168.0). Defines the radial resolution for the spline curves.
- **wave_count**: 12 (10.0 ~ 16.0). Sets the number of primary lobes/ripples around the vase circumference.
- **twist**: 0.02 (0.0 ~ 0.05). Controls the helical twist of the ripples along the Z-axis.
- **secondary_amp**: 0.6 (0.0 ~ 1.8). Sets the amplitude of the secondary (finer) ripples for surface texture.
- **profile_radius**: (10.0 ~ 54.0 mm). Constrains the base radius of the vase profile.
- **wave_amp**: (0.2 ~ 5.2 mm). Controls the amplitude of the primary waves.

## Component Details

### 1. vase_body
The main and only component of the vase, featuring a complex organic exterior and a hollowed interior.
* **Component Purpose**: Acts as a decorative container and aesthetic display piece.
* **Assembly Direction**: N/A (Printed in place, built vertically along the +Z axis).
* **Connection & Kinematics**: N/A (Single continuous body).

---

## Component Assembly Graph (Textual)
vase_body -> Standalone | Joint: N/A | Note: Single continuous solid body; no assembly required.
