"""Ảnh khung hướng dẫn cho vật thể địa hình (cây, đá, vách núi).

Không có khối thô cho vật thể hữu cơ, nên đưa cho AI một khung: hình thoi = ô đất (isometric 2:1,
nghiêng 30°), các cạnh đứng = chiều cao tối đa. AI vẽ vật thể đứng trên hình thoi, nằm trong khung.
Chạy: python tools/art/guides.py   → art/blockout/guide_<rộng>x<sâu>_h<cao>.png
"""
import math
import os

from PIL import Image, ImageDraw

SIZE = 1024
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "art", "blockout")
ELEV = math.radians(30)

# (rộng ô, sâu ô, chiều cao theo đơn vị ô)
GUIDES = [(1, 1, 2.0), (1, 1, 0.6), (2, 2, 1.2)]


def project(x: float, y: float, z: float, s: float) -> tuple[float, float]:
    """Thế giới (x phải-sau, y lên, z trái-sau) → màn hình, camera phương vị 45°, nghiêng 30°."""
    sx = (x - z) * math.cos(math.radians(45)) * s
    sy = -y * math.cos(ELEV) * s + (x + z) * math.sin(math.radians(45)) * math.sin(ELEV) * s
    return sx, sy


def draw(w: int, d: int, h: float) -> str:
    img = Image.new("RGB", (SIZE, SIZE), "white")
    g = ImageDraw.Draw(img)
    # chọn tỉ lệ để khung chiếm khoảng 70% ảnh
    corners3 = [(x, y, z) for x in (0, w) for z in (0, d) for y in (0, h)]
    raw = [project(*c, 1.0) for c in corners3]
    span = max(max(p[0] for p in raw) - min(p[0] for p in raw), max(p[1] for p in raw) - min(p[1] for p in raw))
    s = SIZE * 0.7 / span
    pts = [project(*c, s) for c in corners3]
    cx = SIZE / 2 - (max(p[0] for p in pts) + min(p[0] for p in pts)) / 2
    cy = SIZE / 2 - (max(p[1] for p in pts) + min(p[1] for p in pts)) / 2

    def P(x: float, y: float, z: float) -> tuple[float, float]:
        px, py = project(x, y, z, s)
        return px + cx, py + cy

    base = [P(0, 0, 0), P(w, 0, 0), P(w, 0, d), P(0, 0, d)]
    g.polygon(base, outline=(110, 110, 110), fill=(232, 232, 232), width=4)
    # chia ô
    for i in range(1, w):
        g.line([P(i, 0, 0), P(i, 0, d)], fill=(160, 160, 160), width=2)
    for k in range(1, d):
        g.line([P(0, 0, k), P(w, 0, k)], fill=(160, 160, 160), width=2)
    # khung chiều cao (nét đứt)
    top = [P(0, h, 0), P(w, h, 0), P(w, h, d), P(0, h, d)]
    for a, b in zip(base, top):
        dashed(g, a, b)
    for a, b in zip(top, top[1:] + top[:1]):
        dashed(g, a, b)
    os.makedirs(OUT, exist_ok=True)
    name = f"guide_{w}x{d}_h{str(h).replace('.', '')}.png"
    path = os.path.normpath(os.path.join(OUT, name))
    img.save(path)
    return path


def dashed(g: ImageDraw.ImageDraw, a: tuple[float, float], b: tuple[float, float], dash: float = 14) -> None:
    length = math.dist(a, b)
    n = max(int(length // dash), 1)
    for i in range(0, n, 2):
        t0, t1 = i / n, min((i + 1) / n, 1)
        g.line([(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0), (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)], fill=(170, 170, 170), width=2)


if __name__ == "__main__":
    for w, d, h in GUIDES:
        print(draw(w, d, h))
