# stool_round_tripod (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a round tripod stool with a triangular mortise-and-tenon brace designed for wood-based assembly.

## Geometry and Dimensions
Approx. 344.0 mm × 344.0 mm × 454.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Round seat panel; three legs; three stretchers forming a triangular brace.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
7

## Component Names
- Seat panel
- Leg 01
- Leg 02
- Leg 03
- Stretcher 01
- Stretcher 02
- Stretcher 03

## Adjustable Parameters
- **seat_thickness**: 16.0 (10.0 ~ 30.0 mm). Ensures adequate strength for the seat base while accommodating the insertion depth of the leg tenons.
- **leg_height**: 438.0 (318.0 ~ 598.0 mm). Determines the seating height, strictly following ergonomic standards for seating posture.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Determines the bite depth of the physical connections into the seat panel.
- **seat_radius**: 172.0 (132.0 ~ 217.0 mm). Defines the seating area and overall width of the stool.
- **leg_top_radius**: 13.0 (9.0 ~ 18.0 mm). Defines the upper thickness of the leg for structural support at the joint interface.
- **leg_bottom_radius**: 15.0 (11.0 ~ 21.0 mm). Defines the base footprint of the leg for ground stability.
- **tenon_radius**: 5.5 (4.0 ~ 8.5 mm). Controls the thickness of the top tenon to prevent breakage while fitting into the seat.
- **stretcher_z**: 164.0 (114.0 ~ 244.0 mm). Sets the vertical position of the stretcher brace for optimal structural rigidity and leg stabilization.
- **stretcher_bar_width**: 15.0 (11.0 ~ 21.0 mm). Determines the vertical stiffness of the stretcher bars.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Determines the horizontal stiffness of the stretcher bars.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. Seat Panel
The central hub of the stool.
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (sockets) for the three legs.
* **Assembly Direction**: Fixed base component, positioned at absolute Z = `leg_height`.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features three round sockets arranged radially.

### 2~4. Legs (Leg 01, Leg 02, Leg 03)
The supporting entities of the stool.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability in a radial layout. Also provides mortises for the stretchers.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a round tenon inserted into the seat panel. Mid-section features angled mortises for stretcher insertion.

### 5~7. Stretchers (Stretcher 01, Stretcher 02, Stretcher 03)
The bracing entities of the stool.
* **Component Purpose**: Horizontal bracing. Connects the legs together to form a rigid triangular structure, preventing leg splay under load.
* **Assembly Direction**: Inserted horizontally/angularly between the adjacent legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding leg mortises.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 7-component model:

* **Leg 01 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's first radial socket.
* **Leg 02 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's second radial socket.
* **Leg 03 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's third radial socket.
* **Stretcher 01 -> Leg 01 & Leg 02** | Joint: interlocking | Note: Connects Leg 01 and Leg 02 via end tenons.
* **Stretcher 02 -> Leg 02 & Leg 03** | Joint: interlocking | Note: Connects Leg 02 and Leg 03 via end tenons.
* **Stretcher 03 -> Leg 03 & Leg 01** | Joint: interlocking | Note: Connects Leg 03 and Leg 01 via end tenons.
* **Seat Panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all top connection sockets generated via boolean cut.
