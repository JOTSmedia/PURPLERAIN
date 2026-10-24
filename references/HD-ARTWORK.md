# HD artwork revision — 2026-10-24

## Delivered assets

These images were enhanced with the built-in image generation tool in edit mode. They are photographic cutouts with genuine alpha transparency, not rigged 3D character meshes. All originals are preserved.

| Asset | Actual dimensions | Format |
|---|---:|---|
| `dist/assets/prince-hd-v3.png` | 1076 × 1461 | RGBA PNG |
| `dist/assets/morris-hd-v3.png` | 1024 × 1536 | RGBA PNG |
| `dist/assets/the-time-hd-v3.png` | 1415 × 1112 | RGBA PNG |

The requested 3840-pixel longest edge was not supplied by the built-in tool. These files must not be described as native 4K. A 3840 × 2160 game canvas renders the interface and 3D geometry at 4K, but cannot create original photographic detail missing from the source assets.

Prince and The Time retain the source monochrome treatment, arrangement and poses, with enhanced material detail. Morris retains the pale suit and overcoat, and the prior three-hand artifact is corrected to two hands. Morris's invisible RGB pixels still contain a studio backdrop, but pixel inspection confirms alpha is zero outside the cutout; a viewer ignoring alpha may show a glow that does not appear in normal transparent compositing.

## Source and inspection

The edit targets were inspected before generation:
- `dist/assets/prince-photo-v2.png`
- `dist/assets/morris-photo-v2.png`
- `dist/assets/the-time-photo-v2.png`
- `dist/assets/poster-reference.png`

All successful outputs were visually inspected and their dimensions/alpha inspected using sips/Pillow read-only operations. No image transformations were performed with Python or another editing tool. Final assets were copied unchanged from the built-in tool output directory.

## Final prompt set

### prince

Use case: identity-preserve. Edit target: supplied photographic full-body cutout of Prince playing his white Cloud guitar. Restore and enhance this exact image for high-definition game artwork, requesting a 3840-pixel longest edge output if available. Preserve the exact recognizable facial identity, expression, head angle, hair, body pose, outfit, guitar, composition, original black-and-white tonality and natural film grain. Refine clean detail in curls, lace, ruffles, sequins, guitar strings, and fabric without plastic skin, illustration or 3D stylization. Keep all limbs and boots visible in exactly the same placement. Preserve genuinely transparent alpha background and remove any edge contamination. Do not add scenery, lighting glows, text, people or props.

### morris

Use case: identity-preserve. Edit target: supplied photographic full-body Morris Day cutout. Restore and enhance this exact person for high-definition game artwork, requesting a 3840-pixel longest edge output if available. Preserve the recognizable face, expression, hairstyle, tailored pale lavender suit, cream overcoat, black cane, full-body framing, lighting and realistic photographic texture. Correct the existing extra-hand artifact: retain only two natural hands, the raised hand near the chest and the lowered hand holding the cane; remove the additional middle hand at coat closure and restore natural suit fabric there. Make background fully transparent with clean alpha around hair, clothing, shoes and cane, removing the current backdrop/glow. Refine fine hair, eyes, cloth weave and seams without changing facial identity or making skin smooth/plastic. Keep clothing colors and body pose otherwise unchanged. No new props, scenery, words, illustration or 3D rendering.

### the-time

Use case: identity-preserve. Edit target: supplied photographic full-body cutout of the six members of The Time. Restore and enhance this exact group for high-definition game artwork, requesting a 3840-pixel longest edge output if available. Preserve all six exact faces, expressions, hairstyles, hats, body positions, clothing, distinctive patterns, overlapping poses and original monochrome photographic treatment. Keep every person's head and shoes within the frame. Refine the source's photographic detail in eyes, hair, tailoring, shoes and fabric without inventing faces, plastic skin or an illustrated appearance. Preserve genuinely transparent alpha background and clean hair/body edges. Do not add any people, objects, scenery, words, colorization or stylization.

## Additional attempted edits

