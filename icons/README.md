# ChatMarker Icons

## Current Status

**Icons temporarily disabled in manifest.json** to allow extension to load without errors. The extension will use Chrome's default icon until proper icons are created.

## Creating Icons (Optional for Development)

When ready to add icons, create these files:
- `icon16.png` - 16×16px
- `icon48.png` - 48×48px
- `icon128.png` - 128×128px

Then update manifest.json to include:

```json
"action": {
  "default_popup": "popup/popup.html",
  "default_icon": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
},
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

## Design Specs

From DESIGN.md:
- **Background**: #6366F1 (Brand Primary - Indigo)
- **Icon Symbol**: White star (⭐) or bookmark
- **Style**: Modern, minimal, flat design

## Quick Creation Methods

### Method 1: Online Generators
- https://www.favicon-generator.org/
- https://realfavicongenerator.net/
- https://icon.kitchen/

### Method 2: Command Line (if ImageMagick installed)
```bash
# Create 128px icon with star emoji
convert -size 128x128 xc:#6366F1 \
  -gravity center -pointsize 80 -fill white -annotate +0+0 "⭐" \
  icons/icon128.png

# Resize for other sizes
convert icons/icon128.png -resize 48x48 icons/icon48.png
convert icons/icon128.png -resize 16x16 icons/icon16.png
```

### Method 3: Design Tools
- Figma, Canva, Photoshop
- Export at exact sizes (no scaling)
- Use PNG format with transparency (optional)

## Notes

Icons are cosmetic only - extension functionality is unaffected. Add them when polishing for production/store release.
