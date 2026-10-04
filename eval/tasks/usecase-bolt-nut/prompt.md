# Typical use case U11: bolt and nut

> M8×30 hex bolt with a real ISO metric thread and a matching M8 nut that
> screws onto it (print tolerance).

Parts `hex-bolt` and `hex-nut`, axis on Z. The bolt head sits on z = 0…5.3
(13 mm across flats), the 30 mm shank above it. The nut (13 mm across flats,
6.8 mm tall) is screwed onto the bolt with its top 10 pitches above the head.

Pass criteria (the harness checks each one, ±0.1 mm):

- Two parts, each one closed, valid solid.
- Bolt: 13 mm across flats, head 5.3 mm, shank 30 mm (top at z = 35.3).
- A real helical thread with a 1.25 mm pitch (ISO 262 coarse) on the bolt,
  and the matching internal thread in the nut.
- Nut: 13 mm across flats, 6.8 mm tall, on the bolt axis; nut and bolt do not
  overlap (print clearance).
- STEP re-imports as two solids; each part's STL is watertight; the 3MF has
  both parts.

End with `return <assembly>.model();`.
