# pegboard_circle (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a circular perforated pegboard panel designed for modular wall-mounted storage and organization.

## Geometry and Dimensions
Approx. 400.0 mm × 400.0 mm × 5.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Load-bearing storage and wall-mounted organization for hanging tools or accessories.

## Structural Features
Circular main panel; uniform grid of circular cutouts (holes).

## Special Requirements
Keep assembly split unchanged. Ensure all grid holes maintain a minimum structural margin (`hole_radius + 0.5`) from the outer circular boundary to prevent edge breakout.

## Planned Component Quantity
1

## Component Names
- perforated_panel

## Adjustable Parameters
- **diameter**: 400 (150.0 ~ 800.0 mm). Defines the overall footprint and bounding box of the circular board.
- **thickness**: 5 (3.0 ~ 24.0 mm). Determines the structural rigidity of the board and the insertion depth for external pegs.
- **spacing**: 25 (10.0 ~ 50.0 mm). Controls the grid density and the center-to-center distance between adjacent holes.
- **hole_radius**: 3 (1.0 ~ 8.0 mm). Sets the size of the cutouts to match standard external pegs or dowels.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main circular profile of the part based on the `diameter` parameter.
2. Generate a grid of cylindrical cutters and filter out any cylinders that intersect or exceed the outer boundary margin.
3. Execute a boolean cut to subtract the cylinder grid from the main board.

---

### 1. perforated_panel
The main structural body of the pegboard.
* **Component Purpose**: Acts as the base platform, providing a standardized grid of sockets for attaching external hooks, pegs, or dowels.
* **Assembly Direction**: Modeled in the X-Y plane; typically mounted vertically against a wall surface.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). The internal holes act as female sockets for external male dowels/pegs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the single-component model:

* **[External Pegs/Accessories] -> perforated_panel** | Joint: Dowel Joint | Note: External components are inserted into the grid of cylindrical holes on the panel.
