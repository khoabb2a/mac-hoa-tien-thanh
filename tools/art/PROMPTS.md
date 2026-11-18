# Prompt vẽ tay bằng Gemini — Mặc Họa Tiên Thành

Tệp này được sinh tự động từ `style-prompt.md` + `subjects.json`. Đừng sửa trực tiếp; sửa nguồn rồi chạy `npm run art:prompts`.

## Cách dùng
1. Mở Gemini (gemini.google.com, chọn chế độ tạo ảnh) hoặc Google AI Studio với model ảnh (Nano Banana).
2. Đính kèm **hai ảnh theo đúng thứ tự**: `art/blockout/<loai>_line.png` trước, `art/blockout/<loai>_shade.png` sau.
3. Dán nguyên khối prompt của công trình đó (bấm nút copy ở góc khối trên GitHub).
4. Tạo 3–4 lần, lưu ảnh đẹp vào `art/generated/<loai>/` hoặc gửi thẳng cho Claude.
5. Nếu AI vẽ lệch hình khối, gửi thêm: *"Keep the exact silhouette and camera angle of Image 1. Redraw."*

## chinhDien

Ảnh đính kèm: `art/blockout/chinhDien_line.png` (Image 1), `art/blockout/chinhDien_shade.png` (Image 2)

```text
# Style brief — Mặc Họa Tiên Thành (ink-wash isometric game asset)

Paint ONE building as a game sprite for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world.

## Must keep
- Follow the LINE DRAWING exactly: same silhouette, proportions, footprint, number of pillars, roof tiers and camera angle (isometric, viewed from the front-right, about 30° downward, orthographic — no perspective).
- True 2:1 isometric projection: a square footprint appears as a diamond exactly twice as wide as it is tall; a circle on the ground appears as an ellipse whose height is exactly half its width. Keep heights the same as in the line drawing — do not make anything taller or thicker.
- Single building only, centered, filling about 80% of the frame. The stone base is the lowest thing drawn.
- Background: pure flat white (#FFFFFF), no paper texture behind the building, no ground, no shadow on the ground, no scenery, no clouds, no people, no text, no seal stamp, no border or frame.

## Style
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, like a detailed gongbi-meets-xieyi architectural illustration.
- Confident brush outlines of varying thickness: heavy strokes on the roof ridge and eaves, fine strokes on lattice and railings. One boldest stroke on the main roof line.
- Dry-brush texture on wood and stone, soft wet washes for shading, slight ink bleed at the edges of washes.
- Rich craftsmanship detail: rows of roof tiles, upturned flying eave tips, ridge ornaments, wooden lattice windows and doors, railings, bracket sets under the eaves, carved stone base with steps.
- Lighting matches the TONAL REFERENCE: light from the upper left, shadows on the right faces.

## Palette (strict)
- 90%: ink black-to-grey tones and warm paper beige (#EFE6D2) on the walls.
- Stone bases and platforms: light-to-mid grey ink wash with visible dry-brush texture and a dark outline — never pure white, so they stand out on a beige paper map.
- 8%: muted jade green (#7FA38A) or stone blue (#3E6C8C) accents only.
- 2%: cinnabar red (#C8372D) only on pillars, doors or lanterns; a tiny touch of ochre gold (#C9A24A) allowed on the roof finial.
- No saturated colors, no gradients that look digital, no glossy 3D rendering look.

## Subject
Sect Grand Hall (Tông Môn Đại Điện 宗門大殿): the main hall of an immortal cultivation sect. Two-tier hip-and-gable roof with dark grey tiles and strongly upturned eave tips, a small gold finial on top. Six cinnabar-red pillars across the front veranda, wooden lattice doors behind them, a raised carved stone platform with a short flight of steps at the front. Dignified, ancient, slightly mystical.

Image 1 is the LINE DRAWING: follow its silhouette, proportions and camera angle exactly.
Image 2 is the TONAL REFERENCE: use only its light and shadow, do NOT copy its flat colors.
Output a square 1:1 image.
```

## tinhXa

Ảnh đính kèm: `art/blockout/tinhXa_line.png` (Image 1), `art/blockout/tinhXa_shade.png` (Image 2)

