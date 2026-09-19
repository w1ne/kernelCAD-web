# pegboard_frame (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a framed pegboard panel designed for wall-mounted storage and organization, featuring a recessed perforated grid for inserting hooks, pegs, or tool holders.

## Geometry and Dimensions
Approx. 500.0 mm × 500.0 mm × 15.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage for hanging tools and accessories.

## Structural Features
Thick outer support frame; recessed inner panel; uniform grid of cylindrical mounting holes.

## Special Requirements
Keep assembly split unchanged. Ensure the inner pocket machining does not compromise the structural integrity of the outer frame.

## Planned Component Quantity
1

## Component Names
- framed_panel

## Adjustable Parameters
- **width**: 500 (200.0 ~ 800.0 mm). Determines the overall horizontal span of the pegboard.
- **height**: 500 (200.0 ~ 800.0 mm). Determines the overall vertical span of the pegboard.
- **thickness**: 5 (3.0 ~ 12.0 mm). Thickness of the inner perforated panel; must be thick enough to support hanging loads without excessive deflection.
- **frame_width**: 30 (15.0 ~ 60.0 mm). Width of the solid outer border, providing structural rigidity and a mounting surface.
- **frame_height**: 15 (8.0 ~ 30.0 mm). Total depth of the frame, creating a necessary standoff distance from the wall to allow peg insertion.
- **spacing**: 25 (10.0 ~ 50.0 mm). Center-to-center distance between the grid holes, dictating accessory compatibility.
- **hole_radius**: 3 (1.0 ~ 8.0 mm). Radius of the mounting holes, sized to accommodate standard pegboard hooks (acting as tenons).

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. framed_panel
The singular main body of the pegboard structure.
* **Component Purpose**: Acts as the primary load-bearing base, providing a rigid standoff frame for wall mounting and a grid of sockets (holes) for organizing external accessories.
* **Assembly Direction**: Fixed base component, typically mounted vertically against a wall.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The grid of cylindrical holes acts as an array of mortises designed to receive external pegs/hooks (tenons).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the single-component model interacting with external accessories:

* **[External Pegs/Hooks] -> framed_panel** | Joint: interlocking | Note: External accessory tenons insert into the grid holes (mortises) of the inner panel.
