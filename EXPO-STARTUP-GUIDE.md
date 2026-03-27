# Expo Startup Guide

## Requirements

- **Node 22 LTS** (v22.x) — Do NOT use Node 24 / npm 11 (causes ~400 duplicate packages in node_modules)
- **npm 10.x** (ships with Node 22)
- Verify: `node --version` should show `v22.x.x`, `npm --version` should show `10.x.x`

## What's Already Configured

These fixes are already in place — no manual setup needed:

1. **Persistent Metro cache** — `metro.config.js` stores cache in `.metro-cache/` instead of `/tmp` (which macOS clears)
2. **Telemetry disabled** — `EXPO_NO_TELEMETRY=1` in `.env` prevents network hangs on startup
3. **`.metro-cache/` in `.gitignore`** — cache won't be committed

## Daily Workflow

```bash
# Normal startup (fast — seconds with warm cache)
npm start

# If bundling feels slow
npm run start:fast
```

That's it. You should almost never need anything else.

## When Things Go Wrong

### Level 1: Watchman stale (Expo hangs after Mac sleep)

```bash
watchman watch-del-all && npm start
```

### Level 2: Cache bugs (stale imports, wrong output)

```bash
npm run clean
```

This clears watchman, `.expo/`, `.metro-cache/`, and temp Metro files, then starts with `--clear`.

### Level 3: Nuclear option (broken node_modules — rare)

```bash
npm run nuke
```

This deletes everything (node_modules, caches) and reinstalls from scratch.

## Available Scripts

| Command | What it does | When to use |
|---------|-------------|-------------|
| `npm start` | Standard startup | Daily |
| `npm run start:fast` | Startup with more CPU workers | Slow bundling |
| `npm run clean` | Clear all caches + restart | Stale imports, weird bugs |
| `npm run nuke` | Full reinstall + restart | Broken node_modules (last resort) |

## Troubleshooting

### Stuck at "env: load .env"

Expo is hanging on a network call:

```bash
npx expo start --offline
```

### Port 8081 Already in Use

```bash
lsof -ti:8081 | xargs kill -9
```

### Metro Bundler Crashes

```bash
npm run clean
```

## Why Node 24 / npm 11 Is Bad

npm 11 (which ships with Node 24) uses a different dependency resolution algorithm that creates numbered duplicate packages at the top level of `node_modules` (e.g., `react-native 2`, `expo 3`, `@babel 4`). For this project, it created ~400 duplicates, inflating node_modules from ~634 to ~1016 packages. This causes:

- `npm install` taking 5+ minutes instead of ~1 minute
- `rm -rf node_modules` taking minutes (more files to delete)
- Watchman/Metro crawling more directories on startup
- `npm dedupe` hanging indefinitely

If you accidentally switch to Node 24, fix it with:

```bash
brew unlink node && brew link --overwrite node@22
rm -rf node_modules package-lock.json && npm install
```
