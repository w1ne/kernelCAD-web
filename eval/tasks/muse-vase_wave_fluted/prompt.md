# vase_wave_fluted (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Create a decorative fluted wave vase with rhythmic vertical undulations, designed as a single continuous shell for aesthetic display.

## Geometry and Dimensions
Approx. 91.0 mm × 91.0 mm × 214.0 mm.

## Material
PLA

## Manufacturing Method
FDM 3D Printing

## Connection Method (Joint Type)
Not applicable (Single monolithic component)

## Mechanical Condition
Freestanding decorative container, suitable for holding lightweight items such as dried flowers or acting as a standalone aesthetic piece.

## Structural Features
Hollow lofted shell; solid bottom base; fluted exterior and interior walls with primary and secondary wave patterns.

## Special Requirements
The lofted surfaces must be perfectly sewn to form a closed, watertight solid. Overhangs must be kept within printable limits to avoid the need for internal supports during FDM printing.

## Planned Component Quantity
1

## Component Names
- Vase body

## Adjustable Parameters
- **height**: 214.0 (154.0 ~ 294.0 mm). Controls the overall vertical dimension of the vase.
- **wall_thickness**: 3.0 (1.8 ~ 5.0 mm). Determines the structural thickness of the shell; lower limits ensure printability, while upper limits prevent excessive material use.
- **steps**: 18 (12.0 ~ 28.0). Defines the vertical resolution (number of layers) used to generate the lofted shape.
- **pts_per_layer**: 108 (84.0 ~ 144.0). Defines the horizontal resolution of the spline curves for smooth wave generation.
- **wave_count**: 8 (6.0 ~ 12.0). Sets the number of primary vertical flutes around the circumference.
- **twist**: 0.01 (0.0 ~ 0.04). Controls the helical rotation of the flutes along the Z-axis.
- **secondary_amp**: 0.8 (0.0 ~ 2.0 mm). Controls the intensity of the secondary surface ripples for added texture.
- **profile_radius**: 40.0 (12.0 ~ 56.0 mm). Base radius constraint for the profile points, determining the overall width of the vase.
- **wave_amp**: 5.4 (1.0 ~ 7.4 mm). Controls the depth of the primary flutes.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate horizontal spline wires for the inner and outer profiles based on the wave and radius parameters.
2. Loft the outer wires and inner wires independently.
3. Cap the top and bottom with ruled surfaces and planar faces.
4. Sew all surfaces together to form a valid solid.

---

### 1. Vase body
The primary and sole entity of the model.
* **Component Purpose**: Acts as the main aesthetic body and functional container.
* **Assembly Direction**: Freestanding base component, built vertically along the +Z axis.
* **Connection & Kinematics**: Not applicable (Single continuous body).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 1-component model:

* **Vase body -> Ground** | Joint: None | Note: Standalone monolithic object.
