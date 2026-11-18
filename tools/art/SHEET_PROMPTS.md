# Prompt sprite sheet 3×3 — Mặc Họa Tiên Thành

Sinh tự động từ `terrain.json` (trường `variants`) + `style-terrain.md` (`npm run art:prompts`). Đừng sửa trực tiếp.

Mỗi sheet cho 9 biến thể của một loại cây/đá. Game bốc ngẫu nhiên một biến thể cho mỗi ô và lật trái/phải, nên cảnh không lặp lại.

## Cách dùng
1. Đính kèm đúng ảnh khung ghi dưới mỗi mục (`art/blockout/sheet_guide_*.png`), dán prompt, khung 1:1.
2. Kiểm tra: đủ 9 vật, mỗi vật nằm gọn trong ô của nó, không vẽ khung. Hàng trên to, hàng dưới nhỏ.
3. Gửi ảnh cho Claude kèm tên (vd. `tung`). Claude cắt bằng `python tools/art/sheet.py art/source/tung_sheet_v1.png tung`.

## vach_da — Vách đá trên ô Đá (rìa sau bản đồ), 2×2 ô

Đính kèm: `art/blockout/sheet_guide_2x2_h12.png` (Image 1) · Tỉ lệ 1:1

```text
Paint a SPRITE SHEET for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world: a 3×3 grid showing NINE different variations of the same kind of object, so the game can scatter them without visible repetition.

Must keep:
- Image 1 is the LAYOUT GUIDE: nine equal cells, each with a grey diamond (the ground footprint, true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective) and a dashed box (the maximum height). Put exactly ONE object in each cell, standing on that cell's diamond, inside its dashed box.
- Every object stays fully inside its own cell with wide white margins — no leaf, branch or petal may cross into a neighbouring cell. Keep the cells in a strict 3×3 layout.
- Do NOT draw the guide: no diamonds, no dashed boxes, no cell borders, no grid lines, no ground under the objects.
- Size variety: row 1 = large (fills most of the dashed box), row 2 = medium (about two thirds), row 3 = small (about half). Within each row, vary the silhouette and lean direction.
- All nine share the same camera angle, the same light from the upper left, the same brush style and palette.
- Background: pure flat white (#FFFFFF), no paper texture, no shadows on the ground, no text, no numbers, no seal stamp, no frame.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent. Soft pale pink only for peach blossoms.
- No saturated colors, no digital gradients, no glossy 3D look.

## Subject
Rocky outcrops for the edge of a mountain sect: angular stacked boulders with cracked faces, dry-brush texture strokes (cun fa), moss in muted jade green. Each one covers its cell's 2×2 diamond footprint.

The nine cells, left to right, top to bottom:
1. tall stacked cliff of angular boulders with a clinging pine
2. wide low rocky ledge with moss
3. cliff with a thin trickle of waterfall down one face
4. pile of three big boulders with ferns
5. jagged rock spire with cracked faces
6. cliff with a small dark cave opening
7. mossy rounded boulders with a shrub
8. broken scree of medium rocks
9. low flat rock shelf with grass on top

Image 1 is the LAYOUT GUIDE only — do not draw it.
Output a square 1:1 image.
```

## tung — Cây tùng trang trí trên ô cỏ trống, 1×1 ô

Đính kèm: `art/blockout/sheet_guide_1x1_h20.png` (Image 1) · Tỉ lệ 1:1

```text
Paint a SPRITE SHEET for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world: a 3×3 grid showing NINE different variations of the same kind of object, so the game can scatter them without visible repetition.

Must keep:
- Image 1 is the LAYOUT GUIDE: nine equal cells, each with a grey diamond (the ground footprint, true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective) and a dashed box (the maximum height). Put exactly ONE object in each cell, standing on that cell's diamond, inside its dashed box.
- Every object stays fully inside its own cell with wide white margins — no leaf, branch or petal may cross into a neighbouring cell. Keep the cells in a strict 3×3 layout.
- Do NOT draw the guide: no diamonds, no dashed boxes, no cell borders, no grid lines, no ground under the objects.
- Size variety: row 1 = large (fills most of the dashed box), row 2 = medium (about two thirds), row 3 = small (about half). Within each row, vary the silhouette and lean direction.
- All nine share the same camera angle, the same light from the upper left, the same brush style and palette.
- Background: pure flat white (#FFFFFF), no paper texture, no shadows on the ground, no text, no numbers, no seal stamp, no frame.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent. Soft pale pink only for peach blossoms.
- No saturated colors, no digital gradients, no glossy 3D look.

## Subject
Ancient pine trees (cổ tùng): gnarled trunks with flaking bark in dry brush, layered flat needle clusters in dark ink with muted jade-green wash, elegant scholar-painting silhouettes. Each trunk base sits on the center of its cell's diamond.

The nine cells, left to right, top to bottom:
1. ancient pine leaning strongly to the left, long horizontal top branch
2. tall upright pine with a split twin trunk and layered crown
3. windswept pine bent to the right, crown swept sideways
4. mature pine with a round dense crown
5. pine with a sparse crown of three needle clusters and peeling bark
6. pine growing out of a small rock at its base
7. young pine sapling, slim straight trunk
8. low bushy pine shrub, wider than tall
9. old broken pine stump with a few new needle shoots

Image 1 is the LAYOUT GUIDE only — do not draw it.
Output a square 1:1 image.
```

