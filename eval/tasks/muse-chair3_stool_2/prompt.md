# chair3_stool_2 (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a four-legged bar stool with staggered horizontal footrests designed for wood-based assembly.

## Geometry and Dimensions
Approx. 350.0 mm × 350.0 mm × 780.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person elevated seating (bar or counter use).

## Structural Features
Seat panel; four legs; four horizontal footrests (front, rear, left, right).

## Special Requirements
Keep assembly split unchanged. Ensure staggered Z-heights for X-axis and Y-axis footrests to prevent internal tenon collision within the legs.

## Planned Component Quantity
9

## Component Names
- Seat panel
- Front left leg
- Front right leg
- Rear left leg
- Rear right leg
- Front footrest
- Rear footrest
- Left footrest
- Right footrest

## Adjustable Parameters
- **width**: 350 (250.0 ~ 500.0 mm). Defines the overall width of the stool base and seat.
- **depth**: 350 (250.0 ~ 500.0 mm). Defines the overall depth of the stool base and seat.
- **seat_height**: 750 (600.0 ~ 900.0 mm). Determines the height of the seating surface, suitable for bar or counter ergonomics.
- **leg_thickness**: 35 (20.0 ~ 60.0 mm). Ensures structural stability and load-bearing capacity of the vertical supports.
- **seat_thickness**: 30 (15.0 ~ 50.0 mm). Provides sufficient material depth for the leg tenons to insert securely.
- **tenon_length**: 20 (8.0 ~ 40.0 mm). Controls the insertion depth of the joints for mechanical strength.
- **tenon_offset**: 5 (2.0 ~ 15.0 mm). Defines the setback of the tenon to prevent edge splitting.
- **footrest_height**: 300 (150.0 ~ 500.0 mm). Sets the ergonomic height for resting feet and provides lower structural bracing.
- **footrest_thickness**: 22 (12.0 ~ 40.0 mm). Determines the robustness of the horizontal bracing.

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
* **Component Purpose**: Acts as the main load-bearing base for seating and provides localization references and mechanical interfaces (sockets) for the four legs.
* **Assembly Direction**: Fixed base component, positioned at absolute Z = `seat_height` + `seat_thickness` / 2.0.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four rectangular sockets to receive the leg tenons.

### 2~5. Four Legs (Front Left, Front Right, Rear Left, Rear Right)
The vertical supporting entities of the stool.
* **Component Purpose**: Transfers the seat load to the ground, ensuring anti-overturning stability. Houses mortise sockets for the footrests.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a tenon of length `tenon_length` that interference-fits into the bottom sockets of the seat panel. Inner faces feature sockets at staggered heights for the footrests.

### 6~7. Front and Rear Footrests
The X-axis horizontal bracing entities.
* **Component Purpose**: Connects the left and right legs to prevent splay, enhances structural rigidity, and serves as a footrest.
* **Assembly Direction**: Inserted horizontally along the X axis into the corresponding legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the leg sockets at the base `footrest_height`.

### 8~9. Left and Right Footrests
The Y-axis horizontal bracing entities.
* **Component Purpose**: Connects the front and rear legs to prevent splay, enhances structural rigidity, and serves as a footrest.
* **Assembly Direction**: Inserted horizontally along the Y axis into the corresponding legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the leg sockets at `footrest_height` + `footrest_thickness` to avoid internal collision with the front/rear footrest tenons.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 9-component model:

* **Front Left Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-left socket.
* **Front Right Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-right socket.
* **Rear Left Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's rear-left socket.
* **Rear Right Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's rear-right socket.
* **Front Footrest -> Front Left & Right Legs** | Joint: interlocking | Note: Tenons inserted into inner X-facing sockets of the front legs.
* **Rear Footrest -> Rear Left & Right Legs** | Joint: interlocking | Note: Tenons inserted into inner X-facing sockets of the rear legs.
* **Left Footrest -> Front & Rear Left Legs** | Joint: interlocking | Note: Tenons inserted into inner Y-facing sockets of the left legs (staggered Z-height).
* **Right Footrest -> Front & Rear Right Legs** | Joint: interlocking | Note: Tenons inserted into inner Y-facing sockets of the right legs (staggered Z-height).
* **Seat Panel -> All Legs** | Joint: Support Base | Note: Acts as the core hub; all vertical connection sockets generated via boolean cut.
