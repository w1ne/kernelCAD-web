# cnc_shoe_rack_narrow_three_tier (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a narrow three-tier shoe rack designed for small apartments, featuring closely spaced solid shelves for efficient storage.

## Geometry and Dimensions
Approx. 640.0 mm × 290.0 mm × 720.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage for footwear.

## Structural Features
Left side panel; right side panel; three solid shelf panels.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
5

## Component Names
- left_side_panel
- right_side_panel
- shelf_panel_01
- shelf_panel_02
- shelf_panel_03

## Adjustable Parameters
- **width**: 640.0 (540.0 ~ 780.0 mm). Controls the overall span of the rack and determines the horizontal storage capacity.
- **depth**: 290.0 (190.0 ~ 430.0 mm). Determines the footprint of the rack and the maximum shoe size it can accommodate.
- **height**: 720.0 (660.0 ~ 800.0 mm). Defines the total vertical space occupied by the rack.
- **thickness**: 18.0 (12.0 ~ 26.0 mm). Defines the material thickness of the vertical side panels, ensuring structural stability.
- **tab_width**: 18.0 (100.0 ~ 158.0 mm). Determines the width of the tenon joints connecting the shelves to the side panels, affecting joint strength.
- **shelf_depth**: 250.0 (150.0 ~ 390.0 mm). Defines the depth of the individual horizontal shelves.
- **shelf_thickness**: 18.0 (12.0 ~ 26.0 mm). Defines the material thickness of the shelves to prevent sagging under the weight of footwear.

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
The vertical support structure on the left side.
* **Component Purpose**: Acts as the main load-bearing vertical support and provides mortise slots for the insertion of the shelves.
* **Assembly Direction**: Vertical placement along the Z-axis, positioned at the left extreme of the X-axis.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features three horizontal slots (mortises) cut into the inner face to receive the shelf tabs.

### 2. right_side_panel
The vertical support structure on the right side.
* **Component Purpose**: Acts as the main load-bearing vertical support and provides mortise slots for the insertion of the shelves.
* **Assembly Direction**: Vertical placement along the Z-axis, positioned at the right extreme of the X-axis.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features three horizontal slots (mortises) cut into the inner face to receive the shelf tabs.

### 3~5. shelf_panel_01, shelf_panel_02, shelf_panel_03
The horizontal storage platforms.
* **Component Purpose**: Provides the flat surfaces for storing shoes and structurally ties the two side panels together to prevent lateral sway.
* **Assembly Direction**: Inserted horizontally along the X-axis between the left and right side panels at designated Z-heights.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Both the left and right ends feature protruding tabs (tenons) that fit into the corresponding slots of the side panels.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 5-component model:

* **shelf_panel_01 -> left_side_panel** | Joint: interlocking | Note: Left tab of the bottom shelf inserted into the lower slot of the left side panel.
* **shelf_panel_01 -> right_side_panel** | Joint: interlocking | Note: Right tab of the bottom shelf inserted into the lower slot of the right side panel.
* **shelf_panel_02 -> left_side_panel** | Joint: interlocking | Note: Left tab of the middle shelf inserted into the middle slot of the left side panel.
* **shelf_panel_02 -> right_side_panel** | Joint: interlocking | Note: Right tab of the middle shelf inserted into the middle slot of the right side panel.
* **shelf_panel_03 -> left_side_panel** | Joint: interlocking | Note: Left tab of the top shelf inserted into the upper slot of the left side panel.
* **shelf_panel_03 -> right_side_panel** | Joint: interlocking | Note: Right tab of the top shelf inserted into the upper slot of the right side panel.
