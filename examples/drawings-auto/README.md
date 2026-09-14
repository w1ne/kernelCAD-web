# Automatic drawing: dimensions, GD&T and an oblique section

`bracket.kcad.ts` is an L mounting bracket: four ⌀6.6 clearance holes and a
counterbored locating hole in the base, two ⌀8.5 holes through the upright,
rounded front corners, chamfered upright edges. The script writes no drawing
callouts. It declares two things that are design intent rather than rule
outcomes: the bolting face is datum A, and the upright holes need a ⌀0.05
position zone instead of the ISO 2768-m default.

`autoAnnotate` derives everything else from the geometry, and one section is
cut on a vertical plane turned 30° from the YZ plane.

## Run it

From the repository root:

```bash
npx tsx src/agent/cli/index.ts export svg-drawing examples/drawings-auto/bracket.kcad.ts \
  -o /tmp/bracket-drawing.svg \
  --options '{"autoAnnotate":true,"sections":[{"plane":{"origin":[45,30,20],"normal":[0.866,0.5,0]},"label":"D"}]}'
```

Output:

```
Wrote 55653 bytes to /tmp/bracket-drawing.svg
drawing: 21 annotation(s) placed, 0 overlapped (hole-position 9, overall 3, hole 3, datum 3, flatness 1, fillet 1, chamfer 1, general-tolerance 1)
```

The same call through MCP is `export({ target: 'model', file: 'examples/drawings-auto/bracket.kcad.ts', format: 'svg-drawing', output_path, options: { format: 'svg-drawing', autoAnnotate: true, sections: [...] } })`, which returns the report as `drawing_report`.

## What is on the sheet

Add `--json` to get the report. Datums (A was declared, B and C follow the rules):

```json
"datums": [
  { "label": "A", "source": "declared", "normal": [0, 0, -1], "point": [45, 30.144345, 0] },
  { "label": "B", "source": "auto", "normal": [0, -1, 0], "point": [45, 52, 32.096509] },
  { "label": "C", "source": "auto", "normal": [-1, 0, 0], "point": [0, 31.5, 4] }
],
"generalTolerance": "ISO 2768-mK"
```

Every annotation, from `drawingReport.annotations`:

| kind | view | text | overlapped |
|---|---|---|---|
| hole-position | front | 25 | false |
| hole-position | front | 65 | false |
| overall | front | 90 | false |
| hole-position | front | 38 | false |
| overall | front | 58 | false |
| hole-position | top | 12 | false |
| hole-position | top | 45 | false |
| hole-position | top | 78 | false |
| hole-position | top | 12 | false |
| hole-position | top | 26 | false |
| hole-position | top | 40 | false |
| overall | top | 60 | false |
| hole | front | 2× ⌀8.5 THRU \| ⌖ ⌀0.05 A B C | false |
| hole | top | 4× ⌀6.6 THRU \| ⌖ ⌀0.1 A B C | false |
| hole | top | ⌀5.5 THRU ⌴⌀10 ▾ 3 \| ⌖ ⌀0.1 A B C | false |
| datum | front | datum A | false |
| datum | left | datum B | false |
| datum | front | datum C | false |
| flatness | left | ⏥ 0.2 | false |
| fillet | top | 2× R3 | false |
| chamfer | left | 2× 1.5 × 45° | false |

Things to check on the rendered sheet:

- B is the upright's front face. The base holes are located from it, and it
  ties on area with the upright's back face; the tie goes to the face nearer
  the hole axes.
- The upright holes carry the declared `⌖ ⌀0.05 A B C`; the base holes keep
  the automatic `⌀0.1`.
- `SECTION D-D` is a true-shape cell: the base and upright cut faces are
  hatched, the counterbored hole and the edge of an upright hole show as gaps
  in the hatch, and the cutting-plane trace is drawn across the top view.

Render the SVG to PNG to look at it, for example
`google-chrome --headless --screenshot=/tmp/bracket-drawing.png file:///tmp/bracket-drawing.svg`.
