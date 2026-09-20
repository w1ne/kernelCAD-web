# chair_split_back (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a four-legged dining chair with a split-slat backrest designed for wood-based assembly.

## Geometry and Dimensions
Approx. 420.0 mm × 400.0 mm × 850.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Seat panel; two front legs; two rear legs (posts); upper back slat; lower back slat.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
7

## Component Names
- Seat panel
- Front left leg
- Front right leg
- Rear left leg
- Rear right leg
- Upper back slat
- Lower back slat

## Adjustable Parameters
- **width**: 420 (300.0 ~ 650.0 mm). Controls the overall width of the chair seat and backrest span.
- **depth**: 400 (300.0 ~ 600.0 mm). Controls the seating depth.
- **seat_height**: 450 (350.0 ~ 520.0 mm). Determines the ergonomic seating height from the floor.
- **post_height**: 850 (700.0 ~ 1100.0 mm). Determines the total height of the rear legs/backrest posts.
- **leg_thickness**: 40 (20.0 ~ 70.0 mm). Defines the structural thickness of the legs and posts.
- **seat_thickness**: 30 (15.0 ~ 50.0 mm). Defines the thickness of the main load-bearing seat panel.
- **slat_height**: 60 (30.0 ~ 120.0 mm). Determines the vertical size of the backrest support slats.
- **slat_gap**: 40 (15.0 ~ 80.0 mm). Controls the vertical spacing between the upper and lower back slats.
- **tenon_length**: 20 (8.0 ~ 40.0 mm). Determines the insertion depth for the mortise and tenon joints.
- **tenon_offset**: 5 (2.0 ~ 20.0 mm). Controls the setback distance of the tenons relative to the part edge to prevent wood splitting.

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
The central hub of the chair.
* **Component Purpose**: Acts as the main load-bearing base, providing blind sockets for the front legs and through-holes for the rear legs.
* **Assembly Direction**: Fixed base component, positioned at absolute Z = `seat_height`.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features two blind rectangular sockets at the front; rear features two through-holes for the back posts.

### 2~3. Front Legs (Front Left, Front Right)
The front supporting entities of the chair.
* **Component Purpose**: Vertical support. Transfers the front seat load to the ground.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a tenon of length `tenon_length` that interference-fits into the bottom blind sockets of the seat panel.

### 4~5. Rear Legs (Rear Left, Rear Right)
The rear supporting entities and backrest posts.
* **Component Purpose**: Vertical support and backrest frame. Transfers the rear seat load to the ground and provides mounting points for the back slats.
* **Assembly Direction**: Inserted upwards along the +Z axis through the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Passes entirely through the seat panel's rear holes. The inner X-faces feature mortise sockets to receive the back slats.

### 6~7. Back Slats (Upper, Lower)
The functional support entities of the backrest.
* **Component Purpose**: Horizontal guide and lumbar/back support for human-computer interaction.
* **Assembly Direction**: Inserted horizontally along the X axis between the rear legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both left and right ends feature tenons that insert into the corresponding mortise sockets on the inner faces of the rear legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 7-component model:

* **Front Left Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-left blind socket.
* **Front Right Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-right blind socket.
* **Rear Left Leg -> Seat Panel** | Joint: interlocking | Note: Leg passes through the seat's rear-left through-hole.
* **Rear Right Leg -> Seat Panel** | Joint: interlocking | Note: Leg passes through the seat's rear-right through-hole.
* **Upper Back Slat -> Rear Left Leg & Rear Right Leg** | Joint: interlocking | Note: Slat tenons inserted into the upper inner mortises of the rear legs.
* **Lower Back Slat -> Rear Left Leg & Rear Right Leg** | Joint: interlocking | Note: Slat tenons inserted into the lower inner mortises of the rear legs.
* **Seat Panel -> All Leg Components** | Joint: Support Base | Note: Acts as the core hub; connection sockets and through-holes generated via boolean cut.
