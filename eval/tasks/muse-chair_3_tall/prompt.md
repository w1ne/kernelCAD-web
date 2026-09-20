# chair_3_tall (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a bar-height chair with a footrest tier and slatted seat and backrest, designed for modular board assembly.

## Geometry and Dimensions
Approx. 410.0 mm × 404.0 mm × 900.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Dowel Joint

## Mechanical Condition
Single-person seating at bar or counter height, requiring elevated foot support and structural stability.

## Structural Features
Slatted seat panel; four vertical uprights (legs); under-seat support rails; horizontal side rails (upper and lower); footrest rails; slatted backrest.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
25

## Component Names
- seat_slat_01 to seat_slat_10
- left_under_seat_rail
- right_under_seat_rail
- right_back_upright
- right_front_upright
- right_lower_side_rail
- right_upper_side_rail
- right_footrest_rail
- left_back_upright
- left_front_upright
- left_lower_side_rail
- left_upper_side_rail
- left_footrest_rail
- back_slat_01 to back_slat_03

## Adjustable Parameters
- **board_length**: 900.0 (750.0 ~ 1050.0 mm). Determines the overall height of the chair and the backrest.
- **board_thickness**: 12.0 (8.0 ~ 24.0 mm). Controls the thickness of all structural boards, affecting weight and load-bearing capacity.
- **seat_length**: 380.0 (300.0 ~ 480.0 mm). Defines the depth of the seating area.
- **seat_height**: 650.0 (550.0 ~ 750.0 mm). Sets the ergonomic height for bar/counter seating.
- **board_width**: 30.0 (15.0 ~ 60.0 mm). Determines the width of the individual slats and frame members.
- **seat_board_gap**: 6.96 (2.0 ~ 18.0 mm). Controls the spacing between the seat slats for aesthetics and material savings.
- **hole_radius**: 1.0 (0.5 ~ 3.0 mm). Defines the radius of the cylindrical cuts used for the dowel/screw joints.
- **hole_depth**: 3.0 (1.0 ~ 8.0 mm). Determines the insertion depth for the connecting dowels/hardware.
- **horizontal_bottom_board_length**: 380.0 (280.0 ~ 500.0 mm). Defines the depth of the side frames and overall footprint stability.
- **back_slat_spacing**: 40.0 (25.0 ~ 65.0 mm). Controls the vertical gap between backrest slats.
- **back_slat_top_margin**: 28.0 (14.0 ~ 55.0 mm). Sets the clearance from the top of the back uprights to the first back slat.
- **footrest_height**: 250.0 (150.0 ~ 400.0 mm). Ergonomic placement of the footrest rail to support the user's legs.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1~10. Seat Slats
The primary seating surface.
* **Component Purpose**: Provides the horizontal load-bearing surface for the user.
* **Assembly Direction**: Placed horizontally on top of the under-seat rails.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features cylindrical holes on the bottom face to align with the under-seat rails.

### 11~12. Under Seat Rails (Left, Right)
The primary support for the seat slats.
* **Component Purpose**: Bridges the front and back uprights, providing a mounting base for the seat slats and transferring the user's weight to the legs.
* **Assembly Direction**: Positioned horizontally along the Y-axis, intersecting the vertical uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features vertical holes for the seat slats and horizontal holes for connecting to the vertical uprights.

### 13~14 & 18~19. Vertical Uprights (Right Back, Right Front, Left Back, Left Front)
The main vertical structural pillars (legs).
* **Component Purpose**: Transfers all loads to the ground and provides the framework for all horizontal rails and back slats. The back uprights extend upwards to support the backrest.
* **Assembly Direction**: Positioned vertically along the Z-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features multiple cylindrical holes along their length to accept side rails, under-seat rails, and back slats.

### 15~17 & 20~22. Horizontal Side Rails (Lower, Upper, Footrest - Left & Right)
The lateral bracing elements.
* **Component Purpose**: Prevents the chair from splaying or wobbling. The footrest rails specifically provide ergonomic support for the user's feet.
* **Assembly Direction**: Positioned horizontally along the Y-axis between the front and back uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features cylindrical holes at both ends to mate with the vertical uprights.

### 23~25. Back Slats
The lumbar and back support.
* **Component Purpose**: Provides a resting surface for the user's back, bridging the extended left and right back uprights.
* **Assembly Direction**: Positioned horizontally along the X-axis between the rear uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features cylindrical holes at the ends to connect to the inner faces of the back uprights.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 25-component model:

* **Seat Slats -> Under Seat Rails** | Joint: Dowel Joint | Note: Bottom of seat slats connect to the top edge of the under-seat rails.
* **Under Seat Rails -> Vertical Uprights** | Joint: Dowel Joint | Note: Ends of the under-seat rails connect to the inner faces of the front and back uprights.
* **Horizontal Side Rails -> Vertical Uprights** | Joint: Dowel Joint | Note: Ends of the upper, lower, and footrest rails connect to the inner faces of the front and back uprights.
* **Back Slats -> Back Vertical Uprights** | Joint: Dowel Joint | Note: Ends of the back slats connect to the upper inner faces of the left and right back uprights.
