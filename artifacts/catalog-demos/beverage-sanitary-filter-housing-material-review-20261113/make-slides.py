import sys
from PIL import Image, ImageDraw, ImageFont
D = sys.argv[1]; which = sys.argv[2]
W, H = 1280, 720
def font(s, bold=False):
    p = '/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else '')
    return ImageFont.truetype(p, s)
def base(title):
    im = Image.new('RGB', (W, H), '#f4f6f8'); d = ImageDraw.Draw(im)
    d.text((40, 28), title, font=font(34, True), fill='#1d2b36'); return im, d
def tile(im, path, x, y, s, label, d):
    t = Image.open(path).convert('RGB').resize((s, s)); im.paste(t, (x, y))
    d.text((x, y + s + 6), label, font=font(18), fill='#1d2b36')
if which == 'audit':
    im, d = base('Audit: 5 beverage-bottling machines, previews before change')
    names = ['sanitary-filter-skid','rotary-capper','cip-supply-return-skid','shrink-bundle-wrapper','case-erector']
    notes = ['DEFECT: painted shells','no clear defect','no material defect','no material defect','no clear defect']
    s = 230
    for i, n in enumerate(names):
        x = 25 + i * 250; tile(im, f'{D}/samples/{n}.png', x, 120, s, n, d)
        d.text((x, 120 + s + 32), notes[i], font=font(18, i == 0), fill='#b03a2e' if i == 0 else '#3d5566')
    d.text((40, 560), 'Selection: no earlier ledger, bundle, open issue or open PR names these IDs.', font=font(22), fill='#1d2b36')
    d.text((40, 600), 'Geometry gaps recorded, not fixed: vertical header poles, no film web, empty magazine.', font=font(22), fill='#1d2b36')
    im.save(f'{D}/slides/01-audit.png')
elif which == 'beforeafter':
    im, d = base('sanitary-filter-skid: cartridge housings back to stainless')
    tile(im, f'{D}/previews/before/sanitary-filter-skid.png', 60, 100, 440, 'Before: filter-housing-0/1 -> powderCoat (teal)', d)
    tile(im, f'{D}/previews/after/sanitary-filter-skid.png', 640, 100, 440, 'After: filter-housing-0/1 -> stainlessSteel', d)
    d.text((60, 600), 'Cause: shared finishPart regex painted any name containing "housing".', font=font(22), fill='#1d2b36')
    d.text((60, 636), 'Fix: drop "housing" from this file\'s paint regex. Geometry and 360 triangles unchanged.', font=font(22), fill='#1d2b36')
    im.save(f'{D}/slides/02-before-after.png')
else:
    im, d = base('Verification (local)')
    for i, line in enumerate(open(sys.argv[3]).read().splitlines()):
        d.text((60, 120 + i * 48), line, font=font(26), fill='#1d2b36')
    im.save(f'{D}/slides/03-verification.png')