## truc — Cụm trúc trang trí, 1×1 ô

Đính kèm: `art/blockout/sheet_guide_1x1_h20.png` (Image 1) · Tỉ lệ 1:1

```text
Paint a SPRITE SHEET for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world: a 3×3 grid showing NINE different variations of the same kind of object, so the game can scatter them without visible repetition.

Must keep:
- Image 1 is the LAYOUT GUIDE: nine equal cells, each with a grey diamond (the ground footprint, true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective) and a dashed box (the maximum height). Put exactly ONE object in each cell, standing on that cell's diamond, inside its dashed box.
- Every object stays fully inside its own cell with wide white margins — no leaf, branch or petal may cross into a neighbouring cell. Keep the cells in a strict 3×3 layout.
- Do NOT draw the guide: no diamonds, no dashed boxes, no cell borders, no grid lines, no ground under the objects.
- Size variety: row 1 = large (fills most of the dashed box), row 2 = medium (about two thirds), row 3 = small (about half). Within each row, vary the silhouette and lean direction.
- All nine share the same camera angle, the same light from the upper left, the same brush style and palette.
- Background: pure flat white (#FFFFFF), no paper texture, no shadows on the ground, no text, no numbers, no seal stamp, no frame.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent. Soft pale pink only for peach blossoms.
- No saturated colors, no digital gradients, no glossy 3D look.

## Subject
Bamboo (trúc): jointed stalks in ink, slender leaves drawn as quick brush strokes, dark ink with muted jade-green wash. Each clump is rooted on the center of its cell's diamond.

The nine cells, left to right, top to bottom:
1. dense clump of seven tall bamboo stalks, full foliage
2. three very tall slender stalks, sparse leaves near the top
3. clump leaning to the left as if in strong wind
4. medium clump of four stalks with young bamboo shoots at the base
5. two crossing stalks with drooping leaves
6. medium clump with a short woven bamboo fence segment at its foot
7. small cluster of young stalks, mostly leaves
8. a single young stalk with a few leaves
9. low bamboo bush, short stems, round leafy shape

Image 1 is the LAYOUT GUIDE only — do not draw it.
Output a square 1:1 image.
```

## dao — Cây đào hoa trang trí (xuân), 1×1 ô

Đính kèm: `art/blockout/sheet_guide_1x1_h20.png` (Image 1) · Tỉ lệ 1:1

```text
Paint a SPRITE SHEET for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world: a 3×3 grid showing NINE different variations of the same kind of object, so the game can scatter them without visible repetition.

Must keep:
- Image 1 is the LAYOUT GUIDE: nine equal cells, each with a grey diamond (the ground footprint, true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective) and a dashed box (the maximum height). Put exactly ONE object in each cell, standing on that cell's diamond, inside its dashed box.
- Every object stays fully inside its own cell with wide white margins — no leaf, branch or petal may cross into a neighbouring cell. Keep the cells in a strict 3×3 layout.
- Do NOT draw the guide: no diamonds, no dashed boxes, no cell borders, no grid lines, no ground under the objects.
- Size variety: row 1 = large (fills most of the dashed box), row 2 = medium (about two thirds), row 3 = small (about half). Within each row, vary the silhouette and lean direction.
- All nine share the same camera angle, the same light from the upper left, the same brush style and palette.
- Background: pure flat white (#FFFFFF), no paper texture, no shadows on the ground, no text, no numbers, no seal stamp, no frame.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent. Soft pale pink only for peach blossoms.
- No saturated colors, no digital gradients, no glossy 3D look.

## Subject
Peach blossom trees (đào): dark angular ink branches, clusters of pale pink blossoms in light wash, kept soft and muted. Each trunk base sits on the center of its cell's diamond.

The nine cells, left to right, top to bottom:
1. large peach tree in full bloom, wide crown of pale pink blossoms
2. large peach tree with fewer blossoms and fresh green leaves
3. old twisted trunk with a few blossoming branches
4. medium young peach tree, upright, light blossoms
5. medium tree with petals falling around it
6. medium tree leaning to the right, blossoms on one side
7. small peach sapling with a handful of blossoms
8. small flowering bush
9. low gnarled stump with one blossoming twig

Image 1 is the LAYOUT GUIDE only — do not draw it.
Output a square 1:1 image.
```

