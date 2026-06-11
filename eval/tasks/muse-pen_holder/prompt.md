# pen_holder (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a cylindrical desktop pen holder designed for organizing stationery and writing instruments.

## Geometry and Dimensions
Approx. 100.0 mm × 100.0 mm × 150.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Desktop storage, non-load-bearing stationery organization.

## Structural Features
Cylindrical outer wall; flat circular base; hollow interior cavity.

## Special Requirements
Maintain uniform wall and base thickness to ensure consistent material extrusion and structural stability during 3D printing.

## Planned Component Quantity
1

## Component Names
- cylindrical_pen_cup

## Adjustable Parameters
- **height_of_cylinder**: 150 (60.0 ~ 300.0 mm). Determines the vertical capacity for holding writing instruments of various lengths without tipping over.
- **radius_of_cylinder**: 50 (15.0 ~ 120.0 mm). Defines the footprint and internal storage volume of the pen holder.
- **thickness**: 3 (1.0 ~ 8.0 mm). Controls the wall and base thickness, ensuring adequate structural integrity and printability.

## Component Details

### 1. cylindrical_pen_cup
The main and only body of the pen holder, formed by subtracting a smaller internal cylinder from a larger external cylinder.
* **Component Purpose**: Contains and supports pens vertically on a flat surface.
* **Assembly Direction**: N/A (Standalone part).
* **Connection & Kinematics**: N/A (Standalone part).

---

## Component Assembly Graph (Textual)
cylindrical_pen_cup -> Standalone | Joint: None | Note: Monolithic design, no assembly required.
