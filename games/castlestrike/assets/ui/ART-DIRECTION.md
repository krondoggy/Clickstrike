# Castle Strike UI art direction

Original interface artwork created on 2026-09-04. The visual direction draws on the tactile material language of early-2000s fantasy strategy interfaces: carved charcoal stone, worn bronze reinforcement, dark recessed panels, heraldic faction color, and compact illustrated ability buttons. No external reference images or existing copyrighted character artwork were provided.

## Shipped assets and methods

- `command-frame.png`: 1254 × 1254 PNG, generated with the built-in image generation tool. A complete square stone and bronze ornamental frame. Straight rails are approximately 120px deep; full corner fittings occupy about 215px. The image is the unmodified generated output; no raster slicing or postprocessing was performed. The interface uses CSS nine-slicing: `border-image: url('assets/ui/command-frame.png') 220 / 24px / 0 stretch;` on 14px panel borders. Dialogs use a 44px image border width. Responsive layouts reduce the visible border width.
- `alliance-crest.svg`: original hand-authored SVG, 128 × 128 viewBox. An angular blue and gold shield with a sunlike heraldic face, metal rim and restrained highlights.
- `horde-crest.svg`: original hand-authored SVG, 128 × 128 viewBox. A rust-red shield with crossed weapons, bone tusks and a weathered iron rim.
- `undead-crest.svg`: original hand-authored SVG, 128 × 128 viewBox. A jagged violet and bone crest with a pale green spectral skull.
- `starfall.svg`: original hand-authored SVG, 128 × 128 viewBox. A falling ember-bright meteor in an aged metal square frame.
- `war-cry.svg`: original hand-authored SVG, 128 × 128 viewBox. A curved bronze war horn against a dark red inset in the same metal frame.
- `restoration.svg`: original hand-authored SVG, 128 × 128 viewBox. A hand supporting a green leaf, with small restorative sparks and the matching metal frame.
- `stone-grain.svg`: original hand-authored SVG, 192 × 192. A low-contrast charcoal surface using stitched fractal noise and shallow crack paths; tiles behind interface content.

The seven SVG assets are editable vector source built from paths, shapes and gradients; the stone grain also uses SVG filter primitives. The six crest and ability designs share chunky silhouettes, dark outlines and warm directional bevels so they remain legible at small sizes. Existing unit portrait sheets continue to supply all 27 unit portraits.

## Command frame generation prompt

Use case: stylized-concept
Asset type: one seamless-in-use nine-slice UI PANEL FRAME texture for a fantasy real-time strategy game; a square decorative stone and bronze frame with a plain dark center.
Primary request: paint one original square heavy carved dark charcoal stone interface frame with narrow tarnished bronze edge bands, inspired by tactile medieval fantasy game interfaces from the early 2000s. This is a flat FRONT-ON 2D GAME UI TEXTURE, not a physical object seen in perspective. Square image target 1024 by 1024.
Exact composition: a 120-pixel-thick ornamental frame around all four OUTER EDGES. Its outermost edges extend exactly to the image boundaries. Each corner is a roughly 120px square containing a compact chiseled stone fitting and small aged bronze reinforcement. Top, bottom, left and right edge segments between corners are simple continuous straight stone rails with bronze bevel trim, very easy to stretch. Keep the corner art entirely within the four 120px corner squares. Frame interior begins exactly 120px from each image edge. Absolutely no decorative shapes extending from the frame into the center.
Center: an uninterrupted square recessed field of near-black charcoal slate (#101518) from x=120 to x=904 and y=120 to y=904, only very subtle natural stone pigment grain. No center ornament. The center should remain visually quiet behind game text. No spots, emblems, cracks, flames, gems, figures, branches, letters, or highlights in the central field.
Style/medium: restrained hand-painted carved basalt and dark iron with worn bronze strips, uneven brush texture, chipped bevels, weighty functional fortification architecture. Strong physical depth created by light top bevel and deep inset shadow; illuminate from top left with warm subdued light. Small weathered bronze rivets within corner fittings, compact shallow spiral carving within the four corner stones only. Very dark desaturated teal-black stone, tarnished brown gold metal, no saturated glows.
Constraints: EXACTLY ONE flat square frame, only perimeter decoration, single uninterrupted dark flat center. All straight edge rails parallel to canvas edges. No perspective, no tilt, no rendered room, no surrounding background, no transparency. No text, no lettering, no numbers, no logos, no watermark, no title. Avoid shiny gold, glossy rendering, giant central emblem, busy ornament, delicate filigree, and modern web UI.