## ky_thach — Đá cảnh (kỳ thạch), 1×1 ô

Đính kèm: `art/blockout/sheet_guide_1x1_h06.png` (Image 1) · Tỉ lệ 1:1

```text
Paint a SPRITE SHEET for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world: a 3×3 grid showing NINE different variations of the same kind of object, so the game can scatter them without visible repetition.

Must keep:
- Image 1 is the LAYOUT GUIDE: nine equal cells, each with a grey diamond (the ground footprint, true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective) and a dashed box (the maximum height). Put exactly ONE object in each cell, standing on that cell's diamond, inside its dashed box.
- Every object stays fully inside its own cell with wide white margins — no leaf, branch or petal may cross into a neighbouring cell. Keep the cells in a strict 3×3 layout.
- Do NOT draw the guide: no diamonds, no dashed boxes, no cell borders, no grid lines, no ground under the objects.
- Size variety: row 1 = large (fills most of the dashed box), row 2 = medium (about two thirds), row 3 = small (about half). Within each row, vary the silhouette and lean direction.
- All nine share the same camera angle, the same light from the upper left, the same brush style and palette.
- Background: pure flat white (#FFFFFF), no paper texture, no shadows on the ground, no text, no numbers, no seal stamp, no frame.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent. Soft pale pink only for peach blossoms.
- No saturated colors, no digital gradients, no glossy 3D look.

## Subject
Scholar's rocks (kỳ thạch, Taihu stone) and garden stones: pale grey porous limestone with holes and hollows, confident ink outline, dry-brush texture. Each sits on its cell's diamond, inside the low dashed box.

The nine cells, left to right, top to bottom:
1. tall vertical Taihu scholar rock with many holes
2. wide low porous rock lying on its side
3. two scholar rocks of different heights side by side
4. medium rock with a clump of grass and moss
5. pointed upright stone like a small peak
6. flat stepping stone with moss in its cracks
7. group of three small pebbles and one medium stone
8. small round mossy boulder
9. tiny pair of pebbles with a grass tuft

Image 1 is the LAYOUT GUIDE only — do not draw it.
Output a square 1:1 image.
```

## lau_say — Cụm lau sậy ven nước, 1×1 ô

Đính kèm: `art/blockout/sheet_guide_1x1_h06.png` (Image 1) · Tỉ lệ 1:1

```text
Paint a SPRITE SHEET for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world: a 3×3 grid showing NINE different variations of the same kind of object, so the game can scatter them without visible repetition.

Must keep:
- Image 1 is the LAYOUT GUIDE: nine equal cells, each with a grey diamond (the ground footprint, true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective) and a dashed box (the maximum height). Put exactly ONE object in each cell, standing on that cell's diamond, inside its dashed box.
- Every object stays fully inside its own cell with wide white margins — no leaf, branch or petal may cross into a neighbouring cell. Keep the cells in a strict 3×3 layout.
- Do NOT draw the guide: no diamonds, no dashed boxes, no cell borders, no grid lines, no ground under the objects.
- Size variety: row 1 = large (fills most of the dashed box), row 2 = medium (about two thirds), row 3 = small (about half). Within each row, vary the silhouette and lean direction.
- All nine share the same camera angle, the same light from the upper left, the same brush style and palette.
- Background: pure flat white (#FFFFFF), no paper texture, no shadows on the ground, no text, no numbers, no seal stamp, no frame.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent. Soft pale pink only for peach blossoms.
- No saturated colors, no digital gradients, no glossy 3D look.

## Subject
Reeds and tall grass at a stream bank: slender blades in quick ink strokes, feathery seed heads, muted jade green and ochre washes. Each clump is rooted on its cell's diamond, inside the low dashed box.

The nine cells, left to right, top to bottom:
1. tall dense reed clump with feathery seed heads
2. wide fan-shaped grass clump bending in the wind
3. reeds with seed heads drooping to the left
4. cattails (bulrush) with brown spikes
5. medium reeds beside a small stone
6. sparse reeds, five thin stems
7. short sedge tuft
8. small grass clump with tiny pale flowers
9. a few young reed shoots

Image 1 is the LAYOUT GUIDE only — do not draw it.
Output a square 1:1 image.
```


