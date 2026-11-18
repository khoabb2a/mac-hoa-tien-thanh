"""Cắt sprite sheet 3×3 do AI vẽ thành 9 biến thể, gom vào một ảnh atlas + file mô tả JSON.

Chạy:  python tools/art/sheet.py art/source/tung_sheet_v1.png tung [--holes] [--grid 3]
Ra:    public/sprites/decor/<loai>.webp  +  public/sprites/decor/<loai>.json

- Chia ảnh thành lưới đều, tách nền từng ô (dùng chung thuật toán với cutout.py).
- Giữ tỉ lệ to/nhỏ giữa các biến thể: JSON ghi kích thước pixel gốc; game lấy vật lớn nhất làm chuẩn.
- Điểm neo = chân vật (trung bình hoành độ của dải điểm thấp nhất), để cây nghiêng vẫn đứng đúng ô.
- Cảnh báo nếu vật chạm mép ô (AI vẽ lấn sang ô bên cạnh) — khi đó nên vẽ lại sheet.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from cutout import alpha_cutout  # noqa: E402

PAD = 4
ATLAS_W = 1024
MIN_SPECK = 60  # cụm điểm nhỏ hơn thế (vệt bẩn, chấm lạc) thì bỏ


def split(src: str, kind: str, grid: int = 3, holes: bool = False) -> str:
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    H, W = rgb.shape[:2]
    variants = []
    warnings = []
    for r in range(grid):
        for c in range(grid):
            y0, y1 = r * H // grid, (r + 1) * H // grid
            x0, x1 = c * W // grid, (c + 1) * W // grid
            cell = alpha_cutout(rgb[y0:y1, x0:x1], holes)
            a = cell[..., 3] > 5
            # bỏ chấm lạc, giữ các cụm đủ lớn (lá rơi, cánh hoa vẫn giữ nếu ≥ MIN_SPECK)
            lab, n = ndimage.label(a)
            if n:
                sizes = ndimage.sum(a, lab, index=np.arange(1, n + 1))
                keep = np.isin(lab, np.nonzero(sizes >= MIN_SPECK)[0] + 1)
                cell[~keep] = 0
                a = keep
            if not a.any():
                warnings.append(f"ô {r * grid + c + 1}: trống")
                continue
            edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]).mean()
            if edge > 0.004:
                warnings.append(f"ô {r * grid + c + 1}: vật chạm mép ô ({edge:.1%}) — có thể bị cắt")
            ys, xs = np.nonzero(a)
            by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            crop = cell[by0:by1, bx0:bx1]
            h, w = crop.shape[:2]
            band = a[by1 - max(int(h * 0.08), 2) : by1, bx0:bx1]
            bxs = np.nonzero(band)[1]
            ax = float(bxs.mean() / w) if bxs.size else 0.5
            variants.append({"img": Image.fromarray(crop, "RGBA"), "ax": round(ax, 4), "ay": 0.03, "wPx": int(w), "hPx": int(h)})

    # xếp kệ (shelf packing) vào atlas rộng ATLAS_W
    variants.sort(key=lambda v: -v["hPx"])
    x = y = shelf = 0
    for v in variants:
        w, h = v["wPx"], v["hPx"]
        if x + w + PAD > ATLAS_W:
            x, y, shelf = 0, y + shelf + PAD, 0
        v["x"], v["y"] = x, y
        x += w + PAD
        shelf = max(shelf, h)
    atlas_h = y + shelf
    atlas = Image.new("RGBA", (ATLAS_W, atlas_h), (0, 0, 0, 0))
    for v in variants:
        atlas.paste(v["img"], (v["x"], v["y"]))

    root = os.path.join(os.path.dirname(__file__), "..", "..")
    out_dir = os.path.normpath(os.path.join(root, "public", "sprites", "decor"))
    os.makedirs(out_dir, exist_ok=True)
    atlas.save(os.path.join(out_dir, f"{kind}.webp"), "WEBP", quality=88, method=6)
    manifest = {
        "image": f"sprites/decor/{kind}.webp",
        "width": ATLAS_W,
        "height": atlas_h,
        "maxHPx": max(v["hPx"] for v in variants),
        "maxWPx": max(v["wPx"] for v in variants),
        "variants": [{k: v[k] for k in ("x", "y", "wPx", "hPx", "ax", "ay")} for v in variants],
    }
    with open(os.path.join(out_dir, f"{kind}.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    size = os.path.getsize(os.path.join(out_dir, f"{kind}.webp")) // 1024
    msg = f"{kind}: {len(variants)} biến thể, atlas {ATLAS_W}x{atlas_h}, {size} KB"
    return msg + ("".join(f"\n  ! {w}" for w in warnings))


if __name__ == "__main__":
    g = int(sys.argv[sys.argv.index("--grid") + 1]) if "--grid" in sys.argv else 3
    print(split(sys.argv[1], sys.argv[2], grid=g, holes="--holes" in sys.argv))
