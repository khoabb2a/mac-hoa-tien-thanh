# Prompt địa hình — Mặc Họa Tiên Thành

Sinh tự động từ `terrain.json` + `style-terrain.md` (`npm run art:prompts`). Đừng sửa trực tiếp.

## Cách dùng
1. Vẽ **ưu tiên 1** trước (6 ảnh): đủ để thay toàn bộ địa hình khối hiện tại. Ưu tiên 2 là cây/đá trang trí thêm.
2. **Vật thể** (cây, đá, vách): đính kèm đúng ảnh khung ghi bên dưới (`art/blockout/guide_*.png`) rồi dán prompt.
3. **Texture** và **phông núi**: không cần đính kèm ảnh, chỉ dán prompt. Chọn đúng tỉ lệ khung ghi bên dưới nếu app cho chọn.
4. Gửi ảnh cho Claude, ghi kèm tên (vd. `tung`, `mat_nuoc`).

| Tên | Loại | Ưu tiên | Dùng trong game |
| --- | --- | --- | --- |
| `nui_xa` | Phông núi | 1 | Phông núi xa sau bản đồ (thay các khối nón xa) |
| `vach_da` | Vật thể isometric | 1 | Vách đá trên ô Đá (rìa sau bản đồ), 2×2 ô |
| `tung` | Vật thể isometric | 1 | Cây tùng trang trí trên ô cỏ trống, 1×1 ô |
| `duong_da` | Texture mặt ô | 1 | Mặt ô Linh lộ (đường) |
| `mat_nuoc` | Texture mặt ô | 1 | Mặt ô Nước (suối) |
| `dat_co` | Texture mặt ô | 1 | Mặt ô đất trống (nền) |
| `truc` | Vật thể isometric | 2 | Cụm trúc trang trí, 1×1 ô |
| `dao` | Vật thể isometric | 2 | Cây đào hoa trang trí (xuân), 1×1 ô |
| `ky_thach` | Vật thể isometric | 2 | Đá cảnh (kỳ thạch), 1×1 ô |
| `lau_say` | Vật thể isometric | 2 | Cụm lau sậy ven nước, 1×1 ô |

## nui_xa — Phông núi xa sau bản đồ (thay các khối nón xa)

Ưu tiên 1 · Tỉ lệ 21:9 · Không đính kèm ảnh

```text
Paint a wide landscape backdrop for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world. It is placed far behind the playable map.

Must keep:
- Sky: pure flat white (#FFFFFF), no clouds drawn in the sky, no sun or moon, no text, no seal stamp, no border.
- The bottom of the image fades fully into pure white mist so it blends into the map.
- Seen from slightly above, matching a game camera tilted 30° downward.

Style:
- Song-dynasty blue-green landscape painting (qinglü shanshui) on xuan paper: mineral jade-green (#7FA38A, #4F7A66) and stone-blue (#3E6C8C) washes over ink outlines, texture strokes on the mountain faces, atmospheric perspective (far = pale, near = dark).
- Calm, majestic, misty. No saturated or digital-looking colors.

## Subject
A wide panorama of distant immortal mountains in the style of the Song-dynasty blue-green landscape 'A Thousand Li of Rivers and Mountains': three or four layered ranges of steep, tall peaks, nearest range darkest ink with jade-green and stone-blue washes on the slopes, farther ranges paler and paler until they are only faint grey silhouettes. A few tiny pavilions and a thin waterfall on the peaks, bands of white mist drifting between the ranges. Composition: peaks occupy the upper 70% of the image; the lowest 30% dissolves completely into pure white mist so it blends into the map below.

Output a wide 21:9 image.
```

## vach_da — Vách đá trên ô Đá (rìa sau bản đồ), 2×2 ô

Ưu tiên 1 · Tỉ lệ 1:1 · Đính kèm: `art/blockout/guide_2x2_h12.png` (Image 1)

```text
Paint ONE natural object as a game sprite for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world.

Must keep:
- Image 1 is a PLACEMENT GUIDE: the grey diamond is the ground footprint (true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective), and the dashed lines show the maximum height. Draw the object standing on that footprint and inside that box. Do NOT draw the guide lines, the grey diamond or any ground under the object.
- One object only, centered where the guide is. Background: pure flat white (#FFFFFF), no paper texture behind it, no ground shadow, no scenery, no text, no seal stamp, no border.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed at the edges of washes.
- Light from the upper left, shadows on the right side.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent.
- No saturated colors, no digital gradients, no glossy 3D rendering look.

## Subject
A rugged rocky outcrop / small cliff for the edge of a mountain sect: several stacked angular boulders with cracked faces, dry-brush texture strokes (cun fa) on the rock, a twisted small pine clinging to one side, some moss in muted jade green at the base. Its footprint fills the 2×2 diamond and it rises to about the height of the dashed box.

Image 1 is the PLACEMENT GUIDE only — do not draw it.
Output a square 1:1 image.
```

