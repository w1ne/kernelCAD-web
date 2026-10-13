from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).parent
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 26)
for source, caption, target in [
    ('01-before.png', 'Local Studio - actual workflow captures', 'frame-1.png'),
    ('03-user-edge.png', 'User clicks edge 6 - get_selection returns that pick', 'frame-2.png'),
    ('04-agent-edge.png', 'set_selection restores edge 6 in the viewer', 'frame-3.png'),
]:
    image = Image.open(root / source).convert('RGB')
    image.thumbnail((1280, 620))
    canvas = Image.new('RGB', (1280, 720), 'black')
    canvas.paste(image, (0, 0))
    ImageDraw.Draw(canvas).text((30, 650), caption, font=font, fill='white')
    canvas.save(root / target)
