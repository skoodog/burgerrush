# External setup

**The game requires none of this.** Local play is complete offline with
procedural art and synthesised audio, no credentials and no network. Everything
below is optional production tooling.

## Higgsfield MCP (asset generation)

Not used in this build. No generation call was made and no credit was spent; the
asset ledger is correspondingly empty.

When connected, the integration points are:

| Step                        | Where                                                  |
| --------------------------- | ------------------------------------------------------ |
| Manifest of required assets | `docs/ASSET_MANIFEST.md`                               |
| Prompts, already written    | `docs/ART_AND_AUDIO_PROMPTS.md`                        |
| Ledger of attempts and cost | `docs/ASSET_LEDGER.md`                                 |
| Drop-in point for final art | the painter behind each texture key in `src/game/art/` |

Process: inspect the actual tools and auth status; never invent tool names or
schemas; generate low-cost contact sheets first; select against written criteria;
reserve high-quality generation for locked directions; process locally into clean
sprite sources; validate transparency, cropping, frame alignment and 1×
readability; keep placeholders behind identical keys.

Generated images are **not** collision geometry. Generated video is motion
reference unless clean frame extraction is explicitly validated.

## Supabase leaderboard

Optional. Implement `LeaderboardProvider` (see
`docs/LEADERBOARD_AND_REPLAY.md`) behind an environment check.

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The anon key is public by design; row-level security must do the work.
Service-role keys must never reach client code. Submissions are validated
server-side against the replay before ranking.

## Fonts

The Japanese warning line uses a local font stack (`Noto Sans JP`,
`Hiragino Kaku Gothic ProN`, `Yu Gothic`). For a shipped build, bundle a licensed
subset rather than relying on system fonts, and record the licence in the asset
manifest.

## Name clearance

`Burger Rush` is a **working title**. Perform formal name and trademark clearance
before release. The title is modular — it appears in `index.html`, the PWA
manifest and `TitleScene` — so a rename is a three-file change.
