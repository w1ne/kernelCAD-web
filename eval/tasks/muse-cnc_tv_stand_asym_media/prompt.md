# cnc_tv_stand_asym_media (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct an asymmetric media TV stand with two off-center dividers to create varied bay widths, designed for CNC-machined wood assembly.

## Geometry and Dimensions
Approx. 1640.0 mm × 420.0 mm × 500.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage for media equipment and television displays.

## Structural Features
Top panel; bottom panel; left side panel; right side panel; two center dividers; three shelf segments.

## Special Requirements
Keep assembly split unchanged. Ensure all tab-and-slot (mortise and tenon) features account for tool radius offsets during CNC machining.

## Planned Component Quantity
9

## Component Names
- top_panel
- bottom_panel
- left_side_panel
- right_side_panel
- center_divider_01
- center_divider_02
- shelf_l01_b01
- shelf_l01_b02
- shelf_l01_b03

## Adjustable Parameters
- **width**: 1640.0 (1540.0 ~ 1780.0 mm). Determines the overall horizontal span of the TV stand.
- **depth**: 420.0 (320.0 ~ 560.0 mm). Determines the footprint depth, ensuring stability and adequate space for media devices.
- **height**: 500.0 (440.0 ~ 580.0 mm). Sets the viewing height of the stand.
- **thickness**: 18.0 (12.0 ~ 26.0 mm). Standard sheet material thickness for vertical structural integrity.
- **top_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the top load-bearing panel.
- **bottom_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the bottom base panel.
- **tab_width**: 18.0 (100.0 ~ 158.0 mm). Width of the mortise and tenon tabs used for interlocking the panels.
- **corner_radius**: 0.0 (0.0 ~ 20.0 mm). Softens the outer corners of the horizontal panels for safety and aesthetics.
- **shelf_depth**: 360.0 (260.0 ~ 500.0 mm). Depth of the internal storage shelves, slightly recessed from the main frame.
- **shelf_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the internal shelf segments.

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
The main upper load-bearing surface.
* **Component Purpose**: Supports the television and ties the top of all vertical supports together to prevent lateral racking.
* **Assembly Direction**: Pressed downwards along the -Z axis onto the vertical panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features slotted mortises on its underside to receive the top tabs of the side panels and dividers.

### 2. bottom_panel
The main base surface.
* **Component Purpose**: Provides ground support, distributes the structural load, and ties the bottom of the vertical supports together.
* **Assembly Direction**: Fixed base component, positioned at the bottom of the assembly.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features slotted mortises to receive the bottom tabs of the side panels and dividers.

### 3. left_side_panel
The left outer vertical support.
* **Component Purpose**: Bears the vertical load on the left extremity and encloses the stand.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features protruding tabs on the top and bottom edges, and mortise slots on the inner face for the shelf.

### 4. right_side_panel
The right outer vertical support.
* **Component Purpose**: Bears the vertical load on the right extremity and encloses the stand.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features protruding tabs on the top and bottom edges, and mortise slots on the inner face for the shelf.

### 5. center_divider_01
The first internal vertical support.
* **Component Purpose**: Provides intermediate vertical support and divides the stand to create the first asymmetric bay.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features top/bottom tabs and side slots for shelf insertion.

### 6. center_divider_02
The second internal vertical support.
* **Component Purpose**: Provides intermediate vertical support and divides the stand to create the second and third asymmetric bays.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features top/bottom tabs and side slots for shelf insertion.

### 7. shelf_l01_b01
The horizontal storage surface for the first bay.
* **Component Purpose**: Provides internal storage space between the left side panel and the first center divider.
* **Assembly Direction**: Inserted horizontally along the X/Y axis into the vertical supports.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features side tabs that lock into the vertical panels.

### 8. shelf_l01_b02
The horizontal storage surface for the second bay.
* **Component Purpose**: Provides internal storage space between the two center dividers.
* **Assembly Direction**: Inserted horizontally along the X/Y axis into the vertical supports.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features side tabs that lock into the vertical dividers.

### 9. shelf_l01_b03
The horizontal storage surface for the third bay.
* **Component Purpose**: Provides internal storage space between the second center divider and the right side panel.
* **Assembly Direction**: Inserted horizontally along the X/Y axis into the vertical supports.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features side tabs that lock into the vertical panels.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 9-component model:

* **left_side_panel -> bottom_panel** | Joint: interlocking | Note: Bottom tabs inserted into the bottom panel's left-most slots.
* **right_side_panel -> bottom_panel** | Joint: interlocking | Note: Bottom tabs inserted into the bottom panel's right-most slots.
* **center_divider_01 -> bottom_panel** | Joint: interlocking | Note: Bottom tabs inserted into the bottom panel's inner-left slots.
* **center_divider_02 -> bottom_panel** | Joint: interlocking | Note: Bottom tabs inserted into the bottom panel's inner-right slots.
* **shelf_l01_b01 -> left_side_panel & center_divider_01** | Joint: interlocking | Note: Suspended horizontally between the left panel and first divider.
* **shelf_l01_b02 -> center_divider_01 & center_divider_02** | Joint: interlocking | Note: Suspended horizontally between the two center dividers.
* **shelf_l01_b03 -> center_divider_02 & right_side_panel** | Joint: interlocking | Note: Suspended horizontally between the second divider and right panel.
* **top_panel -> All Vertical Panels** | Joint: interlocking | Note: Top panel slots fit over the top tabs of the left side, right side, and both center dividers.
