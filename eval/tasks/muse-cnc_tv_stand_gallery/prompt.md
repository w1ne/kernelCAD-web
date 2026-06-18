# cnc_tv_stand_gallery (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a gallery-style TV stand with two dividers and an open lower space for baskets or consoles, designed for CNC-machined wood assembly.

## Geometry and Dimensions
Approx. 1720.0 mm × 420.0 mm × 440.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage (supporting a TV, media consoles, and storage baskets).

## Structural Features
Top panel; bottom panel; left side panel; right side panel; two center dividers.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
6

## Component Names
- top_panel
- bottom_panel
- left_side_panel
- right_side_panel
- center_divider_01
- center_divider_02

## Adjustable Parameters
- **width**: 1720.0 (1620.0 ~ 1860.0 mm). Determines the overall span of the TV stand.
- **depth**: 420.0 (320.0 ~ 560.0 mm). Determines the front-to-back footprint of the stand.
- **height**: 440.0 (380.0 ~ 520.0 mm). Determines the vertical elevation of the top surface.
- **thickness**: 18.0 (12.0 ~ 26.0 mm). Controls the material thickness of the vertical support panels.
- **top_thickness**: 18.0 (12.0 ~ 26.0 mm). Controls the material thickness of the top load-bearing panel.
- **bottom_thickness**: 18.0 (12.0 ~ 26.0 mm). Controls the material thickness of the bottom base panel.
- **tab_width**: 18.0 (100.0 ~ 158.0 mm). Controls the width of the interlocking tenons (tabs) for structural joints.
- **corner_radius**: 0.0 (0.0 ~ 20.0 mm). Controls the rounding of the horizontal panel corners for aesthetics and safety.
- **shelf_depth**: 360.0 (260.0 ~ 500.0 mm). Determines the depth of internal shelves or dividers.
- **shelf_thickness**: 18.0 (12.0 ~ 26.0 mm). Controls the material thickness of the internal shelves.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. top_panel
The upper horizontal surface of the TV stand.
* **Component Purpose**: Acts as the primary load-bearing surface for the TV and provides top-level structural locking for the vertical panels.
* **Assembly Direction**: Pressed downwards along the -Z axis onto the vertical panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features mortise slots that align with the top tenons of the side panels and dividers.

### 2. bottom_panel
The lower horizontal base of the TV stand.
* **Component Purpose**: Acts as the structural foundation, resting on the floor and providing localization references (mortises) for all vertical supports.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = 0$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features mortise slots that receive the bottom tenons of the side panels and dividers.

### 3. left_side_panel
The outer left vertical support.
* **Component Purpose**: Transfers the load from the left side of the top panel to the bottom panel, ensuring vertical stability.
* **Assembly Direction**: Inserted downwards along the -Z axis into the bottom panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features protruding tenons on the top and bottom edges.

### 4. right_side_panel
The outer right vertical support.
* **Component Purpose**: Transfers the load from the right side of the top panel to the bottom panel, ensuring vertical stability.
* **Assembly Direction**: Inserted downwards along the -Z axis into the bottom panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features protruding tenons on the top and bottom edges.

### 5. center_divider_01
The first internal vertical support.
* **Component Purpose**: Prevents sagging of the top panel across the wide span and divides the lower space for storage organization.
* **Assembly Direction**: Inserted downwards along the -Z axis into the bottom panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features protruding tenons on the top and bottom edges.

### 6. center_divider_02
The second internal vertical support.
* **Component Purpose**: Works in tandem with the first divider to prevent sagging and further partition the lower storage area.
* **Assembly Direction**: Inserted downwards along the -Z axis into the bottom panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features protruding tenons on the top and bottom edges.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 6-component model:

* **left_side_panel -> bottom_panel** | Joint: interlocking | Note: Bottom tenons of the left panel inserted into the bottom panel's far-left slots.
* **right_side_panel -> bottom_panel** | Joint: interlocking | Note: Bottom tenons of the right panel inserted into the bottom panel's far-right slots.
* **center_divider_01 -> bottom_panel** | Joint: interlocking | Note: Bottom tenons of the first divider inserted into the bottom panel's inner-left slots.
* **center_divider_02 -> bottom_panel** | Joint: interlocking | Note: Bottom tenons of the second divider inserted into the bottom panel's inner-right slots.
* **top_panel -> left_side_panel** | Joint: interlocking | Note: Top panel's far-left slots fit over the top tenons of the left side panel.
* **top_panel -> right_side_panel** | Joint: interlocking | Note: Top panel's far-right slots fit over the top tenons of the right side panel.
* **top_panel -> center_divider_01** | Joint: interlocking | Note: Top panel's inner-left slots fit over the top tenons of the first divider.
* **top_panel -> center_divider_02** | Joint: interlocking | Note: Top panel's inner-right slots fit over the top tenons of the second divider.
