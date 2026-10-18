# Importing CAD files with `lib.fromCAD`

`lib.fromCAD(path)` reads a CAD file by its extension and returns one B-rep shape.
Downstream features (fillet, boolean, shell, face queries) work on it the same way
they work on a `lib.fromSTEP` result.

```ts
const robot = await lib.fromCAD('./parts/robot.FCStd');
return robot.color('#a8b3bd');
```

| Extension | How it is read |
| --- | --- |
| `.step`, `.stp` | Native. Same as `lib.fromSTEP`. |
| `.brep` | Native. Same as `lib.fromBREP`. |
| `.FCStd` (FreeCAD) | Native. The document is read directly, with no FreeCAD install. |
| `.x_t`, `.x_b`, `.xt` (Parasolid) | Native. parasolid-core is linked into kernelCAD. No install and no `PATH` entry. |
| `.sldprt`, `.sldasm` (SolidWorks) | Through a converter you configure (below). |
| `.igs`, `.iges` (IGES) | Through a converter you configure. |

## FreeCAD documents (`.FCStd`)

Each body in the document is imported from its stored shape and placed with its
FreeCAD `Placement`. Bodies are combined into one compound.

- If the file has PartDesign bodies, only the bodies are imported.
- Otherwise the Part workbench results are imported. An object that another object
  links to (a cut's base, for example) is treated as an input and skipped.
- Sketches, datums and other shapeless objects are ignored.

## Parasolid (`.x_t`, `.x_b`)

`lib.fromCAD` reads Parasolid inside the kernelCAD process. The reader is
parasolid-core (a reviewed fork under `crates/parasolid-core`, applied via a
`[patch]`), compiled into `src/modeling/parts/parasolid/parasolid_import.wasm`
from `crates/parasolid-import`. There is no external program.

Pass the file's coordinate unit. The reader does not infer it. The default is
millimetres.

```ts
const part = await lib.fromCAD('./parts/link.x_t', { sourceUnit: 'm' });
```

The reader accepts an exact built-in schema profile plus the shipped application
schemas it is reviewed against. It does not substitute a nearby profile: a file
whose schema key is outside that set fails with the key named in the error.

### Whole-machine transmits

Whole assemblies are streamed, not retained. A 1.2 GB transmit parses in about
a minute inside the wasm module: the buffer is compacted in place, one pass
records a pointer-level summary of every B-Rep node, and each body is then
parsed and mapped from its own small closure. The full node stream is never
held in memory, which is what keeps whole-machine files inside the 32-bit
wasm address space.

What is built into solids:

- Bodies whose faces are planes, cylinders, cones, spheres or tori are sewn
  into closed solids and placed by the transmit's own instance transforms.
- NURBS and intersection surfaces are reported as unsupported-geometry
  diagnostics; they are read and named, never replaced with a mesh.
- Very large bodies (over 400 faces, or over 150 000 closure nodes) and bodies
  whose geometry the source stored invalid are skipped and counted
  (`skippedBodies`, `firstSkip` in the reader result).

Performance notes: a whole-machine import is dominated by OCCT sewing, not
parsing (~7 minutes for the 1.2 GB RP1 robot on an M-series Mac, roughly 47
seconds of that inside the wasm reader). Both whole-file and excerpt imports
use the same path; there is no caching between runs.

`cargo run --release --example excerpt` in `crates/parasolid-import` writes
small self-contained excerpts (one body, two instances of one body) for tests
that must not depend on the whole file.

## SolidWorks and IGES (converter)

These formats are not read by the Parasolid reader. Point
`KERNELCAD_CAD_CONVERTER` at any command that writes a STEP file:

```sh
export KERNELCAD_CAD_CONVERTER='["/path/to/converter","--in","{input}","--out","{output}"]'
```

- The value is a JSON array of strings. It runs without a shell.
- `{input}` and `{output}` are replaced with absolute paths. The output is a STEP file.
- The converter has 15 minutes to run. Its stderr is included in any error.

Without a converter, SolidWorks files can be exported to STEP from SolidWorks itself.
[`solidworks-export-step.bas`](solidworks-export-step.bas) is a VBA macro that exports
a whole `.SLDASM` to one STEP AP214 file. It is untested against every SolidWorks
version, so read the messages it shows if a call fails. Then import the STEP with
`lib.fromSTEP` or `lib.fromCAD`.

## Errors

| Message | Fix |
| --- | --- |
| `unsupported file type` | Use one of the extensions above, or export STEP. |
| `... is not set` | Set `KERNELCAD_CAD_CONVERTER`, or export STEP. |
| `must be a JSON array of strings` | Quote the array in single quotes so the shell keeps the JSON. |
| `the converter failed` | Read the converter's stderr in the message. |
| `wrote no STEP file` | The command must write its output to `{output}`. |
| `not a zip archive` / `no Document.xml` | Re-save the file from FreeCAD as `.FCStd`. |

## Scope and limits

- `.FCStd` support was built against FreeCAD's documented file layout. Files that use
  features outside it may need an adjustment; report the file and its FreeCAD version.
- A SolidWorks assembly converts to one STEP file. Each part keeps the frame it had
  in its own file, so the assembly's joint placement is only as correct as the
  converter's output.
