# pen_holder_print_tri_cluster (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
A one-piece, three-cell clustered pen organizer designed for desktop stationery storage.

## Geometry and Dimensions
Approx. 88.0 mm × 83.4 mm × 108.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Desktop storage, stationary load-bearing for pens, pencils, and other cylindrical stationery items.

## Structural Features
Three clustered cylindrical cells; unified solid base; shared intersecting inner walls.

## Special Requirements
Keep assembly split unchanged. The model must be exported as a single, continuous solid body to ensure printability without assembly.

## Planned Component Quantity
1

## Component Names
- printed_body

## Adjustable Parameters
- **cell_radius**: 24.0 (18.0 ~ 48.0 mm). Determines the internal storage capacity and diameter of each individual compartment.
- **wall_height**: 108.0 (80.0 ~ 148.0 mm). Controls the overall height of the organizer to adequately support various pen lengths without tipping over.
- **wall_thickness**: 3.0 (2.0 ~ 5.0 mm). Ensures structural rigidity and provides sufficient thickness for FDM wall line generation.
- **base_thickness**: 4.0 (2.8 ~ 6.0 mm). Provides a solid bottom to prevent items from falling through and adds lower-center-of-gravity weight for stability.
- **center_spacing**: 34.0 (18.0 ~ 58.0 mm). Defines the distance between the centers of the three cells, affecting the overall footprint and the degree of intersection/overlap between the cylinders.

## Component Details

### 1. printed_body
The main and only component of the pen organizer.
* **Component Purpose**: Acts as the complete structural and functional body, providing three distinct compartments for organizing pens.
* **Assembly Direction**: Not applicable (printed in place vertically from the base along the +Z axis).
* **Connection & Kinematics**: Not Applicable (Monolithic part; fully constrained internally).

---

## Component Assembly Graph (Textual)
printed_body -> Standalone | Joint: None | Note: Monolithic single-piece 3D printed structure; no physical assembly required.
