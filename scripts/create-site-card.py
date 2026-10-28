"""Recreate the branded fallback card with Pillow (no runtime dependency)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
image = Image.new("RGB", (1200, 630), "#08090d")
draw = ImageDraw.Draw(image)
font_root = Path("C:/Windows/Fonts")
def font(size, bold=False):
    return ImageFont.truetype(str(font_root / ("segoeuib.ttf" if bold else "segoeui.ttf")), size)

for x in range(0, 1200, 60):
    draw.line((x, 0, x, 630), fill="#131c25")
for y in range(0, 630, 60):
    draw.line((0, y, 1200, y), fill="#131c25")
draw.rounded_rectangle((70, 64, 365, 112), radius=24, fill="#183437")
draw.text((92, 69), "112 GAMES · READY TO PLAY", font=font(18, True), fill="#89f6df")
draw.text((67, 174), "Open", font=font(108, True), fill="#f4f6fa")
draw.text((337, 174), "Arcade", font=font(108, True), fill="#2de2e6")
draw.text((75, 328), "Tiny games. Big side quests.", font=font(42), fill="#d5dce5")
draw.text((77, 405), "Watch the games play. Pick one. Take control.", font=font(25), fill="#a6b4c4")
draw.rounded_rectangle((76, 505, 327, 563), radius=12, fill="#2de2e6")
draw.text((103, 516), "PLAY OPENARCADE", font=font(23, True), fill="#08090d")
target = root / "public/social/site-card-v1.png"
target.parent.mkdir(parents=True, exist_ok=True)
image.save(target, optimize=True)
