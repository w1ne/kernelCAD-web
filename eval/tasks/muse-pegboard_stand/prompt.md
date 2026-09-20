# pegboard_stand (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a freestanding pegboard stand designed for desktop organization, tool storage, and display.

## Geometry and Dimensions
Approx. 400.0 mm × 120.0 mm × 520.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Desktop storage and display; load-bearing for hanging small tools, accessories, or stationery.

## Structural Features
Perforated vertical panel; horizontal stabilizing base.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
2

## Component Names
- perforated_panel
- base

## Adjustable Parameters
- **width**: 400 (200.0 ~ 800.0 mm). Determines the overall width of the pegboard and base.
- **height**: 500 (300.0 ~ 800.0 mm). Determines the vertical storage area of the pegboard.
- **panel_thickness**: 8 (5.0 ~ 15.0 mm). Ensures sufficient structural stiffness for hanging items without excessive weight or material use.
- **spacing**: 25 (10.0 ~ 50.0 mm). Controls the density of the pegboard hole grid for accessory placement.
- **hole_radius**: 3 (1.0 ~ 8.0 mm). Sized to fit standard pegboard hooks and pegs.
- **base_depth**: 120 (60.0 ~ 200.0 mm). Provides anti-overturning stability in the front-to-back (Y-axis) direction.
- **base_height**: 20 (10.0 ~ 40.0 mm). Provides enough thickness to accommodate the blind mortise slot and ensure base rigidity.
- **board_corner_radius**: 8 (0.0 ~ 30.0 mm). Intended to round the sharp edges of the board for safety and aesthetics.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. perforated_panel
The main vertical storage interface of the stand.
* **Component Purpose**: Provides a standardized grid of through-holes for attaching hooks, shelves, and mounts to hold items.
* **Assembly Direction**: Inserted downwards along the -Z axis into the base.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The bottom edge features a centered rectangular tenon that fits into the base.

### 2. base
The horizontal support structure.
* **Component Purpose**: Acts as the stabilizing footprint to transfer the load to the desktop and prevent the vertical panel from tipping over under eccentric loads.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = 0$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features a central blind slot (mortise) on its top face to receive the panel's tenon.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 2-component model:

* **perforated_panel -> base** | Joint: interlocking | Note: Panel bottom tenon inserted into the base's top central slot.
