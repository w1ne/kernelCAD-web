# over_the_door_hook (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct an over-the-door hook rack featuring a main mounting rail and multiple evenly spaced hooks, designed for hanging garments, towels, or accessories without requiring permanent wall installation.

## Geometry and Dimensions
Approx. 142.0 mm × 860.0 mm × 300.0 mm.

## Material
Aluminum

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Bonding (Glue)

## Mechanical Condition
Load-bearing storage (supporting the weight of multiple hanging items such as heavy coats or bags).

## Structural Features
Main door rail (U-channel profile); 10 hook tubes; 10 spherical end caps.

## Special Requirements
Ensure the inner U-channel profile maintains strict dimensional accuracy to fit standard door thicknesses without excessive play.

## Planned Component Quantity
21

## Component Names
- hook_tube_01
- hook_tube_02
- hook_tube_03
- hook_tube_04
- hook_tube_05
- hook_tube_06
- hook_tube_07
- hook_tube_08
- hook_tube_09
- hook_tube_10
- hook_end_cap_01
- hook_end_cap_02
- hook_end_cap_03
- hook_end_cap_04
- hook_end_cap_05
- hook_end_cap_06
- hook_end_cap_07
- hook_end_cap_08
- hook_end_cap_09
- hook_end_cap_10
- door_rail

## Adjustable Parameters
- **rail_width**: 80 (40.0 ~ 140.0 mm). Defines the inner width of the U-channel to accommodate various standard door thicknesses.
- **rail_drop**: -300 (-500.0 ~ -120.0 mm). Determines the vertical reach of the rail down the face of the door for accessible hanging height.
- **rail_wall**: 3 (1.0 ~ 8.0 mm). Controls the structural thickness of the rail to ensure sufficient load-bearing stiffness and prevent bending.
- **front_rail_depth**: 60 (30.0 ~ 120.0 mm). Sets the length of the front section of the rail where the hooks are mounted.
- **rear_rail_offset**: 800 (300.0 ~ 1200.0 mm). Determines the overall span and spacing capacity of the rail across the width of the door.
- **hook_count**: 10 (4 ~ 18). The total number of hooks distributed evenly along the rail.
- **hook_pipe_radius**: 5 (2.0 ~ 12.0 mm). Defines the thickness of the hook tubes to prevent deformation under heavy loads.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1~10. Hook Tubes (hook_tube_01 to hook_tube_10)
The primary hanging interfaces of the rack.
* **Component Purpose**: Extends outward from the rail and curves downwards to provide a secure resting point for hanging items.
* **Assembly Direction**: Horizontal extension along the +X axis, curving into the -Z axis.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions). The base of each tube is permanently affixed to the front face of the door rail.

### 11~20. Hook End Caps (hook_end_cap_01 to hook_end_cap_10)
The safety terminations for the hooks.
* **Component Purpose**: Provides a smooth, spherical end to each hook tube to prevent snagging, tearing of fabrics, or user injury.
* **Assembly Direction**: Positioned at the distal end of each hook tube.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions). Mated to the trimmed ends of the hook tubes.

### 21. Door Rail (door_rail)
The structural backbone of the assembly.
* **Component Purpose**: Acts as the main load-bearing base, hooking over the top edge of a door and providing a mounting surface for all hook tubes.
* **Assembly Direction**: Placed vertically over the door edge (spanning the Y-axis).
* **Connection & Kinematics**: Support Base. Acts as the core hub; all hooks are attached to its front face.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 21-component model:

* **hook_tube_01 ~ 10 -> door_rail** | Joint: Bonding (Glue) | Note: Base of each hook tube is fixed to the front face of the door rail at evenly spaced intervals.
* **hook_end_cap_01 ~ 10 -> hook_tube_01 ~ 10** | Joint: Bonding (Glue) | Note: Each spherical cap is attached to the distal end of its corresponding hook tube.
* **door_rail -> All Components** | Joint: Support Base | Note: Acts as the central structural hub supporting the entire hook array.