Morris background extraction follow-up:
Use case: background-extraction. Edit the supplied Morris Day image. Remove ONLY every part of the studio backdrop and bright halo surrounding the man. Output a tight, genuinely transparent PNG cutout of the man and his cane. In the output, all pixels not belonging to his body, hair, clothing, shoes or cane must be alpha-transparent, including the pale halo around the shoulders, coat, legs and shoes. Preserve the existing two hands, face, identity, eyes, expression, hair, pale lavender suit, cream overcoat, cane, pose and photographic pixels exactly. Do not redraw the subject, do not add shadows, do not add a background or halo, do not change framing. Requested longest edge 3840 pixels if possible.

This follow-up was not selected because alpha inspection showed that the first output already had a transparent backdrop. The first output preserves photographic detail more closely.

Poster restoration prompt:
Use case: identity-preserve. Edit target: the supplied complete Purple Rain poster. The user requests higher definition. Perform resolution enhancement and careful photographic restoration only within the exact existing canvas and composition; request a 3840-pixel longest edge if supported. Preserve all original faces, identities, poses, costume, motorcycle, building, smoke, rain, colors, title lettering, crop and framing. Improve the clarity of the existing pixels and fine detail conservatively, retaining photographic realism and natural grain. Keep the exact Purple Rain title lettering shape and placement. Do not extend the image, outpaint, add objects, change clothing or expressions, remove title text, create a new scene, or turn it into an illustration.

The resolution-only poster restoration was rejected by the image service safety system at output moderation, category `other`, request ID `44187bef-7023-4311-aa60-0f6989dca5c3`. No further attempt was made. The original 452 × 678 poster remains unchanged; there is no `poster-hd-v3.png`.

## Tool mode

Built-in `image_gen.imagegen`, edit requests with local referenced image paths; `transparent_background: true` for character cutouts and false for the poster. No fallback CLI or API-key workflow was used.

## Environment materials

Two new opaque materials were generated with the built-in tool and inspected:

| Asset | Actual dimensions | Format |
|---|---:|---|
| `dist/assets/wet-asphalt-hd.png` | 1254 × 1254 | RGB PNG |
| `dist/assets/brick-wall-hd.png` | 1254 × 1254 | RGB PNG |

Both are flat photographic-style diffuse color textures without objects, signage or directional perspective. The prompt requested a 2048-pixel square, but the tool returned 1254-pixel squares. No upsampling was performed. These are not native 4K textures and do not include separate normal or roughness maps. Repeat-friendly layouts were requested; exact pixel continuity at opposite edges is not guaranteed. Mirrored repeat can reduce visible boundary seams.

### wet-asphalt-hd prompt

Use case: photorealistic-natural. Asset type: seamless repeating PBR-style game environment diffuse color texture, flat top-down orthographic square tile. Create highly realistic dark charcoal asphalt covered by a thin rain film. Fine irregular aggregate, subtle gritty stone grains, restrained variation in wetness and very faint soft gray reflections only; dark but sufficient texture to read under game lighting. Request 2048 by 2048 pixels or highest available square resolution. Perfectly tileable at opposite edges, uniform lighting without direction or perspective. Texture only: no road markings, painted lines, sidewalks, objects, puddle boundaries, sky, people, vehicles, lettering or vignette. No baked large light sources. Opaque full-bleed square image.

### brick-wall-hd prompt

Use case: photorealistic-natural. Asset type: seamless repeating PBR-style game environment diffuse color texture, straight-on orthographic square tile. Create a highly realistic weathered Minneapolis industrial brick wall material. Modest rectangular red-brown and dark terracotta bricks in traditional running bond, slightly irregular aged surfaces, subtle chipped corners, fine gritty gray-beige mortar with realistic shallow joints. Restrained natural color variation and faint age stains. Request 2048 by 2048 pixels or highest available square resolution. Perfectly tileable at opposite edges with consistent brick size, uniform neutral diffuse lighting, no perspective distortion or vignette. Material texture only: no windows, doors, signs, graffiti, plants, people, objects or text. No baked directional shadows. Opaque full-bleed square image.

Mode: built-in `image_gen.imagegen`, new generation, `transparent_background: false`; outputs copied unchanged.


