# CNC milling CAM status

`plan_cnc_toolpaths` is the contract for this slice. It measures a parametric
solid with the existing bounding-box path, seats that box in a `StockSpec`
blank, and writes 2.5D facing, profile, pocket, and drill moves plus mill
G-code (`G21`/`G90`, `G0`/`G1`, `G81`/`G83`).

This is not `export` format `gcode`. That path is an FDM slicer.

## Origin and heuristics

Machine origin is the stock minimum corner. +X is stock length, +Y is stock
width, and +Z is up from the stock bottom. The part box is centered in XY and
seated on Z=0. Model coordinates are not preserved. Round bar length is +X and
its diameter is the YZ section. Plate thickness and blank height are +Z.

Facing rasters the stock top down to the part top. Profile is a rectangle
around the part box, offset by the tool radius; climb (the default) is
clockwise for spindle M3, and `conventional` reverses it. The profile runs to
the stock bottom and adds no tabs. Pocket rasters the interior of the part
box. The floor defaults to Z=0, which clears that whole footprint; pass
`pocket_floor_z_mm` to leave a floor. Drill holes are in the stock-corner
frame, measured down from the stock top. A hole deeper than three tool
diameters uses a G83 peck of one diameter; a shallower hole uses G81.

Feeds default to 10000 rpm and 600 mm/min. Those numbers are a labelled
stand-in for a small carbide end mill, not a material model. Removed volume is
a per-op proxy and can double-count.

The plan is a bounding-box heuristic. It is not collision-checked, and it is
not a machine-ready post for every controller.

Local playback of one box-on-plate plan is in
[docs/demos/cnc-cam-pr1](../../../docs/demos/cnc-cam-pr1/README.md). That video
draws the planner polylines. It is not a machine cut and not a deployed run.

## Later slices

These are ideas only. This slice does not vendor them.

- Kiri:Moto (Grid.Space, MIT) is a browser CAM with 2D and 3D toolpaths. A
  later handoff could study its operation model. Copying its code would
  require its NOTICE.
- OpenCAMLib is a drop-cutter library for real 3-axis surfaces. It is not
  imported here.
- FreeCAD Path is a full operation and post stack. It is not imported here.