## tung — Cây tùng trang trí trên ô cỏ trống, 1×1 ô

Ưu tiên 1 · Tỉ lệ 1:1 · Đính kèm: `art/blockout/guide_1x1_h20.png` (Image 1)

```text
Paint ONE natural object as a game sprite for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world.

Must keep:
- Image 1 is a PLACEMENT GUIDE: the grey diamond is the ground footprint (true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective), and the dashed lines show the maximum height. Draw the object standing on that footprint and inside that box. Do NOT draw the guide lines, the grey diamond or any ground under the object.
- One object only, centered where the guide is. Background: pure flat white (#FFFFFF), no paper texture behind it, no ground shadow, no scenery, no text, no seal stamp, no border.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed at the edges of washes.
- Light from the upper left, shadows on the right side.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent.
- No saturated colors, no digital gradients, no glossy 3D rendering look.

## Subject
A single ancient pine tree (cổ tùng): gnarled, twisting trunk with flaking bark drawn in dry brush, layered flat clusters of needles in dark ink with muted jade-green wash, slightly leaning, elegant scholar-painting silhouette. Trunk base sits in the center of the diamond; the crown reaches about the top of the dashed box.

Image 1 is the PLACEMENT GUIDE only — do not draw it.
Output a square 1:1 image.
```

## duong_da — Mặt ô Linh lộ (đường)

Ưu tiên 1 · Tỉ lệ 1:1 · Không đính kèm ảnh

```text
Paint a SQUARE, SEAMLESS, TILEABLE ground texture for a mobile isometric city-builder in Chinese ink-wash style.

Must keep:
- Viewed straight from above (top-down, orthographic). No perspective, no horizon, no objects standing up, no cast shadows.
- Seamless: the left edge must continue into the right edge and the top edge into the bottom edge, so the tile repeats without visible seams. No border, no vignette, no frame, no text, no seal.
- Even lighting and LOW contrast: it is shown as small tiles behind buildings and must stay quiet.

Style:
- Traditional Chinese ink-wash (shuimo) on xuan paper: soft washes, a few confident brush strokes, visible paper grain.
- Palette: warm paper beige (#EFE6D2), ink greys, at most a hint of muted jade green (#7FA38A) or stone blue (#3E6C8C). No saturated colors.

## Subject
Old flagstone path: irregular rectangular paving stones in light-to-mid grey ink wash with thin dark ink joints, a little moss in the joints, worn edges. Fill the whole square edge to edge.

Output a square 1:1 seamless tileable texture.
```

## mat_nuoc — Mặt ô Nước (suối)

Ưu tiên 1 · Tỉ lệ 1:1 · Không đính kèm ảnh

```text
Paint a SQUARE, SEAMLESS, TILEABLE ground texture for a mobile isometric city-builder in Chinese ink-wash style.

Must keep:
- Viewed straight from above (top-down, orthographic). No perspective, no horizon, no objects standing up, no cast shadows.
- Seamless: the left edge must continue into the right edge and the top edge into the bottom edge, so the tile repeats without visible seams. No border, no vignette, no frame, no text, no seal.
- Even lighting and LOW contrast: it is shown as small tiles behind buildings and must stay quiet.

Style:
- Traditional Chinese ink-wash (shuimo) on xuan paper: soft washes, a few confident brush strokes, visible paper grain.
- Palette: warm paper beige (#EFE6D2), ink greys, at most a hint of muted jade green (#7FA38A) or stone blue (#3E6C8C). No saturated colors.

## Subject
Calm stream water as an ink painter would draw it: pale grey-blue (#B7C3BE) wash with rhythmic thin ink ripple lines (curved wave strokes in the Song painting manner), mostly empty paper-like surface between the lines. Fill the whole square edge to edge.

Output a square 1:1 seamless tileable texture.
```

## dat_co — Mặt ô đất trống (nền)

Ưu tiên 1 · Tỉ lệ 1:1 · Không đính kèm ảnh

```text
Paint a SQUARE, SEAMLESS, TILEABLE ground texture for a mobile isometric city-builder in Chinese ink-wash style.

Must keep:
- Viewed straight from above (top-down, orthographic). No perspective, no horizon, no objects standing up, no cast shadows.
- Seamless: the left edge must continue into the right edge and the top edge into the bottom edge, so the tile repeats without visible seams. No border, no vignette, no frame, no text, no seal.
- Even lighting and LOW contrast: it is shown as small tiles behind buildings and must stay quiet.

Style:
- Traditional Chinese ink-wash (shuimo) on xuan paper: soft washes, a few confident brush strokes, visible paper grain.
- Palette: warm paper beige (#EFE6D2), ink greys, at most a hint of muted jade green (#7FA38A) or stone blue (#3E6C8C). No saturated colors.

## Subject
Bare ground of a mountain meadow, very subtle: warm paper beige (#EFE6D2) with faint uneven ink washes and a few tiny grass strokes and dots in muted green and grey. Low contrast — it must stay quiet behind buildings. Fill the whole square edge to edge.

Output a square 1:1 seamless tileable texture.
```

