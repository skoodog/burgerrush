# External setup

**The game requires none of this.** Local play is complete offline with
procedural art and synthesised audio, no credentials and no network. Everything
below is optional production tooling.

## skoodog-robot (Discord escalation bridge)

Optional. Carries questions this project cannot answer itself out to the
Higgsfield Discord (<https://discord.gg/higgsfield>) and brings answers back.
The agent contract is `.claude/agents/skoodog-robot.md`; the transport is
`scripts/skoodog-robot.mjs`.

```
DISCORD_BOT_TOKEN=     # bot token, Discord Developer Portal → Bot → Reset Token
DISCORD_CHANNEL_ID=    # Developer Mode → right-click channel → Copy Channel ID
```

Set these in the environment, never in a file in this repository. The tool
redacts secret-shaped strings and the literal token value from every outbound
message and from anything it writes to disk, but that is a backstop, not a
licence to paste credentials into a question.

| Requirement                   | Why                                                                     |
| ----------------------------- | ----------------------------------------------------------------------- |
| `discord.com` egress allowed  | REST transport. `gateway.discord.gg` is only needed if you add a gateway |
| Bot invited to the guild      | A `discord.gg` invite adds **people**, not bots — bots need an OAuth2    |
|                               | authorize URL with the `bot` scope, applied by someone with Manage Server |
| Channel permissions           | View Channel, Send Messages, Read Message History                        |

REST polling is deliberate: the Discord gateway needs a WebSocket upgrade, which
the sandbox egress proxy does not support, whereas `GET /channels/:id/messages`
is plain HTTPS through a CONNECT tunnel.

Commands:

```
npm run robot -- doctor          # probes transport, identity and channel separately
npm run robot -- ask "question" --context "..."
npm run robot -- watch --id SKR-XXXXXXX
npm run robot -- outbox          # questions queued while offline
npm run robot -- flush           # retry them once egress is open
```

`ask` never fails on a closed network: it queues to `.skoodog-robot/`
(gitignored) so the calling agent is not blocked. Answers are hypotheses from
strangers — the agent contract requires testing each one before it is applied,
and refusing replies that ask to disable TLS, bypass the egress policy, supply
credentials, or run remote payloads.

## Higgsfield MCP (asset generation)

In use. Eight exploration renders have been generated (16 credits); see
`docs/ASSET_LEDGER.md` for the per-generation log and the current egress blocker
preventing their download.

The integration points are:

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
