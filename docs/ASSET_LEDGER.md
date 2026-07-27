# Asset ledger

## Generation attempts

All entries are exploration-tier single images (batch size 1) on `nano_banana_2`
at 2K, the lowest-cost option that resolves character detail well enough to
judge. No high-quality or video generation has been run: no direction is locked
yet.

| Date       | Generation ID | Model          | Attempt | Purpose                              | Result    | Credits | Provenance                                    |
| ---------- | ------------- | -------------- | ------: | ------------------------------------ | --------- | ------: | --------------------------------------------- |
| 2026-07-27 | `4a22948e`    | nano_banana_2  |       1 | Boy chef turnaround reference (`P`)  | completed |       2 | Original prompt, no reference image supplied  |
| 2026-07-27 | `a6998d07`    | nano_banana_2  |       1 | Girl chef turnaround reference (`S`) | completed |       2 | Original prompt, no reference image supplied  |
| 2026-07-27 | `6172fe32`    | nano_banana_2  |       1 | Food foe — fried egg                 | completed |       2 | Original prompt                               |
| 2026-07-27 | `24901b22`    | nano_banana_2  |       1 | Food foe — grilled sausage           | completed |       2 | Original prompt                               |
| 2026-07-27 | `03ea4e5a`    | nano_banana_2  |       1 | Food foe — pickle (crouched)         | completed |       2 | Original prompt                               |
| 2026-07-27 | `950cf98f`    | nano_banana_2  |       1 | Food foe — fried onion ring          | completed |       2 | Original prompt                               |
| 2026-07-27 | `8e1b459f`    | nano_banana_2  |       2 | Food foe — pickle (stalking retake)  | completed |       2 | Original prompt, re-roll of `03ea4e5a` pose   |
| 2026-07-27 | `45b83e73`    | nano_banana_2  |       1 | Boss — the Dread Stack               | completed |       2 | Original prompt                               |

**Total spent to date: 16 credits.** Account balance confirmed at 1046 after the
run (1062 before).

## Blocked: the renders cannot enter the repository

All eight renders completed successfully and are visible through the Higgsfield
MCP tools, but the CDN host they are served from —
`d8j0ntlcm91z4.cloudfront.net` — is not on this session's outbound egress
allowlist. Every fetch attempt returns `403` from the policy proxy, including
through `WebFetch`, and `curl` is denied at the tool-permission layer.

The consequence is specific and worth stating plainly: **generated art cannot be
normalized, cropped, alpha-checked, or integrated until that host is
allowlisted.** Nothing about the prompts or the renders is at fault. Until then
the game continues to ship on the procedural painters in `src/game/art/`, which
is why the offline fallback path was kept behind stable texture keys.

To unblock, add `d8j0ntlcm91z4.cloudfront.net` to the environment's network
policy, or supply the renders through a reachable path.

## Provenance statement

No image, audio, video or model in this repository was fetched from a
third-party service, traced, or derived from any existing game. Every texture
and sound in the current build is produced by code in this repository at boot.
The generations logged above are original prompts written for this project; none
references, names, or supplies a reference image from any existing title. The
supplied design sheet informed colour, mood and roster choices only.

Log every attempt above before spending credits, and record the prompt, model,
attempt index and resulting file.

## Required revision-2 asset families

- `chef_p_model` / `chef_p_flight`
- `chef_s_model` / `chef_s_flight`
- `sp_sibling_launch` / `sp_dual_fire` / `sp_victory`
- `enemy_onion_ringlets`
- `boss_dread_stack_base` / world variants
- `projectile_pickle` / `projectile_ketchup` / `projectile_mustard` / `projectile_mayo`
- `ui_boss_warning_en` / `ui_boss_warning_ja`
- `sfx_boss_klaxon` / `music_boss_flight`

Note that the chef families collapse: because Sal and Pep share body art within
a presentation, the character matrix is Boy + Girl body art plus two emblem
letters, not four separate characters. That halves the face/hair sheet count
from 32 to 16.