## truc — Cụm trúc trang trí, 1×1 ô

Ưu tiên 2 · Tỉ lệ 1:1 · Đính kèm: `art/blockout/guide_1x1_h20.png` (Image 1)

```text
Paint ONE natural object as a game sprite for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world.

Must keep:
- Image 1 is a PLACEMENT GUIDE: the grey diamond is the ground footprint (true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective), and the dashed lines show the maximum height. Draw the object standing on that footprint and inside that box. Do NOT draw the guide lines, the grey diamond or any ground under the object.
- One object only, centered where the guide is. Background: pure flat white (#FFFFFF), no paper texture behind it, no ground shadow, no scenery, no text, no seal stamp, no border.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed at the edges of washes.
- Light from the upper left, shadows on the right side.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent.
- No saturated colors, no digital gradients, no glossy 3D rendering look.

## Subject
A small clump of five or six bamboo stalks with jointed stems in ink and slender leaves drawn as quick 'ge' character strokes, leaves in dark ink with muted jade-green wash, gently leaning as if in a breeze. Rooted in the center of the diamond, reaching about the top of the dashed box.

Image 1 is the PLACEMENT GUIDE only — do not draw it.
Output a square 1:1 image.
```

## dao — Cây đào hoa trang trí (xuân), 1×1 ô

Ưu tiên 2 · Tỉ lệ 1:1 · Đính kèm: `art/blockout/guide_1x1_h20.png` (Image 1)

```text
Paint ONE natural object as a game sprite for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world.

Must keep:
- Image 1 is a PLACEMENT GUIDE: the grey diamond is the ground footprint (true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective), and the dashed lines show the maximum height. Draw the object standing on that footprint and inside that box. Do NOT draw the guide lines, the grey diamond or any ground under the object.
- One object only, centered where the guide is. Background: pure flat white (#FFFFFF), no paper texture behind it, no ground shadow, no scenery, no text, no seal stamp, no border.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed at the edges of washes.
- Light from the upper left, shadows on the right side.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent.
- No saturated colors, no digital gradients, no glossy 3D rendering look.

## Subject
A small peach blossom tree: dark angular ink branches, clusters of pale pink blossoms dotted in light wash (the only pink in the image, kept soft and muted), a few petals falling. Rooted in the center of the diamond, crown reaching about the top of the dashed box.

Image 1 is the PLACEMENT GUIDE only — do not draw it.
Output a square 1:1 image.
```

## ky_thach — Đá cảnh (kỳ thạch), 1×1 ô

Ưu tiên 2 · Tỉ lệ 1:1 · Đính kèm: `art/blockout/guide_1x1_h06.png` (Image 1)

```text
Paint ONE natural object as a game sprite for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world.

Must keep:
- Image 1 is a PLACEMENT GUIDE: the grey diamond is the ground footprint (true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective), and the dashed lines show the maximum height. Draw the object standing on that footprint and inside that box. Do NOT draw the guide lines, the grey diamond or any ground under the object.
- One object only, centered where the guide is. Background: pure flat white (#FFFFFF), no paper texture behind it, no ground shadow, no scenery, no text, no seal stamp, no border.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed at the edges of washes.
- Light from the upper left, shadows on the right side.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent.
- No saturated colors, no digital gradients, no glossy 3D rendering look.

## Subject
A single scholar's rock (Taihu stone): pale grey porous limestone with holes and hollows, outlined in confident ink with dry-brush texture, a tuft of grass at its foot. It sits on the diamond and stays within the low dashed box.

Image 1 is the PLACEMENT GUIDE only — do not draw it.
Output a square 1:1 image.
```

## lau_say — Cụm lau sậy ven nước, 1×1 ô

Ưu tiên 2 · Tỉ lệ 1:1 · Đính kèm: `art/blockout/guide_1x1_h06.png` (Image 1)

```text
Paint ONE natural object as a game sprite for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world.

Must keep:
- Image 1 is a PLACEMENT GUIDE: the grey diamond is the ground footprint (true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective), and the dashed lines show the maximum height. Draw the object standing on that footprint and inside that box. Do NOT draw the guide lines, the grey diamond or any ground under the object.
- One object only, centered where the guide is. Background: pure flat white (#FFFFFF), no paper texture behind it, no ground shadow, no scenery, no text, no seal stamp, no border.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed at the edges of washes.
- Light from the upper left, shadows on the right side.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent.
- No saturated colors, no digital gradients, no glossy 3D rendering look.

## Subject
A clump of reeds and tall grass at a stream bank: slender blades in quick ink strokes, a few feathery seed heads, muted jade green and ochre washes. Rooted on the diamond, within the low dashed box.

Image 1 is the PLACEMENT GUIDE only — do not draw it.
Output a square 1:1 image.
```

