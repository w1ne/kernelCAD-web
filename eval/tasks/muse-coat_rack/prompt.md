# coat_rack (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a wooden coat rack featuring upper and lower hanging cross rails and a slatted bottom storage shelf, designed for dowel-based assembly.

## Geometry and Dimensions
Approx. 530.0 mm × 360.0 mm × 1700.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Nailing

## Mechanical Condition
Load-bearing storage for hanging clothing and placing accessories on the bottom shelf.

## Structural Features
Four vertical uprights; top and bottom side rails; upper and lower cross rails (acting as hanging pegs); shelf rails; slatted bottom shelf.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
23

## Component Names
- right_front_upright
- right_back_upright
- left_front_upright
- left_back_upright
- right_bottom_rail
- left_bottom_rail
- right_top_rail
- left_top_rail
- upper_front_cross
- upper_back_cross
- lower_front_cross
- lower_back_cross
- left_shelf_rail
- right_shelf_rail
- shelf_slat_01
- shelf_slat_02
- shelf_slat_03
- shelf_slat_04
- shelf_slat_05
- shelf_slat_06
- shelf_slat_07
- shelf_slat_08
- shelf_slat_09

## Adjustable Parameters
- **rack_width**: 500.0 (350.0 ~ 700.0 mm). Defines the overall width of the rack, ensuring adequate hanging space without compromising structural stability.
- **rack_depth**: 350.0 (250.0 ~ 500.0 mm). Defines the depth footprint, balancing the anti-overturning base with spatial constraints.
- **rack_height**: 1700.0 (1400.0 ~ 2000.0 mm). Defines the total height of the uprights to accommodate long coats.
- **peg_height_upper**: 1500.0 (1300.0 ~ 1800.0 mm). Sets the Z-height for the upper hanging cross rails for standard adult reach.
- **peg_height_lower**: 1200.0 (900.0 ~ 1400.0 mm). Sets the Z-height for the lower hanging cross rails for shorter garments or accessible reach.
- **shelf_height**: 150.0 (80.0 ~ 300.0 mm). Sets the Z-height for the bottom storage shelf, keeping items off the floor.
- **board_thickness**: 10.0 (6.0 ~ 16.0 mm). Thickness of the timber boards used, ensuring sufficient material for blind dowel holes.
- **board_width**: 30.0 (20.0 ~ 45.0 mm). Width of the timber boards used, providing structural stiffness to the frame.
- **slat_gap**: 7.0 (3.0 ~ 12.0 mm). Spacing between adjacent shelf slats, dynamically determining the total number of slats based on rack depth.
- **hole_radius**: 1.0 (0.5 ~ 3.0 mm). Radius of the dowel holes for assembly alignment and connection.
- **hole_depth**: 3.0 (1.0 ~ 8.0 mm). Depth of the blind dowel holes to ensure they do not pierce through the outer faces of the boards.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1~4. Uprights (Right Front, Right Back, Left Front, Left Back)
The primary vertical support structures of the coat rack.
* **Component Purpose**: Vertical support. Transfers the load to the ground and provides dowel hole interfaces on the inner faces for side rails, shelf rails, and cross rails.
* **Assembly Direction**: Vertical base components, positioned upright along the Z-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features blind holes on the X and Y inner faces.

### 5~8. Side Rails (Right Bottom, Left Bottom, Right Top, Left Top)
The horizontal depth-wise bracing components.
* **Component Purpose**: Connects the front and back uprights to ensure structural stability and prevent racking in the Y-Z plane.
* **Assembly Direction**: Inserted horizontally along the Y-axis between the front and back uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features dowel holes at both ends mating with the uprights.

### 9~12. Cross Rails (Upper Front, Upper Back, Lower Front, Lower Back)
The horizontal width-wise bracing and functional hanging components.
* **Component Purpose**: Connects the left and right uprights to prevent racking in the X-Z plane, while simultaneously acting as the primary hanging pegs for garments.
* **Assembly Direction**: Inserted horizontally along the X-axis between the left and right uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features dowel holes at both ends mating with the uprights.

### 13~14. Shelf Rails (Left, Right)
The horizontal supports for the bottom shelf.
* **Component Purpose**: Connects the front and back uprights at the designated shelf height and provides vertical dowel holes on the top face to mount the shelf slats.
* **Assembly Direction**: Inserted horizontally along the Y-axis between the front and back uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations).

### 15~23. Shelf Slats (01 to 09)
The surface components of the bottom storage shelf.
* **Component Purpose**: Spans across the left and right shelf rails to form a slatted platform for storing shoes or bags.
* **Assembly Direction**: Placed downwards along the -Z axis onto the shelf rails.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features vertical dowel holes on the bottom face mating with the shelf rails.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 23-component model:

* **Right Bottom Rail -> Right Front & Back Uprights** | Joint: Dowel Joint | Note: Connects front and back uprights at the bottom base.
* **Left Bottom Rail -> Left Front & Back Uprights** | Joint: Dowel Joint | Note: Connects front and back uprights at the bottom base.
* **Right Top Rail -> Right Front & Back Uprights** | Joint: Dowel Joint | Note: Connects front and back uprights at the top.
* **Left Top Rail -> Left Front & Back Uprights** | Joint: Dowel Joint | Note: Connects front and back uprights at the top.
* **Upper Front Cross Rail -> Left & Right Front Uprights** | Joint: Dowel Joint | Note: Connects left and right uprights at the upper peg height.
* **Upper Back Cross Rail -> Left & Right Back Uprights** | Joint: Dowel Joint | Note: Connects left and right uprights at the upper peg height.
* **Lower Front Cross Rail -> Left & Right Front Uprights** | Joint: Dowel Joint | Note: Connects left and right uprights at the lower peg height.
* **Lower Back Cross Rail -> Left & Right Back Uprights** | Joint: Dowel Joint | Note: Connects left and right uprights at the lower peg height.
* **Left Shelf Rail -> Left Front & Back Uprights** | Joint: Dowel Joint | Note: Connects front and back uprights at the shelf height.
* **Right Shelf Rail -> Right Front & Back Uprights** | Joint: Dowel Joint | Note: Connects front and back uprights at the shelf height.
* **Shelf Slats (01-09) -> Left & Right Shelf Rails** | Joint: Dowel Joint | Note: Slats are mounted on top of the shelf rails via vertical dowel holes.
