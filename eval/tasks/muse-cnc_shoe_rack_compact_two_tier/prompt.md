# cnc_shoe_rack_compact_two_tier (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Compact two-tier shoe rack with solid shelves for an entry corner.

## Geometry and Dimensions
Approx. 720.0 mm × 300.0 mm × 420.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage (holding footwear).

## Structural Features
Left side panel; right side panel; two solid shelf panels.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
4

## Component Names
- left_side_panel
- right_side_panel
- shelf_panel_01
- shelf_panel_02

## Adjustable Parameters
- **width**: 720.0 (620.0 ~ 860.0 mm). Controls the overall horizontal span of the shoe rack.
- **depth**: 300.0 (200.0 ~ 440.0 mm). Determines the footprint depth for shoe storage capacity.
- **height**: 420.0 (360.0 ~ 500.0 mm). Controls the overall vertical height of the side support panels.
- **thickness**: 18.0 (12.0 ~ 26.0 mm). Defines the thickness of the side panels, ensuring adequate structural stiffness.
- **tab_width**: 18.0 (100.0 ~ 158.0 mm). Determines the width of the tenons (tabs) used for the joints, affecting connection strength.
- **shelf_depth**: 260.0 (160.0 ~ 400.0 mm). Defines the depth of the individual horizontal shelves.
- **shelf_thickness**: 18.0 (12.0 ~ 26.0 mm). Sets the thickness of the shelf panels to prevent bending under load.
- **include_top_bench**: False (1.0 ~ 28.0). Toggle/threshold parameter to optionally include a top seating bench.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. left_side_panel
The vertical support entity on the left side of the rack.
* **Component Purpose**: Acts as the primary load-bearing structure on the left, transferring weight to the ground and providing mortise slots for shelf insertion. Features a central window cutout to reduce weight and improve aesthetics.
* **Assembly Direction**: Fixed vertical component, positioned at absolute $X = -351.0$ (left side).
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features rectangular cutouts (mortises) at specified shelf heights.

### 2. right_side_panel
The vertical support entity on the right side of the rack.
* **Component Purpose**: Acts as the primary load-bearing structure on the right, transferring weight to the ground and providing mortise slots for shelf insertion. Features a central window cutout.
* **Assembly Direction**: Fixed vertical component, positioned at absolute $X = 351.0$ (right side).
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features rectangular cutouts (mortises) at specified shelf heights.

### 3. shelf_panel_01
The lower horizontal storage platform.
* **Component Purpose**: Provides the primary surface for storing shoes. Acts as a structural cross-member that ties the two side panels together to prevent lateral racking.
* **Assembly Direction**: Inserted horizontally between the side panels at $Z = 70.0$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). The left and right ends feature protruding tabs (tenons) that mate with the slots in the side panels.

### 4. shelf_panel_02
The upper horizontal storage platform.
* **Component Purpose**: Provides the secondary surface for storing shoes. Acts as an additional structural cross-member tying the side panels together.
* **Assembly Direction**: Inserted horizontally between the side panels at $Z = 210.0$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). The left and right ends feature protruding tabs (tenons) that mate with the slots in the side panels.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 4-component model:

* **shelf_panel_01 -> left_side_panel** | Joint: interlocking | Note: Left tabs of the lower shelf inserted into the lower slots of the left panel.
* **shelf_panel_01 -> right_side_panel** | Joint: interlocking | Note: Right tabs of the lower shelf inserted into the lower slots of the right panel.
* **shelf_panel_02 -> left_side_panel** | Joint: interlocking | Note: Left tabs of the upper shelf inserted into the upper slots of the left panel.
* **shelf_panel_02 -> right_side_panel** | Joint: interlocking | Note: Right tabs of the upper shelf inserted into the upper slots of the right panel.