```text
# Style brief — Mặc Họa Tiên Thành (ink-wash isometric game asset)

Paint ONE building as a game sprite for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world.

## Must keep
- Follow the LINE DRAWING exactly: same silhouette, proportions, footprint, number of pillars, roof tiers and camera angle (isometric, viewed from the front-right, about 30° downward, orthographic — no perspective).
- True 2:1 isometric projection: a square footprint appears as a diamond exactly twice as wide as it is tall; a circle on the ground appears as an ellipse whose height is exactly half its width. Keep heights the same as in the line drawing — do not make anything taller or thicker.
- Single building only, centered, filling about 80% of the frame. The stone base is the lowest thing drawn.
- Background: pure flat white (#FFFFFF), no paper texture behind the building, no ground, no shadow on the ground, no scenery, no clouds, no people, no text, no seal stamp, no border or frame.

## Style
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, like a detailed gongbi-meets-xieyi architectural illustration.
- Confident brush outlines of varying thickness: heavy strokes on the roof ridge and eaves, fine strokes on lattice and railings. One boldest stroke on the main roof line.
- Dry-brush texture on wood and stone, soft wet washes for shading, slight ink bleed at the edges of washes.
- Rich craftsmanship detail: rows of roof tiles, upturned flying eave tips, ridge ornaments, wooden lattice windows and doors, railings, bracket sets under the eaves, carved stone base with steps.
- Lighting matches the TONAL REFERENCE: light from the upper left, shadows on the right faces.

## Palette (strict)
- 90%: ink black-to-grey tones and warm paper beige (#EFE6D2) on the walls.
- Stone bases and platforms: light-to-mid grey ink wash with visible dry-brush texture and a dark outline — never pure white, so they stand out on a beige paper map.
- 8%: muted jade green (#7FA38A) or stone blue (#3E6C8C) accents only.
- 2%: cinnabar red (#C8372D) only on pillars, doors or lanterns; a tiny touch of ochre gold (#C9A24A) allowed on the roof finial.
- No saturated colors, no gradients that look digital, no glossy 3D rendering look.

## Subject
Disciple Quarters (Đệ Tử Tĩnh Xá 弟子靜舍): a modest one-storey wooden dwelling for outer-sect disciples. Single curved tile roof with upturned corners, four red pillars, paper lattice windows, a low stone base. Simple, quiet, lived-in: a broom by the door, a small potted pine.

Image 1 is the LINE DRAWING: follow its silhouette, proportions and camera angle exactly.
Image 2 is the TONAL REFERENCE: use only its light and shadow, do NOT copy its flat colors.
Output a square 1:1 image.
```

## tuLinhTran

Ảnh đính kèm: `art/blockout/tuLinhTran_line.png` (Image 1), `art/blockout/tuLinhTran_shade.png` (Image 2)

