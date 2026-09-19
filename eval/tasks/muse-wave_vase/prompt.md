# wave_vase (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Create an aesthetic, parametric vase featuring a twisted, corrugated outer profile and a hollow interior, primarily intended for decorative desktop display.

## Geometry and Dimensions
Approx. 190.0 mm × 190.0 mm × 250.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
N/A (Single solid body)

## Mechanical Condition
Desktop decoration, non-load-bearing aesthetic display, or holding lightweight dried flowers.

## Structural Features
Twisted wavy outer shell; hollow interior cavity; solid flat base; top rim.

## Special Requirements
The final geometry must be sewed and exported as a single closed manifold solid to ensure proper slicing for 3D printing.

## Planned Component Quantity
1

## Component Names
- wave_vase_body

## Adjustable Parameters
- **base_radius**: 50 (20.0 ~ 120.0 mm). Determines the base footprint and the starting width of the vase.
- **height**: 250 (120.0 ~ 420.0 mm). Controls the overall vertical dimension of the vase.
- **profile_amp**: 40 (0.0 ~ 80.0 mm). Controls the outward bulge (amplitude) of the vase's overall silhouette.
- **wave_amp**: 5 (0.0 ~ 20.0 mm). Defines the depth and prominence of the surface ripples/corrugations.
- **thickness**: 4 (1.0 ~ 10.0 mm). Sets the wall thickness between the inner and outer lofted shells to ensure printability and structural integrity.
- **steps**: 20 (8 ~ 40). Resolution parameter defining the number of vertical layers used for lofting the shape.
- **pts_per_layer**: 100 (48 ~ 180). Resolution parameter defining the number of points used to construct the horizontal splines.
- **twist**: 0.05 (0.0 ~ 0.12). Defines the helical rotation rate of the waves along the Z-axis, creating the twisting effect.
- **wave_count**: 8 (3 ~ 16). Sets the number of wave ridges distributed around the perimeter of the vase.

## Component Details

### 1. wave_vase_body
The main and only component of the model.
* **Component Purpose**: Acts as a decorative container.
* **Assembly Direction**: N/A (Standalone base component).
* **Connection & Kinematics**: N/A (Single continuous body).

---

## Component Assembly Graph (Textual)
wave_vase_body -> Standalone | Joint: None | Note: Single continuous body constructed from sewed inner/outer lofts and end faces.
