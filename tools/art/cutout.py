"""Tách nền trắng ảnh AI vẽ → sprite trong suốt cho game.

Chạy:  python tools/art/cutout.py art/source/chinhDien_v1.png chinhDien
Ra:    public/sprites/<loai>.webp  (cạnh dài tối đa 768 px — đủ nét trên iPhone SE, nhẹ cho bộ nhớ)

Cách làm: điểm gần-trắng nối liền với mép ảnh là nền (giữ lại vùng trắng bên trong công trình);
viền 3 px quanh nền được làm mềm theo độ đậm của mực và khử quầng trắng.
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

MAX_SIDE = 768
PAD = 6


def cutout(src: str, name: str) -> str:
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    mn = rgb.min(axis=2)
    spread = rgb.max(axis=2) - mn
    near_white = (mn > 232) & (spread < 20)

    labels, _ = ndimage.label(near_white)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, border[border > 0])

    alpha = np.ones(mn.shape, np.float32)
    alpha[bg] = 0
    ring = ndimage.binary_dilation(bg, iterations=3) & ~bg
    soft = np.clip((255 - mn) / 60.0, 0, 1)
    alpha[ring] = soft[ring]

    # khử quầng trắng: c = (c_obs - (1 - a) * 255) / a
    a = alpha[..., None]
    with np.errstate(divide="ignore", invalid="ignore"):
        col = np.where(a > 0.01, (rgb - (1 - a) * 255) / np.maximum(a, 0.01), 0)
    out = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)

    ys, xs = np.nonzero(alpha > 0.02)
    y0, y1 = max(ys.min() - PAD, 0), min(ys.max() + PAD, out.shape[0])
    x0, x1 = max(xs.min() - PAD, 0), min(xs.max() + PAD, out.shape[1])
    img = Image.fromarray(out[y0:y1, x0:x1], "RGBA")
    scale = MAX_SIDE / max(img.size)
    if scale < 1:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)

    root = os.path.join(os.path.dirname(__file__), "..", "..")
    dst = os.path.normpath(os.path.join(root, "public", "sprites", f"{name}.webp"))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    img.save(dst, "WEBP", quality=88, method=6)
    return f"{dst}  {img.size[0]}x{img.size[1]}  {os.path.getsize(dst) // 1024} KB"


if __name__ == "__main__":
    print(cutout(sys.argv[1], sys.argv[2]))
