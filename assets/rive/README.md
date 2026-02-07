# Rive Assets Directory

Place your companion `.riv` animation files here.

## Quick Reference

| File | Companion |
|------|-----------|
| `companion_mind.riv` | Mind (Blue #3B82F6) |
| `companion_body.riv` | Body (Red #EF4444) |
| `companion_soul.riv` | Soul (Amber #F59E0B) |
| `soteria.riv` | Soteria Guide (Gold #F7DD6F) |

## State Machine

Each file needs a state machine named **`CompanionState`** with:
- Input: `lightLevel` (Number 0-4)
- Trigger: `userTapped`

## Full Documentation

See **[docs/RIVE-INTEGRATION-GUIDE.md](../../docs/RIVE-INTEGRATION-GUIDE.md)** for:
- Step-by-step Rive Editor setup
- Export instructions
- Testing workflow
- Troubleshooting guide
- Per-character checklists

## Test Your Assets

1. Place `.riv` files in this directory
2. Run `npm start`
3. Navigate to `/companion-demo` in the app
