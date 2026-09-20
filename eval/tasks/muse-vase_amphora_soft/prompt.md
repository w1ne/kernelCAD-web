# vase_amphora_soft (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Create a soft amphora vase with a lifted shoulder and a slightly flared lip, intended for use as a decorative vessel.

## Geometry and Dimensions
Approx. 80.0 mm × 80.0 mm × 234.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Static decorative display; capable of holding lightweight items such as dried flowers.

## Structural Features
Continuous lofted outer shell; hollow interior cavity; solid bottom base; flared top lip.

## Special Requirements
The final geometry must be successfully sewed into a closed, watertight solid.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 234.0 (174.0 ~ 314.0 mm). Determines the overall vertical extent of the vase.
- **wall_thickness**: 2.5 (1.5 ~ 4.5 mm). Controls the thickness of the vase shell, ensuring structural integrity and printability.
- **steps**: 18 (12.0 ~ 28.0). Defines the vertical resolution and the number of cross-sectional wires used for lofting the surface.
- **profile_radius**: 40.0 (10.0 ~ 56.0 mm). Controls the radial bounds of the amphora profile (derived from the maximum value in the profile points).

## Component Details

### 1. vase_body
The primary and sole component of the model, forming the complete amphora shape.
* **Component Purpose**: Acts as a decorative vessel and containment shell.
* **Assembly Direction**: N/A (Base standalone component, built vertically along the +Z axis).
* **Connection & Kinematics**: Not applicable (Single continuous body).

---

## Component Assembly Graph (Textual)
vase_body -> Standalone | Joint: None | Note: Single continuous solid body; no assembly required.
