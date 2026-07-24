# Kindle 2 reference provenance

- Wikimedia file page: <https://commons.wikimedia.org/wiki/File:Amazon-kindle-gen2.jpg>
- Creator: Evan-Amos.
- Rights status: public domain.
- Downloaded (UTC): 2026-07-14T02:06:12Z.
- Download URL: <https://commons.wikimedia.org/wiki/Special:FilePath/Amazon-kindle-gen2.jpg>
- SHA-256 (`kindle-2-reference.jpg`): `5fb89746d43b96c6ccfbe5f5f6125061d59cc7fcc675439160c59f8fa4e11d02`

## Physical scale anchor

- Source: [Amazon Kindle User's Guide, 2nd Edition](https://kindle.s3.amazonaws.com/Kindle%20User%E2%80%99s%20Guide%2C%202nd%20Ed.-%20English.pdf), Appendix product specifications, model D00701.
- Published exterior envelope: **203.2 mm × 134.6 mm × 9.1 mm** (height × width × thickness).
- Photo calibration: the checked-in JPEG is 2100 px × 3000 px. Its visible outer-device envelope is 1843 px × 2774 px (x=134..1976, y=110..2883, measured against the pale background). The horizontal and vertical published-dimension ratios are averaged into `REFERENCE_MM_PER_PIXEL`, so `referenceImage()` uses a 153.60 mm full-frame width while preserving the native photo aspect ratio. That maps the visible enclosure to the published envelope within 0.2% on either axis.
- Use in `kindle-2-e-reader.kcad.ts`: `REFERENCE_WIDTH_MM = 134.6` supplies the `bodyWidth` default; `REFERENCE_IMAGE_WIDTH_MM` applies the measured photo calibration to the full `referenceImage()` plane. The accompanying image remains a visual aid only; its crop and perspective are not treated as metrology for internal features.

This image supports an internal, parametric reference-reconstruction benchmark.
The accompanying model is a deliberately simplified, clean-room e-reader
study rather than an exact production clone or a mesh derived from the photo.
The source image's product trade dress, Amazon/Kindle trademarks, logos, text,
keyboard layout, and other brand-identifying details are not licensed or
claimed by this benchmark; it must not be presented as an affiliated product,
an exact reproduction, or manufacturing documentation.
