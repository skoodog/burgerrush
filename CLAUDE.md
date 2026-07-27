# Burger Rush project instructions

## Product identity

Build an original arcade platform game under the working title **Burger Rush**. It is a spiritual successor to single-screen burger-assembly arcade games, not a clone. Never copy or trace any BurgerTime/Data East sprite, logo, sound, character name, exact level geometry, cabinet art, animation, or text. Familiar gameplay grammar is allowed; all expression must be original.

The permanent design pillars are:

1. **Read in one glance.** The player can understand platforms, ladders, ingredient progress, threats, exits, and the 60-second timer immediately.
2. **Panic with fairness.** Pressure increases, but every hit must be explainable and every procedural map must preserve escape options.
3. **Physical comedy.** Ingredient drops, enemy reactions, spinning spatulas, and the map flip should feel tactile and funny.
4. **One more run.** Rounds are short, seeds are replayable, scoring is legible, and restarts are nearly instant.
5. **Depth behind simplicity.** Enemy prediction, route choice, front/back navigation, secrets, and risk-reward scoring create mastery.
6. **Two-act escalation.** Every completed platform stage must flow into the S&P sibling boss flight without feeling like a disconnected minigame.

## Working behavior

- Work autonomously. Make reasonable decisions rather than asking routine questions.
- Do not stop at planning, scaffolding, mockups, or TODOs. Produce a playable implementation.
- If an external credential or generation service is unavailable, build a deterministic local adapter or placeholder and document the exact integration point in `docs/EXTERNAL_SETUP.md`.
- Maintain `BUILD_STATUS.md` with completed work, commands run, known failures, and next actions.
- After each meaningful phase run formatting, lint, typecheck, unit tests, relevant E2E tests, and a production build.
- Do not push, deploy, purchase credits, or publish anything unless explicitly instructed.
- Never read, print, or commit `.env`, credentials, tokens, or private keys.
- Never delete user-created files. Prefer additive edits and targeted refactors.
- Track external asset-generation attempts and estimated credit use in `docs/ASSET_LEDGER.md`.
- Use the lowest-cost satisfactory generation option for exploration; reserve high-quality generation for locked final directions.
- Generated media is source material, not automatically game-ready. Normalize, crop, clean, validate alpha, and test readability at gameplay scale.
- Keep platform simulation, boss pattern decks, wing-partner behavior, projectiles, scoring, and replay verification deterministic for a given seed and input stream.
- Gameplay code must not depend on React rendering cadence. The game loop owns simulation.
- Use fixed-step simulation, object pooling for repeated entities and dual-chef boss projectiles, and crisp resolution-independent 2.5D rendering.
- Avoid unnecessary dependencies.

## Character and boss invariants

- Chef Sal (`S`) and Chef Pep (`P`) are the two sibling identities. Each identity has Boy and Girl presentations, and every combination has identical ranked mechanics and validated collision bounds.
- The S&P initials belong to Sal and Pep; do not create salt or pepper shaker enemies.
- Sal is always red in uniform striping/lettering and Pep is always blue; color follows chef identity, not player slot or gender, and travels with the identity through a character-select swap. Player slots are told apart by slot number and shape markers (P1 diamond, P2 circle), never by color alone.
- Sal and Pep share body art within a presentation: Pep Girl uses the same head, hair, and face artwork as Sal Girl. Only the toque emblem letter and the uniform accent color distinguish them, which halves the face/hair sheet matrix.
- Keep chef identity, Boy/Girl presentation, player slot, and input device as separate data.
- Two gamepads and keyboard-plus-gamepad must join, select, play, disconnect, and rebind without one device controlling both players.
- Every completed Stack Phase shows the exact warning `BOSS COMING!` with `ボス接近！` beneath it, then launches both chefs through the top boundary.
- Boss Flight is an original side-scrolling shooter sequence. Both chefs visibly fire unlimited spinning spatulas. There is no boss ammo count, reload, heat, or coupling to the three finite field spatulas introduced at level 10.
- The giant flying burger must use distinct pickle, ketchup, mustard, and mayo projectile grammars by round 4.
- Do not copy the art, typography, sound, level composition, enemy formations, or weapon behavior of any existing shooter.

## Preferred stack

Use current compatible stable releases, selected after checking package compatibility:

- Vite
- TypeScript with strict mode
- Phaser for 2D gameplay
- Three.js only for the render-texture map-flip transition and optional menu dioramas
- Howler.js or a similarly small audio layer, with Web Audio fallback
- Vitest
- Playwright
- ESLint
- Prettier
- vite-plugin-pwa
- IndexedDB/localStorage adapter for local saves and leaderboard
- Optional Supabase leaderboard adapter behind an interface; local play must work without it

## Required scripts

The final `package.json` must expose:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run validate:maps`
- `npm run simulate:runs`

## Quality gates

A change is not complete until:

- no uncaught console errors occur in the main flow;
- keyboard, gamepad, and touch input paths remain functional;
- two-device local co-op maintains isolated player ownership through character select, Stack Phase, boss transition, Boss Flight, results, and reconnect;
- Sal/Pep identity changes and Boy/Girl changes never alter gameplay values;
- Sal red and Pep blue accents remain cosmetic, and color-independent slot markers remain visible;
- deterministic map and score tests pass;
- all procedural maps pass reachability and time-budget validation;
- reduced-motion mode replaces the 3D rotation with an accessible transition;
- no copyrighted source asset, exact source-map geometry, shooter warning treatment, or copied boss pattern exists in the repository;
- the game remains playable with placeholder assets and no network connection;
- unlimited boss-flight firing never decrements field-spatula inventory;
- every level is gated on boss defeat after a successful Stack Phase.