# Nhà phàm trần — sheet 3×3 (hàng = cấp nhà)

Ba sheet cho ba vùng Tam Tài Khí. Khác sheet cây đá: **hàng trên là nhà cấp 1 (nhỏ nhất), hàng dưới là cấp 3 (lớn nhất)**.
Đính kèm `art/blockout/sheet_guide_1x1_h12.png`. Cắt bằng `python tools/art/sheet.py art/source/cu_sheet_v1.png cu --houses`.

## nha_cu — Nhà phàm trần — vùng Phàm Cư (dân ở)

Đính kèm: `art/blockout/sheet_guide_1x1_h12.png` (Image 1) · Tỉ lệ 1:1

```text
Paint a SPRITE SHEET for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world: a 3×3 grid showing NINE different variations of the same kind of building, in three upgrade levels, so the game can scatter them without visible repetition.

Must keep:
- Image 1 is the LAYOUT GUIDE: nine equal cells, each with a grey diamond (the ground footprint, true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective) and a dashed box (the maximum height). Put exactly ONE object in each cell, standing on that cell's diamond, inside its dashed box.
- Every object stays fully inside its own cell with wide white margins — no leaf, branch or petal may cross into a neighbouring cell. Keep the cells in a strict 3×3 layout.
- Do NOT draw the guide: no diamonds, no dashed boxes, no cell borders, no grid lines, no ground under the objects.
- Size by ROW, not by column: row 1 = level 1 (smallest), row 2 = level 2, row 3 = level 3 (largest), exactly as described below. Within each row the three buildings are similar in size but different in design.
- All nine share the same camera angle, the same light from the upper left, the same brush style and palette.
- Background: pure flat white (#FFFFFF), no paper texture, no shadows on the ground, no text, no numbers, no seal stamp, no frame.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent. Soft pale pink only for peach blossoms.
- No saturated colors, no digital gradients, no glossy 3D look.

## Subject
Mortal village houses at the foot of an immortal sect mountain, 1×1 tile each. Simple Song-dynasty rural architecture: rammed-earth or whitewashed walls, wooden posts, small courtyards.

Row 1 — level 1 THATCHED COTTAGES (thảo xá), small and humble, about 40% of the dashed box height: (1) thatched hut with a woven fence, (2) thatched cottage with a drying rack of herbs, (3) tiny hut with a water jar and a hoe by the door.
Row 2 — level 2 TILED HOUSES (trạch viện), about 65% of the box height: (4) tiled-roof house with a small walled courtyard, (5) L-shaped tiled house with a well, (6) tiled house with a bamboo grove behind a low wall.
Row 3 — level 3 TWO-STOREY RESIDENCES (lâu các), filling most of the box: (7) two-storey house with a balcony and hanging lanterns, (8) courtyard mansion with an upturned-eave gate, (9) two-storey house with a small tower room on top.

Image 1 is the LAYOUT GUIDE only — do not draw it.
Output a square 1:1 image.
```

## nha_thi — Cửa hàng — vùng Phường Thị (buôn bán)

Đính kèm: `art/blockout/sheet_guide_1x1_h12.png` (Image 1) · Tỉ lệ 1:1

