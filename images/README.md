# Image Workflow

End-to-end workflow for adding blog-style images to about.aigamma.com. The goal is one consistent on-page footprint for every image regardless of source aspect ratio, no per-image CSS tweaks, and a repeatable ChatGPT → Snagit → repo pipeline.

## File standard

| Property | Value | Why |
| --- | --- | --- |
| Format | `.webp` | ~70% smaller than PNG/JPEG at equivalent quality, universal browser support in 2026. |
| Source dimensions | 1600×900 (16:9) | 2× the rendered display width. Sharp on retina without `srcset` complexity. |
| Compression | Quality 80 | Visually lossless for photographic content; aggressive enough to keep files under 200 KB. |
| Color profile | sRGB | Matches browser default rendering; avoids ICC mismatch artifacts. |
| Naming | `kebab-case-descriptive-slug.webp` | Slug describes content not slot, so the file survives layout reshuffling. |
| Location | `/images/<slug>.webp` (flat) | One directory, no subfolder maintenance. Cardinality at this site (~5–10 images) doesn't justify nesting. |

## Pipeline

### 1. Generate in ChatGPT (image 2.0 / gpt-image-1)

Use a structured prompt. The model performs better with explicit composition than with adjectives.

```
Generate a 1536×1024 landscape image, 16:9 framing, photorealistic, dark editorial mood.
Subject: <one-sentence concept>.
Composition: <foreground / background / negative space>.
Color palette: muted, dark blue and graphite, with a single accent color (#4a9eff blue OR #34d399 green — pick one, never amber/yellow).
Avoid: text overlays, watermarks, faces in focus, generic stock-photo composition.
```

Prompt notes:
- Ask for 1536×1024 (or larger) so you have headroom for cropping.
- Generate three variants per slot. Keep the one that needs the least editing.
- Save the chosen output as PNG to a working folder (not directly into `/images/`).

### 2. Edit and export in Snagit

1. Open the PNG in Snagit Editor.
2. Crop to **1600×900** (Image → Resize → Custom). 16:9 is the canonical ratio every figure on the site renders into.
3. Optional: increase contrast slightly (the dark editorial style benefits from it), apply minor color grading toward the site palette.
4. Export: File → Export → choose **WebP**, quality slider at **80**, color profile sRGB.
5. Save as `<descriptive-slug>.webp` directly into `C:\about.aigamma.com\images\`.

If Snagit's WebP export quality looks soft, fall back to exporting PNG and running it through https://squoosh.app (browser tool, drag-drop, WebP at q80). Squoosh's encoder is best-in-class.

### 3. Embed in `index.html`

Find the matching placeholder (a `<figure class="blog-figure">` block with a `picsum.photos` `src`) and replace three things:

```html
<!-- BEFORE (placeholder) -->
<figure class="blog-figure">
  <img src="https://picsum.photos/seed/defense-network/1600/900"
       alt="Placeholder — replace with: global network operations visual"
       width="1600" height="900" loading="lazy" decoding="async">
  <figcaption>Placeholder caption.</figcaption>
</figure>

<!-- AFTER (real image) -->
<figure class="blog-figure">
  <img src="/images/defense-network-topology.webp"
       alt="World map with network nodes connecting 22 countries, dark editorial style"
       width="1600" height="900" loading="lazy" decoding="async">
  <figcaption>Network topology spanning 22 countries, documented as acting lead infrastructure architect.</figcaption>
</figure>
```

Things to update:
- `src` → local path under `/images/`
- `alt` → describe the actual content for screen readers and SEO (one sentence, present tense, no "image of")
- `<figcaption>` → the visible caption shown under the image, or remove the entire `<figcaption>` line if the image stands alone

Things to **not** touch:
- `class="blog-figure"` — the size, border, centering, and caption styling are all enforced by this class
- `width="1600" height="900"` — these prevent layout shift while the image loads; keep them at the source dimensions even if CSS scales the image down
- `loading="lazy" decoding="async"` — performance hints, free wins

### 4. Verify locally

Open `index.html` in a browser, scroll to the image, confirm:
- It renders at the same width as other figures
- Caption sits centered below
- No console 404 (filename typo is the most common cause)

## Constraints carried from project rules

- Never use yellow/amber as a foreground text color for caption text (covered by the project's adjacency rule). Captions use `var(--text-tertiary)` from the global palette.
- The figure container has `aspect-ratio: 16/9` and `object-fit: cover` — if your source image is a different ratio, it will be cropped to center 16:9. Pre-crop in Snagit to control the framing.

## Scaling to the 52-page site

This README documents the manual flow appropriate for a single-page site with ~5–10 image slots. For the larger sister site (~52 pages × ~7 images = ~364 slots), the same `.blog-figure` CSS contract works, but the assignment step (which image goes in which slot) will be too tedious to do by hand. The follow-up there is a small CLI helper: scan all pages for placeholder `<!-- image-slot: name -->` comments, list empty slots, drag a new image onto the tool, the tool moves the file into place and rewrites the placeholder to a real `<figure>`. That helper is not built yet — flag when starting that project.
