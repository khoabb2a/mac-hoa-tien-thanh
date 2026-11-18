"""Tách nền trắng ảnh AI vẽ → sprite trong suốt cho game.

Chạy:  python tools/art/cutout.py art/source/chinhDien_v1.png chinhDien            # vật thể: tách nền, ≤768 px
       python tools/art/cutout.py art/source/mat_nuoc_v1.png mat_nuoc --texture   # texture ô: giữ nguyên, 256×256
       python tools/art/cutout.py art/source/nui_xa_v1.png nui_xa --backdrop      # phông núi: trắng→trong suốt mềm
       python tools/art/cutout.py art/source/tung_v1.png tung --small             # cây/đá trang trí: ≤512 px
       thêm --holes để làm trong suốt cả lỗ trắng kín bên trong (vd. kỳ thạch)
Ra:    public/sprites/<ten>.webp

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


def backdrop(src: str, name: str, max_side: int = 1536) -> str:
    """Phông núi: "color to alpha" — trắng thành trong suốt, sương nhạt thành bán trong suốt,
    giống in mực lên giấy (nhân màu). Không cắt cứng nên chân núi tan vào nền bản đồ."""
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    a = (255 - rgb.min(axis=2)) / 255.0
    a = np.clip((a - 0.03) / 0.97, 0, 1)  # trắng gần tinh khiết → 0
    with np.errstate(divide="ignore", invalid="ignore"):
        col = np.where(a[..., None] > 0.01, 255 - (255 - rgb) / np.maximum(a[..., None], 0.01), 255)
    out = np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    scale = max_side / max(img.size)
    if scale < 1:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    return _save(img, name)


def texture(src: str, name: str, size: int = 512) -> str:
    """Texture ô liền mạch: không tách nền, chỉ thu nhỏ (mặt ô trên màn hình chỉ vài chục pixel)."""
    img = Image.open(src).convert("RGB").resize((size, size), Image.LANCZOS)
    return _save(img, name)


def _save(img: Image.Image, name: str) -> str:
    root = os.path.join(os.path.dirname(__file__), "..", "..")
    dst = os.path.normpath(os.path.join(root, "public", "sprites", f"{name}.webp"))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    img.save(dst, "WEBP", quality=88, method=6)
    return f"{dst}  {img.size[0]}x{img.size[1]}  {os.path.getsize(dst) // 1024} KB"


def alpha_cutout(rgb: np.ndarray, holes: bool = False, holes_min: int = 300) -> np.ndarray:
    """RGB float → RGBA uint8: nền trắng nối với mép ảnh (và lỗ kín nếu holes) thành trong suốt."""
    mn = rgb.min(axis=2)
    spread = rgb.max(axis=2) - mn
    near_white = (mn > 232) & (spread < 20)

    labels, _ = ndimage.label(near_white)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, border[border > 0])
    if holes:  # lỗ trắng kín bên trong (kẽ lá, đá Thái Hồ) cũng là nền nếu ≥ holes_min px
        # cây/đá: holes_min nhỏ (~12) để kẽ lá trong; nhà: giữ lớn để không đục tường vôi
        sizes = ndimage.sum(near_white, labels, index=np.arange(labels.max() + 1))
        bg |= np.isin(labels, np.nonzero(sizes >= holes_min)[0][1:])

    alpha = np.ones(mn.shape, np.float32)
    alpha[bg] = 0
    ring = ndimage.binary_dilation(bg, iterations=3) & ~bg
    soft = np.clip((255 - mn) / 60.0, 0, 1)
    alpha[ring] = soft[ring]

    # khử quầng trắng: c = (c_obs - (1 - a) * 255) / a
    a = alpha[..., None]
    with np.errstate(divide="ignore", invalid="ignore"):
        col = np.where(a > 0.01, (rgb - (1 - a) * 255) / np.maximum(a, 0.01), 0)
    return np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)


def cutout(src: str, name: str, max_side: int = MAX_SIDE, holes: bool = False, holes_min: int = 300) -> str:
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    out = alpha_cutout(rgb, holes, holes_min)
    alpha = out[..., 3] / 255.0
    ys, xs = np.nonzero(alpha > 0.02)
    y0, y1 = max(ys.min() - PAD, 0), min(ys.max() + PAD, out.shape[0])
    x0, x1 = max(xs.min() - PAD, 0), min(xs.max() + PAD, out.shape[1])
    img = Image.fromarray(out[y0:y1, x0:x1], "RGBA")
    scale = max_side / max(img.size)
    if scale < 1:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    return _save(img, name)


if __name__ == "__main__":
    src, name = sys.argv[1], sys.argv[2]
    if "--texture" in sys.argv:
        print(texture(src, name))
    elif "--backdrop" in sys.argv:
        print(backdrop(src, name))
    else:
        side = 512 if "--small" in sys.argv else MAX_SIDE
        hm = int(sys.argv[sys.argv.index("--holes-min") + 1]) if "--holes-min" in sys.argv else 300
        print(cutout(src, name, max_side=side, holes="--holes" in sys.argv or "--holes-min" in sys.argv, holes_min=hm))
