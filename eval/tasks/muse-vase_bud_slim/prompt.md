# vase_bud_slim (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Create a slim bud vase with a narrow mouth and a softly swollen body, intended for aesthetic display and holding small floral arrangements.

## Geometry and Dimensions
Approx. 76.0 mm × 76.0 mm × 208.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Static tabletop display; acts as a lightweight container for single buds or small dried flowers.

## Structural Features
Single hollow vase body; solid bottom base; narrow top opening; lofted curved shell.

## Special Requirements
The final geometry must be sewn into a completely closed, watertight solid shell to ensure structural integrity and proper slicing for 3D printing.

## Planned Component Quantity
1

## Component Names
- Vase body

## Adjustable Parameters
- **height**: 208.0 (148.0 ~ 288.0 mm). Determines the overall vertical extent of the vase.
- **wall_thickness**: 2.4 (1.5 ~ 4.4 mm). Controls the shell thickness; the lower limit ensures printability and structural stability, while the upper limit prevents excessive material use.
- **steps**: 14 (10.0 ~ 24.0). Defines the vertical resolution and the number of lofting sections used to interpolate the smooth profile.
- **profile_radius**: Variable (10.0 ~ 54.0 mm). Controls the radial swelling and narrowing of the vase body at various height fractions (defined by `profile_points`).

## Component Details

### 1. Vase body
The primary and sole component of the model.
* **Component Purpose**: Acts as the functional container and provides the aesthetic outer profile. Formed by lofting outer and inner wire profiles and sewing them with a bottom cap and top ring.
* **Assembly Direction**: N/A (Manufactured as a single piece, built vertically along the +Z axis).
* **Connection & Kinematics**: None (Single continuous body).

---

## Component Assembly Graph (Textual)
Vase body -> Standalone | Joint: None | Note: Single-piece construction; no assembly required.
