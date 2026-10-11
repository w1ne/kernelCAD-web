#!/usr/bin/env python3
"""Render-vs-reference composite for the E46 sedan study.

The reference blueprint (getoutlines.com, CC-BY 4.0) cannot be redistributed
here and is not downloadable from every build environment, so this script draws
the published dimensions as a vector reference frame instead and puts it next
to (and over) an orthographic render of the model:

  - overall length / width / height box (4471 x 1739 x 1415 mm),
  - axle stations and tyre circles (wheelbase 2725, Ø632 for 205/55 R16),
  - track lines (1481 / 1488) in the front / rear views.

Usage: compare.py <view: side|front|rear|top> <render.png> <out.png>

The render is a kernelCAD side / front / rear / top view on a plain
background (the model is found by background colour). The headless renderer
uses a perspective camera: side and top frames are fitted on overall length,
front and rear frames on the body width at bumper height, so in those two
views the far roof reads lower than the published height.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

L, W, H, WB, FO, TR_F, TR_R, TYRE_D = 4471, 1739, 1415, 2725, 770, 1481, 1488, 632


def bbox_of_model(img: Image.Image, bg_tol: int = 18):
    rgb = img.convert('RGB')
    w, h = rgb.size
    bg = rgb.getpixel((5, 5))
    px = rgb.load()
    xs, ys = [], []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            p = px[x, y]
            if abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) > bg_tol:
                xs.append(x)
                ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


def main():
    view, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
    img = Image.open(src).convert('RGB')
    # Ignore the contact shadow: it is low-contrast grey, so a higher tolerance skips it.
    x0, y0, x1, y1 = bbox_of_model(img, 60)
    if view == 'side':
        ext_x, ext_y = L, H
    elif view in ('front', 'rear'):
        ext_x, ext_y = W, H  # mirrors stick out past W; fit on height
    else:
        ext_x, ext_y = L, W
    # mm -> px. Side / top: overall length. Front / rear: the headless camera
    # is a perspective camera, so the far roof looks lower than the near
    # bumper; fit the published WIDTH to the widest row in the bumper band
    # (below the mirrors) and accept that the height reads short.
    if view in ('front', 'rear'):
        rgb = img.convert('RGB'); px = rgb.load(); bg = rgb.getpixel((5, 5))
        best = 0
        for y in range(int(y0 + 0.45 * (y1 - y0)), int(y0 + 0.8 * (y1 - y0))):
            xs = [x for x in range(x0, x1 + 1) if sum(abs(px[x, y][i] - bg[i]) for i in range(3)) > 60]
            if xs: best = max(best, xs[-1] - xs[0])
        mmpx = best / W
    else:
        mmpx = (x1 - x0) / ext_x
    ref = Image.new('RGB', img.size, (250, 250, 248))
    panels = []
    for base in (ref, img.copy()):
        d = ImageDraw.Draw(base)
        col = (210, 30, 40)
        if view == 'side':
            gx = x0  # front bumper at left (pose 0,0 looks at the car's left side, nose left)
            gz = y1  # ground at bottom of tyres
            d.rectangle([gx, gz - H * mmpx, gx + L * mmpx, gz], outline=col, width=2)
            for ax in (FO, FO + WB):
                cx = gx + ax * mmpx
                r = TYRE_D / 2 * mmpx
                d.ellipse([cx - r, gz - 2 * r, cx + r, gz], outline=col, width=2)
                d.line([cx, gz - H * mmpx, cx, gz], fill=col, width=1)
        elif view in ('front', 'rear'):
            cx = (x0 + x1) / 2
            gz = y1
            d.rectangle([cx - W / 2 * mmpx, gz - H * mmpx, cx + W / 2 * mmpx, gz], outline=col, width=2)
            tr = TR_F if view == 'front' else TR_R
            for sx in (-1, 1):
                d.line([cx + sx * tr / 2 * mmpx, gz - 0.5 * TYRE_D * mmpx, cx + sx * tr / 2 * mmpx, gz], fill=col, width=2)
        else:
            cy = (y0 + y1) / 2
            d.rectangle([x0, cy - W / 2 * mmpx, x0 + L * mmpx, cy + W / 2 * mmpx], outline=col, width=2)
            for ax in (FO, FO + WB):
                d.line([x0 + ax * mmpx, cy - W / 2 * mmpx, x0 + ax * mmpx, cy + W / 2 * mmpx], fill=col, width=1)
        panels.append(base)
    label_h = 40
    comp = Image.new('RGB', (img.width * 2, img.height + label_h), (255, 255, 255))
    comp.paste(panels[0], (0, label_h))
    comp.paste(panels[1], (img.width, label_h))
    d = ImageDraw.Draw(comp)
    try:
        f = ImageFont.truetype('DejaVuSans.ttf', 22)
    except OSError:
        f = ImageFont.load_default()
    d.text((12, 8), f'reference: published E46 sedan dimensions ({view})', fill=(30, 30, 30), font=f)
    note = ' (perspective camera: fitted on bumper width)' if view in ('front', 'rear') else ''
    d.text((img.width + 12, 8), 'kernelCAD render + same reference frame (red)' + note, fill=(30, 30, 30), font=f)
    comp.save(out)
    print(out, 'mm/px', round(1 / mmpx, 2))


if __name__ == '__main__':
    main()