```text
# Style brief — Mặc Họa Tiên Thành (ink-wash isometric game asset)

Paint ONE building as a game sprite for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world.

## Must keep
- Follow the LINE DRAWING exactly: same silhouette, proportions, footprint, number of pillars, roof tiers and camera angle (isometric, viewed from the front-right, about 30° downward, orthographic — no perspective).
- True 2:1 isometric projection: a square footprint appears as a diamond exactly twice as wide as it is tall; a circle on the ground appears as an ellipse whose height is exactly half its width. Keep heights the same as in the line drawing — do not make anything taller or thicker.
- Single building only, centered, filling about 80% of the frame. The stone base is the lowest thing drawn.
- Background: pure flat white (#FFFFFF), no paper texture behind the building, no ground, no shadow on the ground, no scenery, no clouds, no people, no text, no seal stamp, no border or frame.

## Style
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, like a detailed gongbi-meets-xieyi architectural illustration.
- Confident brush outlines of varying thickness: heavy strokes on the roof ridge and eaves, fine strokes on lattice and railings. One boldest stroke on the main roof line.
- Dry-brush texture on wood and stone, soft wet washes for shading, slight ink bleed at the edges of washes.
- Rich craftsmanship detail: rows of roof tiles, upturned flying eave tips, ridge ornaments, wooden lattice windows and doors, railings, bracket sets under the eaves, carved stone base with steps.
- Lighting matches the TONAL REFERENCE: light from the upper left, shadows on the right faces.

## Palette (strict)
- 90%: ink black-to-grey tones and warm paper beige (#EFE6D2) on the walls.
- Stone bases and platforms: light-to-mid grey ink wash with visible dry-brush texture and a dark outline — never pure white, so they stand out on a beige paper map.
- 8%: muted jade green (#7FA38A) or stone blue (#3E6C8C) accents only.
- 2%: cinnabar red (#C8372D) only on pillars, doors or lanterns; a tiny touch of ochre gold (#C9A24A) allowed on the roof finial.
- No saturated colors, no gradients that look digital, no glossy 3D rendering look.

## Subject
Qi Gathering Array (Tụ Linh Trận 聚靈陣): a FLAT, LOW round stone disc lying on the ground like a millstone — its thickness is only about one tenth of its diameter, NOT a tall drum or pedestal. On its top surface: a carved ring of Chinese seal-script talisman characters and a faint jade-green circle. In the center a slim jade obelisk, topped with a small floating gold crystal. Wisps of pale ink mist rise from the runes. No walls, no roof.

Image 1 is the LINE DRAWING: follow its silhouette, proportions and camera angle exactly.
Image 2 is the TONAL REFERENCE: use only its light and shadow, do NOT copy its flat colors.
Output a square 1:1 image.
```

## duocVien

Ảnh đính kèm: `art/blockout/duocVien_line.png` (Image 1), `art/blockout/duocVien_shade.png` (Image 2)

```text
# Style brief — Mặc Họa Tiên Thành (ink-wash isometric game asset)

Paint ONE building as a game sprite for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world.

## Must keep
- Follow the LINE DRAWING exactly: same silhouette, proportions, footprint, number of pillars, roof tiers and camera angle (isometric, viewed from the front-right, about 30° downward, orthographic — no perspective).
- True 2:1 isometric projection: a square footprint appears as a diamond exactly twice as wide as it is tall; a circle on the ground appears as an ellipse whose height is exactly half its width. Keep heights the same as in the line drawing — do not make anything taller or thicker.
- Single building only, centered, filling about 80% of the frame. The stone base is the lowest thing drawn.
- Background: pure flat white (#FFFFFF), no paper texture behind the building, no ground, no shadow on the ground, no scenery, no clouds, no people, no text, no seal stamp, no border or frame.

## Style
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, like a detailed gongbi-meets-xieyi architectural illustration.
- Confident brush outlines of varying thickness: heavy strokes on the roof ridge and eaves, fine strokes on lattice and railings. One boldest stroke on the main roof line.
- Dry-brush texture on wood and stone, soft wet washes for shading, slight ink bleed at the edges of washes.
- Rich craftsmanship detail: rows of roof tiles, upturned flying eave tips, ridge ornaments, wooden lattice windows and doors, railings, bracket sets under the eaves, carved stone base with steps.
- Lighting matches the TONAL REFERENCE: light from the upper left, shadows on the right faces.

## Palette (strict)
- 90%: ink black-to-grey tones and warm paper beige (#EFE6D2) on the walls.
- Stone bases and platforms: light-to-mid grey ink wash with visible dry-brush texture and a dark outline — never pure white, so they stand out on a beige paper map.
- 8%: muted jade green (#7FA38A) or stone blue (#3E6C8C) accents only.
- 2%: cinnabar red (#C8372D) only on pillars, doors or lanterns; a tiny touch of ochre gold (#C9A24A) allowed on the roof finial.
- No saturated colors, no gradients that look digital, no glossy 3D rendering look.

## Subject
Herb Garden (Dược Viên 藥園): four neat raised beds of medicinal spirit herbs in dark soil, small leafy plants in jade green, bordered by low bamboo edging. No building, only the garden plot on its footprint.

Image 1 is the LINE DRAWING: follow its silhouette, proportions and camera angle exactly.
Image 2 is the TONAL REFERENCE: use only its light and shadow, do NOT copy its flat colors.
Output a square 1:1 image.
```

