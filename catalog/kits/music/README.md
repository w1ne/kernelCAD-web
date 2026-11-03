# Music kit

Forty original low-poly assets for orchestra, band, rehearsal and stage scenes. Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. Every asset exposes editable `scale` and `color` controls and exports as one material under its triangle budget. These stylized scene props do not claim acoustic, performance or instrument certification.

The [music wave demo bundle](../../../artifacts/catalog-demos/music-wave-20261102/README.md) retains source, capture settings, local verification evidence and an inspected MP4.

| id | asset | description | knobs | triangles |
| --- | --- | --- | --- | ---: |
| `accordion` | Accordion | Accordion with visible bellows ribs, button rows and a piano-key strip on its end. | scale · color | 204 |
| `acoustic-guitar` | Acoustic guitar | Low-poly acoustic guitar with a waisted body, sound hole, long neck and tuning head. | scale · color | 176 |
| `alto-saxophone` | Alto saxophone | Saxophone with bent neck, broad bell and raised pearl-like key buttons. | scale · color | 222 |
| `banjo` | Banjo | Banjo with a circular resonator, narrow neck, bridge and tuning head. | scale · color | 188 |
| `bass-drum` | Bass drum | Large concert bass drum on a floor cradle with a broad circular drumhead. | scale · color | 168 |
| `bass-guitar` | Bass guitar | Electric bass guitar prop with an elongated body, long fretted neck and four strings. | scale · color | 104 |
| `bassoon` | Bassoon | Bassoon prop with paired long bores, curved bocal and grouped keywork. | scale · color | 228 |
| `bongos` | Bongos | Small paired bongo drums joined by a center bridge and supported on a low base. | scale · color | 200 |
| `cajon` | Cajon | Peruvian box drum with a broad front striking panel, low-profile feet and top seat edge. | scale · color | 60 |
| `cello` | Cello | Seated cello with a broad resonant body, long neck, bridge and extended endpin. | scale · color | 222 |
| `clarinet` | Clarinet | Straight clarinet with a flared bell, mouthpiece and regularly spaced key pads. | scale · color | 482 |
| `concert-flute` | Concert flute | Concert flute with an inline head joint and visible round key cups. | scale · color | 264 |
| `concert-harp` | Concert harp | Concert harp with a triangular frame, soundboard, slanted pillar and a fan of strings. | scale · color | 144 |
| `conductor-podium` | Conductor podium | Small raised conductor podium with broad top, stepped riser and front access step. | scale · color | 48 |
| `conga-drums` | Conga drums | Pair of tall conga drums with tapered-looking shells, top heads and floor feet. | scale · color | 276 |
| `double-bass` | Double bass | Upright double bass with a large body, long neck, bridge and floor endpin. | scale · color | 222 |
| `drum-kit` | Drum kit | Compact drum kit with bass drum, supported snare and toms, cymbal stands and a stool. | scale · color | 560 |
| `electric-guitar` | Electric guitar | Solid-body electric guitar with a double-cutaway silhouette, pickup bars, bridge and headstock. | scale · color | 136 |
| `french-horn` | French horn | Coiled French horn prop with a flared bell, circular tubing loop and rotary valve block. | scale · color | 416 |
| `harmonica` | Harmonica | Compact harmonica with a rectangular body and repeated raised reed covers. | scale · color | 120 |
| `maracas` | Maracas | Pair of hand maracas with rounded shaker heads and straight handles. | scale · color | 332 |
| `marimba` | Marimba | Marimba with long graduated bars, resonator tubes and a sturdy frame. | scale · color | 228 |
| `mechanical-metronome` | Mechanical metronome | Stepped tapered mechanical metronome with a face scale, pendulum and sliding weight. | scale · color | 162 |
| `microphone-stand` | Microphone stand | Stage microphone on a tripod stand with an angled boom arm and round grille head. | scale · color | 266 |
| `music-stand` | Music stand | Portable music stand with a broad score tray, adjustable stem and three floor feet. | scale · color | 148 |
| `oboe` | Oboe | Double-reed oboe with a narrow tapered-looking body, bell, reed and small key pads. | scale · color | 526 |
| `orchestral-cymbals` | Orchestral cymbals | Pair of thin orchestral crash cymbals with central bosses and short grips. | scale · color | 316 |
| `orchestral-triangle` | Orchestral triangle | Metal triangle percussion instrument with a three-sided frame and hanging striker. | scale · color | 158 |
| `snare-drum` | Snare drum | Snare drum with a shallow shell, paired hoops and a simple carry-stand frame. | scale · color | 304 |
| `tambourine` | Tambourine | Hand tambourine with a broad ring and evenly spaced pairs of jingles. | scale · color | 286 |
| `tenor-saxophone` | Tenor saxophone | Larger tenor saxophone with a curved neck, broad bell and raised keywork. | scale · color | 222 |
| `timpani` | Timpani | Kettle drum with a broad bowl, top head, adjustment legs and pedal base. | scale · color | 226 |
| `trombone` | Trombone | Trombone with a wide bell, long slide tubes and a cross brace. | scale · color | 314 |
| `trumpet` | Trumpet | Low-poly trumpet with a bell flare, three valve buttons and a straight lead pipe. | scale · color | 268 |
| `tuba` | Tuba | Compact tuba with a large bell, looping body tube and front-facing valve buttons. | scale · color | 340 |
| `ukulele` | Ukulele | Compact four-string ukulele with a rounded body, short neck, bridge and sound hole. | scale · color | 208 |
| `vibraphone` | Vibraphone | Vibraphone with graduated bars, resonator tubes and a compact wheeled stand. | scale · color | 304 |
| `viola` | Viola | Slightly larger viola prop with an hourglass body, neck, bridge and four strings. | scale · color | 178 |
| `violin` | Violin | Faceted violin with an hourglass body, raised neck, bridge and four strings. | scale · color | 178 |
| `xylophone` | Xylophone | Tabletop xylophone with graduated wooden bars and crossed support legs. | scale · color | 152 |

## Rebuild and verify

```sh
python3 artifacts/catalog-demos/music-wave-20261102/generate_music_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/music-wave-20261102/render_music_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-music-catalog-pages
python3 artifacts/catalog-demos/music-wave-20261102/record_music_checks.py
python3 artifacts/catalog-demos/music-wave-20261102/capture_music_demo.py
python3 artifacts/catalog-demos/music-wave-20261102/inspect_music_video.py
```

## Licence and provenance

Every asset and any export from it are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is modeled from scratch with kernelCAD primitives. No downloaded, traced, converted or decimated meshes, textures or palettes are included.
