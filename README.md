# New England Contech-for-Cleantech Audit Map · 2026

Interactive Mapbox map tracking which New England states are filling the contech-for-cleantech funding gap, four years after the original diagnosis in [NREL/CP-5500-83262](https://www.nrel.gov/docs/fy22osti/83262.pdf).

## Repo layout

```
public/data/
  ne-audit.json     ← single source of truth (edit here)
  ne-audit.csv      ← auto-generated; commit alongside JSON
src/
  map.js            ← Mapbox GL JS frontend
  style.css         ← dark-mode styles
scripts/
  export-csv.js     ← node scripts/export-csv.js regenerates the CSV
  inject-token.js   ← Vercel build step: replaces __MAPBOX_TOKEN__
index.html
vercel.json
```

## Local dev

```bash
# 1. Copy env
cp .env.example .env
# add your Mapbox public token (pk.…) to .env

# 2. Inject token
MAPBOX_TOKEN=pk.xxx node scripts/inject-token.js

# 3. Serve locally (any static server)
npx serve .
# open http://localhost:3000
```

## Deploying to Vercel

1. Push this repo to GitHub
2. Import project in Vercel dashboard
3. Add environment variable: `MAPBOX_TOKEN = pk.your_token`
4. Deploy — Vercel runs `node scripts/inject-token.js` as the build step

## Updating data

Edit `public/data/ne-audit.json` → run `node scripts/export-csv.js` → commit both files.

## Three-actor model

| Role | Actor |
|------|-------|
| ① Validates | State government |
| ② Accelerates | Philanthropy |
| ③ Acquires | Construction / materials industry |

Status: **Working** · **Partial** · **Weak / absent**

## Authorship

Independent update. Not affiliated with NREL.
Original paper: Podder et al. (2022). *Contech to Accelerate Cleantech.* NREL/CP-5500-83262.
