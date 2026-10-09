# Tiny Toon Duel (Three.js)

A quick-action toon shooter built with Three.js and Vite. Duel 1v1 or 4-player deathmatch against AI, playable in the browser on desktop or phone.

- 6 weapons (pistol, SMG, shotgun, rifle, sniper, rocket launcher) + grenades and kicks
- 3 arenas (Junkyard, Depot, Barricades) with landmines and bear traps
- Two fighter skins (Soldier, Hazmat)
- Procedural sound effects and music (Web Audio, no audio files)
- Touch controls: left stick moves, right stick aims and fires, buttons for dash / reload / grenade / kick / swap

Desktop controls: WASD move · mouse aim · click/hold fire · 1-6 switch weapon · E kick · Space dash · R reload · G grenade · Tab leaderboard · P pause · V visuals · M sound.

<p align="center">
  <img src="public/toonshooter/design-markedup.jpeg" alt="Tiny Toon Duel design" width="720" />
</p>

## Project Layout

```
index.html                  # Landing page
toonshooter/index.html      # Game page (markup only)
src/
├─ main.js                  # Boot: renderer, input, assets, menu, loop
├─ styles.css               # Game styles (HUD, menus, touch controls)
└─ game/
   ├─ config.js             # Tuning + weapon table (one entry per weapon)
   ├─ maps.js               # Arena layouts: cover, decor, barrels, hazards
   ├─ state.js              # Shared state (input, match, world, settings)
   ├─ events.js / timers.js # Event bus, pause-aware game-flow timers
   ├─ combat.js, ai.js, player.js, actions.js, hazards.js, pickups.js
   ├─ audio.js, touch.js, hud.js, menu.js, match.js, loop.js
   └─ arena.js, entities.js, visuals.js, fx.js, camera.js, collision.js, ...
tests/                      # Vitest: collision, timers/events/util, content data checks
public/
├─ assets.json              # Asset manifest (loaded by the game)
├─ assets/                  # GLTF models / textures referenced by the manifest
└─ toonshooter/             # Static images for the landing page
vite.config.js              # Multi-page build (landing + game)
vercel.json                 # Vercel build/output config (clean URLs, caching)
```

## Running Locally

```bash
npm install
npm run dev      # http://localhost:5173/ (landing) and /toonshooter/ (game)
npm run build    # outputs to dist/
npm test         # unit tests (Vitest)
```

## Deployment (Vercel)

Framework preset: **Vite**. Build command `npm run build`, output directory `dist` (declared in `vercel.json`). Clean URLs are enabled, so `/toonshooter` and `/toonshooter/` both work. Files under `/assets` are cached with `Cache-Control: public,max-age=31536000,immutable`.

## Asset Management

- `public/assets.json` is the single source of truth for model paths. The game fetches it at runtime and resolves URLs relative to the game page.
- When adding or pruning models, update the manifest so the scene and assets stay aligned.

## Local Dev Notes

- Optional Three.js workflow references live in `.claude/skills/threejs-builder/` (not deployed).
