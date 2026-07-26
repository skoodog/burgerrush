# Changelog

## Revision 3 — Sal/Pep selectable-gender local co-op

- Named the two player-facing sibling identities Chef Sal (`S`) and Chef Pep (`P`).
- Decoupled chef identity from Boy/Girl presentation and specified four equal base variants.
- Added a two-column keyboard/controller local co-op join and character-select flow.
- Made Player 1's stripes and toque lettering red and Player 2's blue, independent of identity or gender presentation.
- Allowed both players to select the same gender presentation.
- Added identity-swap behavior that preserves presentation, input device, and player color.
- Added explicit input-device ownership, disconnect, replacement-controller rebind, and replay-channel rules.
- Added non-color P1/P2 identification, cosmetic red/blue boss-projectile attribution, art mask/export requirements, analytics, migrations, and acceptance tests.
- Added a local-co-op input specialist agent and `/validate-local-coop` project skill.

## Revision 2 — S&P sibling boss-flight update

- Replaced the four-chef placeholder roster with selectable siblings Chef Pep and Chef Sal.
- Removed salt and pepper shaker enemies and replaced coordinated behavior with Onion Ringlets.
- Added a mandatory boss finale after every completed 60-second Stack Phase.
- Added the exact bilingual warning `BOSS COMING!` / `ボス接近！`, two-pulse klaxon, and top-boundary sibling launch.
- Added the giant flying burger boss and distinct pickle, ketchup, mustard, and mayo projectile families.
- Made Chef Pep and Chef Sal fire unlimited spinning spatulas throughout Boss Flight.
- Explicitly separated unlimited Boss Flight fire from the three finite level-10+ field spatulas.
- Updated art direction to model-realistic 2.5D anime/manga-kawaii presentation.
- Expanded tests, acceptance criteria, audio prompts, agents, and skills for the boss system.
