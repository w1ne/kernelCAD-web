# workbench (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a sturdy, slatted wooden workbench with a lower storage shelf, designed for CNC-machined timber assembly.

## Geometry and Dimensions
Approx. 1200.0 mm × 600.0 mm × 864.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Nailing

## Mechanical Condition
Load-bearing workspace for manual tasks and lower shelf for tool/material storage.

## Structural Features
Slatted top surface; four vertical legs; under-top side rails; bottom side rails; bottom cross rails; slatted lower shelf; back brace rail.

## Special Requirements
Keep assembly split unchanged. Ensure all cylindrical pilot holes align perfectly for dowel/fastener insertion across intersecting components.

## Planned Component Quantity
39

## Component Names
- top_slat_01 ~ top_slat_13
- left_under_top_rail
- right_under_top_rail
- right_front_leg
- right_back_leg
- left_front_leg
- left_back_leg
- right_bottom_rail
- left_bottom_rail
- back_bottom_cross
- front_bottom_cross
- left_shelf_rail
- right_shelf_rail
- shelf_slat_01 ~ shelf_slat_13
- back_brace_rail

## Adjustable Parameters
- **bench_width**: 1200.0 (800.0 ~ 1600.0 mm). Defines the overall span of the workspace.
- **bench_depth**: 600.0 (400.0 ~ 800.0 mm). Defines the working depth and determines the total number of slats required.
- **bench_height**: 850.0 (750.0 ~ 950.0 mm). Ergonomic height for standing or seated work.
- **shelf_height**: 200.0 (100.0 ~ 400.0 mm). Determines the vertical clearance and position of the lower storage shelf.
- **board_thickness**: 14.0 (10.0 ~ 22.0 mm). Ensures adequate structural rigidity for the boards and slats.
- **board_width**: 40.0 (30.0 ~ 60.0 mm). Defines the width of the structural framing and individual slats.
- **slat_gap**: 5.0 (2.0 ~ 10.0 mm). Controls the spacing between top and shelf slats for drainage, expansion, or tool clearance.
- **hole_radius**: 1.5 (0.5 ~ 3.0 mm). Sizes the pilot holes for connecting dowels or standard fasteners.
- **hole_depth**: 4.0 (1.0 ~ 8.0 mm). Determines the insertion depth for the connecting dowels/fasteners into the boards.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1~13. Top Slats
The primary working surface of the bench.
* **Component Purpose**: Provides a flat, slatted load-bearing area for work activities.
* **Assembly Direction**: Placed downwards along the -Z axis onto the under-top rails.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Bottom faces feature blind holes that align with the under-top rails.

### 14~15. Under-top Rails (Left, Right)
The upper longitudinal supports.
* **Component Purpose**: Supports the top slats and ties the front and back legs together at the top of the structure.
* **Assembly Direction**: Horizontal insertion along the Y axis between the legs.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features Z-direction holes for the top slats and Y-direction holes for the legs.

### 16~19. Four Legs (Right Front, Right Back, Left Front, Left Back)
The main vertical support entities.
* **Component Purpose**: Transfers all loads to the ground and provides mounting points for all horizontal rails.
* **Assembly Direction**: Vertical standing along the +Z axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features multiple Y-direction and X-direction holes at varying heights to accept side rails, cross rails, and braces.

### 20~21. Bottom Side Rails (Right, Left)
The lower longitudinal supports.
* **Component Purpose**: Connects the front and back legs near the floor to prevent longitudinal racking.
* **Assembly Direction**: Horizontal insertion along the Y axis between the legs.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features Y-direction holes at the ends.

### 22~23. Bottom Cross Rails (Back, Front)
The lower transverse supports.
* **Component Purpose**: Connects the left and right legs near the floor to prevent lateral racking.
* **Assembly Direction**: Horizontal insertion along the X axis between the legs.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features X-direction holes at the ends.

### 24~25. Shelf Side Rails (Left, Right)
The mid-level longitudinal supports.
* **Component Purpose**: Provides the structural base for the lower shelf slats.
* **Assembly Direction**: Horizontal insertion along the Y axis between the legs.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features Z-direction holes for the shelf slats and Y-direction holes for the legs.

### 26~38. Shelf Slats
The secondary storage surface.
* **Component Purpose**: Provides a slatted platform for storing tools and materials beneath the main workspace.
* **Assembly Direction**: Placed downwards along the -Z axis onto the shelf side rails.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Bottom faces feature blind holes that align with the shelf rails.

### 39. Back Brace Rail
The mid-level transverse support.
* **Component Purpose**: Connects the rear legs at mid-height to provide additional lateral stiffness and prevent wobbling.
* **Assembly Direction**: Horizontal insertion along the X axis between the back legs.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features X-direction holes at the ends.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 39-component model:

* **Top Slats -> Under-top Rails** | Joint: Dowel Joint | Note: Slats rest on rails with Z-direction alignment holes.
* **Under-top Rails -> Legs** | Joint: Dowel Joint | Note: Rails connect to inner faces of legs via Y-direction holes.
* **Bottom Side Rails -> Legs** | Joint: Dowel Joint | Note: Rails connect to inner faces of legs near the base via Y-direction holes.
* **Shelf Side Rails -> Legs** | Joint: Dowel Joint | Note: Rails connect to inner faces of legs at shelf height via Y-direction holes.
* **Shelf Slats -> Shelf Side Rails** | Joint: Dowel Joint | Note: Slats rest on shelf rails with Z-direction alignment holes.
* **Bottom Cross Rails -> Legs** | Joint: Dowel Joint | Note: Cross rails connect to outer faces of legs via X-direction holes.
* **Back Brace Rail -> Back Legs** | Joint: Dowel Joint | Note: Brace connects to back legs at mid-height via X-direction holes.
