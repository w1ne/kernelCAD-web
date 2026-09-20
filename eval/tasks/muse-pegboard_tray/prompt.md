# pegboard_tray (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a rectangular storage tray featuring a raised perimeter lip and a standardized pegboard hole grid on the base for organizing tools and components.

## Geometry and Dimensions
Approx. 600.0 mm × 400.0 mm × 25.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Not applicable (Single monolithic component)

## Mechanical Condition
Load-bearing storage and organization of tools or hardware items on a flat surface.

## Structural Features
Perforated base panel; four raised perimeter lips (front, back, left, right).

## Special Requirements
The component must be machined or formed as a single continuous solid body.

## Planned Component Quantity
1

## Component Names
- tray_panel

## Adjustable Parameters
- **width**: 600 (200.0 ~ 1200.0 mm). Defines the overall X-axis dimension of the tray.
- **height**: 400 (200.0 ~ 1200.0 mm). Defines the overall Y-axis dimension (depth) of the tray.
- **thickness**: 5 (3.0 ~ 24.0 mm). Determines the structural thickness of the bottom pegboard panel to support the load.
- **spacing**: 25 (10.0 ~ 50.0 mm). Controls the center-to-center distance between the pegboard holes, ensuring compatibility with standard peg hooks.
- **hole_radius**: 3 (1.0 ~ 8.0 mm). Sets the size of the pegboard holes; must match the intended insertion hardware.
- **lip_thickness**: 5 (3.0 ~ 15.0 mm). Defines the wall thickness of the perimeter lips to provide adequate edge rigidity.
- **lip_height**: 20 (10.0 ~ 50.0 mm). Sets the height of the perimeter lips above the base panel to effectively contain loose items.

## Component Details

### 1. tray_panel
The main and only body of the pegboard tray.
* **Component Purpose**: Provides a flat, perforated surface for peg insertion and a raised boundary to prevent items from falling off the edges.
* **Assembly Direction**: Not applicable (Standalone part).
* **Connection & Kinematics**: Not applicable (Single component).

---

## Component Assembly Graph (Textual)
tray_panel -> Standalone | Joint: None | Note: Single monolithic component.
