# table (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a four-legged table designed for wood-based assembly, featuring a flat working surface and mortise-and-tenon joinery.

## Geometry and Dimensions
Approx. 1280.0 mm × 880.0 mm × 820.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing work or dining surface.

## Structural Features
Tabletop panel; four legs.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
5

## Component Names
- tabletop_panel
- front_left_leg
- front_right_leg
- rear_left_leg
- rear_right_leg

## Adjustable Parameters
- **leg_height**: 800 (600.0 ~ 900.0 mm). Determines the vertical working height of the table.
- **table_half_width**: 600 (400.0 ~ 900.0 mm). Controls half of the table's longitudinal span.
- **table_half_depth**: 400 (250.0 ~ 700.0 mm). Controls half of the table's transverse depth.
- **top_thickness**: 20 (12.0 ~ 40.0 mm). Ensures adequate stiffness for the load-bearing surface and accommodates the socket depth.
- **top_corner_radius**: 10 (0.0 ~ 60.0 mm). Prevents sharp corners on the tabletop for user safety and ergonomics.
- **leg_half_size**: 20 (10.0 ~ 50.0 mm). Determines the cross-sectional area of the legs for structural stability and load transfer.
- **leg_corner_radius**: 3 (0.0 ~ 16.0 mm). Softens the leg edges to prevent splintering and improve aesthetics.
- **tenon_half_size**: 5 (3.0 ~ 18.0 mm). Defines the cross-section of the connecting tenon at the top of each leg.
- **socket_half_size**: 5.2 (3.0 ~ 22.0 mm). Provides a slight clearance offset relative to the tenon to ensure assemblability.
- **tenon_height**: 5 (3.0 ~ 20.0 mm). Determines the physical bite depth of the joint.
- **socket_depth**: 5.2 (3.0 ~ 20.0 mm). Must be slightly deeper than the tenon height to prevent bottoming out before the mating faces meet.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. Tabletop Panel
The central hub and primary functional surface of the table.
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (sockets) for the four legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height + top\_thickness / 2.0$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The bottom face features four rectangular sockets generated via boolean cut.

### 2~5. Four Legs (Front Left, Front Right, Rear Left, Rear Right)
The supporting entities of the table.
* **Component Purpose**: Vertical support. Transfers the tabletop load to the ground, ensuring anti-overturning stability in the X-Y plane.
* **Assembly Direction**: Inserted upwards along the +Z axis into the tabletop panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). The top of each leg features a protruding tenon that fits into the corresponding bottom sockets of the tabletop panel.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 5-component model:

* **Front Left Leg -> Tabletop Panel** | Joint: interlocking | Note: Leg top tenon inserted into tabletop's front-left socket.
* **Front Right Leg -> Tabletop Panel** | Joint: interlocking | Note: Leg top tenon inserted into tabletop's front-right socket.
* **Rear Left Leg -> Tabletop Panel** | Joint: interlocking | Note: Leg top tenon inserted into tabletop's rear-left socket.
* **Rear Right Leg -> Tabletop Panel** | Joint: interlocking | Note: Leg top tenon inserted into tabletop's rear-right socket.
* **Tabletop Panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all connection sockets generated via boolean cut.
