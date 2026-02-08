# Companion State Images

Place static images for each companion state in their respective folders.

## Required Images

Each companion needs 5 state images (PNG recommended, transparent background):

| State | Filename | Description |
|-------|----------|-------------|
| Dormant | `dormant.png` | Very dim, inactive (48+ hours no activity) |
| Sleepy | `sleepy.png` | Resting, subdued (start of new day) |
| Awakening | `awakening.png` | Building up energy (during routine execution) |
| Glowing | `glowing.png` | Lit up, active (completed routine today) |
| Radiant | `radiant.png` | Full brightness (all 3 categories complete) |

## Folder Structure

```
companions/
├── mind/
│   ├── dormant.png
│   ├── sleepy.png
│   ├── awakening.png
│   ├── glowing.png
│   └── radiant.png
├── body/
│   └── (same 5 images)
└── soul/
    └── (same 5 images)
```

## Image Specifications

- **Format:** PNG with transparency
- **Size:** 256x256px recommended (will be scaled by component)
- **Style:** Should reflect the companion's personality and energy level

## Color Reference

| Companion | Primary Color | Hex |
|-----------|---------------|-----|
| Mind | Blue | #3B82F6 |
| Body | Red | #EF4444 |
| Soul | Amber | #F59E0B |
