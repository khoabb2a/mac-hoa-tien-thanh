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


def draw(w: int, d: int, h: float, weight: int = 1, name: str | None = None) -> str:
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
    g.polygon(base, outline=(110, 110, 110), fill=(232, 232, 232), width=4 * weight)
    # chia ô
    for i in range(1, w):
        g.line([P(i, 0, 0), P(i, 0, d)], fill=(160, 160, 160), width=2 * weight)
    for k in range(1, d):
        g.line([P(0, 0, k), P(w, 0, k)], fill=(160, 160, 160), width=2 * weight)
    # khung chiều cao (nét đứt)
    top = [P(0, h, 0), P(w, h, 0), P(w, h, d), P(0, h, d)]
    for a, b in zip(base, top):
        dashed(g, a, b, width=2 * weight, dash=14 * weight)
    for a, b in zip(top, top[1:] + top[:1]):
        dashed(g, a, b, width=2 * weight, dash=14 * weight)
    os.makedirs(OUT, exist_ok=True)
    name = name or f"guide_{w}x{d}_h{str(h).replace('.', '')}.png"
    path = os.path.normpath(os.path.join(OUT, name))
    img.save(path)
    return path


def dashed(g: ImageDraw.ImageDraw, a: tuple[float, float], b: tuple[float, float], dash: float = 14, width: int = 2) -> None:
    length = math.dist(a, b)
    n = max(int(length // dash), 1)
    for i in range(0, n, 2):
        t0, t1 = i / n, min((i + 1) / n, 1)
        g.line([(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0), (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)], fill=(150, 150, 150), width=width)


if __name__ == "__main__":
    for w, d, h in GUIDES:
        print(draw(w, d, h))


# ---------- khung sprite sheet 3×3 ----------
SHEET_GUIDES = [(1, 1, 2.0), (1, 1, 0.6), (2, 2, 1.2), (1, 1, 1.2)]


def draw_sheet(w: int, d: int, h: float, n: int = 3) -> str:
    """Ghép n×n ô khung giống nhau thành một ảnh; viền ô chấm mờ chỉ để chia chỗ."""
    cell = SIZE // n
    tmp = draw(w, d, h, weight=3, name="_tmp_sheet_cell.png")
    single = Image.open(tmp).convert("RGB")
    os.remove(tmp)
    # thu khung còn ~80% ô và đặt sát đáy ô để vật thể nhỏ vẫn đứng cùng mặt đất với vật lớn
    inner = int(cell * 0.8)
    single = single.resize((inner, inner), Image.LANCZOS)
    sheet = Image.new("RGB", (SIZE, SIZE), "white")
    g = ImageDraw.Draw(sheet)
    for r in range(n):
        for c in range(n):
            sheet.paste(single, (c * cell + (cell - inner) // 2, r * cell + (cell - inner) // 2))
    for k in range(1, n):  # viền ô: chấm rất mờ
        for t in range(0, SIZE, 12):
            g.point([(k * cell, t), (t, k * cell)], fill=(200, 200, 200))
    name = f"sheet_guide_{w}x{d}_h{str(h).replace('.', '')}.png"
    path = os.path.normpath(os.path.join(OUT, name))
    sheet.save(path)
    return path


if __name__ == "__main__":
    for w, d, h in SHEET_GUIDES:
        print(draw_sheet(w, d, h))
