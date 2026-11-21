#!/usr/bin/env python3
"""Make the five-preview audit sheet from the committed local sample PNGs."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
ASSETS = [
    'bulk-loading-spout',
    'burner-management-skid',
    'mobile-tool-cart',
    'rooftop-air-handler',
    'vacuum-pump-unit',
]
COLS, CARD_W, CARD_H = 3, 420, 455


def main() -> None:
    try:
        title_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 19)
        label_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    except OSError:
        title_font = ImageFont.load_default()
        label_font = ImageFont.load_default()
    rows = (len(ASSETS) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * CARD_W, rows * CARD_H), '#edf2f4')
    draw = ImageDraw.Draw(sheet)
    for index, asset in enumerate(ASSETS):
        x, y = (index % COLS) * CARD_W, (index // COLS) * CARD_H
        draw.rectangle((x + 8, y + 8, x + CARD_W - 8, y + CARD_H - 8), fill='white')
        draw.text((x + 20, y + 16), asset, font=title_font, fill='#263741')
        preview = Image.open(ROOT / 'samples' / f'{asset}.png').convert('RGB')
        preview.thumbnail((CARD_W - 36, CARD_H - 92), Image.Resampling.LANCZOS)
        px = x + (CARD_W - preview.width) // 2
        py = y + 50 + (CARD_H - 100 - preview.height) // 2
        sheet.paste(preview, (px, py))
        text = 'selected material finding' if asset == 'rooftop-air-handler' else 'reviewed · no material edit'
        draw.text((x + 20, y + CARD_H - 35), text, font=label_font, fill='#52636d')
    output = ROOT / 'preview-review-five-assets.png'
    sheet.save(output)
    print(output)


if __name__ == '__main__':
    main()