```text
Paint a SPRITE SHEET for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world: a 3×3 grid showing NINE different variations of the same kind of building, in three upgrade levels, so the game can scatter them without visible repetition.

Must keep:
- Image 1 is the LAYOUT GUIDE: nine equal cells, each with a grey diamond (the ground footprint, true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective) and a dashed box (the maximum height). Put exactly ONE object in each cell, standing on that cell's diamond, inside its dashed box.
- Every object stays fully inside its own cell with wide white margins — no leaf, branch or petal may cross into a neighbouring cell. Keep the cells in a strict 3×3 layout.
- Do NOT draw the guide: no diamonds, no dashed boxes, no cell borders, no grid lines, no ground under the objects.
- Size by ROW, not by column: row 1 = level 1 (smallest), row 2 = level 2, row 3 = level 3 (largest), exactly as described below. Within each row the three buildings are similar in size but different in design.
- All nine share the same camera angle, the same light from the upper left, the same brush style and palette.
- Background: pure flat white (#FFFFFF), no paper texture, no shadows on the ground, no text, no numbers, no seal stamp, no frame.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent. Soft pale pink only for peach blossoms.
- No saturated colors, no digital gradients, no glossy 3D look.

## Subject
Market buildings of a small xianxia town, 1×1 tile each. Song-dynasty shops with shop flags, cloth awnings and goods on display.

Row 1 — level 1 STALLS, small, about 40% of the dashed box height: (1) noodle stall with a cloth awning and benches, (2) herb stall with baskets, (3) street stall with pottery and a red shop flag.
Row 2 — level 2 SHOPS, about 65% of the box height: (4) tea house with an open front and a hanging sign board, (5) cloth shop with bolts of silk at the door, (6) talisman and paper shop with yellow paper hanging.
Row 3 — level 3 TWO-STOREY TRADING HOUSES, filling most of the box: (7) two-storey restaurant with red lanterns and a tall shop flag, (8) spirit-stone exchange with a stone lion at the door, (9) two-storey inn with a balcony.

Image 1 is the LAYOUT GUIDE only — do not draw it.
Output a square 1:1 image.
```

## nha_dien — Ruộng nương — vùng Linh Điền (việc làm ruộng)

Đính kèm: `art/blockout/sheet_guide_1x1_h12.png` (Image 1) · Tỉ lệ 1:1

```text
Paint a SPRITE SHEET for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world: a 3×3 grid showing NINE different variations of the same kind of building, in three upgrade levels, so the game can scatter them without visible repetition.

Must keep:
- Image 1 is the LAYOUT GUIDE: nine equal cells, each with a grey diamond (the ground footprint, true 2:1 isometric, viewed from the front-right, 30° downward, orthographic — no perspective) and a dashed box (the maximum height). Put exactly ONE object in each cell, standing on that cell's diamond, inside its dashed box.
- Every object stays fully inside its own cell with wide white margins — no leaf, branch or petal may cross into a neighbouring cell. Keep the cells in a strict 3×3 layout.
- Do NOT draw the guide: no diamonds, no dashed boxes, no cell borders, no grid lines, no ground under the objects.
- Size by ROW, not by column: row 1 = level 1 (smallest), row 2 = level 2, row 3 = level 3 (largest), exactly as described below. Within each row the three buildings are similar in size but different in design.
- All nine share the same camera angle, the same light from the upper left, the same brush style and palette.
- Background: pure flat white (#FFFFFF), no paper texture, no shadows on the ground, no text, no numbers, no seal stamp, no frame.

Style:
- Traditional Chinese ink-wash painting (shuimo) on xuan paper, detailed like a Song-dynasty landscape painting.
- Confident brush outlines of varying thickness, dry-brush texture strokes on rock and bark, soft wet washes, slight ink bleed.

Palette (strict):
- Mostly ink black-to-grey tones. Muted jade green (#7FA38A) and stone blue (#3E6C8C) washes for foliage and moss. Ochre (#C9A24A) only as a tiny accent. Soft pale pink only for peach blossoms.
- No saturated colors, no digital gradients, no glossy 3D look.

## Subject
Spirit-farm plots of a xianxia village, 1×1 tile each, seen as small isometric dioramas: neat raised field beds of glowing-green spirit rice and herbs, irrigation channels, farm structures.

Row 1 — level 1 SMALL PLOTS, low, about 25% of the dashed box height: (1) three rows of young spirit rice in wet soil, (2) small vegetable and herb beds with a bamboo fence, (3) plot with a scarecrow.
Row 2 — level 2 FIELDS WITH A HUT, about 45% of the box height: (4) rice field with a small thatched field hut, (5) herb field with a water wheel on a channel, (6) field with stacked harvest sheaves.
Row 3 — level 3 TERRACED FARMS, about 65% of the box height: (7) terraced spirit-rice paddies with a granary, (8) herb garden with a drying pavilion, (9) field with a round granary and a small shrine.

Image 1 is the LAYOUT GUIDE only — do not draw it.
Output a square 1:1 image.
```

