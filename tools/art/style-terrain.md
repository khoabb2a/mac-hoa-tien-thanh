<!-- Ba khối phong cách cho tài sản địa hình. prompts.mjs chọn khối theo "kind" trong terrain.json. -->

## object
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

## texture
Paint a SQUARE, SEAMLESS, TILEABLE ground texture for a mobile isometric city-builder in Chinese ink-wash style.

Must keep:
- Viewed straight from above (top-down, orthographic). No perspective, no horizon, no objects standing up, no cast shadows.
- Seamless: the left edge must continue into the right edge and the top edge into the bottom edge, so the tile repeats without visible seams. No border, no vignette, no frame, no text, no seal.
- Even lighting and LOW contrast: it is shown as small tiles behind buildings and must stay quiet.

Style:
- Traditional Chinese ink-wash (shuimo) on xuan paper: soft washes, a few confident brush strokes, visible paper grain.
- Palette: warm paper beige (#EFE6D2), ink greys, at most a hint of muted jade green (#7FA38A) or stone blue (#3E6C8C). No saturated colors.

## backdrop
Paint a wide landscape backdrop for a mobile isometric city-builder set in a xianxia (Chinese cultivation fantasy) world. It is placed far behind the playable map.

Must keep:
- Sky: pure flat white (#FFFFFF), no clouds drawn in the sky, no sun or moon, no text, no seal stamp, no border.
- The bottom of the image fades fully into pure white mist so it blends into the map.
- Seen from slightly above, matching a game camera tilted 30° downward.

Style:
- Song-dynasty blue-green landscape painting (qinglü shanshui) on xuan paper: mineral jade-green (#7FA38A, #4F7A66) and stone-blue (#3E6C8C) washes over ink outlines, texture strokes on the mountain faces, atmospheric perspective (far = pale, near = dark).
- Calm, majestic, misty. No saturated or digital-looking colors.

## sheet
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
