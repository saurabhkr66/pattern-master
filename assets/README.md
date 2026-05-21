# App Assets

Source images for Android (and later iOS) launcher icons + splash screens.
The `@capacitor/assets` CLI reads files from this folder and generates every
resolution Android needs (mdpi → xxxhdpi, portrait + landscape splashes,
adaptive icon layers).

## Files to provide

Drop these PNGs into this folder. **Format must be PNG.**

### Minimum (works for basic icon + single splash)

| File             | Size       | Notes                                              |
|------------------|------------|----------------------------------------------------|
| `icon-only.png`  | 1024×1024  | Square logo, fills the canvas. Used as the legacy launcher icon. |
| `splash.png`     | 2732×2732  | Logo centered, ~33% of canvas size. Outer area is solid background color (gets cropped on different aspect ratios). |

### Better (recommended — supports adaptive icons + dark splash)

| File                   | Size       | Notes                                                          |
|------------------------|------------|----------------------------------------------------------------|
| `icon-foreground.png`  | 1024×1024  | Logo only, **transparent background**. Keep logo inside the central 66% — outer 33% gets cropped on round/squircle masks (the "safe zone"). |
| `icon-background.png`  | 1024×1024  | Solid color background OR a subtle pattern. Used as the bottom layer of Android's adaptive icon. Alternative: leave the file out and edit `capacitor.config.ts` to set a hex color instead. |
| `splash.png`           | 2732×2732  | Light-mode splash. Logo centered, ~33% of canvas. Outer area gets cropped depending on device aspect ratio. |
| `splash-dark.png`      | 2732×2732  | Dark-mode splash. Same composition as `splash.png`, just darker background. Optional. |

## How to regenerate

After dropping/updating any file above, run:

```bash
npm run assets:generate
```

This regenerates every Android asset under `android/app/src/main/res/`
(mipmap-*, drawable-*). Then `npx cap sync android` is **not** needed for
assets — but you do need to **rebuild the APK** for the new icons/splashes
to show up on the device.

## Safe zones quick reference

Android adaptive icons crop differently depending on the device launcher:
- **Square**: full 1024×1024 visible
- **Circle / squircle / teardrop**: only the central **66%** (≈676px diameter)
  is guaranteed to be visible

So design your foreground with critical elements (text, logo center) inside
that central 66% — anything in the outer ring may be hidden.

For splash screens, the central **33%** is the only area guaranteed visible
on every device aspect ratio (portrait tall phones, landscape tablets, etc.).
The background color of `splash.png` fills the cropped edges.

## What's in `android/app/src/main/res/` right now

Capacitor template placeholders — the default Capacitor logo icons. They'll
get overwritten the first time you run `npm run assets:generate` with real
source images in this folder.
