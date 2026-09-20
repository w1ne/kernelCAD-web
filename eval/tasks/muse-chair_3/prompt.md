# chair_3 (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a slatted wooden chair with a backrest, designed for modular dowel-based assembly.

## Geometry and Dimensions
Approx. 400.0 mm × 400.0 mm × 609.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Nailing

## Mechanical Condition
Single-person seating.

## Structural Features
Seat slats; under-seat rails; vertical uprights (front and rear legs); horizontal side rails; back slats.

## Special Requirements
Keep assembly split unchanged. All components must retain their respective alignment holes for dowel insertion.

## Planned Component Quantity
24

## Component Names
- seat_slat_01 to seat_slat_11 (11 components)
- left_under_seat_rail
- right_under_seat_rail
- right_back_upright
- right_front_upright
- right_lower_side_rail
- right_upper_side_rail
- left_back_upright
- left_front_upright
- left_lower_side_rail
- left_upper_side_rail
- back_slat_01 to back_slat_03 (3 components)

## Adjustable Parameters
- **board_length**: 609.0 (450.0 ~ 760.0 mm). Determines the overall height of the back uprights and the chair's maximum vertical dimension.
- **board_thickness**: 10.0 (6.0 ~ 24.0 mm). Controls the structural thickness of all wooden members; lower limits may compromise load-bearing capacity.
- **seat_length**: 400.0 (320.0 ~ 520.0 mm). Defines the depth of the seating area, affecting ergonomic comfort.
- **seat_height**: 400.0 (320.0 ~ 520.0 mm). Sets the distance from the floor to the seating surface, adhering to standard seating postures.
- **board_width**: 30.0 (15.0 ~ 60.0 mm). Determines the width of the slats and structural rails, balancing weight and stiffness.
- **seat_board_gap**: 6.96 (2.0 ~ 18.0 mm). Controls the spacing between individual seat slats for aesthetics and material economy.
- **hole_radius**: 1.0 (0.5 ~ 3.0 mm). Sets the radius of the cylindrical cuts used for the dowel joints.
- **hole_depth**: 3.0 (1.0 ~ 8.0 mm). Determines the insertion depth for the dowel pins to ensure adequate joint strength.
- **horizontal_bottom_board_length**: 400.0 (300.0 ~ 560.0 mm). Defines the overall width of the chair base and seating area.
- **back_slat_spacing**: 35.0 (20.0 ~ 60.0 mm). Controls the vertical distribution of the backrest slats.
- **back_slat_top_margin**: 25.2 (12.0 ~ 60.0 mm). Sets the clearance from the top of the back uprights to the highest back slat.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like dowel holes via boolean cuts.
3. Place the part back in its original position within the sample assembly.

---

### 1~11. Seat Slats (seat_slat_01 to seat_slat_11)
The horizontal surfaces forming the seating area.
* **Component Purpose**: Directly supports the user's weight. Features through-holes for alignment and fastening to the under-seat rails.
* **Assembly Direction**: Placed horizontally along the Z-axis at `seat_height`.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Connected to the under-seat rails via vertical cylindrical holes.

### 12~13. Under-Seat Rails (left_under_seat_rail, right_under_seat_rail)
The primary horizontal load-bearing supports for the seat.
* **Component Purpose**: Bridges the front and back uprights and provides a mounting base for the seat slats.
* **Assembly Direction**: Positioned longitudinally along the Y-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features vertical holes on the top face for seat slats and horizontal holes on the ends for the uprights.

### 14, 18. Back Uprights (right_back_upright, left_back_upright)
The rear vertical structural pillars.
* **Component Purpose**: Acts as the rear legs and extends upwards to support the back slats.
* **Assembly Direction**: Vertical placement along the Z-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features horizontal holes to receive the under-seat rails, side rails, and back slats.

### 15, 19. Front Uprights (right_front_upright, left_front_upright)
The front vertical structural pillars.
* **Component Purpose**: Acts as the front legs supporting the front edge of the seat.
* **Assembly Direction**: Vertical placement along the Z-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features horizontal holes to receive the under-seat rails and side rails.

### 16~17, 20~21. Side Rails (right_lower/upper, left_lower/upper)
Horizontal stabilizers connecting the front and rear legs.
* **Component Purpose**: Prevents splaying of the legs and increases the overall rigidity of the chair frame.
* **Assembly Direction**: Horizontal placement along the Y-axis at specific Z-heights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Ends feature holes aligning with the front and back uprights.

### 22~24. Back Slats (back_slat_01 to back_slat_03)
The horizontal supports for the user's back.
* **Component Purpose**: Provides ergonomic lumbar and back support.
* **Assembly Direction**: Horizontal placement along the X-axis between the rear uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Ends feature holes aligning with the inner faces of the back uprights.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 24-component model:

* **Seat Slats (01-11) -> Under-Seat Rails (Left/Right)** | Joint: Dowel Joint | Note: Vertical dowels connect the bottom of the slats to the top of the rails.
* **Under-Seat Rails (Left/Right) -> Front & Back Uprights** | Joint: Dowel Joint | Note: Horizontal dowels connect the ends of the rails to the inner faces of the uprights.
* **Side Rails (Upper/Lower, Left/Right) -> Front & Back Uprights** | Joint: Dowel Joint | Note: Horizontal dowels connect the ends of the side rails to the uprights for lateral stability.
* **Back Slats (01-03) -> Back Uprights (Left/Right)** | Joint: Dowel Joint | Note: Horizontal dowels connect the ends of the back slats to the upper inner faces of the back uprights.
